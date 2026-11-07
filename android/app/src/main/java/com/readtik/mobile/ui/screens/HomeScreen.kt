package com.readtik.mobile.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.VolumeOff
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.readtik.mobile.AppViewModel
import com.readtik.mobile.UiState
import com.readtik.mobile.data.ConnectionStatus
import com.readtik.mobile.data.LiveEvent
import com.readtik.mobile.ui.components.GhostButton
import com.readtik.mobile.ui.components.LimeButton
import com.readtik.mobile.ui.components.ReadField
import com.readtik.mobile.ui.components.StatusChip
import com.readtik.mobile.ui.theme.BrandAmber
import com.readtik.mobile.ui.theme.BrandBlue
import com.readtik.mobile.ui.theme.BrandBorder
import com.readtik.mobile.ui.theme.BrandDark
import com.readtik.mobile.ui.theme.BrandHover
import com.readtik.mobile.ui.theme.BrandLight
import com.readtik.mobile.ui.theme.BrandLime
import com.readtik.mobile.ui.theme.BrandMuted
import com.readtik.mobile.ui.theme.BrandRose
import com.readtik.mobile.ui.theme.BrandSurface

@Composable
fun HomeScreen(state: UiState, vm: AppViewModel) {
    Box(Modifier.fillMaxSize().background(BrandDark)) {
        Column(Modifier.fillMaxSize()) {
            TopBar(state, vm)
            Column(
                Modifier
                    .weight(1f)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                ConnectCard(state, vm)
                if (!state.subscription.isPro) {
                    ProBanner { vm.togglePro(true) }
                }
                StatsGrid(state)
                EventFeedCard(state, vm, Modifier.weight(1f))
            }
        }
        AlertBanner(state.lastAlert)
        if (state.showSettings) SettingsSheet(state, vm)
        if (state.showSimulator) SimulatorSheet(state, vm)
        if (state.showPro) ProSheet(state, vm)
    }
}

@Composable
private fun TopBar(state: UiState, vm: AppViewModel) {
    Column(
        Modifier
            .fillMaxWidth()
            .background(BrandSurface)
            .border(width = 1.dp, color = BrandBorder),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Read", color = BrandLight, fontWeight = FontWeight.Black, fontSize = 20.sp)
                    Text("Tik", color = BrandLime, fontWeight = FontWeight.Black, fontSize = 20.sp)
                }
                Text("Alertas y TTS", color = BrandMuted, fontSize = 11.sp)
            }
            StatusChip(statusLabel(state.connection.status), statusColor(state.connection.status))
            IconButton(onClick = { vm.toggleSettings(true) }) {
                Icon(Icons.Default.Settings, "Ajustes", tint = BrandLight)
            }
            IconButton(onClick = { vm.signOut() }) {
                Icon(Icons.Default.Logout, "Salir", tint = BrandMuted)
            }
        }
        Row(
            Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(start = 12.dp, end = 12.dp, bottom = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            CompactToggle(state.sounds.enabled, Icons.Default.VolumeUp, Icons.Default.VolumeOff, "Sonido") {
                vm.updateSounds { it.copy(enabled = !it.enabled) }
            }
            CompactToggle(state.tts.enabled, Icons.Default.Mic, Icons.Default.MicOff, "Voz") {
                vm.updateTts { it.copy(enabled = !it.enabled) }
            }
            GhostButton("Simular") { vm.toggleSimulator(true) }
            if (state.subscription.isPro) {
                StatusChip("PRO ${state.subscription.daysRemaining}d", BrandLime)
            } else {
                GhostButton("PRO") { vm.togglePro(true) }
            }
        }
    }
}

@Composable
private fun CompactToggle(on: Boolean, onIcon: ImageVector, offIcon: ImageVector, label: String, onClick: () -> Unit) {
    Row(
        Modifier
            .clip(RoundedCornerShape(12.dp))
            .border(1.dp, if (on) BrandLime.copy(alpha = 0.4f) else BrandRose.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
            .background(if (on) BrandDark else BrandRose.copy(alpha = 0.12f))
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(if (on) onIcon else offIcon, label, tint = if (on) BrandLime else BrandRose, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(6.dp))
        Text(label, color = if (on) BrandLime else BrandRose, fontSize = 12.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun ConnectCard(state: UiState, vm: AppViewModel) {
    var user by remember { mutableStateOf("") }
    val connected = state.connection.status == ConnectionStatus.CONNECTED ||
        state.connection.status == ConnectionStatus.CONNECTING
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .border(1.dp, BrandBorder, RoundedCornerShape(16.dp))
            .background(BrandSurface)
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        ReadField(
            if (connected) state.connection.username else user,
            { user = it },
            Modifier.fillMaxWidth(),
            "Usuario de TikTok (sin @)",
            enabled = !connected,
        )
        if (connected) {
            GhostButton(
                if (state.connection.status == ConnectionStatus.CONNECTING) "Cancelar" else "Desconectar",
                Modifier.fillMaxWidth(),
                BrandRose,
            ) { vm.disconnect() }
        } else {
            LimeButton("Conectar al Live", Modifier.fillMaxWidth()) { vm.connect(user) }
        }
        Text(
            state.connection.message.ifBlank {
                if (connected) "Conectado a @${state.connection.username}"
                else "Ingresa tu usuario y conéctate."
            },
            color = statusColor(state.connection.status),
            fontSize = 12.sp,
        )
        if (connected) {
            Text(
                "La primera vez puede tardar ~1 min (servidor dormido). Deja la notificación y abre TikTok.",
                color = BrandMuted,
                fontSize = 11.sp,
            )
        }
    }
}

@Composable
private fun ProBanner(onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .border(1.dp, BrandLime.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)).background(BrandLime),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Default.Star, null, tint = BrandDark)
        }
        Column(Modifier.weight(1f)) {
            Text("ReadTik PRO", color = BrandLight, fontWeight = FontWeight.Bold, fontSize = 13.sp)
            Text("Canciones por regalo y filtro.", color = BrandMuted, fontSize = 11.sp)
        }
        GhostButton("Activar") { onClick() }
    }
}

@Composable
private fun StatsGrid(state: UiState) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatCard("Espectadores", state.stats.viewers, Icons.Default.Person, Modifier.weight(1f))
            StatCard("Me gusta", state.stats.likes, Icons.Default.Favorite, Modifier.weight(1f))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatCard("Regalos", state.stats.giftsCount, Icons.Default.Star, Modifier.weight(1f))
            StatCard("Diamantes", state.stats.diamonds, Icons.Default.Star, Modifier.weight(1f))
        }
    }
}

@Composable
private fun StatCard(label: String, value: Int, icon: ImageVector, modifier: Modifier) {
    Row(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .border(1.dp, BrandBorder, RoundedCornerShape(12.dp))
            .background(BrandSurface)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            Modifier.size(32.dp).clip(RoundedCornerShape(8.dp)).background(BrandLime.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = BrandLime, modifier = Modifier.size(16.dp))
        }
        Column {
            Text(label, color = BrandMuted, fontSize = 11.sp)
            Text(formatNumber(value), color = BrandLight, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }
    }
}

private fun formatNumber(num: Int): String = when {
    num >= 1_000_000 -> String.format("%.1fM", num / 1_000_000.0)
    num >= 1_000 -> String.format("%.1fK", num / 1_000.0)
    else -> num.toString()
}

@Composable
private fun EventFeedCard(state: UiState, vm: AppViewModel, modifier: Modifier = Modifier) {
    var tab by remember { mutableStateOf("all") }
    var query by remember { mutableStateOf("") }
    val filtered = state.events.filter { ev ->
        val tabOk = when (tab) {
            "chat" -> ev.type == "chat"
            "gift" -> ev.type == "gift"
            "like" -> ev.type == "like"
            "social" -> ev.type == "follow" || ev.type == "share"
            else -> true
        }
        if (!tabOk) return@filter false
        if (query.isBlank()) true
        else listOf(ev.comment, ev.nickname, ev.uniqueId, ev.giftName).any { it.contains(query, true) }
    }
    Column(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .border(1.dp, BrandBorder, RoundedCornerShape(16.dp)),
    ) {
        Column(
            Modifier.background(BrandSurface).padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Row(
                Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                listOf(
                    "all" to "Todo (${state.events.size})",
                    "chat" to "Chat",
                    "gift" to "Regalos",
                    "like" to "Likes",
                    "social" to "Social",
                ).forEach { (id, label) ->
                    val selected = tab == id
                    Text(
                        label,
                        color = if (selected) BrandDark else BrandMuted,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (selected) BrandLime else BrandHover)
                            .clickable { tab = id }
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                    )
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                ReadField(
                    query,
                    { query = it },
                    Modifier.weight(1f),
                    "Buscar...",
                    leading = { Icon(Icons.Default.Search, null, tint = BrandMuted) },
                )
                IconButton(onClick = { vm.clearEvents() }) {
                    Icon(Icons.Default.Close, "Limpiar", tint = BrandMuted)
                }
            }
        }
        if (filtered.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Sin eventos", color = BrandLight, fontWeight = FontWeight.Medium)
                    Text("Conéctate a un live o pulsa Simular.", color = BrandMuted, fontSize = 12.sp)
                }
            }
        } else {
            LazyColumn(
                Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(filtered, key = { it.id }) { ev -> EventRow(ev, vm) }
            }
        }
    }
}

@Composable
private fun EventRow(ev: LiveEvent, vm: AppViewModel) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        if (!ev.profilePictureUrl.isNullOrBlank()) {
            AsyncImage(
                ev.profilePictureUrl,
                null,
                Modifier.size(36.dp).clip(CircleShape),
                contentScale = ContentScale.Crop,
            )
        } else {
            Box(
                Modifier.size(36.dp).clip(CircleShape).background(BrandHover),
                contentAlignment = Alignment.Center,
            ) {
                Text(ev.nickname.take(1).uppercase().ifBlank { "?" }, color = BrandLight, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            }
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(ev.nickname.ifBlank { ev.uniqueId }, color = BrandLight, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
            Text(
                when (ev.type) {
                    "chat" -> ev.comment
                    "gift" -> "envió ${ev.giftName} ×${ev.repeatCount} (${ev.diamondCount} 💎)"
                    "like" -> "+${ev.likeCount} likes"
                    "follow" -> "empezó a seguirte"
                    "share" -> "compartió el directo"
                    else -> ev.type
                },
                color = BrandMuted,
                fontSize = 12.sp,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis,
            )
        }
        if (ev.type == "chat" && ev.comment.isNotBlank()) {
            IconButton(onClick = { vm.replayTts("${ev.nickname} dice: ${ev.comment}") }) {
                Icon(Icons.Default.VolumeUp, null, tint = BrandLime, modifier = Modifier.size(18.dp))
            }
        }
        if (ev.type == "gift") {
            IconButton(onClick = { vm.playSound("coin") }) {
                Icon(Icons.Default.Star, null, tint = BrandLime, modifier = Modifier.size(18.dp))
            }
        }
    }
}

@Composable
private fun AlertBanner(alert: LiveEvent?) {
    val show = alert != null && alert.type in listOf("gift", "follow", "share")
    Box(Modifier.fillMaxWidth().padding(top = 88.dp), contentAlignment = Alignment.TopCenter) {
        AnimatedVisibility(show, enter = fadeIn() + scaleIn(), exit = fadeOut()) {
            if (alert == null) return@AnimatedVisibility
            Row(
                Modifier
                    .padding(horizontal = 20.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .border(2.dp, BrandLime, RoundedCornerShape(16.dp))
                    .background(BrandDark.copy(alpha = 0.96f))
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    when (alert.type) {
                        "gift" -> Icons.Default.Star
                        "follow" -> Icons.Default.PersonAdd
                        else -> Icons.Default.Share
                    },
                    null,
                    tint = BrandLime,
                )
                Spacer(Modifier.width(10.dp))
                Column {
                    Text(alert.nickname, color = BrandLight, fontWeight = FontWeight.Bold)
                    Text(
                        when (alert.type) {
                            "gift" -> "envió ${alert.giftName}"
                            "follow" -> "nuevo seguidor"
                            else -> "compartió el live"
                        },
                        color = BrandLime,
                        fontSize = 12.sp,
                    )
                }
            }
        }
    }
}

private fun statusLabel(status: ConnectionStatus) = when (status) {
    ConnectionStatus.CONNECTED -> "EN VIVO"
    ConnectionStatus.CONNECTING -> "Conectando"
    ConnectionStatus.ERROR -> "Error"
    ConnectionStatus.ENDED -> "Finalizado"
    else -> "Off"
}

private fun statusColor(status: ConnectionStatus) = when (status) {
    ConnectionStatus.CONNECTED -> BrandLime
    ConnectionStatus.CONNECTING -> BrandAmber
    ConnectionStatus.ERROR -> BrandRose
    ConnectionStatus.ENDED -> BrandBlue
    else -> BrandMuted
}
