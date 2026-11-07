package com.readtik.mobile.live

import com.readtik.mobile.BuildConfig
import com.readtik.mobile.data.LiveEvent
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.sse.EventSource
import okhttp3.sse.EventSourceListener
import okhttp3.sse.EventSources
import java.util.concurrent.TimeUnit

class LiveSseClient(
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(90, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build(),
) {
    private val json = Json { ignoreUnknownKeys = true; isLenient = true }
    private var source: EventSource? = null

    fun connect(username: String): Flow<LiveEvent> = callbackFlow {
        disconnect()
        val url = "${BuildConfig.API_BASE_URL.trimEnd('/')}/api/tiktok/stream?username=${java.net.URLEncoder.encode(username, "UTF-8")}"
        val request = Request.Builder().url(url).header("Accept", "text/event-stream").build()
        val factory = EventSources.createFactory(client)
        source = factory.newEventSource(request, object : EventSourceListener() {
            override fun onEvent(eventSource: EventSource, id: String?, type: String?, data: String) {
                parse(data)?.let { trySend(it) }
            }

            override fun onFailure(eventSource: EventSource, t: Throwable?, response: Response?) {
                trySend(
                    LiveEvent(
                        type = "status",
                        status = "error",
                        message = "Conexión perdida con el servidor. Reintentando...",
                    ),
                )
            }
        })
        awaitClose { disconnect() }
    }

    fun disconnect(username: String? = null) {
        source?.cancel()
        source = null
        if (!username.isNullOrBlank()) {
            val url = "${BuildConfig.API_BASE_URL.trimEnd('/')}/api/tiktok/stream?username=${java.net.URLEncoder.encode(username, "UTF-8")}"
            runCatching {
                client.newCall(Request.Builder().url(url).post(okhttp3.RequestBody.create(null, ByteArray(0))).build()).execute().close()
            }
        }
    }

    private fun parse(data: String): LiveEvent? {
        return runCatching {
            val obj = json.parseToJsonElement(data) as? JsonObject ?: return null
            fun str(key: String) = obj[key]?.jsonPrimitive?.contentOrNull.orEmpty()
            fun int(key: String) = obj[key]?.jsonPrimitive?.intOrNull ?: 0
            fun long(key: String) = obj[key]?.jsonPrimitive?.longOrNull ?: System.currentTimeMillis()
            fun bool(key: String) = obj[key]?.jsonPrimitive?.booleanOrNull ?: false
            LiveEvent(
                type = str("type"),
                id = str("id").ifBlank { "ev-${long("timestamp")}" },
                uniqueId = str("uniqueId"),
                nickname = str("nickname"),
                comment = str("comment").ifBlank { str("content") },
                profilePictureUrl = obj["profilePictureUrl"]?.jsonPrimitive?.contentOrNull,
                isModerator = bool("isModerator"),
                isSubscriber = bool("isSubscriber"),
                giftId = str("giftId").ifBlank { int("giftId").toString() },
                giftName = str("giftName"),
                diamondCount = int("diamondCount"),
                repeatCount = int("repeatCount").coerceAtLeast(1),
                repeatEnd = obj["repeatEnd"]?.jsonPrimitive?.booleanOrNull ?: true,
                likeCount = int("likeCount"),
                totalLikeCount = int("totalLikeCount"),
                viewerCount = int("viewerCount"),
                status = str("status"),
                message = str("message"),
                timestamp = long("timestamp"),
                raw = obj,
            )
        }.getOrNull()
    }
}
