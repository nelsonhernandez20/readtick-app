package com.readtik.mobile.live

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.media.app.NotificationCompat.MediaStyle
import com.readtik.mobile.MainActivity
import com.readtik.mobile.R
import com.readtik.mobile.ReadTikApp
import com.readtik.mobile.audio.BackgroundPlaybackKeeper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class LiveForegroundService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var job: Job? = null
    private val sse = LiveSseClient()
    private var keeper: BackgroundPlaybackKeeper? = null
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopLive()
                return START_NOT_STICKY
            }
            else -> {
                val username = intent?.getStringExtra(EXTRA_USERNAME).orEmpty().trim().removePrefix("@")
                if (username.isBlank()) {
                    stopSelf()
                    return START_NOT_STICKY
                }
                startLive(username)
            }
        }
        return START_STICKY
    }

    private fun startLive(username: String) {
        job?.cancel()
        val app = application as ReadTikApp
        app.viewModel.onConnecting(username)
        acquireWakeLock()
        if (keeper == null) {
            keeper = BackgroundPlaybackKeeper(this).also { it.start() }
        }
        startInForeground(username)
        job = scope.launch {
            RenderWakeUp.wake { message ->
                app.viewModel.onConnecting(username, message)
            }
            sse.connect(username).collect { event ->
                app.viewModel.onLiveEvent(event)
                if (event.type == "status" && event.status == "ended") {
                    stopLive()
                }
            }
        }
    }

    private fun stopLive() {
        val app = application as ReadTikApp
        val user = app.viewModel.uiState.value.connection.username
        sse.disconnect(user.ifBlank { null })
        app.viewModel.onDisconnected()
        keeper?.stop()
        keeper = null
        releaseWakeLock()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun startInForeground(username: String) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    getString(R.string.live_notification_channel),
                    NotificationManager.IMPORTANCE_LOW,
                ).apply {
                    setSound(null, null)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                },
            )
        }
        val pending = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val stop = PendingIntent.getService(
            this,
            1,
            Intent(this, LiveForegroundService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_radio)
            .setContentTitle(getString(R.string.live_notification_title))
            .setContentText("Conectado a @$username — abre TikTok y sigue escuchando")
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(pending)
            .addAction(0, "Desconectar", stop)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)

        keeper?.mediaSessionToken?.let { token ->
            builder.setStyle(MediaStyle().setMediaSession(token).setShowActionsInCompactView(0))
        }

        val notification = builder.build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ServiceCompat.startForeground(
                this,
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == true) return
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "readtik:live").apply {
            setReferenceCounted(false)
            acquire(6 * 60 * 60 * 1000L)
        }
    }

    private fun releaseWakeLock() {
        runCatching { if (wakeLock?.isHeld == true) wakeLock?.release() }
        wakeLock = null
    }

    override fun onDestroy() {
        job?.cancel()
        scope.cancel()
        keeper?.stop()
        keeper = null
        releaseWakeLock()
        super.onDestroy()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        // Keep reading comments even if the user leaves the ReadTik screen / recents.
        super.onTaskRemoved(rootIntent)
    }

    companion object {
        const val EXTRA_USERNAME = "username"
        const val ACTION_STOP = "com.readtik.mobile.STOP_LIVE"
        private const val CHANNEL_ID = "readtik_live"
        private const val NOTIFICATION_ID = 42

        fun start(context: Context, username: String) {
            val intent = Intent(context, LiveForegroundService::class.java).putExtra(EXTRA_USERNAME, username)
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            context.startService(Intent(context, LiveForegroundService::class.java).setAction(ACTION_STOP))
        }
    }
}
