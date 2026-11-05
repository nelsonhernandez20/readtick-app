export interface TikTokUser {
  uniqueId: string;
  nickname: string;
  profilePictureUrl?: string;
}

export interface ChatEvent {
  type: 'chat';
  id: string;
  uniqueId: string;
  nickname: string;
  comment: string;
  profilePictureUrl?: string;
  isModerator?: boolean;
  isSubscriber?: boolean;
  timestamp: number;
}

export interface GiftEvent {
  type: 'gift';
  id: string;
  uniqueId: string;
  nickname: string;
  profilePictureUrl?: string;
  giftId: number | string;
  giftName: string;
  diamondCount: number;
  repeatCount: number;
  repeatEnd: boolean;
  giftPictureUrl?: string;
  timestamp: number;
}

export interface LikeEvent {
  type: 'like';
  id: string;
  uniqueId: string;
  nickname: string;
  profilePictureUrl?: string;
  likeCount: number;
  totalLikeCount: number;
  timestamp: number;
}

export interface FollowEvent {
  type: 'follow';
  id: string;
  uniqueId: string;
  nickname: string;
  profilePictureUrl?: string;
  timestamp: number;
}

export interface ShareEvent {
  type: 'share';
  id: string;
  uniqueId: string;
  nickname: string;
  profilePictureUrl?: string;
  timestamp: number;
}

export interface ViewerCountEvent {
  type: 'roomUser';
  viewerCount: number;
  timestamp: number;
}

export interface StatusEvent {
  type: 'status';
  status: 'disconnected' | 'connecting' | 'connected' | 'error' | 'ended';
  message?: string;
  roomId?: string;
  timestamp: number;
}

export type TikTokLiveEvent = 
  | ChatEvent 
  | GiftEvent 
  | LikeEvent 
  | FollowEvent 
  | ShareEvent 
  | ViewerCountEvent 
  | StatusEvent;

export type VoiceEffectPreset = 'normal' | 'ardilla' | 'monstruo' | 'locutor' | 'camara_lenta' | 'personalizado';

export interface TTSSettings {
  enabled: boolean;
  voiceName: string;
  rate: number;
  pitch: number;
  volume: number;
  voiceEffect?: VoiceEffectPreset;
  readChat: boolean;
  readGifts: boolean;
  readFollows: boolean;
  readShares: boolean;
  minGiftDiamonds: number;
  chatTemplate: string; // e.g. "{user} dice: {comment}"
  giftTemplate: string; // e.g. "¡{user} envió {gift}!"
  followTemplate: string; // e.g. "¡Gracias {user} por seguirme!"
  shareTemplate: string; // e.g. "¡{user} compartió el directo!"
  ignoreCommands: boolean; // skip messages starting with !
  maxCommentLength: number; // skip or truncate long comments
  filterEnabled?: boolean; // Activar filtro de palabras
  bannedWords?: string[]; // Lista de palabras prohibidas (Opción 1: silenciar mensaje completo)
}

export interface CustomGiftSoundRule {
  id: string; // ID único de la regla
  giftName: string; // Nombre del regalo, ej. "Rose", "Rosa", "Galaxy"
  giftId?: number | string; // ID opcional de TikTok
  soundKey: string; // 'custom' | 'coin' | 'fanfare' | 'airhorn' | 'applause' | 'levelup' | 'ding' | 'chime'
  soundUrl?: string; // URL o base64 Data URI de la canción/audio
  soundName?: string; // Nombre legible (ej: "CancionRosa.mp3")
  volume?: number; // 0 a 1
  minCount?: number; // Cantidad mínima (ej: 1 o 10 rosas)
  waitForComboEnd?: boolean; // Esperar al final de la racha de combo
  interruptPrevious?: boolean; // Cortar el audio anterior de inmediato vs esperar en cola
  customTTS?: string; // Anuncio TTS opcional (ej: "¡Gracias por esa rosa especial!")
  maxDuration?: number; // Duración máxima de reproducción en segundos (ej: 5, 10, 15, 30. 0 = completa)
}

export interface SoundSettings {
  enabled: boolean;
  volume: number;
  giftSound: string; // sound key, e.g. "coin" | "fanfare" | "airhorn" | "custom"
  followSound: string; // "levelup" | "ding" | "chime" | "custom"
  shareSound: string; // "chime" | "pop" | "custom"
  likeMilestoneSound: string; // "ding" | "pop" | "custom"
  likeMilestoneStep: number; // e.g. every 100 likes
  customGiftSoundUrl?: string;
  customFollowSoundUrl?: string;
  customShareSoundUrl?: string;
  customLikeSoundUrl?: string;
  customGiftRules?: CustomGiftSoundRule[]; // Mapeo de canciones y sonidos por regalo específico
  maxAlertDuration?: number; // Límite máximo general en segundos para alarmas de audio (default: 10s)
}
