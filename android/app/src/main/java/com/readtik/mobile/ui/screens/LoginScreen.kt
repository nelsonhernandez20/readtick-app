package com.readtik.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.readtik.mobile.AppViewModel
import com.readtik.mobile.UiState
import com.readtik.mobile.ui.components.LimeButton
import com.readtik.mobile.ui.components.ReadField
import com.readtik.mobile.ui.theme.BrandBorder
import com.readtik.mobile.ui.theme.BrandDark
import com.readtik.mobile.ui.theme.BrandLight
import com.readtik.mobile.ui.theme.BrandLime
import com.readtik.mobile.ui.theme.BrandMuted
import com.readtik.mobile.ui.theme.BrandRose
import com.readtik.mobile.ui.theme.BrandSurface

@Composable
fun LoginScreen(state: UiState, vm: AppViewModel) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var showPass by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandDark)
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(BrandLime),
            contentAlignment = Alignment.Center,
        ) {
            Text("RT", color = BrandDark, fontWeight = FontWeight.Black, fontSize = 26.sp)
        }
        Spacer(Modifier.height(16.dp))
        Row {
            Text("Read", color = BrandLight, fontSize = 32.sp, fontWeight = FontWeight.Black)
            Text("Tik", color = BrandLime, fontSize = 32.sp, fontWeight = FontWeight.Black)
        }
        Text("Sound Alerts y TTS para TikTok LIVE", color = BrandMuted, fontSize = 13.sp)
        Spacer(Modifier.height(28.dp))

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .border(1.dp, BrandBorder, RoundedCornerShape(20.dp))
                .background(BrandSurface)
                .padding(20.dp),
        ) {
            Text(if (state.isSignUp) "Crear cuenta" else "Iniciar sesión", color = BrandLight, fontWeight = FontWeight.Black, fontSize = 18.sp)
            Spacer(Modifier.height(14.dp))
            ReadField(email, { email = it }, Modifier.fillMaxWidth(), "Correo electrónico", leading = { Icon(Icons.Default.Mail, null, tint = BrandLime) }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email))
            Spacer(Modifier.height(10.dp))
            ReadField(
                password,
                { password = it },
                Modifier.fillMaxWidth(),
                "Contraseña",
                leading = { Icon(Icons.Default.Lock, null, tint = BrandLime) },
                trailing = {
                    IconButton(onClick = { showPass = !showPass }) {
                        Icon(if (showPass) Icons.Default.VisibilityOff else Icons.Default.Visibility, null, tint = BrandMuted)
                    }
                },
                visualTransformation = if (showPass) VisualTransformation.None else PasswordVisualTransformation(),
            )
            if (state.isSignUp) {
                Spacer(Modifier.height(10.dp))
                ReadField(confirm, { confirm = it }, Modifier.fillMaxWidth(), "Confirmar contraseña", leading = { Icon(Icons.Default.Lock, null, tint = BrandLime) }, visualTransformation = PasswordVisualTransformation())
            }
            if (state.authError.isNotBlank()) {
                Spacer(Modifier.height(10.dp))
                Text(state.authError, color = BrandRose, fontSize = 12.sp)
            }
            if (state.authSuccess.isNotBlank()) {
                Spacer(Modifier.height(10.dp))
                Text(state.authSuccess, color = BrandLime, fontSize = 12.sp)
            }
            Spacer(Modifier.height(16.dp))
            LimeButton(
                text = when {
                    state.authLoading -> "Espera..."
                    state.isSignUp -> "Registrarme"
                    else -> "Entrar"
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !state.authLoading,
            ) {
                if (state.isSignUp) vm.signUp(email, password, confirm) else vm.signIn(email, password)
            }
            TextButton(onClick = { vm.setSignUp(!state.isSignUp) }, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                Text(if (state.isSignUp) "¿Ya tienes cuenta? Inicia sesión" else "¿No tienes cuenta? Regístrate", color = BrandLime, fontSize = 13.sp)
            }
        }
    }
}
