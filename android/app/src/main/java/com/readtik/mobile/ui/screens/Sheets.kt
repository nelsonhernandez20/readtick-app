package com.readtik.mobile.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.readtik.mobile.AppViewModel
import com.readtik.mobile.UiState
import com.readtik.mobile.data.Catalog
import com.readtik.mobile.data.CustomGiftSoundRule
import com.readtik.mobile.data.LiveEvent
import com.readtik.mobile.ui.components.GhostButton
import com.readtik.mobile.ui.components.LimeButton
import com.readtik.mobile.ui.components.ReadField
import com.readtik.mobile.ui.theme.BrandBorder
import com.readtik.mobile.ui.theme.BrandDark
import com.readtik.mobile.ui.theme.BrandLight
import com.readtik.mobile.ui.theme.BrandLime
import com.readtik.mobile.ui.theme.BrandMuted
import com.readtik.mobile.ui.theme.BrandRose
import com.readtik.mobile.ui.theme.BrandSurface
import kotlinx.coroutines.launch
import java.util.UUID

private val users = listOf(
    Triple("Carlos Gamer", "carlos_pro99", ""),
    Triple("Ana Streamer", "anita_live", ""),
    Triple("Mateo TikToker", "mateo_oficial", ""),
    Triple("Lucía Fans", "lucia_dance", ""),
)
private val comments = listOf(
    "¡Saludos desde México! Excelente directo crack.",
    "¿A qué hora juegas la siguiente partida?",
    "¡Qué buena música pusiste hoy!",
    "Te sigo desde hace un año, sigue así.",
    "¡Hola! Acabo de llegar al directo.",
    "Jajaja qué épica esa jugada hermano.",
)

@Composable
fun SimulatorSheet(state: UiState, vm: AppViewModel) {
    var customText by remember { mutableStateOf("") }
    var customUser by remember { mutableStateOf("EspectadorPro") }
    var giftName by remember { mutableStateOf("Rosa") }
    var giftCount by remember { mutableStateOf("1") }
    var giftDiamonds by remember { mutableStateOf("1") }

    fun randomUser() = users.random()

    SheetScaffold("Simulador de eventos", onClose = { vm.toggleSimulator(false) }) {
        ReadField(customUser, { customUser = it }, Modifier.fillMaxWidth(), "Usuario")
        Spacer(Modifier.height(8.dp))
        ReadField(customText, { customText = it }, Modifier.fillMaxWidth(), "Comentario personalizado")
        Spacer(Modifier.height(8.dp))
        LimeButton("Simular chat", Modifier.fillMaxWidth()) {
            val u = randomUser()
            vm.simulate(
                LiveEvent(
                    type = "chat",
                    id = "sim-chat-${System.currentTimeMillis()}",
                    uniqueId = u.second,
                    nickname = customUser.ifBlank { u.first },
                    comment = customText.ifBlank { comments.random() },
                ),
            )
        }
        Spacer(Modifier.height(10.dp))
        FlowButtons {
            GhostButton("Rosa") { vm.simulate(gift("Rosa", 1)) }
            GhostButton("Corona") { vm.simulate(gift("Corona", 99)) }
            GhostButton("Galaxia") { vm.simulate(gift("Galaxia", 1000)) }
            GhostButton("Seguidor") {
                val u = randomUser()
                vm.simulate(LiveEvent("follow", "sim-follow-${System.currentTimeMillis()}", u.second, u.first))
            }
            GhostButton("Share") {
                val u = randomUser()
                vm.simulate(LiveEvent("share", "sim-share-${System.currentTimeMillis()}", u.second, u.first))
            }
            GhostButton("+50 likes") {
                vm.simulate(LiveEvent("like", "sim-like-${System.currentTimeMillis()}", likeCount = 50, totalLikeCount = state.stats.likes + 50))
            }
        }
        Spacer(Modifier.height(12.dp))
        Text("Regalo personalizado", color = BrandLight, fontWeight = FontWeight.Bold)
        ReadField(giftName, { giftName = it }, Modifier.fillMaxWidth(), "Nombre del regalo")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            ReadField(giftCount, { giftCount = it }, Modifier.weight(1f), "Cantidad")
            ReadField(giftDiamonds, { giftDiamonds = it }, Modifier.weight(1f), "Diamantes")
        }
        LimeButton("Enviar regalo custom", Modifier.fillMaxWidth()) {
            vm.simulate(gift(giftName, giftDiamonds.toIntOrNull() ?: 1, giftCount.toIntOrNull() ?: 1))
        }
    }
}

private fun gift(name: String, diamonds: Int, count: Int = 1) = LiveEvent(
    type = "gift",
    id = "sim-gift-${System.currentTimeMillis()}",
    uniqueId = "sim_user",
    nickname = "Simulado",
    giftName = name,
    diamondCount = diamonds * count,
    repeatCount = count,
    repeatEnd = true,
)

@Composable
fun SettingsSheet(state: UiState, vm: AppViewModel) {
    SheetScaffold("Configuración", onClose = { vm.toggleSettings(false) }) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(
                selected = state.settingsTab == "tts",
                onClick = { vm.setSettingsTab("tts") },
                label = { Text("TTS") },
                colors = chipColors(),
            )
            FilterChip(
                selected = state.settingsTab == "sounds",
                onClick = { vm.setSettingsTab("sounds") },
                label = { Text("Sonidos") },
                colors = chipColors(),
            )
        }
        Spacer(Modifier.height(12.dp))
        if (state.settingsTab == "tts") TtsSettingsPane(state, vm) else SoundSettingsPane(state, vm)
    }
}

@Composable
private fun TtsSettingsPane(state: UiState, vm: AppViewModel) {
    val t = state.tts
    ToggleRow("Activar TTS", t.enabled) { vm.updateTts { it.copy(enabled = t.enabled.not()) } }
    ToggleRow("Leer chat", t.readChat) { vm.updateTts { it.copy(readChat = t.readChat.not()) } }
    ToggleRow("Leer regalos", t.readGifts) { vm.updateTts { it.copy(readGifts = t.readGifts.not()) } }
    ToggleRow("Leer follows", t.readFollows) { vm.updateTts { it.copy(readFollows = t.readFollows.not()) } }
    ToggleRow("Leer shares", t.readShares) { vm.updateTts { it.copy(readShares = t.readShares.not()) } }
    ToggleRow("Ignorar comandos ! /", t.ignoreCommands) { vm.updateTts { it.copy(ignoreCommands = t.ignoreCommands.not()) } }
    ToggleRow("Filtro de palabras (PRO)", t.filterEnabled) { vm.updateTts { it.copy(filterEnabled = t.filterEnabled.not()) } }
    Text("Efecto de voz", color = BrandMuted, fontSize = 12.sp)
    ChipWrap {
        Catalog.voiceEffects.forEach { effect ->
            val locked = effect.isPro && !state.subscription.isPro
            FilterChip(
                selected = t.voiceEffect == effect.id,
                onClick = { if (!locked) vm.applyVoiceEffect(effect.id) else vm.togglePro(true) },
                label = { Text(if (locked) "${effect.label} 🔒" else effect.label) },
                colors = chipColors(),
            )
        }
    }
    LabeledSlider("Velocidad", t.rate, 0.5f, 2f) { v -> vm.updateTts { it.copy(rate = v, voiceEffect = "personalizado") } }
    LabeledSlider("Tono", t.pitch, 0.1f, 2f) { v -> vm.updateTts { it.copy(pitch = v, voiceEffect = "personalizado") } }
    LabeledSlider("Volumen voz", t.volume, 0.1f, 1f) { v -> vm.updateTts { it.copy(volume = v) } }
    ReadField(t.chatTemplate, { v -> vm.updateTts { it.copy(chatTemplate = v) } }, Modifier.fillMaxWidth(), "Plantilla chat")
    ReadField(t.giftTemplate, { v -> vm.updateTts { it.copy(giftTemplate = v) } }, Modifier.fillMaxWidth(), "Plantilla regalos")
    ReadField(t.followTemplate, { v -> vm.updateTts { it.copy(followTemplate = v) } }, Modifier.fillMaxWidth(), "Plantilla follows")
    ReadField(t.shareTemplate, { v -> vm.updateTts { it.copy(shareTemplate = v) } }, Modifier.fillMaxWidth(), "Plantilla shares")
    var phrase by remember { mutableStateOf("") }
    Text("Palabras prohibidas", color = BrandLight, fontWeight = FontWeight.Bold)
    ReadField(phrase, { phrase = it }, Modifier.fillMaxWidth(), "Agregar palabra o frase")
    LimeButton("Agregar") {
        val incoming = phrase.split(Regex("[\\r\\n,;]+")).map { it.trim() }.filter { it.isNotEmpty() }
        vm.updateTts { it.copy(bannedWords = (it.bannedWords + incoming).distinct()) }
        phrase = ""
    }
    t.bannedWords.forEach { word ->
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Text(word, color = BrandMuted, modifier = Modifier.weight(1f), fontSize = 12.sp)
            IconButton(onClick = { vm.updateTts { it.copy(bannedWords = it.bannedWords.filterNot { w -> w == word }) } }) {
                Icon(Icons.Default.Close, null, tint = BrandRose)
            }
        }
    }
    LimeButton("Probar voz") { vm.replayTts("Hola, esto es una prueba de ReadTik.") }
}

@Composable
private fun SoundSettingsPane(state: UiState, vm: AppViewModel) {
    val s = state.sounds
    ToggleRow("Activar sonidos", s.enabled) { vm.updateSounds { it.copy(enabled = s.enabled.not()) } }
    LabeledSlider("Volumen alertas", s.volume, 0f, 1f) { v -> vm.updateSounds { it.copy(volume = v) } }
    Text("Sonido de regalos", color = BrandMuted, fontSize = 12.sp)
    SoundPicker(s.giftSound) { key -> vm.updateSounds { it.copy(giftSound = key) } }
    Text("Follows", color = BrandMuted, fontSize = 12.sp)
    SoundPicker(s.followSound) { key -> vm.updateSounds { it.copy(followSound = key) } }
    Text("Shares", color = BrandMuted, fontSize = 12.sp)
    SoundPicker(s.shareSound) { key -> vm.updateSounds { it.copy(shareSound = key) } }
    Text("Likes (hito)", color = BrandMuted, fontSize = 12.sp)
    SoundPicker(s.likeMilestoneSound) { key -> vm.updateSounds { it.copy(likeMilestoneSound = key) } }
    ReadField(s.likeMilestoneStep.toString(), { v -> vm.updateSounds { it.copy(likeMilestoneStep = v.toIntOrNull() ?: 50) } }, Modifier.fillMaxWidth(), "Cada cuántos likes")
    if (state.subscription.isPro) {
        ReadField(s.customGiftSoundUrl, { v -> vm.updateSounds { it.copy(customGiftSoundUrl = v) } }, Modifier.fillMaxWidth(), "URL audio regalos")
        var gift by remember { mutableStateOf("Rosa") }
        var url by remember { mutableStateOf("") }
        Text("Reglas por regalo", color = BrandLight, fontWeight = FontWeight.Bold)
        ReadField(gift, { gift = it }, Modifier.fillMaxWidth(), "Nombre del regalo")
        ReadField(url, { url = it }, Modifier.fillMaxWidth(), "URL MP3")
        LimeButton("Agregar regla") {
            vm.addGiftRule(
                CustomGiftSoundRule(
                    id = UUID.randomUUID().toString(),
                    giftName = gift,
                    soundKey = if (url.isBlank()) "coin" else "custom",
                    soundUrl = url,
                ),
            )
        }
        s.customGiftRules.forEach { rule ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("${rule.giftName} → ${rule.soundKey}", color = BrandMuted, modifier = Modifier.weight(1f), fontSize = 12.sp)
                IconButton(onClick = { vm.removeGiftRule(rule.id) }) { Icon(Icons.Default.Close, null, tint = BrandRose) }
            }
        }
    } else {
        Text("Las canciones por regalo son PRO.", color = BrandMuted, fontSize = 12.sp)
        GhostButton("Activar PRO") { vm.togglePro(true) }
    }
    LimeButton("Probar moneda") { vm.playSound("coin") }
}

@Composable
fun ProSheet(state: UiState, vm: AppViewModel) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var reference by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var imageUri by remember { mutableStateOf<Uri?>(null) }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { imageUri = it }

    SheetScaffold("Activar ReadTik PRO  $3.00 USD", onClose = { vm.togglePro(false) }) {
        Text("Paga vía Pago Móvil y reporta tu transferencia.", color = BrandMuted, fontSize = 12.sp)
        BankRow(context, "Banco", "0102 - Banco de Venezuela")
        BankRow(context, "Teléfono", "04162731818")
        BankRow(context, "Cédula", "V27920342")
        BankRow(context, "Nombre", "ReadTik Pro Venezuela")
        Spacer(Modifier.height(8.dp))
        ReadField(state.userEmail.orEmpty(), {}, Modifier.fillMaxWidth(), "Correo", enabled = false)
        ReadField(reference, { reference = it }, Modifier.fillMaxWidth(), "Número de referencia")
        GhostButton(if (imageUri == null) "Adjuntar captura" else "Captura lista") { picker.launch("image/*") }
        if (message.isNotBlank()) Text(message, color = BrandLime, fontSize = 12.sp)
        LimeButton("Enviar reporte", Modifier.fillMaxWidth()) {
            scope.launch {
                runCatching {
                    val bytes = imageUri?.let { context.contentResolver.openInputStream(it)?.use { s -> s.readBytes() } }
                    val mime = imageUri?.let { context.contentResolver.getType(it) }
                    vm.submitPayment(reference, bytes, mime)
                    message = "Reporte enviado. Lo activamos al confirmar el pago."
                    reference = ""
                }.onFailure { message = it.message ?: "No se pudo enviar el reporte." }
            }
        }
    }
}

@Composable
private fun BankRow(context: Context, label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(label, color = BrandMuted, fontSize = 11.sp)
            Text(value, color = BrandLight, fontWeight = FontWeight.Bold, fontSize = 13.sp)
        }
        GhostButton("Copiar") {
            val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            cm.setPrimaryClip(ClipData.newPlainText(label, value))
        }
    }
}

@Composable
private fun SheetScaffold(title: String, onClose: () -> Unit, content: @Composable () -> Unit) {
    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Column(
            Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.92f)
                .padding(12.dp)
                .clip(RoundedCornerShape(20.dp))
                .border(1.dp, BrandBorder, RoundedCornerShape(20.dp))
                .background(BrandDark),
        ) {
            Row(
                Modifier.fillMaxWidth().background(BrandSurface).padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(title, color = BrandLight, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                IconButton(onClick = onClose) { Icon(Icons.Default.Close, null, tint = BrandMuted) }
            }
            Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                content()
            }
        }
    }
}

@Composable
private fun ToggleRow(label: String, checked: Boolean, onChange: () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(label, color = BrandLight, modifier = Modifier.weight(1f), fontSize = 14.sp)
        Switch(checked, { onChange() }, colors = SwitchDefaults.colors(checkedThumbColor = BrandDark, checkedTrackColor = BrandLime))
    }
}

@Composable
private fun LabeledSlider(label: String, value: Float, from: Float, to: Float, onChange: (Float) -> Unit) {
    Text("$label: ${"%.2f".format(value)}", color = BrandMuted, fontSize = 12.sp)
    Slider(value, onChange, valueRange = from..to, colors = SliderDefaults.colors(thumbColor = BrandLime, activeTrackColor = BrandLime))
}

@Composable
private fun SoundPicker(selected: String, onSelect: (String) -> Unit) {
    ChipWrap {
        Catalog.sounds.forEach { opt ->
            FilterChip(
                selected = selected == opt.id,
                onClick = { onSelect(opt.id) },
                label = { Text(opt.name) },
                colors = chipColors(),
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ChipWrap(content: @Composable () -> Unit) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        content = { content() },
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun FlowButtons(content: @Composable () -> Unit) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        content = { content() },
    )
}

@Composable
private fun chipColors() = FilterChipDefaults.filterChipColors(
    selectedContainerColor = BrandLime,
    selectedLabelColor = BrandDark,
    containerColor = BrandSurface,
    labelColor = BrandMuted,
)
