import { SoundSettings } from '@/types/tiktok';

export const AVAILABLE_SOUNDS = [
  { id: 'coin', name: '🪙 Moneda (Coin)', desc: 'Chime clásico de recompensa' },
  { id: 'fanfare', name: '🎺 Fanfarria Victoria', desc: 'Ideal para regalos grandes' },
  { id: 'airhorn', name: '📢 Airhorn Hype', desc: 'Bocina de stream' },
  { id: 'ding', name: '🔔 Ding Suave', desc: 'Notificación limpia' },
  { id: 'levelup', name: '⭐ Level Up (8-bit)', desc: 'Estilo videojuego retro' },
  { id: 'applause', name: '👏 Aplausos / Ovación', desc: 'Multitud celebrando' },
  { id: 'chime', name: '✨ Chime Melódico', desc: 'Brillo campana' },
  { id: 'none', name: '🔇 Silencio (Sin sonido)', desc: 'Desactiva sonido para este evento' },
  { id: 'custom', name: '🔗 Audio Personalizado', desc: 'Usa una URL de audio MP3/WAV' },
];

export const POPULAR_TIKTOK_GIFTS = [
  { name: 'Rose', spanish: 'Rosa', emoji: '🌹', defaultCoins: 1 },
  { name: 'TikTok', spanish: 'Logo TikTok', emoji: '🎵', defaultCoins: 1 },
  { name: 'Finger Heart', spanish: 'Mini Corazón', emoji: '🫰', defaultCoins: 5 },
  { name: 'Doughnut', spanish: 'Dona', emoji: '🍩', defaultCoins: 30 },
  { name: 'Cap', spanish: 'Gorra', emoji: '🧢', defaultCoins: 99 },
  { name: 'Paper Crane', spanish: 'Grulla', emoji: '🕊️', defaultCoins: 99 },
  { name: 'Sunglasses', spanish: 'Gafas de Sol', emoji: '🕶️', defaultCoins: 199 },
  { name: 'Love You', spanish: 'Te Quiero', emoji: '💖', defaultCoins: 199 },
  { name: 'Corgi', spanish: 'Corgi', emoji: '🐶', defaultCoins: 299 },
  { name: 'Money Gun', spanish: 'Pistola Dinero', emoji: '🔫', defaultCoins: 500 },
  { name: 'Swan', spanish: 'Cisne', emoji: '🦢', defaultCoins: 699 },
  { name: 'Galaxy', spanish: 'Galaxia', emoji: '🌌', defaultCoins: 1000 },
  { name: 'Fireworks', spanish: 'Fuegos Artificiales', emoji: '🎆', defaultCoins: 1088 },
  { name: 'Diamond', spanish: 'Diamante', emoji: '💎', defaultCoins: 1500 },
  { name: 'Crown', spanish: 'Corona', emoji: '👑', defaultCoins: 9999 },
  { name: 'Sports Car', spanish: 'Coche Deportivo', emoji: '🏎️', defaultCoins: 7000 },
  { name: 'Rocket', spanish: 'Cohete', emoji: '🚀', defaultCoins: 20000 },
  { name: 'Whale', spanish: 'Ballena', emoji: '🐳', defaultCoins: 21500 },
  { name: 'Castle', spanish: 'Castillo', emoji: '🏰', defaultCoins: 20000 },
  { name: 'Leon the Lion', spanish: 'León', emoji: '🦁', defaultCoins: 29999 },
  { name: 'TikTok Universe', spanish: 'Universo', emoji: '🪐', defaultCoins: 34999 },
];

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.8,
  giftSound: 'coin',
  followSound: 'levelup',
  shareSound: 'chime',
  likeMilestoneSound: 'ding',
  likeMilestoneStep: 50,
  customGiftSoundUrl: '',
  customFollowSoundUrl: '',
  customShareSoundUrl: '',
  customLikeSoundUrl: '',
  customGiftRules: [],
  maxAlertDuration: 5, // 5 segundos fijo automáticamente para todos los audios
};
