package com.readtik.mobile.data

import com.readtik.mobile.audio.SoundEngine
import com.readtik.mobile.audio.TtsEngine

class EventDispatcher(
    private val tts: TtsEngine,
    private val sounds: SoundEngine,
) {
    var ttsSettings: TtsSettings = TtsSettings()
        set(value) {
            field = value
            tts.settings = value
        }
    var soundSettings: SoundSettings = SoundSettings()
        set(value) {
            field = value
            sounds.enabled = value.enabled
            sounds.masterVolume = value.volume
        }
    var isPro: Boolean = false
    var lastLikeMilestone: Int = 0

    data class DispatchResult(
        val stats: LiveStats? = null,
        val alert: LiveEvent? = null,
        val keepInFeed: Boolean = true,
        val status: ConnectionStatus? = null,
        val statusMessage: String? = null,
        val viewers: Int? = null,
    )

    fun dispatch(event: LiveEvent, current: LiveStats): DispatchResult {
        when (event.type) {
            "status" -> {
                val status = when (event.status) {
                    "connected" -> ConnectionStatus.CONNECTED
                    "connecting" -> ConnectionStatus.CONNECTING
                    "ended" -> ConnectionStatus.ENDED
                    "error" -> ConnectionStatus.ERROR
                    else -> ConnectionStatus.DISCONNECTED
                }
                return DispatchResult(
                    keepInFeed = false,
                    status = status,
                    statusMessage = event.message,
                )
            }
            "roomUser" -> return DispatchResult(keepInFeed = false, viewers = event.viewerCount)
            "chat" -> {
                maybeSpeakChat(event)
                return DispatchResult()
            }
            "gift" -> {
                playGift(event)
                speakGift(event)
                return DispatchResult(
                    stats = current.copy(
                        giftsCount = current.giftsCount + 1,
                        diamonds = current.diamonds + event.diamondCount.coerceAtLeast(1),
                    ),
                    alert = event,
                )
            }
            "like" -> {
                val total = if (event.totalLikeCount > 0) event.totalLikeCount else current.likes + event.likeCount
                playLike(event, total)
                return DispatchResult(stats = current.copy(likes = total))
            }
            "follow" -> {
                playNamed(soundSettings.followSound, soundSettings.customFollowSoundUrl, "levelup")
                if (ttsSettings.enabled || event.isSimulated) {
                    if (ttsSettings.readFollows || event.isSimulated) {
                        tts.speak(
                            (ttsSettings.followTemplate.ifBlank { "¡Gracias {user} por seguirme!" })
                                .replace("{user}", event.nickname),
                            bypassDisabled = event.isSimulated,
                        )
                    }
                }
                return DispatchResult(alert = event)
            }
            "share" -> {
                playNamed(soundSettings.shareSound, soundSettings.customShareSoundUrl, "chime")
                if ((ttsSettings.enabled || event.isSimulated) && (ttsSettings.readShares || event.isSimulated)) {
                    tts.speak(
                        (ttsSettings.shareTemplate.ifBlank { "¡{user} compartió el directo!" })
                            .replace("{user}", event.nickname),
                        bypassDisabled = event.isSimulated,
                    )
                }
                return DispatchResult(alert = event)
            }
            else -> return DispatchResult(keepInFeed = false)
        }
    }

    private fun maybeSpeakChat(event: LiveEvent) {
        if (!(ttsSettings.enabled || event.isSimulated) || !(ttsSettings.readChat || event.isSimulated)) return
        val comment = event.comment.trim()
        if (comment.isEmpty()) return
        if (ttsSettings.ignoreCommands && (comment.startsWith("!") || comment.startsWith("/")) && !event.isSimulated) return
        val filterOn = (isPro || event.isSimulated) && ttsSettings.filterEnabled
        if (filterOn && (
                TextFilters.containsBannedWord(comment, ttsSettings.bannedWords) ||
                    TextFilters.containsBannedWord(event.nickname, ttsSettings.bannedWords)
                )
        ) return
        var formatted = (ttsSettings.chatTemplate.ifBlank { "{user} dice: {comment}" })
            .replace("{user}", event.nickname)
            .replace("{comment}", comment)
        if (formatted.length > ttsSettings.maxCommentLength) {
            formatted = formatted.take(ttsSettings.maxCommentLength) + "..."
        }
        tts.speak(formatted, bypassDisabled = event.isSimulated)
    }

    private fun playGift(event: LiveEvent) {
        if (!(soundSettings.enabled || event.isSimulated)) return
        val customAllowed = isPro || event.isSimulated
        val matched = if (customAllowed) soundSettings.customGiftRules.find { matchesGift(it, event) } else null
        if (matched != null) {
            sounds.enqueue(
                matched.soundKey,
                matched.volume,
                matched.soundUrl,
                matched.interruptPrevious,
                matched.maxDuration,
            )
            return
        }
        val soundToPlay = when {
            soundSettings.giftSound == "custom" && customAllowed -> "custom"
            !customAllowed -> "coin"
            event.diamondCount >= 100 -> "fanfare"
            soundSettings.giftSound != "none" && soundSettings.giftSound != "custom" -> soundSettings.giftSound
            else -> "coin"
        }
        sounds.enqueue(
            soundToPlay,
            soundSettings.volume,
            if (customAllowed) soundSettings.customGiftSoundUrl else "",
            false,
            soundSettings.maxAlertDuration,
        )
    }

    private fun speakGift(event: LiveEvent) {
        if (!(ttsSettings.enabled || event.isSimulated)) return
        if (!(ttsSettings.readGifts || event.isSimulated)) return
        if (event.diamondCount < ttsSettings.minGiftDiamonds && !event.isSimulated) return
        val matched = soundSettings.customGiftRules.find { matchesGift(it, event) }
        val template = matched?.customTTS?.takeIf { it.isNotBlank() }
            ?: ttsSettings.giftTemplate.ifBlank { "¡{user} envió {gift}!" }
        val formatted = template
            .replace("{user}", event.nickname)
            .replace("{gift}", event.giftName)
            .replace("{count}", event.repeatCount.toString())
        tts.speak(formatted, forcePriority = event.diamondCount >= 100, bypassDisabled = event.isSimulated)
    }

    private fun playLike(event: LiveEvent, total: Int) {
        if (!(soundSettings.enabled || event.isSimulated)) return
        val key = if (soundSettings.likeMilestoneSound != "none") soundSettings.likeMilestoneSound else "ding"
        val step = soundSettings.likeMilestoneStep.coerceAtLeast(1)
        if (event.isSimulated || total - lastLikeMilestone >= step) {
            lastLikeMilestone = total
            sounds.enqueue(
                key,
                soundSettings.volume * 0.7f,
                if (isPro) soundSettings.customLikeSoundUrl else null,
                false,
                soundSettings.maxAlertDuration,
            )
        }
    }

    private fun playNamed(configured: String, customUrl: String, fallback: String) {
        if (!(soundSettings.enabled)) return
        val key = if (configured != "none") configured else fallback
        sounds.enqueue(
            key,
            soundSettings.volume,
            if (isPro) customUrl else null,
            false,
            soundSettings.maxAlertDuration,
        )
    }

    private fun matchesGift(rule: CustomGiftSoundRule, gift: LiveEvent): Boolean {
        fun norm(s: String) = TextFilters.normalize(s).trim()
        val rName = norm(rule.giftName)
        val gName = norm(gift.giftName)
        val popular = Catalog.popularGifts.any { p ->
            val en = norm(p.name)
            val es = norm(p.spanish)
            val r = rName == en || rName == es || rName.contains(en) || rName.contains(es)
            val g = gName == en || gName == es || gName.contains(en) || gName.contains(es)
            r && g
        }
        val idMatch = rule.giftId.isNotBlank() && gift.giftId.isNotBlank() && rule.giftId == gift.giftId
        val nameMatch = rName.isNotBlank() && gName.isNotBlank() && (rName == gName || gName.contains(rName) || rName.contains(gName))
        if (!(idMatch || popular || nameMatch)) return false
        if (gift.repeatCount < rule.minCount) return false
        if (rule.waitForComboEnd && !gift.repeatEnd) return false
        return true
    }
}
