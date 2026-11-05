import { TTSSettings, VoiceEffectPreset } from '@/types/tiktok';

export const VOICE_EFFECT_PRESETS: Record<
  Exclude<VoiceEffectPreset, 'personalizado'>,
  { label: string; description: string; pitch: number; rate: number; isPro: boolean }
> = {
  normal: {
    label: 'Normal',
    description: 'Voz natural y estándar',
    pitch: 1.0,
    rate: 1.1,
    isPro: false,
  },
  ardilla: {
    label: 'Ardilla / Helio',
    description: 'Tono ultra chillón, agudo y súper rápido',
    pitch: 2.0,
    rate: 1.6,
    isPro: true,
  },
  monstruo: {
    label: 'Monstruo / Ogro',
    description: 'Voz ultra grave, ronca, pesada y cavernosa',
    pitch: 0.05,
    rate: 0.65,
    isPro: true,
  },
  locutor: {
    label: 'Locutor de Carreras',
    description: 'Ráfaga ultra rápida de comentarista',
    pitch: 1.2,
    rate: 1.85,
    isPro: true,
  },
  camara_lenta: {
    label: 'Cámara Lenta',
    description: 'Voz pesada y ultra pausada',
    pitch: 0.6,
    rate: 0.55,
    isPro: true,
  },
};

export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  enabled: true,
  voiceName: '',
  rate: 1.1,
  pitch: 1.0,
  volume: 1.0,
  voiceEffect: 'normal',
  readChat: true,
  readGifts: true,
  readFollows: true,
  readShares: false,
  minGiftDiamonds: 1,
  chatTemplate: '{user} dice: {comment}',
  giftTemplate: '¡{user} envió {gift}!',
  followTemplate: '¡Gracias {user} por seguirme!',
  shareTemplate: '¡{user} compartió el directo!',
  ignoreCommands: true,
  maxCommentLength: 120,
  filterEnabled: true,
  bannedWords: [],
};

// Normalización avanzada para filtro de palabras (elimina acentos, números leet y caracteres especiales)
export function normalizeTextForFilter(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[7+]/g, 't');
}

// Opción 1: Detecta si el texto contiene alguna palabra o frase de la lista negra para descartar el mensaje completo
export function containsBannedWord(text: string, bannedWords?: string[]): boolean {
  if (!bannedWords || bannedWords.length === 0 || !text.trim()) return false;

  // Aplanar y separar cualquier elemento que contenga comas, saltos de línea o punto y coma
  const wordsList: string[] = [];
  for (const raw of bannedWords) {
    if (typeof raw !== 'string') continue;
    const parts = raw.split(/[\r\n,;]+/);
    for (const p of parts) {
      const trimmed = p.trim();
      if (trimmed) wordsList.push(trimmed);
    }
  }

  if (wordsList.length === 0) return false;

  const normalized = normalizeTextForFilter(text);
  const compact = normalized.replace(/[^a-z0-9]/g, '');

  return wordsList.some((rawItem) => {
    // Normalizar la palabra o frase prohibida eliminando espacios redundantes
    const cleanItem = normalizeTextForFilter(rawItem.trim()).replace(/\s+/g, ' ');
    if (!cleanItem) return false;

    // Si es una frase con más de una palabra (ej. "eres muy feo", "callate la boca")
    if (cleanItem.includes(' ')) {
      // 1. Coincidencia directa de la frase completa
      if (normalized.includes(cleanItem)) return true;

      // 2. Coincidencia con espacios flexibles, comas, guiones o símbolos entre las palabras
      const wordsOfPhrase = cleanItem
        .split(' ')
        .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const phrasePattern = wordsOfPhrase.join('[\\s\\W_]+');
      const phraseRegex = new RegExp(`(^|\\W)${phrasePattern}(\\W|$)`, 'i');
      if (phraseRegex.test(normalized)) return true;

      // 3. Coincidencia compacta si escribieron la frase sin espacios (ej. "callatelaboca")
      const cleanPhraseCompact = cleanItem.replace(/[^a-z0-9]/g, '');
      if (cleanPhraseCompact.length >= 4 && compact.includes(cleanPhraseCompact)) return true;

      return false;
    }

    // Si es una sola palabra:
    // 1. Coincidencia de palabra completa
    const escapedWord = cleanItem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordBoundaryRegex = new RegExp(`(^|\\W)${escapedWord}(\\W|$)`, 'i');
    if (wordBoundaryRegex.test(normalized)) return true;

    // 2. Coincidencia como subcadena solo para palabras de 5 o más letras
    // (evita que palabras de 3 o 4 letras como "ola", "por", "que", "pan", "mal" censuren frases normales)
    if (cleanItem.length >= 5 && normalized.includes(cleanItem)) return true;

    // 3. Coincidencia compacta si escribieron letras separadas por puntos o espacios (ej. p.a.l.a.b.r.a)
    const cleanWordCompact = cleanItem.replace(/[^a-z0-9]/g, '');
    if (cleanWordCompact.length >= 4 && compact.includes(cleanWordCompact)) return true;

    return false;
  });
}

// Conjunto global para evitar que el Garbage Collector de Chromium destruya el Utterance antes de terminar
const retainedUtterances = new Set<SpeechSynthesisUtterance>();

class TTSEngine {
  private queue: string[] = [];
  private isSpeaking: boolean = false;
  private settings: TTSSettings = { ...DEFAULT_TTS_SETTINGS };
  private voices: SpeechSynthesisVoice[] = [];
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private watchdogTimer: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.loadVoices();
      try {
        window.speechSynthesis.addEventListener('voiceschanged', () => {
          this.loadVoices();
        });
      } catch {
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
      }
    }
  }

  public updateSettings(newSettings: Partial<TTSSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    if (!this.settings.enabled) {
      this.stop();
    }
  }

  public getSettings(): TTSSettings {
    return { ...this.settings };
  }

  public loadVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    const list = window.speechSynthesis.getVoices();
    if (list && list.length > 0) {
      this.voices = list;
    }
    return this.voices;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0) {
      this.loadVoices();
    }
    return this.voices;
  }

  // Desbloquea y limpia el estado de TTS (llamado durante gestos de usuario)
  public unlockTTS(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      // Si la cola está libre pero el navegador quedó con deadlock, liberar
      if (!this.isSpeaking && this.queue.length === 0 && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {
      console.warn('Unlock TTS failed', e);
    }
  }

  public speak(text: string, forcePriority: boolean = false, bypassDisabled: boolean = false): void {
    if ((!this.settings.enabled && !bypassDisabled) || !text.trim()) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (forcePriority) {
      // Prioridad alta (ej. alertas de regalo grande o botón de prueba)
      this.queue.unshift(text);
    } else {
      // Evitar que la cola crezca sin control (máximo 15 elementos)
      if (this.queue.length > 15) {
        this.queue.splice(0, 5); // descartar los más viejos
      }
      this.queue.push(text);
    }

    this.processQueue();
  }

  private processQueue(): void {
    if (this.isSpeaking || this.queue.length === 0) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (window.speechSynthesis.paused) {
      try {
        window.speechSynthesis.resume();
      } catch (e) {
        // ignore
      }
    }

    const nextText = this.queue.shift();
    if (!nextText) return;

    this.isSpeaking = true;

    const utterance = new SpeechSynthesisUtterance(nextText);
    this.activeUtterance = utterance;
    retainedUtterances.add(utterance);

    utterance.rate = Math.max(0.2, Math.min(2.5, this.settings.rate || 1.1));
    utterance.pitch = Math.max(0.0, Math.min(2.0, this.settings.pitch || 1.0));
    utterance.volume = Math.max(0.1, Math.min(1.0, this.settings.volume ?? 1.0));

    // Selección de voz
    const availableVoices = this.getVoices();
    let selectedVoice: SpeechSynthesisVoice | undefined;

    if (this.settings.voiceName) {
      selectedVoice = availableVoices.find((v) => v.name === this.settings.voiceName);
    }

    if (!selectedVoice) {
      if (this.settings.voiceEffect === 'ardilla') {
        const femaleEsVoice = availableVoices.find(
          (v) =>
            v.lang.startsWith('es') &&
            /(helena|sabina|laura|dalia|sofia|monica|lucia|elvira|camila|paulina|female|mujer|google\s+español)/i.test(
              v.name
            )
        );
        selectedVoice =
          femaleEsVoice ||
          availableVoices.find((v) => /(female|mujer|zira|samantha|victoria|helena)/i.test(v.name)) ||
          availableVoices.find((v) => v.lang.startsWith('es'));
      } else if (this.settings.voiceEffect === 'monstruo') {
        const maleEsVoice = availableVoices.find(
          (v) =>
            v.lang.startsWith('es') &&
            /(raul|pablo|jorge|miguel|carlos|diego|enrique|male|hombre)/i.test(v.name)
        );
        selectedVoice =
          maleEsVoice ||
          availableVoices.find((v) => /(male|hombre|david|mark|george)/i.test(v.name)) ||
          availableVoices.find((v) => v.lang.startsWith('es'));
      } else {
        selectedVoice = availableVoices.find((v) => v.lang.startsWith('es'));
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang || 'es-ES';
    } else {
      utterance.lang = 'es-ES';
      const fallbackVoice = availableVoices.find((v) => v.default) || availableVoices[0];
      if (fallbackVoice) {
        utterance.voice = fallbackVoice;
      }
    }

    const cleanup = () => {
      if (this.watchdogTimer) {
        clearTimeout(this.watchdogTimer);
        this.watchdogTimer = null;
      }
      retainedUtterances.delete(utterance);
      this.isSpeaking = false;
      this.activeUtterance = null;
    };

    utterance.onstart = () => {
      if (window.speechSynthesis.paused) {
        try {
          window.speechSynthesis.resume();
        } catch {}
      }
    };

    utterance.onend = () => {
      cleanup();
      // Pequeña pausa natural entre mensajes
      setTimeout(() => this.processQueue(), 120);
    };

    utterance.onerror = (e) => {
      cleanup();
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('TTS Warning / Error:', e.error);
        setTimeout(() => this.processQueue(), 100);
      }
    };

    // Watchdog de seguridad (máximo 8s por frase para evitar que un bug de Chrome congele la cola)
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    this.watchdogTimer = setTimeout(() => {
      if (this.isSpeaking) {
        console.warn('TTS watchdog triggered. Resetting speech synthesis.');
        cleanup();
        try {
          window.speechSynthesis.cancel();
        } catch {}
        setTimeout(() => this.processQueue(), 50);
      }
    }, 8000);

    try {
      window.speechSynthesis.speak(utterance);
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (e) {
      console.error('Failed to speak utterance:', e);
      cleanup();
      this.processQueue();
    }
  }

  public stop(): void {
    this.queue = [];
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    retainedUtterances.clear();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    this.activeUtterance = null;
  }

  public getQueueLength(): number {
    return this.queue.length + (this.isSpeaking ? 1 : 0);
  }
}

export const ttsEngine = new TTSEngine();
