package com.readtik.mobile.live

import com.readtik.mobile.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

/**
 * Render Free duerme web y signer. Hay que pegarles a /health antes del live
 * (lo mismo que abrir la URL del signer en el navegador).
 */
object RenderWakeUp {
    private val client = OkHttpClient.Builder()
        .connectTimeout(90, TimeUnit.SECONDS)
        .readTimeout(90, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .callTimeout(95, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    suspend fun wake(onProgress: (String) -> Unit) = coroutineScope {
        onProgress("Despertando servidores (puede tardar ~1 min)...")
        val web = async(Dispatchers.IO) {
            ping("${BuildConfig.API_BASE_URL.trimEnd('/')}/api/tiktok/health", attempts = 4)
        }
        val signerUrl = BuildConfig.SIGNER_URL.trim().trimEnd('/')
        val signer = async(Dispatchers.IO) {
            if (signerUrl.isBlank()) true
            else ping("$signerUrl/health", attempts = 5)
        }
        val webOk = web.await()
        val signerOk = signer.await()
        if (!webOk && !signerOk) {
            onProgress("Los servidores siguen despertando. Reintentando conexión...")
            delay(3000)
        } else if (!signerOk) {
            onProgress("Signer aún arrancando. Conectando de todos modos...")
        }
    }

    private fun ping(url: String, attempts: Int): Boolean {
        repeat(attempts) { i ->
            val ok = runCatching {
                val req = Request.Builder().url(url).header("Cache-Control", "no-store").get().build()
                client.newCall(req).execute().use { it.isSuccessful || it.code in 400..499 }
            }.getOrDefault(false)
            if (ok) return true
            if (i < attempts - 1) Thread.sleep(3000)
        }
        return false
    }
}
