package com.readtik.mobile.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

enum class ConnectionStatus {
    DISCONNECTED, CONNECTING, CONNECTED, ERROR, ENDED
}

@Serializable
data class TtsSettings(
    val enabled: Boolean = true,
    val voiceName: String = "",
    val rate: Float = 1.1f,
    val pitch: Float = 1.0f,
    val volume: Float = 1.0f,
    val voiceEffect: String = "normal",
    val readChat: Boolean = true,
    val readGifts: Boolean = true,
    val readFollows: Boolean = true,
    val readShares: Boolean = false,
    val minGiftDiamonds: Int = 1,
    val chatTemplate: String = "{user} dice: {comment}",
    val giftTemplate: String = "¡{user} envió {gift}!",
    val followTemplate: String = "¡Gracias {user} por seguirme!",
    val shareTemplate: String = "¡{user} compartió el directo!",
    val ignoreCommands: Boolean = true,
    val maxCommentLength: Int = 120,
    val filterEnabled: Boolean = true,
    val bannedWords: List<String> = emptyList(),
)

@Serializable
data class CustomGiftSoundRule(
    val id: String,
    val giftName: String,
    val giftId: String = "",
    val soundKey: String = "custom",
    val soundUrl: String = "",
    val soundName: String = "",
    val volume: Float = 0.8f,
    val minCount: Int = 1,
    val waitForComboEnd: Boolean = false,
    val interruptPrevious: Boolean = false,
    val customTTS: String = "",
    val maxDuration: Int = 5,
)

@Serializable
data class SoundSettings(
    val enabled: Boolean = true,
    val volume: Float = 0.8f,
    val giftSound: String = "coin",
    val followSound: String = "levelup",
    val shareSound: String = "chime",
    val likeMilestoneSound: String = "ding",
    val likeMilestoneStep: Int = 50,
    val customGiftSoundUrl: String = "",
    val customFollowSoundUrl: String = "",
    val customShareSoundUrl: String = "",
    val customLikeSoundUrl: String = "",
    val customGiftRules: List<CustomGiftSoundRule> = emptyList(),
    val maxAlertDuration: Int = 5,
)

data class SubscriptionInfo(
    val isPro: Boolean = false,
    val plan: String = "free",
    val status: String = "gratis",
    val daysRemaining: Int = 0,
    val expiresAt: String? = null,
)

data class LiveEvent(
    val type: String,
    val id: String = "",
    val uniqueId: String = "",
    val nickname: String = "",
    val comment: String = "",
    val profilePictureUrl: String? = null,
    val isModerator: Boolean = false,
    val isSubscriber: Boolean = false,
    val giftId: String = "",
    val giftName: String = "",
    val diamondCount: Int = 0,
    val repeatCount: Int = 1,
    val repeatEnd: Boolean = true,
    val likeCount: Int = 0,
    val totalLikeCount: Int = 0,
    val viewerCount: Int = 0,
    val status: String = "",
    val message: String = "",
    val timestamp: Long = System.currentTimeMillis(),
    val raw: JsonElement? = null,
) {
    val isSimulated: Boolean get() = id.startsWith("sim-")
}

data class ConnectionState(
    val status: ConnectionStatus = ConnectionStatus.DISCONNECTED,
    val message: String = "",
    val username: String = "",
)

data class LiveStats(
    val viewers: Int = 0,
    val likes: Int = 0,
    val giftsCount: Int = 0,
    val diamonds: Int = 0,
)

data class VoiceEffect(
    val id: String,
    val label: String,
    val description: String,
    val pitch: Float,
    val rate: Float,
    val isPro: Boolean,
)

object Catalog {
    val voiceEffects = listOf(
        VoiceEffect("normal", "Normal", "Voz natural y estándar", 1.0f, 1.1f, false),
        VoiceEffect("ardilla", "Ardilla / Helio", "Tono ultra chillón, agudo y súper rápido", 2.0f, 1.6f, true),
        VoiceEffect("monstruo", "Monstruo / Ogro", "Voz ultra grave, ronca y cavernosa", 0.05f, 0.65f, true),
        VoiceEffect("locutor", "Locutor de Carreras", "Ráfaga ultra rápida de comentarista", 1.2f, 1.85f, true),
        VoiceEffect("camara_lenta", "Cámara Lenta", "Voz pesada y ultra pausada", 0.6f, 0.55f, true),
        VoiceEffect("personalizado", "Personalizado", "Usa el tono y velocidad manuales", 1.0f, 1.1f, false),
    )

    val sounds = listOf(
        SoundOption("coin", "Moneda (Coin)", "Chime clásico de recompensa"),
        SoundOption("fanfare", "Fanfarria Victoria", "Ideal para regalos grandes"),
        SoundOption("airhorn", "Airhorn Hype", "Bocina de stream"),
        SoundOption("ding", "Ding Suave", "Notificación limpia"),
        SoundOption("levelup", "Level Up (8-bit)", "Estilo videojuego retro"),
        SoundOption("applause", "Aplausos / Ovación", "Multitud celebrando"),
        SoundOption("chime", "Chime Melódico", "Brillo campana"),
        SoundOption("none", "Silencio", "Sin sonido para este evento"),
        SoundOption("custom", "Audio personalizado", "URL MP3/WAV"),
    )

    val popularGifts = listOf(
        PopularGift("Rose", "Rosa", "🌹", 1),
        PopularGift("TikTok", "Logo TikTok", "🎵", 1),
        PopularGift("Finger Heart", "Mini Corazón", "🫰", 5),
        PopularGift("Doughnut", "Dona", "🍩", 30),
        PopularGift("Cap", "Gorra", "🧢", 99),
        PopularGift("Paper Crane", "Grulla", "🕊️", 99),
        PopularGift("Sunglasses", "Gafas de Sol", "🕶️", 199),
        PopularGift("Love You", "Te Quiero", "💖", 199),
        PopularGift("Corgi", "Corgi", "🐶", 299),
        PopularGift("Money Gun", "Pistola Dinero", "🔫", 500),
        PopularGift("Swan", "Cisne", "🦢", 699),
        PopularGift("Galaxy", "Galaxia", "🌌", 1000),
        PopularGift("Fireworks", "Fuegos Artificiales", "🎆", 1088),
        PopularGift("Diamond", "Diamante", "💎", 1500),
        PopularGift("Crown", "Corona", "👑", 9999),
        PopularGift("Sports Car", "Coche Deportivo", "🏎️", 7000),
        PopularGift("Rocket", "Cohete", "🚀", 20000),
        PopularGift("Whale", "Ballena", "🐳", 21500),
        PopularGift("Castle", "Castillo", "🏰", 20000),
        PopularGift("Leon the Lion", "León", "🦁", 29999),
        PopularGift("TikTok Universe", "Universo", "🪐", 34999),
    )
}

data class SoundOption(val id: String, val name: String, val desc: String)
data class PopularGift(val name: String, val spanish: String, val emoji: String, val coins: Int)
