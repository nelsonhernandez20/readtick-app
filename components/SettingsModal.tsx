'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  Mic,
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  Check,
  Lock,
  Crown,
  Zap,
  Clock,
  Skull,
  ShieldAlert,
  Plus,
  Trash2,
  Upload,
  Music,
  FileAudio,
  Database,
  Cloud,
  Loader2,
  Copy,
  FileMusic,
  Square,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { TTSSettings, SoundSettings, VoiceEffectPreset, CustomGiftSoundRule } from '@/types/tiktok';
import { AVAILABLE_SOUNDS, POPULAR_TIKTOK_GIFTS } from '@/lib/soundConfig';
import { audioEngine } from '@/lib/audioEngine';
import { ttsEngine, DEFAULT_TTS_SETTINGS, VOICE_EFFECT_PRESETS } from '@/lib/ttsEngine';
import { fetchBannedWordsLibrary, saveBannedWordsLibrary } from '@/lib/bannedWordsLibrary';
import {
  fetchUserSounds,
  uploadSoundToSupabase,
  deleteSoundFromSupabase,
  StoredSound,
} from '@/lib/soundLibrary';
import AlertModal, { AlertModalConfig } from '@/components/AlertModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ttsSettings: TTSSettings;
  onUpdateTTS: (settings: Partial<TTSSettings>) => void;
  soundSettings: SoundSettings;
  onUpdateSounds: (settings: Partial<SoundSettings>) => void;
  isPro?: boolean;
  userEmail?: string | null;
  onOpenProModal?: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  ttsSettings,
  onUpdateTTS,
  soundSettings,
  onUpdateSounds,
  isPro = false,
  userEmail = null,
  onOpenProModal,
}: SettingsModalProps) {
  const handleOpenPro = () => {
    if (onOpenProModal) {
      onOpenProModal();
    } else {
      window.open('/pagos', '_blank');
    }
  };

  const [activeTab, setActiveTab] = useState<'tts' | 'sounds'>('tts');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [testStatus, setTestStatus] = useState<string>('');
  
  // Estados para el Filtro de Palabras y Frases
  const [newPhraseInput, setNewPhraseInput] = useState<string>('');
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
  const [bulkText, setBulkText] = useState<string>('');

  // Biblioteca de palabras prohibidas almacenada en Supabase
  const [supabaseLibrary, setSupabaseLibrary] = useState<string[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState<boolean>(false);

  // Cargar biblioteca de palabras de Supabase cuando se abre el modal
  useEffect(() => {
    if (isOpen && userEmail) {
      setIsLoadingLibrary(true);
      fetchBannedWordsLibrary(userEmail)
        .then((words) => {
          setSupabaseLibrary(words);
        })
        .finally(() => {
          setIsLoadingLibrary(false);
        });
    }
  }, [isOpen, userEmail]);

  // Sincronizar el texto masivo solo al abrir el modal para no interferir con la escritura
  useEffect(() => {
    if (isOpen) {
      setBulkText((ttsSettings.bannedWords || []).join('\n'));
    }
  }, [isOpen]);

  const handleAddPhrases = (rawText: string) => {
    if (!rawText.trim()) return;
    // Separa por comas, saltos de línea (\r\n o \n), o punto y coma
    const incoming = rawText
      .split(/[\r\n,;]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    if (incoming.length === 0) return;

    const current = ttsSettings.bannedWords || [];
    const currentLower = new Set(current.map((c) => c.toLowerCase()));
    const toAdd = incoming.filter((w) => !currentLower.has(w.toLowerCase()));

    if (toAdd.length > 0) {
      const updated = [...current, ...toAdd];
      onUpdateTTS({ bannedWords: updated });
      setBulkText(updated.join('\n'));

      // Guardar también en la biblioteca de Supabase
      const mergedLib = Array.from(new Set([...supabaseLibrary, ...toAdd]));
      setSupabaseLibrary(mergedLib);
      if (userEmail) {
        saveBannedWordsLibrary(userEmail, mergedLib);
      }
    }
    setNewPhraseInput('');
  };

  const handleRemovePhrase = (indexToRemove: number) => {
    const updated = (ttsSettings.bannedWords || []).filter((_, i) => i !== indexToRemove);
    onUpdateTTS({ bannedWords: updated });
    setBulkText(updated.join('\n'));
  };

  const handleClearAllPhrases = () => {
    onUpdateTTS({ bannedWords: [] });
    setBulkText('');
    setNewPhraseInput('');
  };

  const handleApplyBulkText = () => {
    const parsed = bulkText
      .split(/[\r\n,;]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    const unique: string[] = [];
    const seen = new Set<string>();
    for (const w of parsed) {
      const lower = w.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        unique.push(w);
      }
    }
    onUpdateTTS({ bannedWords: unique });
    setIsBulkMode(false);

    // Guardar en Supabase
    if (userEmail && unique.length > 0) {
      const mergedLib = Array.from(new Set([...supabaseLibrary, ...unique]));
      setSupabaseLibrary(mergedLib);
      saveBannedWordsLibrary(userEmail, mergedLib);
    }
  };

  const handleToggleLibraryWord = (word: string) => {
    const current = ttsSettings.bannedWords || [];
    const isAlreadyActive = current.some((w) => w.toLowerCase() === word.toLowerCase());

    if (isAlreadyActive) {
      const updated = current.filter((w) => w.toLowerCase() !== word.toLowerCase());
      onUpdateTTS({ bannedWords: updated });
      setBulkText(updated.join('\n'));
    } else {
      const updated = [...current, word];
      onUpdateTTS({ bannedWords: updated });
      setBulkText(updated.join('\n'));
    }
  };

  const handleDeleteFromLibrary = async (wordToDelete: string) => {
    const updated = supabaseLibrary.filter(
      (w) => w.toLowerCase() !== wordToDelete.toLowerCase()
    );
    setSupabaseLibrary(updated);
    // Quitar también de las palabras activas del directo
    const updatedActive = (ttsSettings.bannedWords || []).filter(
      (w) => w.toLowerCase() !== wordToDelete.toLowerCase()
    );
    onUpdateTTS({ bannedWords: updatedActive });
    setBulkText(updatedActive.join('\n'));
    if (userEmail) {
      await saveBannedWordsLibrary(userEmail, updated);
    }
  };

  const handleActivateAllFromLibrary = () => {
    const merged = Array.from(new Set([...(ttsSettings.bannedWords || []), ...supabaseLibrary]));
    onUpdateTTS({ bannedWords: merged });
    setBulkText(merged.join('\n'));
  };

  const handleDeactivateAllFromLibrary = () => {
    onUpdateTTS({ bannedWords: [] });
    setBulkText('');
  };

  const handleSaveActiveToLibrary = async () => {
    if (!userEmail) return;
    const current = ttsSettings.bannedWords || [];
    if (current.length === 0) return;
    const merged = Array.from(new Set([...supabaseLibrary, ...current]));
    setSupabaseLibrary(merged);
    await saveBannedWordsLibrary(userEmail, merged);
  };

  const handleCloseModal = () => {
    if (newPhraseInput.trim()) {
      handleAddPhrases(newPhraseInput);
    }
    if (isBulkMode && bulkText.trim()) {
      handleApplyBulkText();
    }
    onClose();
  };

  // Estados para Mi Almacenamiento de Audios
  const [userSounds, setUserSounds] = useState<StoredSound[]>([]);
  const [isSoundsLibraryOpen, setIsSoundsLibraryOpen] = useState<boolean>(false);
  const [isLoadingSounds, setIsLoadingSounds] = useState<boolean>(false);
  const [isUploadingSound, setIsUploadingSound] = useState<boolean>(false);
  const [soundUploadStatus, setSoundUploadStatus] = useState<string>('');
  const [alertModalConfig, setAlertModalConfig] = useState<AlertModalConfig | null>(null);
  const [showSoundSqlHelp, setShowSoundSqlHelp] = useState<boolean>(false);
  const [copiedSoundSql, setCopiedSoundSql] = useState<boolean>(false);
  const [playingSoundUrl, setPlayingSoundUrl] = useState<string | null>(null);

  // Estados para asignación dinámica de regalos y eventos
  const [selectedGiftToAdd, setSelectedGiftToAdd] = useState<string>('');
  const [isCustomGiftInputOpen, setIsCustomGiftInputOpen] = useState<boolean>(false);
  const [customGiftNameInput, setCustomGiftNameInput] = useState<string>('');
  const [activeEvents, setActiveEvents] = useState<string[]>(() => {
    const list: string[] = [];
    if (soundSettings.customFollowSoundUrl || (soundSettings.followSound && soundSettings.followSound !== 'none' && soundSettings.followSound !== 'levelup')) {
      list.push('follow');
    }
    if (soundSettings.customShareSoundUrl || (soundSettings.shareSound && soundSettings.shareSound !== 'none' && soundSettings.shareSound !== 'chime')) {
      list.push('share');
    }
    if (soundSettings.customLikeSoundUrl || (soundSettings.likeMilestoneSound && soundSettings.likeMilestoneSound !== 'none' && soundSettings.likeMilestoneSound !== 'ding')) {
      list.push('like');
    }
    return list;
  });

  // Sincronizar eventos activos al abrir modal si hay URLs personalizadas
  useEffect(() => {
    if (isOpen) {
      setActiveEvents((prev) => {
        const set = new Set(prev);
        if (soundSettings.customFollowSoundUrl || (soundSettings.followSound && soundSettings.followSound !== 'none' && soundSettings.followSound !== 'levelup')) {
          set.add('follow');
        }
        if (soundSettings.customShareSoundUrl || (soundSettings.shareSound && soundSettings.shareSound !== 'none' && soundSettings.shareSound !== 'chime')) {
          set.add('share');
        }
        if (soundSettings.customLikeSoundUrl || (soundSettings.likeMilestoneSound && soundSettings.likeMilestoneSound !== 'none' && soundSettings.likeMilestoneSound !== 'ding')) {
          set.add('like');
        }
        return Array.from(set);
      });
    }
  }, [isOpen, soundSettings.customFollowSoundUrl, soundSettings.customShareSoundUrl, soundSettings.customLikeSoundUrl, soundSettings.followSound, soundSettings.shareSound, soundSettings.likeMilestoneSound]);

  // Cargar audios guardados al abrir el modal
  useEffect(() => {
    if (isOpen && userEmail) {
      setIsLoadingSounds(true);
      fetchUserSounds(userEmail)
        .then((sounds) => setUserSounds(sounds))
        .finally(() => setIsLoadingSounds(false));
    }
  }, [isOpen, userEmail]);

  const handleAddGiftOrEvent = (val: string) => {
    if (!val) return;

    if (val === 'event:follow') {
      if (!activeEvents.includes('follow')) {
        setActiveEvents((prev) => [...prev, 'follow']);
        if (soundSettings.followSound === 'none') {
          onUpdateSounds({ followSound: 'levelup' });
        }
      }
      return;
    }

    if (val === 'event:share') {
      if (!activeEvents.includes('share')) {
        setActiveEvents((prev) => [...prev, 'share']);
        if (soundSettings.shareSound === 'none') {
          onUpdateSounds({ shareSound: 'chime' });
        }
      }
      return;
    }

    if (val === 'event:like') {
      if (!activeEvents.includes('like')) {
        setActiveEvents((prev) => [...prev, 'like']);
        if (soundSettings.likeMilestoneSound === 'none') {
          onUpdateSounds({ likeMilestoneSound: 'ding' });
        }
      }
      return;
    }

    if (val.startsWith('gift:')) {
      const rawGiftName = val.replace('gift:', '');
      const matchedPreset = POPULAR_TIKTOK_GIFTS.find(
        (g) =>
          g.name.toLowerCase() === rawGiftName.toLowerCase() ||
          g.spanish.toLowerCase() === rawGiftName.toLowerCase()
      );
      const giftName = matchedPreset?.spanish || rawGiftName;

      const currentRules = soundSettings.customGiftRules || [];
      const exists = currentRules.some(
        (r) =>
          r.giftName.toLowerCase() === giftName.toLowerCase() ||
          (matchedPreset && r.giftName.toLowerCase() === matchedPreset.name.toLowerCase())
      );
      if (exists) return;

      const defaultSoundKey = userSounds.length > 0 ? 'custom' : 'coin';
      const defaultSoundUrl = userSounds.length > 0 ? userSounds[0].audio_url : '';
      const defaultSoundName = userSounds.length > 0 ? userSounds[0].nombre : 'Moneda (Coin)';

      const newRule: CustomGiftSoundRule = {
        id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        giftName,
        soundKey: defaultSoundKey,
        soundUrl: defaultSoundUrl,
        soundName: defaultSoundName,
      };

      onUpdateSounds({ customGiftRules: [...currentRules, newRule] });
    }
  };

  const handleAddCustomGiftRule = () => {
    const name = customGiftNameInput.trim();
    if (!name) return;
    const currentRules = soundSettings.customGiftRules || [];
    const exists = currentRules.some((r) => r.giftName.toLowerCase() === name.toLowerCase());
    if (!exists) {
      const defaultSoundKey = userSounds.length > 0 ? 'custom' : 'coin';
      const defaultSoundUrl = userSounds.length > 0 ? userSounds[0].audio_url : '';
      const defaultSoundName = userSounds.length > 0 ? userSounds[0].nombre : 'Moneda (Coin)';

      const newRule: CustomGiftSoundRule = {
        id: `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        giftName: name,
        soundKey: defaultSoundKey,
        soundUrl: defaultSoundUrl,
        soundName: defaultSoundName,
      };
      onUpdateSounds({ customGiftRules: [...currentRules, newRule] });
    }
    setCustomGiftNameInput('');
    setIsCustomGiftInputOpen(false);
  };

  const handleUploadDirectToLibrary = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isPro) {
      setAlertModalConfig({
        isOpen: true,
        type: 'warning',
        title: 'Función Exclusiva PRO',
        message: 'Subir canciones y audios personalizados a la nube es una función exclusiva del Plan PRO.\n\n¡Desbloquea PRO para subir tus canciones y asignarlas a los regalos!',
        confirmLabel: 'Desbloquear con PRO',
        onConfirm: handleOpenPro,
      });
      e.target.value = '';
      return;
    }

    if (!userEmail) {
      setAlertModalConfig({
        isOpen: true,
        type: 'info',
        title: 'Inicio de Sesión Requerido',
        message: 'Debes iniciar sesión con tu cuenta para subir y almacenar audios en tu biblioteca en la nube.',
        confirmLabel: 'Entendido',
      });
      e.target.value = '';
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setAlertModalConfig({
        isOpen: true,
        type: 'warning',
        title: 'Límite de Tamaño Superado',
        message: `El archivo seleccionado pesa ${sizeMb} MB y supera el límite permitido de 1 MB.\n\nPor favor sube un audio más corto o liviano (máximo 1 MB en formato MP3 o WAV).`,
        confirmLabel: 'Entendido',
      });
      e.target.value = '';
      return;
    }

    setIsUploadingSound(true);
    setIsSoundsLibraryOpen(true);
    setSoundUploadStatus('Subiendo archivo a tu almacenamiento...');
    try {
      const res = await uploadSoundToSupabase(userEmail, file);
      if (res.success && res.sound) {
        setUserSounds((prev) => [res.sound!, ...prev.filter((s) => s.id !== res.sound!.id)]);
        // Vincular automáticamente como audio personalizado de regalos
        onUpdateSounds({
          giftSound: 'custom',
          customGiftSoundUrl: res.sound.audio_url,
        });
        setSoundUploadStatus(`¡Audio "${res.sound.nombre}" subido y vinculado a Regalos!`);
        setTimeout(() => setSoundUploadStatus(''), 4000);
      } else {
        setAlertModalConfig({
          isOpen: true,
          type: 'error',
          title: 'Error al Subir Audio',
          message: res.error || 'No se pudo subir el archivo.',
          confirmLabel: 'Entendido',
        });
        setSoundUploadStatus('');
      }
    } catch (err: any) {
      setAlertModalConfig({
        isOpen: true,
        type: 'error',
        title: 'Error al Subir Audio',
        message: err.message || 'Error al subir audio.',
        confirmLabel: 'Entendido',
      });
      setSoundUploadStatus('');
    } finally {
      setIsUploadingSound(false);
      e.target.value = '';
    }
  };

  const handleDeleteSoundFromLibrary = (sound: StoredSound) => {
    setAlertModalConfig({
      isOpen: true,
      type: 'danger',
      isConfirm: true,
      title: '¿Eliminar audio de la nube?',
      message: `¿Estás seguro de que deseas eliminar permanentemente "${sound.nombre}" de tu almacenamiento?\n\nEsta acción no se puede deshacer y desvinculará este sonido de las alertas configuradas.`,
      confirmLabel: 'Eliminar Audio',
      cancelLabel: 'Cancelar',
      onConfirm: async () => {
        const ok = await deleteSoundFromSupabase(userEmail!, sound);
        if (ok) {
          setUserSounds((prev) => prev.filter((s) => s.id !== sound.id));
          if (soundSettings.customGiftSoundUrl === sound.audio_url) {
            onUpdateSounds({ customGiftSoundUrl: '', giftSound: 'coin' });
          }
          if (soundSettings.customFollowSoundUrl === sound.audio_url) {
            onUpdateSounds({ customFollowSoundUrl: '', followSound: 'levelup' });
          }
          if (soundSettings.customShareSoundUrl === sound.audio_url) {
            onUpdateSounds({ customShareSoundUrl: '', shareSound: 'chime' });
          }
          if (soundSettings.customLikeSoundUrl === sound.audio_url) {
            onUpdateSounds({ customLikeSoundUrl: '', likeMilestoneSound: 'ding' });
          }
          if (soundSettings.customGiftRules && soundSettings.customGiftRules.length > 0) {
            const updatedRules = soundSettings.customGiftRules.map((r) =>
              r.soundUrl === sound.audio_url
                ? { ...r, soundKey: 'coin', soundUrl: '', soundName: 'Moneda (Coin)' }
                : r
            );
            onUpdateSounds({ customGiftRules: updatedRules });
          }
        }
      },
    });
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const load = () => {
        const v = window.speechSynthesis.getVoices();
        setVoices(v);
      };
      load();
      window.speechSynthesis.onvoiceschanged = load;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const testTTSVoice = () => {
    setTestStatus('Hablando...');
    let phrase = 'Hola, esta es una prueba de voz de ReadTik.';
    if (ttsSettings.voiceEffect === 'ardilla') {
      phrase = '¡Hola! ¡Mírame, tengo voz de ardilla con helio!';
    } else if (ttsSettings.voiceEffect === 'monstruo') {
      phrase = '¡Grrr!... ¡Soy el monstruo del directo!... ¡Tiemblen mortales!';
    } else if (ttsSettings.voiceEffect === 'locutor') {
      phrase = '¡Y arranca la carrera en vivo damas y caballeros a toda máquina!';
    } else if (ttsSettings.voiceEffect === 'camara_lenta') {
      phrase = 'Hoooola a tooodos... bieeenveeeniiidoooos al directo...';
    }
    ttsEngine.speak(phrase, true, true);
    setTimeout(() => setTestStatus(''), 2800);
  };

  const testSound = (soundKey: string, customUrl?: string) => {
    audioEngine.playSound(
      soundKey,
      Math.max(0.6, soundSettings.volume),
      customUrl || soundSettings.customGiftSoundUrl,
      true,
      5
    );
  };

  const renderSoundPicker = (
    label: string,
    soundKey: string,
    customUrl: string | undefined,
    onSelect: (soundKey: string, customUrl?: string) => void,
    themeColor: string = '#B9FF66',
    onRemove?: () => void,
    isGiftSound: boolean = false
  ) => {
    const isCustom = soundKey === 'custom';
    const effectiveSoundKey = isGiftSound && !isPro ? 'coin' : soundKey;
    const selectValue =
      isCustom && customUrl && (!isGiftSound || isPro)
        ? `supabase:${customUrl}`
        : effectiveSoundKey;

    return (
      <div className="bg-[#111218] p-3 rounded-xl border border-[#292A36] space-y-2.5 animate-fadeIn">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="truncate">{label}</span>
            {isCustom && (
              <span className="px-1.5 py-0.5 rounded-md bg-[#B9FF66]/15 text-[#B9FF66] text-[10px] font-medium border border-[#B9FF66]/30 shrink-0">
                Personalizado
              </span>
            )}
            {isGiftSound && !isPro && (
              <button
                type="button"
                onClick={handleOpenPro}
                className="text-[11px] text-[#B9FF66] hover:underline font-semibold flex items-center gap-1 transition shrink-0"
              >
                <Lock className="w-3 h-3" />
                Desbloquear con PRO
              </button>
            )}
          </label>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                testSound(
                  effectiveSoundKey,
                  isGiftSound && !isPro ? undefined : customUrl
                )
              }
              className="flex items-center gap-1 text-[11px] hover:underline shrink-0 font-medium"
              style={{ color: themeColor || '#B9FF66' }}
            >
              <Play className="w-3 h-3" /> Probar
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                title="Quitar este sonido asignado"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <select
          value={selectValue}
          onChange={(e) => {
            const val = e.target.value;

            // Bloqueo para regalos si no es usuario PRO (solo se permite 'coin')
            if (isGiftSound && !isPro && val !== 'coin') {
              setAlertModalConfig({
                isOpen: true,
                type: 'warning',
                title: 'Función Exclusiva PRO',
                message:
                  'Cambiar el sonido de los regalos es una función del Plan PRO.\n\nEn la versión gratuita, las alertas de regalos utilizan el sonido clásico de Moneda (Coin).\n\n¡Desbloquea el Plan PRO para elegir cualquier efecto o subir tus propias canciones!',
                confirmLabel: 'Desbloquear con PRO',
                onConfirm: handleOpenPro,
              });
              return;
            }

            if (val.startsWith('supabase:') || val.startsWith('pro_locked:')) {
              if (!isPro) {
                setAlertModalConfig({
                  isOpen: true,
                  type: 'warning',
                  title: 'Función Exclusiva PRO',
                  message:
                    'Personalizar el sonido de las alertas es una función del Plan PRO.\n\n¡Desbloquea PRO para que tus audios suenen con los regalos!',
                  confirmLabel: 'Desbloquear con PRO',
                  onConfirm: handleOpenPro,
                });
                return;
              }
              const url = val.replace('supabase:', '');
              onSelect('custom', url);
            } else {
              onSelect(val, '');
            }
          }}
          className="w-full bg-[#191A23] border border-[#292A36] rounded-lg px-2.5 py-2 text-xs text-[#F3F3F3] outline-none focus:border-[#B9FF66]"
        >
          {isGiftSound && !isPro ? (
            <>
              <optgroup label="🔔 Sonido Gratuito">
                <option value="coin">
                  🪙 Moneda (Coin) - Chime clásico de recompensa
                </option>
              </optgroup>
              <optgroup label="🔒 Desbloquear con Plan PRO">
                {AVAILABLE_SOUNDS.filter((s) => s.id !== 'custom' && s.id !== 'coin').map((s) => (
                  <option key={s.id} value={`pro_locked:${s.id}`}>
                    {s.name} 🔒 (PRO)
                  </option>
                ))}
                {userSounds.length > 0 && (
                  <option value="pro_locked:custom">
                    ☁️ Mis Canciones y Audios Subidos 🔒 (PRO)
                  </option>
                )}
              </optgroup>
            </>
          ) : (
            <>
              {userSounds.length > 0 ? (
                <optgroup label={isPro ? "☁️ Mis Audios Guardados" : "🔒 Mis Audios Guardados (Solo PRO)"}>
                  {userSounds.map((s) => (
                    <option key={s.id} value={`supabase:${s.audio_url}`}>
                      🎵 {s.nombre} {!isPro ? '🔒 (PRO)' : ''}
                    </option>
                  ))}
                  {isCustom && customUrl && !userSounds.some((s) => s.audio_url === customUrl) && (
                    <option value={`supabase:${customUrl}`}>🎵 Audio Guardado {!isPro ? '🔒 (PRO)' : ''}</option>
                  )}
                </optgroup>
              ) : (
                <optgroup label="☁️ Mis Audios Guardados">
                  <option disabled value="">
                    {isPro
                      ? '(Sin audios subidos aún - usa "Subir Audio" arriba)'
                      : '🔒 Sube y usa audios personalizados con el Plan PRO'}
                  </option>
                </optgroup>
              )}
              <optgroup label="🔔 Efectos Predeterminados">
                {AVAILABLE_SOUNDS.filter((s) => s.id !== 'custom').map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} - {s.desc}
                  </option>
                ))}
              </optgroup>
            </>
          )}
        </select>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#191A23] border border-[#292A36] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#292A36] flex items-center justify-between bg-[#14151D]">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#B9FF66]" />
            <h2 className="text-base font-bold text-[#F3F3F3]">Configuración ReadTik</h2>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#F3F3F3] hover:bg-[#252631] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#292A36] bg-[#111218]">
          <button
            onClick={() => setActiveTab('tts')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-2 text-xs font-bold transition border-b-2 ${
              activeTab === 'tts'
                ? 'border-[#B9FF66] text-[#B9FF66] bg-[#191A23]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-4 h-4 shrink-0" />
            <span>Voz TTS</span>
            <span className="hidden sm:inline">(Text-to-Speech)</span>
          </button>
          <button
            onClick={() => setActiveTab('sounds')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 px-2 text-xs font-bold transition border-b-2 ${
              activeTab === 'sounds'
                ? 'border-[#B9FF66] text-[#B9FF66] bg-[#191A23]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-4 h-4 shrink-0" />
            <span>Sonidos</span>
            <span className="hidden sm:inline">y Regalos</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-sm">
          {activeTab === 'tts' && (
            <div className="space-y-4">
              {/* Master TTS Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#111218] border border-[#292A36]">
                <div>
                  <div className="font-semibold text-[#F3F3F3]">Activar TTS General</div>
                  <div className="text-xs text-slate-400">Lee eventos y mensajes en vivo</div>
                </div>
                <input
                  type="checkbox"
                  checked={ttsSettings.enabled}
                  onChange={(e) => onUpdateTTS({ enabled: e.target.checked })}
                  className="w-5 h-5 accent-[#B9FF66] cursor-pointer"
                />
              </div>

              {/* Voice Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Voz del sintetizador
                </label>
                <select
                  value={ttsSettings.voiceName}
                  onChange={(e) => onUpdateTTS({ voiceName: e.target.value })}
                  className="w-full bg-[#111218] border border-[#292A36] rounded-xl px-3 py-2.5 text-xs text-[#F3F3F3] outline-none focus:border-[#B9FF66]"
                >
                  <option value="">Predeterminada del sistema (Preferir Español)</option>
                  {voices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang}) {v.default ? '★' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Voice Effects Presets (PRO Feature) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F3F3F3] uppercase tracking-wider">
                      Efectos de Voz Divertidos
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#B9FF66] text-[#191A23] text-[10px] font-black uppercase tracking-tight flex items-center gap-1 shadow-sm">
                      <Sparkles className="w-2.5 h-2.5" />
                      PRO
                    </span>
                  </div>
                  {!isPro && (
                    <button
                      type="button"
                      onClick={handleOpenPro}
                      className="text-[11px] text-[#B9FF66] hover:underline font-semibold flex items-center gap-1 transition"
                    >
                      <Lock className="w-3 h-3" />
                      Desbloquear con PRO
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(VOICE_EFFECT_PRESETS) as Array<keyof typeof VOICE_EFFECT_PRESETS>).map((key) => {
                    const preset = VOICE_EFFECT_PRESETS[key];
                    const isSelected = (ttsSettings.voiceEffect || 'normal') === key;
                    const isLocked = preset.isPro && !isPro;

                    const getPresetIcon = () => {
                      switch (key) {
                        case 'ardilla':
                          return <Sparkles className="w-3.5 h-3.5 text-[#B9FF66]" />;
                        case 'monstruo':
                          return <Skull className="w-3.5 h-3.5 text-rose-400" />;
                        case 'locutor':
                          return <Zap className="w-3.5 h-3.5 text-[#B9FF66]" />;
                        case 'camara_lenta':
                          return <Clock className="w-3.5 h-3.5 text-purple-400" />;
                        default:
                          return <Mic className="w-3.5 h-3.5 text-slate-300" />;
                      }
                    };

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          if (isLocked) {
                            handleOpenPro();
                            return;
                          }
                          onUpdateTTS({
                            voiceEffect: key,
                            pitch: preset.pitch,
                            rate: preset.rate,
                          });
                        }}
                        className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#B9FF66]/15 border-[#B9FF66] text-white shadow-md shadow-[#B9FF66]/10'
                            : isLocked
                            ? 'bg-[#111218]/60 border-[#292A36] text-slate-400 hover:border-[#B9FF66]/40 hover:bg-[#14151D]'
                            : 'bg-[#111218] border-[#292A36] text-slate-200 hover:border-slate-500 hover:bg-[#191A23]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {getPresetIcon()}
                            <span className="text-xs font-bold truncate">{preset.label}</span>
                          </div>
                          {isLocked ? (
                            <span className="p-1 rounded-md bg-[#B9FF66]/15 text-[#B9FF66]" title="Función exclusiva del Plan PRO">
                              <Lock className="w-3 h-3" />
                            </span>
                          ) : isSelected ? (
                            <span className="p-0.5 rounded-full bg-[#B9FF66] text-[#191A23]">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">
                          {preset.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sliders: Rate, Pitch, Volume */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Rate */}
                <div className="bg-[#111218] p-3 rounded-xl border border-[#292A36]">
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Velocidad</span>
                    <span className="font-bold text-[#B9FF66]">{ttsSettings.rate.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.5"
                    step="0.05"
                    value={ttsSettings.rate}
                    onChange={(e) => onUpdateTTS({ rate: parseFloat(e.target.value), voiceEffect: 'personalizado' })}
                    className="w-full accent-[#B9FF66]"
                  />
                </div>

                {/* Pitch */}
                <div className="bg-[#111218] p-3 rounded-xl border border-[#292A36]">
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Tono (Pitch)</span>
                    <span className="font-bold text-[#B9FF66]">{ttsSettings.pitch.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="2.0"
                    step="0.05"
                    value={ttsSettings.pitch}
                    onChange={(e) => onUpdateTTS({ pitch: parseFloat(e.target.value), voiceEffect: 'personalizado' })}
                    className="w-full accent-[#B9FF66]"
                  />
                </div>

                {/* Volume */}
                <div className="bg-[#111218] p-3 rounded-xl border border-[#292A36]">
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Volumen</span>
                    <span className="font-bold text-[#B9FF66]">{Math.round(ttsSettings.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.05"
                    value={ttsSettings.volume}
                    onChange={(e) => onUpdateTTS({ volume: parseFloat(e.target.value) })}
                    className="w-full accent-[#B9FF66]"
                  />
                </div>
              </div>

              {/* Event Toggles */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  ¿Qué debe leer la voz?
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#111218] border border-[#292A36] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ttsSettings.readChat}
                      onChange={(e) => onUpdateTTS({ readChat: e.target.checked })}
                      className="accent-[#B9FF66]"
                    />
                    <span>Comentarios de Chat</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#111218] border border-[#292A36] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ttsSettings.readGifts}
                      onChange={(e) => onUpdateTTS({ readGifts: e.target.checked })}
                      className="accent-[#B9FF66]"
                    />
                    <span>Regalos recibidos</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#111218] border border-[#292A36] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ttsSettings.readFollows}
                      onChange={(e) => onUpdateTTS({ readFollows: e.target.checked })}
                      className="accent-[#B9FF66]"
                    />
                    <span>Nuevos Seguidores</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#111218] border border-[#292A36] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ttsSettings.readShares}
                      onChange={(e) => onUpdateTTS({ readShares: e.target.checked })}
                      className="accent-[#B9FF66]"
                    />
                    <span>Compartidos</span>
                  </label>
                </div>
              </div>

              {/* Gift Filter & Rules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-[#111218] p-3 rounded-xl border border-[#292A36]">
                  <label className="block text-slate-300 font-medium mb-1">
                    Mínimo de diamantes para leer regalo
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={ttsSettings.minGiftDiamonds}
                    onChange={(e) => onUpdateTTS({ minGiftDiamonds: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#191A23] border border-[#292A36] rounded-lg px-2.5 py-1.5 text-[#F3F3F3] outline-none focus:border-[#B9FF66]"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    (Evita saturación de regalos de 1 moneda)
                  </span>
                </div>

                <div className="bg-[#111218] p-3 rounded-xl border border-[#292A36] flex flex-col justify-between">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-300">
                      <input
                        type="checkbox"
                        checked={ttsSettings.ignoreCommands}
                        onChange={(e) => onUpdateTTS({ ignoreCommands: e.target.checked })}
                        className="accent-[#B9FF66]"
                      />
                      <span>Ignorar comandos (!help, etc)</span>
                    </label>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      No lee mensajes que comiencen con ! o /
                    </span>
                  </div>
                </div>
              </div>

              {/* Template customization */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Plantilla de chat (Variables: &#123;user&#125;, &#123;comment&#125;)
                </label>
                <input
                  type="text"
                  value={ttsSettings.chatTemplate}
                  onChange={(e) => onUpdateTTS({ chatTemplate: e.target.value })}
                  placeholder="{user} dice: {comment}"
                  className="w-full bg-[#111218] border border-[#292A36] rounded-xl px-3 py-2 text-xs text-[#F3F3F3] outline-none focus:border-[#B9FF66]"
                />
              </div>

              {/* Filtro de Palabras Prohibidas (Opción 1: Omitir mensaje completo) */}
              <div className="p-3.5 rounded-xl bg-[#111218] border border-[#292A36] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-[#F3F3F3] flex items-center gap-2">
                        <span>Filtro de Palabras y Frases Prohibidas</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#B9FF66] text-[#191A23] text-[10px] font-black uppercase tracking-tight flex items-center gap-1 shadow-sm">
                          <Sparkles className="w-2.5 h-2.5" />
                          PRO
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Si un comentario contiene alguna palabra o frase de la lista, se descarta por completo y no sonará.
                      </div>
                    </div>
                  </div>
                  {!isPro ? (
                    <button
                      type="button"
                      onClick={handleOpenPro}
                      className="text-[11px] text-[#B9FF66] hover:underline font-semibold flex items-center gap-1 transition shrink-0"
                    >
                      <Lock className="w-3 h-3" />
                      Desbloquear con PRO
                    </button>
                  ) : (
                    <input
                      type="checkbox"
                      checked={ttsSettings.filterEnabled ?? true}
                      onChange={(e) => onUpdateTTS({ filterEnabled: e.target.checked })}
                      className="w-4 h-4 accent-[#B9FF66] cursor-pointer mt-0.5"
                    />
                  )}
                </div>

                {!isPro ? (
                  <div className="p-4 rounded-xl bg-[#14151D] border border-[#B9FF66]/20 text-center space-y-2 mt-2">
                    <div className="w-8 h-8 mx-auto rounded-full bg-[#B9FF66]/10 border border-[#B9FF66]/30 flex items-center justify-center text-[#B9FF66]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-[#F3F3F3]">Función exclusiva del Plan PRO</div>
                    <div className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      El filtro silencia automáticamente mensajes que contengan palabras o frases no deseadas en tu directo.
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenPro}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#B9FF66] text-[#191A23] text-xs font-black hover:bg-[#a6f44d] shadow-lg shadow-[#B9FF66]/20 transition mt-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Desbloquear con PRO
                    </button>
                  </div>
                ) : (
                  ttsSettings.filterEnabled !== false && (
                  <div className="space-y-3 pt-1 border-t border-[#292A36]/60">
                    {/* Input para agregar frases */}
                    {!isBulkMode ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newPhraseInput}
                            onChange={(e) => setNewPhraseInput(e.target.value)}
                            onBlur={() => {
                              if (newPhraseInput.trim()) {
                                handleAddPhrases(newPhraseInput);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddPhrases(newPhraseInput);
                              }
                            }}
                            placeholder="Escribe una palabra o frase (ej: callate la boca) y pulsa Enter..."
                            className="flex-1 bg-[#191A23] border border-[#292A36] focus:border-[#B9FF66] rounded-xl px-3 py-2 text-xs text-[#F3F3F3] placeholder-slate-500 outline-none transition"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddPhrases(newPhraseInput)}
                            disabled={!newPhraseInput.trim()}
                            className="px-3.5 py-2 rounded-xl bg-[#B9FF66] hover:bg-[#a6f44d] active:scale-95 text-[#191A23] text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Agregar
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Tip: Puedes pegar varias frases separadas por comas aquí.</span>
                          <button
                            type="button"
                            onClick={() => {
                              setBulkText((ttsSettings.bannedWords || []).join('\n'));
                              setIsBulkMode(true);
                            }}
                            className="text-[#B9FF66] hover:underline cursor-pointer"
                          >
                            Pegar lista por renglones
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Modo masivo / pegado por renglones o comas */
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-medium text-slate-300">
                            Pega o escribe tu lista (una frase por renglón o con comas):
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsBulkMode(false)}
                            className="text-xs text-slate-400 hover:text-white cursor-pointer"
                          >
                            Volver a vista normal
                          </button>
                        </div>
                        <textarea
                          rows={4}
                          value={bulkText}
                          onChange={(e) => setBulkText(e.target.value)}
                          placeholder={"callate la boca\neres un tonto\nvete de aqui\npalabra fea"}
                          className="w-full bg-[#191A23] border border-[#292A36] focus:border-[#B9FF66] rounded-xl p-2.5 text-xs text-[#F3F3F3] placeholder-slate-500 outline-none transition resize-none font-mono"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setIsBulkMode(false)}
                            className="px-3 py-1.5 rounded-lg bg-[#14151D] hover:bg-[#191A23] text-slate-300 border border-[#292A36] text-xs transition"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleApplyBulkText}
                            className="px-3 py-1.5 rounded-lg bg-[#B9FF66] hover:bg-[#a6f44d] text-[#191A23] text-xs font-bold transition shadow-sm"
                          >
                            Guardar lista
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Biblioteca Guardada */}
                    <div className="p-3 rounded-xl bg-[#14151D] border border-[#292A36] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                          <Database className="w-4 h-4 text-[#B9FF66]" />
                          <span>Mi Biblioteca Guardada ({supabaseLibrary.length})</span>
                          {isLoadingLibrary && (
                            <span className="text-[10px] text-slate-400 font-normal animate-pulse">Cargando...</span>
                          )}
                          {supabaseLibrary.length > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-medium border border-rose-500/30">
                              {supabaseLibrary.filter((word) => (ttsSettings.bannedWords || []).some((w) => w.toLowerCase() === word.toLowerCase())).length} activas
                            </span>
                          )}
                        </div>

                        {supabaseLibrary.length > 0 && (
                          <div className="flex items-center gap-2">
                            {supabaseLibrary.some((word) => (ttsSettings.bannedWords || []).some((w) => w.toLowerCase() === word.toLowerCase())) && (
                              <button
                                type="button"
                                onClick={handleDeactivateAllFromLibrary}
                                className="text-[11px] text-slate-400 hover:text-rose-400 hover:underline flex items-center gap-1 transition"
                                title="Desactivar todas las palabras en este directo"
                              >
                                Desactivar todas
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleActivateAllFromLibrary}
                              className="text-[11px] text-[#B9FF66] hover:underline flex items-center gap-1 font-medium transition"
                              title="Activar todas las palabras guardadas para este directo"
                            >
                              <Check className="w-3 h-3" />
                              Activar todas
                            </button>
                          </div>
                        )}
                      </div>

                      {!userEmail ? (
                        <div className="text-[11px] text-slate-400 p-2.5 rounded-lg bg-[#191A23] border border-[#292A36] flex items-center justify-between">
                          <span>Inicia sesión con tu cuenta para guardar y reutilizar tus palabras en la nube.</span>
                          <a href="/login" className="text-[#B9FF66] font-semibold hover:underline shrink-0 ml-2">
                            Iniciar Sesión
                          </a>
                        </div>
                      ) : supabaseLibrary.length === 0 ? (
                        <div className="text-[11px] text-slate-400 p-3 rounded-lg bg-[#191A23]/70 border border-dashed border-[#292A36] text-center">
                          Aún no tienes palabras guardadas. Escribe una arriba y pulsa <strong>&quot;+ Agregar&quot;</strong> para guardarla aquí.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="text-[10px] text-slate-400 flex items-center justify-between">
                            <span>Haz clic en cualquier palabra para activarla o apagarla (las rojas se silenciarán):</span>
                            {(ttsSettings.bannedWords || []).length > 0 && (
                              <button
                                type="button"
                                onClick={handleSaveActiveToLibrary}
                                className="text-[10px] text-[#B9FF66] hover:underline"
                                title="Guarda las palabras que agregaste localmente en tu biblioteca"
                              >
                                Sincronizar activas
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-1 bg-[#191A23]/40 rounded-lg border border-[#292A36]/50">
                            {supabaseLibrary.map((word) => {
                              const isActive = (ttsSettings.bannedWords || []).some(
                                (w) => w.toLowerCase() === word.toLowerCase()
                              );
                              return (
                                <div
                                  key={word}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition select-none ${
                                    isActive
                                      ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40 shadow-sm'
                                      : 'bg-[#191A23] text-slate-400 border border-[#292A36] hover:text-white hover:border-slate-500'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleToggleLibraryWord(word)}
                                    className="flex items-center gap-1 hover:opacity-80 transition"
                                    title={isActive ? 'Palabra activa en el directo. Clic para desactivar' : 'Palabra inactiva. Clic para activar'}
                                  >
                                    {isActive ? (
                                      <Check className="w-3 h-3 text-rose-400" />
                                    ) : (
                                      <Plus className="w-3 h-3 text-slate-400" />
                                    )}
                                    <span>{word}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteFromLibrary(word)}
                                    className="text-slate-500 hover:text-rose-400 p-0.5 ml-0.5 transition"
                                    title="Eliminar permanentemente de la biblioteca"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-500 leading-relaxed pt-1">
                      💡 El filtro detecta automáticamente tildes, números leet (ej. <code className="text-slate-400">t0nt0</code>) y letras separadas por puntos o espacios (ej. <code className="text-slate-400">t.o.n.t.o</code> o <code className="text-slate-400">c.a.l.l.a.t.e</code>).
                    </div>
                  </div>
                ))}
              </div>

              {/* Test Voice Button */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={testTTSVoice}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#B9FF66] text-[#191A23] font-black text-xs hover:bg-[#a6f44d] active:scale-95 transition shadow-md shadow-[#B9FF66]/20"
                >
                  <Play className="w-3.5 h-3.5 fill-[#191A23]" />
                  {testStatus || 'Probar Voz de Prueba'}
                </button>

                <button
                  onClick={() => onUpdateTTS(DEFAULT_TTS_SETTINGS)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restablecer
                </button>
              </div>
            </div>
          )}

          {activeTab === 'sounds' && (
            <div className="space-y-4">
              {/* Master Sounds Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#111218] border border-[#292A36]">
                <div>
                  <div className="font-semibold text-white">Activar Alertas de Audio</div>
                  <div className="text-xs text-slate-400">Reproduce efectos de sonido en regalos y eventos</div>
                </div>
                <input
                  type="checkbox"
                  checked={soundSettings.enabled}
                  onChange={(e) => onUpdateSounds({ enabled: e.target.checked })}
                  className="w-5 h-5 accent-[#B9FF66] cursor-pointer"
                />
              </div>

              {/* Volume Slider */}
              <div className="bg-[#111218] p-3 rounded-xl border border-[#292A36]">
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Volumen de Sonidos</span>
                  <span className="font-bold text-[#B9FF66]">
                    {Math.round(soundSettings.volume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.05"
                  value={soundSettings.volume}
                  onChange={(e) => onUpdateSounds({ volume: parseFloat(e.target.value) })}
                  className="w-full accent-[#B9FF66]"
                />
              </div>

              {/* Sound Selectors */}
              <div className="space-y-3">
                {/* 🎁 Sonido para Regalos (General) con selector directo de Supabase */}
                {renderSoundPicker(
                  '🎁 Sonido para Regalos (General)',
                  soundSettings.giftSound,
                  soundSettings.customGiftSoundUrl,
                  (key, url) => onUpdateSounds({ giftSound: key, customGiftSoundUrl: url }),
                  '#B9FF66',
                  undefined,
                  true
                )}

                {/* ☁️ Almacenamiento y Biblioteca de Audios (Acordeón) */}
                <div className="bg-[#111218] rounded-xl border border-[#292A36] overflow-hidden transition-all">
                  {/* Encabezado del Acordeón interactivo */}
                  <div
                    onClick={() => setIsSoundsLibraryOpen(!isSoundsLibraryOpen)}
                    className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 cursor-pointer select-none hover:bg-[#14151D]/70 transition"
                  >
                    <div className="flex items-center justify-between sm:justify-start gap-2.5 min-w-0 w-full sm:w-auto">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-[#B9FF66]/10 text-[#B9FF66] shrink-0">
                          <Cloud className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-[#F3F3F3] whitespace-nowrap">Mi Almacenamiento</span>
                            <span className="px-1.5 py-0.2 rounded-full bg-[#B9FF66]/15 text-[#B9FF66] text-[10px] font-mono border border-[#B9FF66]/30">
                              {userSounds.length}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-[#B9FF66] text-[#191A23] text-[9px] font-black uppercase tracking-tight flex items-center gap-1 shadow-sm">
                              <Sparkles className="w-2.5 h-2.5" />
                              PRO
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 hidden sm:block truncate">
                            Guarda tus canciones (MP3, WAV, máx. 1MB) en la nube para usarlas con tus regalos.
                          </div>
                        </div>
                      </div>

                      {/* Chevron en móvil en la fila superior */}
                      <div className="sm:hidden p-1 text-slate-400 shrink-0">
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isSoundsLibraryOpen ? 'rotate-180 text-[#B9FF66]' : ''
                          }`}
                        />
                      </div>
                    </div>

                    {/* Botón de acción */}
                    <div className="flex items-center justify-end sm:justify-start gap-2 shrink-0 w-full sm:w-auto">
                      {!isPro ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPro();
                          }}
                          className="w-full sm:w-auto text-center text-[11px] text-[#B9FF66] hover:bg-[#B9FF66]/20 font-semibold flex items-center justify-center gap-1 transition px-2.5 py-1.5 rounded-lg bg-[#B9FF66]/10 border border-[#B9FF66]/20"
                        >
                          <Lock className="w-3 h-3" />
                          Desbloquear con PRO
                        </button>
                      ) : (
                        <label
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsSoundsLibraryOpen(true);
                          }}
                          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#B9FF66] hover:bg-[#a6f44d] text-[#191A23] text-xs font-bold cursor-pointer transition shadow-sm"
                        >
                          {isUploadingSound ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          <span>{isUploadingSound ? 'Subiendo...' : 'Subir Audio'}</span>
                          <input
                            type="file"
                            accept="audio/*"
                            disabled={isUploadingSound}
                            onChange={handleUploadDirectToLibrary}
                            className="hidden"
                          />
                        </label>
                      )}

                      {/* Chevron en desktop */}
                      <div className="hidden sm:block p-1.5 rounded-lg text-slate-400 hover:text-white transition">
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isSoundsLibraryOpen ? 'rotate-180 text-[#B9FF66]' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Cuerpo desplegable del Acordeón */}
                  {isSoundsLibraryOpen && (
                    <div className="p-3.5 pt-0 space-y-3 border-t border-[#292A36]/50 animate-fadeIn">
                      {!isPro ? (
                        <div className="p-4 rounded-xl bg-[#14151D] border border-[#B9FF66]/20 text-center space-y-2 mt-3">
                          <div className="w-8 h-8 mx-auto rounded-full bg-[#B9FF66]/10 border border-[#B9FF66]/30 flex items-center justify-center text-[#B9FF66]">
                            <Lock className="w-4 h-4" />
                          </div>
                          <div className="text-xs font-bold text-[#F3F3F3]">Función exclusiva del Plan PRO</div>
                          <div className="text-[11px] text-slate-400 max-w-sm mx-auto">
                            Almacena tus canciones y audios personalizados en la nube para vincularlos a los regalos de TikTok.
                          </div>
                          <button
                            type="button"
                            onClick={handleOpenPro}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#B9FF66] text-[#191A23] text-xs font-black hover:bg-[#a6f44d] shadow-lg shadow-[#B9FF66]/20 transition mt-1"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Desbloquear con PRO
                          </button>
                        </div>
                      ) : (
                        <>
                      {soundUploadStatus && (
                        <div className="p-2 rounded-lg bg-[#B9FF66]/15 border border-[#B9FF66]/30 text-xs text-[#B9FF66] flex items-center gap-2 mt-3">
                          <Cloud className="w-4 h-4 text-[#B9FF66] shrink-0" />
                          <span>{soundUploadStatus}</span>
                        </div>
                      )}

                      {!userEmail ? (
                        <div className="text-[11px] text-slate-400 p-2.5 rounded-lg bg-[#14151D] border border-[#292A36] flex items-center justify-between mt-3">
                          <span>Inicia sesión con tu cuenta para subir y almacenar tus canciones en la nube.</span>
                          <a href="/login" className="text-[#B9FF66] font-semibold hover:underline shrink-0 ml-2">
                            Iniciar Sesión
                          </a>
                        </div>
                      ) : isLoadingSounds ? (
                        <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2 mt-3">
                          <Loader2 className="w-4 h-4 animate-spin text-[#B9FF66]" />
                          <span>Cargando audios guardados...</span>
                        </div>
                      ) : userSounds.length === 0 ? (
                        <div className="p-3 rounded-xl bg-[#14151D]/40 border border-dashed border-[#292A36] text-center text-xs text-slate-500 space-y-1.5 mt-3">
                          <div>Aún no has subido canciones o audios a tu almacenamiento.</div>
                          <div className="text-[10px] text-slate-400">
                            Pulsa en <strong>&quot;Subir Audio&quot;</strong> para cargar tus canciones MP3 o WAV favoritas a la nube.
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 mt-3">
                          {userSounds.map((snd) => {
                            const isUsedInGiftSound =
                              soundSettings.giftSound === 'custom' &&
                              soundSettings.customGiftSoundUrl === snd.audio_url;

                            return (
                              <div
                                key={snd.id}
                                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-2.5 rounded-xl border transition text-xs gap-2.5 ${
                                  isUsedInGiftSound
                                    ? 'bg-[#B9FF66]/10 border-[#B9FF66]/40 shadow-sm'
                                    : 'bg-[#14151D] border-[#292A36] hover:border-[#B9FF66]/30'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="p-2 rounded-lg bg-[#B9FF66]/10 text-[#B9FF66] shrink-0">
                                    <FileAudio className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-white truncate max-w-xs">{snd.nombre}</div>
                                    <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                                      <span>{snd.file_size ? `${(snd.file_size / (1024 * 1024)).toFixed(1)} MB` : 'Audio'}</span>
                                      <span>•</span>
                                      <span className="text-[#B9FF66]">Guardado en la nube</span>
                                      {isUsedInGiftSound && (
                                        <>
                                          <span>•</span>
                                          <span className="text-[#B9FF66] font-bold">✓ Activo en Regalos</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (playingSoundUrl === snd.audio_url) {
                                        audioEngine.stopAll();
                                        setPlayingSoundUrl(null);
                                      } else {
                                        setPlayingSoundUrl(snd.audio_url);
                                        audioEngine.playSound('custom', 0.85, snd.audio_url, true, 5).finally(() => {
                                          setPlayingSoundUrl((curr) => (curr === snd.audio_url ? null : curr));
                                        });
                                      }
                                    }}
                                    className={`p-1.5 rounded-lg transition ${
                                      playingSoundUrl === snd.audio_url
                                        ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                                        : 'bg-[#111218] hover:bg-[#191A23] text-[#B9FF66]'
                                    }`}
                                    title={playingSoundUrl === snd.audio_url ? 'Detener reproducción' : 'Escuchar audio (hasta 5s)'}
                                  >
                                    {playingSoundUrl === snd.audio_url ? (
                                      <Square className="w-3.5 h-3.5 fill-rose-400" />
                                    ) : (
                                      <Play className="w-3.5 h-3.5 fill-[#B9FF66]" />
                                    )}
                                  </button>

                                  {isUsedInGiftSound ? (
                                    <span className="px-2.5 py-1 rounded-lg bg-[#B9FF66]/20 border border-[#B9FF66]/40 text-[#B9FF66] font-bold text-[10px] flex items-center gap-1">
                                      <Check className="w-3 h-3 text-[#B9FF66]" />
                                      <span>En Regalos</span>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onUpdateSounds({ giftSound: 'custom', customGiftSoundUrl: snd.audio_url });
                                        setSoundUploadStatus(`¡Audio "${snd.nombre}" vinculado a Regalos!`);
                                        setTimeout(() => setSoundUploadStatus(''), 3000);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-[#B9FF66]/15 hover:bg-[#B9FF66]/25 text-[#B9FF66] font-medium text-[11px] flex items-center gap-1 transition"
                                      title="Usar como sonido general para todos los regalos"
                                    >
                                      <Sparkles className="w-3 h-3" />
                                      <span>Usar en Regalos</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSoundFromLibrary(snd)}
                                    className="p-1.5 rounded-lg bg-[#111218] hover:bg-[#191A23] text-slate-400 hover:text-rose-400 transition"
                                    title="Eliminar permanentemente"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Ayuda SQL Supabase desplegable */}
                      <div className="pt-2 border-t border-[#292A36]/50">
                        <button
                          type="button"
                          onClick={() => setShowSoundSqlHelp(!showSoundSqlHelp)}
                          className="text-[11px] text-slate-500 hover:text-[#B9FF66] flex items-center gap-1 transition"
                        >
                          <Database className="w-3 h-3" />
                          <span>{showSoundSqlHelp ? 'Ocultar script SQL de Supabase' : '¿Primera vez? Ver script SQL para Supabase Storage'}</span>
                        </button>

                        {showSoundSqlHelp && (
                          <div className="mt-2 p-2.5 rounded-xl bg-[#111218] border border-[#292A36] space-y-2 text-[11px] animate-fadeIn">
                            <div className="flex items-center justify-between text-slate-300">
                              <span className="font-semibold text-[#B9FF66]">Script SQL para crear el Bucket y Tabla de Sonidos:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const sql = `-- 1. Crear el bucket 'sonidos' si no existe
insert into storage.buckets (id, name, public)
values ('sonidos', 'sonidos', true)
on conflict (id) do update set public = true;

-- 2. Políticas de Storage para el bucket 'sonidos'
create policy "Lectura publica de sonidos"
  on storage.objects for select
  using (bucket_id = 'sonidos');

create policy "Subida de sonidos"
  on storage.objects for insert
  with check (bucket_id = 'sonidos');

create policy "Eliminacion de sonidos"
  on storage.objects for delete
  using (bucket_id = 'sonidos');

-- 3. Crear tabla para la biblioteca de sonidos del streamer
create table if not exists public.biblioteca_sonidos (
  id uuid default gen_random_uuid() primary key,
  user_email text not null,
  nombre text not null,
  audio_url text not null,
  file_size integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Habilitar seguridad RLS
alter table public.biblioteca_sonidos enable row level security;

create policy "Acceso biblioteca sonidos"
  on public.biblioteca_sonidos
  for all
  using (true)
  with check (true);`;
                                  navigator.clipboard.writeText(sql);
                                  setCopiedSoundSql(true);
                                  setTimeout(() => setCopiedSoundSql(false), 2500);
                                }}
                                className="px-2 py-0.5 rounded bg-[#B9FF66] hover:bg-[#a6f44d] text-[#191A23] font-bold flex items-center gap-1 transition"
                              >
                                <Copy className="w-3 h-3" />
                                {copiedSoundSql ? '¡Copiado!' : 'Copiar SQL'}
                              </button>
                            </div>
                            <p className="text-slate-400 text-[10px]">
                              Pega este script en el <strong>SQL Editor</strong> de tu proyecto en Supabase para crear el bucket <code>sonidos</code> y la tabla correspondiente.
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 🎯 Selector para Asignar Sonido a Regalo o Evento */}
            <div className="bg-[#111218] p-3 rounded-xl border border-[#292A36] space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 flex-wrap">
                  <Sparkles className="w-4 h-4 text-[#B9FF66] shrink-0" />
                  <span>Asignar Sonido a Regalo o Evento</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#B9FF66] text-[#191A23] text-[9px] font-black uppercase tracking-tight flex items-center gap-1 shadow-sm shrink-0">
                    <Sparkles className="w-2.5 h-2.5" />
                    PRO
                  </span>
                </label>
                {!isPro ? (
                  <button
                    type="button"
                    onClick={handleOpenPro}
                    className="text-[11px] text-[#B9FF66] hover:underline font-semibold flex items-center gap-1 transition self-start sm:self-auto"
                  >
                    <Lock className="w-3 h-3" />
                    Desbloquear con PRO
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500 hidden sm:inline">
                    Elige para abrir su selector de sonido
                  </span>
                )}
              </div>

              <select
                value={selectedGiftToAdd}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  if (!isPro) {
                    setAlertModalConfig({
                      isOpen: true,
                      type: 'warning',
                      title: 'Función Exclusiva PRO',
                      message:
                        'Asignar sonidos a regalos o eventos (Nuevo Seguidor, Hito de Likes, Compartir Directo) es una función exclusiva del Plan PRO.\n\n¡Desbloquea el Plan PRO para personalizar todos tus eventos y regalos!',
                      confirmLabel: 'Desbloquear con PRO',
                      onConfirm: handleOpenPro,
                    });
                    setSelectedGiftToAdd('');
                    return;
                  }
                  if (val === 'custom_gift_input') {
                    setIsCustomGiftInputOpen(true);
                    setSelectedGiftToAdd('');
                    return;
                  }
                  handleAddGiftOrEvent(val);
                  setSelectedGiftToAdd('');
                }}
                className="w-full bg-[#191A23] border border-[#292A36] rounded-lg px-2.5 py-2 text-xs text-[#F3F3F3] outline-none focus:border-[#B9FF66]"
              >
                <option value="">➕ Selecciona un regalo o evento para asignarle un sonido...</option>

                <optgroup label="⚡ Eventos de Interacción">
                  <option value="event:follow" disabled={isPro && activeEvents.includes('follow')}>
                    ⭐ Nuevo Seguidor {!isPro ? '🔒 (PRO)' : ''} {isPro && activeEvents.includes('follow') ? '(✓ Ya asignado)' : ''}
                  </option>
                  <option value="event:share" disabled={isPro && activeEvents.includes('share')}>
                    🚀 Compartir Directo {!isPro ? '🔒 (PRO)' : ''} {isPro && activeEvents.includes('share') ? '(✓ Ya asignado)' : ''}
                  </option>
                  <option value="event:like" disabled={isPro && activeEvents.includes('like')}>
                    ❤️ Hito de Likes {!isPro ? '🔒 (PRO)' : ''} {isPro && activeEvents.includes('like') ? '(✓ Ya asignado)' : ''}
                  </option>
                </optgroup>

                <optgroup label="🎁 Regalos de TikTok">
                  {POPULAR_TIKTOK_GIFTS.map((g) => {
                    const isAlreadyAdded =
                      isPro &&
                      (soundSettings.customGiftRules || []).some(
                        (r) =>
                          r.giftName.toLowerCase() === g.name.toLowerCase() ||
                          r.giftName.toLowerCase() === g.spanish.toLowerCase()
                      );
                    return (
                      <option key={g.name} value={`gift:${g.name}`} disabled={isAlreadyAdded}>
                        {g.emoji} {g.spanish} ({g.name}) {!isPro ? '🔒 (PRO)' : ''} {isAlreadyAdded ? '(✓ Ya asignado)' : ''}
                      </option>
                    );
                  })}
                  <option value="custom_gift_input">✍️ Escribir otro regalo personalizado... {!isPro ? '🔒 (PRO)' : ''}</option>
                </optgroup>
              </select>

                  {/* Input si elige escribir un regalo manual */}
                  {isCustomGiftInputOpen && (
                    <div className="flex items-center gap-2 pt-1 animate-fadeIn">
                      <input
                        type="text"
                        value={customGiftNameInput}
                        onChange={(e) => setCustomGiftNameInput(e.target.value)}
                        placeholder="Nombre del regalo (ej: Rosa, Dinosaurio, Corona)..."
                        className="flex-1 bg-[#191A23] border border-[#B9FF66]/50 rounded-lg px-2.5 py-1.5 text-xs text-[#F3F3F3] outline-none placeholder-slate-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddCustomGiftRule();
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomGiftRule}
                        disabled={!customGiftNameInput.trim()}
                        className="px-3 py-1.5 rounded-lg bg-[#B9FF66] hover:bg-[#a6f44d] text-[#191A23] font-bold text-xs transition disabled:opacity-40"
                      >
                        Agregar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomGiftInputOpen(false);
                          setCustomGiftNameInput('');
                        }}
                        className="px-2 py-1.5 rounded-lg bg-[#14151D] hover:bg-[#191A23] text-slate-400 border border-[#292A36] text-xs transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>

                {/* 🎶 Módulos de Sonidos Asignados (Exclusivos para usuarios PRO) */}
                {isPro && activeEvents.includes('follow') &&
                  renderSoundPicker(
                    '⭐ Sonido para Nuevo Seguidor',
                    soundSettings.followSound,
                    soundSettings.customFollowSoundUrl,
                    (key, url) => onUpdateSounds({ followSound: key, customFollowSoundUrl: url }),
                    '#A855F7',
                    () => {
                      setActiveEvents((prev) => prev.filter((e) => e !== 'follow'));
                      onUpdateSounds({ followSound: 'none', customFollowSoundUrl: '' });
                    }
                  )}

                {isPro && activeEvents.includes('share') &&
                  renderSoundPicker(
                    '🚀 Sonido para Compartir Directo',
                    soundSettings.shareSound,
                    soundSettings.customShareSoundUrl,
                    (key, url) => onUpdateSounds({ shareSound: key, customShareSoundUrl: url }),
                    '#10B981',
                    () => {
                      setActiveEvents((prev) => prev.filter((e) => e !== 'share'));
                      onUpdateSounds({ shareSound: 'none', customShareSoundUrl: '' });
                    }
                  )}

                {isPro && activeEvents.includes('like') &&
                  renderSoundPicker(
                    `❤️ Sonido por Hito de Likes (cada ${soundSettings.likeMilestoneStep} likes)`,
                    soundSettings.likeMilestoneSound,
                    soundSettings.customLikeSoundUrl,
                    (key, url) => onUpdateSounds({ likeMilestoneSound: key, customLikeSoundUrl: url }),
                    '#B9FF66',
                    () => {
                      setActiveEvents((prev) => prev.filter((e) => e !== 'like'));
                      onUpdateSounds({ likeMilestoneSound: 'none', customLikeSoundUrl: '' });
                    }
                  )}

                {isPro && (soundSettings.customGiftRules || []).map((rule) => {
                  const matchedPreset = POPULAR_TIKTOK_GIFTS.find(
                    (g) =>
                      g.name.toLowerCase() === rule.giftName.toLowerCase() ||
                      g.spanish.toLowerCase() === rule.giftName.toLowerCase()
                  );
                  const emoji = matchedPreset?.emoji || '🎁';
                  const displayName = matchedPreset?.spanish || rule.giftName;

                  return (
                    <div key={rule.id}>
                      {renderSoundPicker(
                        `${emoji} Sonido para ${displayName}`,
                        rule.soundKey,
                        rule.soundUrl,
                        (key, url) => {
                          const matchedSnd = userSounds.find((s) => s.audio_url === url);
                          const updated = (soundSettings.customGiftRules || []).map((r) =>
                            r.id === rule.id
                              ? {
                                  ...r,
                                  soundKey: key,
                                  soundUrl: url || '',
                                  soundName:
                                    matchedSnd?.nombre ||
                                    (AVAILABLE_SOUNDS.find((s) => s.id === key)?.name || key),
                                }
                              : r
                          );
                          onUpdateSounds({ customGiftRules: updated });
                        },
                        '#B9FF66',
                        () => {
                          const updated = (soundSettings.customGiftRules || []).filter(
                            (r) => r.id !== rule.id
                          );
                          onUpdateSounds({ customGiftRules: updated });
                        },
                        true
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#292A36] bg-[#14151D] flex items-center justify-between gap-3">
          {!isPro ? (
            <button
              type="button"
              onClick={handleOpenPro}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#B9FF66]/15 hover:bg-[#B9FF66]/25 border border-[#B9FF66]/40 text-[#B9FF66] font-bold text-xs shadow-md transition active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 fill-[#B9FF66]" />
              <span>Zona de Pagos PRO</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleCloseModal}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#B9FF66] hover:bg-[#a6f44d] text-[#191A23] font-black text-xs hover:opacity-95 transition shadow-lg shadow-[#B9FF66]/20 shrink-0 ml-auto"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            Guardar y Cerrar
          </button>
        </div>
      </div>

      {/* Modal de Alertas y Confirmaciones */}
      <AlertModal
        config={alertModalConfig}
        onClose={() => setAlertModalConfig(null)}
      />
    </div>
  );
}
