package com.readtik.mobile

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import com.readtik.mobile.ui.screens.HomeScreen
import com.readtik.mobile.ui.screens.LoginScreen
import com.readtik.mobile.ui.theme.BrandDark
import com.readtik.mobile.ui.theme.ReadTikTheme

class MainActivity : ComponentActivity() {
    private val permissionLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) {}

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        val vm = (application as ReadTikApp).viewModel
        setContent {
            ReadTikTheme {
                val state by vm.uiState.collectAsState()
                androidx.compose.foundation.layout.Box(
                    Modifier.fillMaxSize().background(BrandDark).safeDrawingPadding(),
                ) {
                    if (state.userEmail.isNullOrBlank()) {
                        LoginScreen(state, vm)
                    } else {
                        HomeScreen(state, vm)
                    }
                }
            }
        }
    }
}
