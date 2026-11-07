package com.readtik.mobile.audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.media.MediaPlayer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.min
import kotlin.math.sin

class SoundEngine {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val mutex = Mutex()
    private var mediaPlayer: MediaPlayer? = null
    @Volatile var enabled: Boolean = true
    @Volatile var masterVolume: Float = 0.8f

    fun enqueue(
        soundKey: String,
        volume: Float = masterVolume,
        customUrl: String? = null,
        interrupt: Boolean = false,
        maxDurationSeconds: Int = 5,
    ) {
        if (!enabled || soundKey == "none") return
        scope.launch {
            if (interrupt) stopAll()
            mutex.withLock {
                play(soundKey, volume, customUrl, maxDurationSeconds)
            }
        }
    }

    fun playNow(soundKey: String, volume: Float = masterVolume, customUrl: String? = null) {
        enqueue(soundKey, volume, customUrl, interrupt = false)
    }

    fun stopAll() {
        runCatching {
            mediaPlayer?.stop()
            mediaPlayer?.release()
        }
        mediaPlayer = null
    }

    private suspend fun play(soundKey: String, volume: Float, customUrl: String?, maxDurationSeconds: Int) {
        if (soundKey == "custom") {
            val url = customUrl?.trim().orEmpty()
            if (url.isNotEmpty()) {
                val ok = playUrl(url, volume, maxDurationSeconds)
                if (!ok) synthesize("coin", volume)
                return
            }
            synthesize("coin", volume)
            return
        }
        synthesize(soundKey, volume)
    }

    private suspend fun playUrl(url: String, volume: Float, maxDurationSeconds: Int): Boolean {
        return try {
            val player = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build(),
                )
                setDataSource(url)
                setVolume(volume, volume)
                prepare()
                start()
            }
            mediaPlayer = player
            val capMs = (maxDurationSeconds.coerceAtLeast(1) * 1000L)
            delay(min(player.duration.toLong().coerceAtLeast(200), capMs))
            player.stop()
            player.release()
            if (mediaPlayer === player) mediaPlayer = null
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun synthesize(key: String, volume: Float) {
        val sampleRate = 22050
        val tones = when (key) {
            "coin" -> listOf(Tone(987.77, 0.0, 0.12, 0.9), Tone(1318.51, 0.08, 0.37, 1.0))
            "fanfare" -> listOf(
                Tone(523.25, 0.0, 0.12, 1.0),
                Tone(659.25, 0.13, 0.12, 1.0),
                Tone(783.99, 0.26, 0.12, 1.0),
                Tone(1046.50, 0.39, 0.5, 1.0),
            )
            "ding" -> listOf(Tone(1760.0, 0.0, 0.35, 0.8))
            "levelup" -> listOf(
                Tone(440.0, 0.0, 0.3, 0.8),
                Tone(554.37, 0.07, 0.3, 0.8),
                Tone(659.25, 0.14, 0.3, 0.8),
                Tone(880.0, 0.21, 0.3, 0.8),
            )
            "chime" -> listOf(Tone(1200.0, 0.0, 0.4, 0.85, sweepTo = 2400.0))
            "airhorn" -> listOf(
                Tone(466.16, 0.0, 0.1, 0.9, sweepTo = 440.0, saw = true),
                Tone(466.16, 0.12, 0.1, 0.9, sweepTo = 440.0, saw = true),
                Tone(466.16, 0.24, 0.1, 0.9, sweepTo = 440.0, saw = true),
                Tone(466.16, 0.38, 0.1, 0.9, sweepTo = 440.0, saw = true),
            )
            "applause" -> noiseBurst(0.55)
            else -> listOf(Tone(1200.0, 0.0, 0.35, 0.8))
        }

        val duration = tones.maxOf { it.start + it.duration }
        val totalSamples = (duration * sampleRate).toInt().coerceAtLeast(sampleRate / 10)
        val buffer = ShortArray(totalSamples)
        tones.forEach { tone ->
            mixTone(buffer, sampleRate, tone, volume)
        }
        playPcm(buffer, sampleRate)
    }

    private fun noiseBurst(seconds: Double): List<Tone> {
        return List(8) { i ->
            Tone(180.0 + i * 40, i * 0.04, 0.18, 0.35, saw = true)
        }
    }

    private fun mixTone(buffer: ShortArray, sampleRate: Int, tone: Tone, volume: Float) {
        val start = (tone.start * sampleRate).toInt()
        val len = (tone.duration * sampleRate).toInt()
        for (i in 0 until len) {
            val idx = start + i
            if (idx !in buffer.indices) continue
            val t = i.toDouble() / sampleRate
            val freq = if (tone.sweepTo == null) tone.freq else {
                tone.freq + (tone.sweepTo - tone.freq) * (i.toDouble() / len)
            }
            val raw = if (tone.saw) {
                val phase = (t * freq) % 1.0
                2.0 * phase - 1.0
            } else {
                sin(2.0 * PI * freq * t)
            }
            val env = exp(-3.0 * (i.toDouble() / len))
            val sample = (raw * env * tone.gain * volume * 0.35 * Short.MAX_VALUE).toInt()
                .coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
            val mixed = (buffer[idx] + sample).coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
            buffer[idx] = mixed.toShort()
        }
    }

    private fun playPcm(buffer: ShortArray, sampleRate: Int) {
        val minBuf = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
        )
        val track = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build(),
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(sampleRate)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build(),
            )
            .setBufferSizeInBytes(minBuf.coerceAtLeast(buffer.size * 2))
            .setTransferMode(AudioTrack.MODE_STATIC)
            .build()
        track.write(buffer, 0, buffer.size)
        track.play()
        Thread.sleep(((buffer.size * 1000L) / sampleRate).coerceAtLeast(80))
        track.stop()
        track.release()
    }

    private data class Tone(
        val freq: Double,
        val start: Double,
        val duration: Double,
        val gain: Double,
        val sweepTo: Double? = null,
        val saw: Boolean = false,
    )
}
