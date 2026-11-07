package com.readtik.mobile.data

import com.readtik.mobile.BuildConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.storage.Storage
import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.time.Instant
import java.time.temporal.ChronoUnit

class AuthRepository {
    val configured: Boolean
        get() = BuildConfig.SUPABASE_URL.isNotBlank() && BuildConfig.SUPABASE_ANON_KEY.isNotBlank()

    val client: SupabaseClient? = if (configured) {
        createSupabaseClient(BuildConfig.SUPABASE_URL, BuildConfig.SUPABASE_ANON_KEY) {
            install(Auth) {
                enableLifecycleCallbacks = false
            }
            install(Postgrest)
            install(Storage)
        }
    } else null

    val emailFlow: Flow<String?>? = client?.auth?.sessionStatus?.map { status ->
        when (status) {
            is SessionStatus.Authenticated -> status.session.user?.email
            else -> null
        }
    }

    suspend fun signIn(email: String, password: String) {
        val supabase = requireClient()
        supabase.auth.signInWith(Email) {
            this.email = email.trim()
            this.password = password
        }
    }

    suspend fun signUp(email: String, password: String): Boolean {
        val supabase = requireClient()
        supabase.auth.signUpWith(Email) {
            this.email = email.trim()
            this.password = password
        }
        return supabase.auth.currentSessionOrNull() != null
    }

    suspend fun signOut() {
        client?.auth?.signOut()
    }

    suspend fun currentEmail(): String? {
        val supabase = client ?: return null
        runCatching { supabase.auth.awaitInitialization() }
        return supabase.auth.currentUserOrNull()?.email
    }

    suspend fun loadSubscription(email: String?): SubscriptionInfo {
        val fallback = SubscriptionInfo()
        val supabase = client ?: return fallback
        if (email.isNullOrBlank()) return fallback
        return runCatching {
            val rows = supabase.postgrest.from("reportes_pago").select {
                filter {
                    or {
                        eq("sender_user", email.trim().lowercase())
                        eq("user_identifier", email.trim().lowercase())
                    }
                    isIn("status", listOf("confirmado", "aprobado"))
                }
            }.decodeList<PaymentReportRow>()
            val latest = rows.maxByOrNull { it.created_at.orEmpty() } ?: return fallback
            val created = Instant.parse(latest.created_at)
            val expires = created.plus(30, ChronoUnit.DAYS)
            val remaining = ChronoUnit.DAYS.between(Instant.now(), expires)
            val isPro = remaining > 0
            SubscriptionInfo(
                isPro = isPro,
                plan = if (isPro) "mensual" else "free",
                status = if (isPro) "activo" else "expirado",
                daysRemaining = if (isPro) remaining.toInt().coerceAtLeast(1) else 0,
                expiresAt = expires.toString(),
            )
        }.getOrDefault(fallback)
    }

    suspend fun reportPayment(email: String, reference: String, imageBytes: ByteArray?, mime: String?): String? {
        val supabase = requireClient()
        var screenshotUrl: String? = null
        if (imageBytes != null) {
            val ext = when {
                mime?.contains("png") == true -> "png"
                mime?.contains("webp") == true -> "webp"
                else -> "jpg"
            }
            val path = "${System.currentTimeMillis()}-${(100000..999999).random()}.$ext"
            supabase.storage.from("comprobantes").upload(path, imageBytes)
            screenshotUrl = supabase.storage.from("comprobantes").publicUrl(path)
        }
        supabase.postgrest.from("reportes_pago").insert(
            buildJsonObject {
                put("user_identifier", email)
                put("sender_user", email)
                put("reference_number", reference.trim())
                put("plan_type", "mensual")
                put("payment_method", "banco")
                screenshotUrl?.let { put("screenshot_url", it) }
                put("status", "pendiente")
            },
        )
        return screenshotUrl
    }

    suspend fun loadBannedWords(email: String): List<String> {
        val supabase = client ?: return emptyList()
        return runCatching {
            supabase.postgrest.from("biblioteca_palabras").select {
                filter { eq("user_email", email.trim().lowercase()) }
            }.decodeList<BannedRow>().firstOrNull()?.palabras.orEmpty()
        }.getOrDefault(emptyList())
    }

    private fun requireClient(): SupabaseClient {
        return client ?: error("Supabase no está configurado. Completa SUPABASE_URL y SUPABASE_ANON_KEY en android/local.properties")
    }
}

@kotlinx.serialization.Serializable
private data class PaymentReportRow(
    val id: String? = null,
    val created_at: String? = null,
    val status: String? = null,
    val plan_type: String? = null,
)

@kotlinx.serialization.Serializable
private data class BannedRow(
    val user_email: String? = null,
    val palabras: List<String> = emptyList(),
)
