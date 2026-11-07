package com.readtik.mobile.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val ReadTikColors = darkColorScheme(
    primary = BrandLime,
    onPrimary = BrandDark,
    secondary = BrandLime,
    onSecondary = BrandDark,
    background = BrandDark,
    onBackground = BrandLight,
    surface = BrandDark,
    onSurface = BrandLight,
    surfaceVariant = BrandSurface,
    onSurfaceVariant = BrandMuted,
    outline = BrandBorder,
    error = BrandRose,
    onError = BrandLight,
)

@Composable
fun ReadTikTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = ReadTikColors.copy(scrim = Color.Black.copy(alpha = 0.8f)),
        content = content,
    )
}
