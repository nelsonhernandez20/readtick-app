package com.readtik.mobile.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val Context.dataStore by preferencesDataStore(name = "readtik_settings")

class SettingsStore(private val context: Context) {
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    private val ttsKey = stringPreferencesKey("tf_tts_settings")
    private val soundKey = stringPreferencesKey("tf_sound_settings")

    val tts: Flow<TtsSettings> = context.dataStore.data.map { prefs ->
        prefs[ttsKey]?.let {
            runCatching { json.decodeFromString<TtsSettings>(it) }.getOrDefault(TtsSettings())
        } ?: TtsSettings()
    }

    val sounds: Flow<SoundSettings> = context.dataStore.data.map { prefs ->
        prefs[soundKey]?.let {
            runCatching { json.decodeFromString<SoundSettings>(it) }.getOrDefault(SoundSettings())
        } ?: SoundSettings()
    }

    suspend fun saveTts(settings: TtsSettings) {
        context.dataStore.edit { it[ttsKey] = json.encodeToString(settings) }
    }

    suspend fun saveSounds(settings: SoundSettings) {
        context.dataStore.edit { it[soundKey] = json.encodeToString(settings) }
    }
}
