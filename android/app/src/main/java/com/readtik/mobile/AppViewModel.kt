package com.readtik.mobile

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.readtik.mobile.audio.SoundEngine
import com.readtik.mobile.audio.TtsEngine
import com.readtik.mobile.audio.requestBatteryExemption
import com.readtik.mobile.data.AuthRepository
import com.readtik.mobile.data.Catalog
import com.readtik.mobile.data.ConnectionState
import com.readtik.mobile.data.ConnectionStatus
import com.readtik.mobile.data.CustomGiftSoundRule
import com.readtik.mobile.data.EventDispatcher
import com.readtik.mobile.data.LiveEvent
import com.readtik.mobile.data.LiveStats
import com.readtik.mobile.data.SettingsStore
import com.readtik.mobile.data.SoundSettings
import com.readtik.mobile.data.SubscriptionInfo
import com.readtik.mobile.data.TtsSettings
import com.readtik.mobile.live.LiveForegroundService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class UiState(
    val ready: Boolean = false,
    val userEmail: String? = null,
    val authError: String = "",
    val authSuccess: String = "",
    val authLoading: Boolean = false,
    val isSignUp: Boolean = false,
    val connection: ConnectionState = ConnectionState(),
    val stats: LiveStats = LiveStats(),
    val events: List<LiveEvent> = emptyList(),
    val lastAlert: LiveEvent? = null,
    val tts: TtsSettings = TtsSettings(),
    val sounds: SoundSettings = SoundSettings(),
    val subscription: SubscriptionInfo = SubscriptionInfo(),
    val showSettings: Boolean = false,
    val showSimulator: Boolean = false,
    val showPro: Boolean = false,
    val settingsTab: String = "tts",
)

class AppViewModel(application: Application) : AndroidViewModel(application) {
    private val store = SettingsStore(application)
    val auth = AuthRepository()
    val ttsEngine = TtsEngine(application)
    val soundEngine = SoundEngine()
    private val dispatcher = EventDispatcher(ttsEngine, soundEngine)

    private val _ui = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _ui

    init {
        viewModelScope.launch {
            store.tts.collect { settings ->
                dispatcher.ttsSettings = settings
                _ui.update { it.copy(tts = settings) }
            }
        }
        viewModelScope.launch {
            store.sounds.collect { settings ->
                dispatcher.soundSettings = settings
                _ui.update { it.copy(sounds = settings) }
            }
        }
        viewModelScope.launch {
            val email = auth.currentEmail()
            applySession(email)
            auth.emailFlow?.collect { applySession(it) }
        }
        _ui.update { it.copy(ready = true) }
    }

    private suspend fun applySession(email: String?) {
        val sub = auth.loadSubscription(email)
        dispatcher.isPro = sub.isPro
        _ui.update { it.copy(userEmail = email, subscription = sub) }
    }

    fun setSignUp(value: Boolean) = _ui.update { it.copy(isSignUp = value, authError = "", authSuccess = "") }

    fun signIn(email: String, password: String) = authAction {
        auth.signIn(email, password)
        _ui.update { it.copy(authSuccess = "¡Inicio de sesión exitoso!") }
    }

    fun signUp(email: String, password: String, confirm: String) = authAction {
        if (password != confirm) error("Las contraseñas no coinciden.")
        if (password.length < 6) error("La contraseña debe tener al menos 6 caracteres.")
        val sessionNow = auth.signUp(email, password)
        _ui.update {
            it.copy(
                authSuccess = if (sessionNow) {
                    "¡Cuenta creada exitosamente!"
                } else {
                    "¡Registro completado! Revisa tu correo para confirmar la cuenta."
                },
            )
        }
    }

    fun signOut() = viewModelScope.launch {
        LiveForegroundService.stop(getApplication())
        auth.signOut()
        _ui.update { it.copy(userEmail = null, subscription = SubscriptionInfo()) }
    }

    private fun authAction(block: suspend () -> Unit) = viewModelScope.launch {
        _ui.update { it.copy(authLoading = true, authError = "", authSuccess = "") }
        runCatching { block() }
            .onFailure { err ->
                val msg = err.message.orEmpty()
                _ui.update {
                    it.copy(
                        authError = when {
                            msg.contains("Invalid login", true) -> "Correo o contraseña incorrectos."
                            msg.contains("Email not confirmed", true) -> "Debes confirmar tu correo antes de iniciar sesión."
                            else -> msg.ifBlank { "Error de autenticación." }
                        },
                    )
                }
            }
        _ui.update { it.copy(authLoading = false) }
    }

    fun connect(username: String) {
        val clean = username.trim().removePrefix("@")
        if (clean.isBlank()) return
        requestBatteryExemption(getApplication())
        LiveForegroundService.start(getApplication(), clean)
    }

    fun disconnect() {
        LiveForegroundService.stop(getApplication())
    }

    fun onConnecting(username: String, message: String? = null) {
        val firstAttempt = _ui.value.connection.username != username ||
            _ui.value.connection.status != ConnectionStatus.CONNECTING
        if (firstAttempt) dispatcher.lastLikeMilestone = 0
        _ui.update {
            it.copy(
                connection = ConnectionState(
                    ConnectionStatus.CONNECTING,
                    message ?: "Conectando con @$username...",
                    username,
                ),
                stats = if (firstAttempt) LiveStats() else it.stats,
            )
        }
    }

    fun onDisconnected() {
        ttsEngine.stop()
        soundEngine.stopAll()
        _ui.update {
            it.copy(connection = ConnectionState(ConnectionStatus.DISCONNECTED, "Desconectado.", it.connection.username))
        }
    }

    fun onLiveEvent(event: LiveEvent) {
        val result = dispatcher.dispatch(event, _ui.value.stats)
        _ui.update { state ->
            val events = if (result.keepInFeed && event.type !in listOf("status", "roomUser")) {
                listOf(event) + state.events.take(99)
            } else state.events
            state.copy(
                events = events,
                stats = result.stats ?: state.stats.copy(viewers = result.viewers ?: state.stats.viewers),
                lastAlert = result.alert ?: state.lastAlert,
                connection = state.connection.copy(
                    status = result.status ?: state.connection.status,
                    message = result.statusMessage ?: state.connection.message,
                ),
            )
        }
    }

    fun clearEvents() = _ui.update { it.copy(events = emptyList()) }

    fun replayTts(text: String) = ttsEngine.speak(text, forcePriority = true, bypassDisabled = true)

    fun playSound(key: String) = soundEngine.playNow(key, _ui.value.sounds.volume)

    fun updateTts(transform: (TtsSettings) -> TtsSettings) = viewModelScope.launch {
        val next = transform(_ui.value.tts)
        dispatcher.ttsSettings = next
        store.saveTts(next)
        _ui.update { it.copy(tts = next) }
    }

    fun updateSounds(transform: (SoundSettings) -> SoundSettings) = viewModelScope.launch {
        val next = transform(_ui.value.sounds)
        dispatcher.soundSettings = next
        store.saveSounds(next)
        _ui.update { it.copy(sounds = next) }
    }

    fun applyVoiceEffect(id: String) {
        val effect = Catalog.voiceEffects.find { it.id == id } ?: return
        updateTts { it.copy(voiceEffect = id, pitch = effect.pitch, rate = effect.rate) }
    }

    fun addGiftRule(rule: CustomGiftSoundRule) = updateSounds { it.copy(customGiftRules = it.customGiftRules + rule) }
    fun removeGiftRule(id: String) = updateSounds { it.copy(customGiftRules = it.customGiftRules.filterNot { r -> r.id == id }) }

    fun toggleSettings(open: Boolean = !_ui.value.showSettings) = _ui.update { it.copy(showSettings = open) }
    fun toggleSimulator(open: Boolean = !_ui.value.showSimulator) = _ui.update { it.copy(showSimulator = open) }
    fun togglePro(open: Boolean = !_ui.value.showPro) = _ui.update { it.copy(showPro = open) }
    fun setSettingsTab(tab: String) = _ui.update { it.copy(settingsTab = tab) }

    fun simulate(event: LiveEvent) = onLiveEvent(event)

    suspend fun submitPayment(reference: String, bytes: ByteArray?, mime: String?) {
        val email = _ui.value.userEmail ?: error("Inicia sesión antes de reportar un pago.")
        auth.reportPayment(email, reference, bytes, mime)
    }

    override fun onCleared() {
        ttsEngine.shutdown()
        soundEngine.stopAll()
        super.onCleared()
    }
}
