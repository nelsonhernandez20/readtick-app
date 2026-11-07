package com.readtik.mobile.audio

import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import com.readtik.mobile.data.Catalog
import com.readtik.mobile.data.TtsSettings
import java.util.Locale
import java.util.UUID
import java.util.concurrent.ConcurrentLinkedQueue

class TtsEngine(context: Context) : TextToSpeech.OnInitListener {
    private val appContext = context.applicationContext
    private val main = Handler(Looper.getMainLooper())
    private var tts: TextToSpeech? = TextToSpeech(appContext, this)
    private val queue = ConcurrentLinkedQueue<String>()
    @Volatile private var speaking = false
    @Volatile private var ready = false
    @Volatile var settings: TtsSettings = TtsSettings()

    override fun onInit(status: Int) {
        ready = status == TextToSpeech.SUCCESS
        tts?.let { engine ->
            engine.language = Locale("es", "ES")
            engine.setAudioAttributes(BackgroundPlaybackKeeper.mediaAttrs())
            engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    speaking = true
                }

                override fun onDone(utteranceId: String?) {
                    speaking = false
                    processQueue()
                }

                @Deprecated("Deprecated in Java")
                override fun onError(utteranceId: String?) {
                    speaking = false
                    processQueue()
                }

                override fun onError(utteranceId: String?, errorCode: Int) {
                    speaking = false
                    processQueue()
                }
            })
        }
        processQueue()
    }

    fun availableVoices(): List<Voice> {
        return tts?.voices?.toList().orEmpty().sortedBy { it.name }
    }

    fun speak(text: String, forcePriority: Boolean = false, bypassDisabled: Boolean = false) {
        if ((!settings.enabled && !bypassDisabled) || text.isBlank()) return
        if (forcePriority) {
            val rest = queue.toList()
            queue.clear()
            queue.add(text)
            rest.forEach { queue.add(it) }
        } else {
            if (queue.size > 15) repeat(5) { queue.poll() }
            queue.add(text)
        }
        processQueue()
    }

    fun stop() {
        queue.clear()
        speaking = false
        main.post { tts?.stop() }
    }

    fun shutdown() {
        stop()
        main.post {
            tts?.shutdown()
            tts = null
            ready = false
        }
    }

    private fun processQueue() {
        main.post {
            if (!ready || speaking) return@post
            val next = queue.poll() ?: return@post
            val engine = tts ?: return@post
            speaking = true
            applyVoice(engine)
            val params = Bundle().apply {
                putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, settings.volume.coerceIn(0.1f, 1f))
                putString(TextToSpeech.Engine.KEY_PARAM_STREAM, android.media.AudioManager.STREAM_MUSIC.toString())
            }
            engine.speak(next, TextToSpeech.QUEUE_FLUSH, params, UUID.randomUUID().toString())
        }
    }

    private fun applyVoice(engine: TextToSpeech) {
        val effect = Catalog.voiceEffects.find { it.id == settings.voiceEffect }
        val rate = if (settings.voiceEffect == "personalizado" || effect == null) settings.rate else effect.rate
        val pitch = if (settings.voiceEffect == "personalizado" || effect == null) settings.pitch else effect.pitch
        engine.setSpeechRate(rate.coerceIn(0.2f, 2.5f))
        engine.setPitch(pitch.coerceIn(0.1f, 2.0f))

        val voices = engine.voices.orEmpty()
        val selected = when {
            settings.voiceName.isNotBlank() -> voices.find { it.name == settings.voiceName }
            settings.voiceEffect == "ardilla" -> voices.find {
                it.locale.language.startsWith("es") && it.name.contains("female", true)
            } ?: voices.find { it.locale.language.startsWith("es") }
            settings.voiceEffect == "monstruo" -> voices.find {
                it.locale.language.startsWith("es") && it.name.contains("male", true)
            } ?: voices.find { it.locale.language.startsWith("es") }
            else -> voices.find { it.locale.language.startsWith("es") }
        }
        if (selected != null) engine.voice = selected
    }
}
