package com.readtik.mobile.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.Build
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import kotlin.math.PI
import kotlin.math.sin

/**
 * Keeps Android treating ReadTik as an active media session so TTS/SFX
 * continue while TikTok is in the foreground.
 */
class BackgroundPlaybackKeeper(context: Context) {
    private val appContext = context.applicationContext
    private val audioManager = appContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var session: MediaSessionCompat? = null
    private var keepAliveTrack: AudioTrack? = null
    private var focusRequest: AudioFocusRequest? = null
    @Volatile private var running = false

    val mediaSessionToken: MediaSessionCompat.Token?
        get() = session?.sessionToken

    fun start() {
        if (running) return
        running = true
        session = MediaSessionCompat(appContext, "ReadTikLive").apply {
            setCallback(object : MediaSessionCompat.Callback() {})
            isActive = true
            setPlaybackState(
                PlaybackStateCompat.Builder()
                    .setActions(PlaybackStateCompat.ACTION_PLAY or PlaybackStateCompat.ACTION_STOP)
                    .setState(PlaybackStateCompat.STATE_PLAYING, 0L, 1f)
                    .build(),
            )
        }
        requestSharedFocus()
        startSilentLoop()
    }

    fun stop() {
        running = false
        runCatching { keepAliveTrack?.pause() }
        runCatching { keepAliveTrack?.release() }
        keepAliveTrack = null
        abandonFocus()
        session?.isActive = false
        session?.release()
        session = null
    }

    private fun requestSharedFocus() {
        val attrs = mediaAttrs()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(attrs)
                .setAcceptsDelayedFocusGain(true)
                .setWillPauseWhenDucked(false)
                .setOnAudioFocusChangeListener { }
                .build()
            focusRequest = request
            audioManager.requestAudioFocus(request)
        } else {
            @Suppress("DEPRECATION")
            audioManager.requestAudioFocus(
                null,
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK,
            )
        }
    }

    private fun abandonFocus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
        } else {
            @Suppress("DEPRECATION")
            audioManager.abandonAudioFocus(null)
        }
        focusRequest = null
    }

    private fun startSilentLoop() {
        val sampleRate = 22050
        val samples = ShortArray(sampleRate / 4) { i ->
            (sin(2.0 * PI * 40.0 * i / sampleRate) * 8).toInt().toShort()
        }
        val minBuf = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
        )
        val track = AudioTrack.Builder()
            .setAudioAttributes(mediaAttrs())
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(sampleRate)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build(),
            )
            .setBufferSizeInBytes(minBuf.coerceAtLeast(samples.size * 2))
            .setTransferMode(AudioTrack.MODE_STATIC)
            .build()
        track.write(samples, 0, samples.size)
        track.setLoopPoints(0, samples.size, -1)
        track.setVolume(0.02f)
        track.play()
        keepAliveTrack = track
    }

    companion object {
        fun mediaAttrs(): AudioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
    }
}
