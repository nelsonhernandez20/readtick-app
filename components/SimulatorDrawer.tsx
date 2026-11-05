'use client';

import React, { useState } from 'react';
import {
  X,
  PlayCircle,
  MessageSquare,
  Gift,
  Heart,
  UserPlus,
  Share2,
  Sparkles,
  Send,
  Music,
} from 'lucide-react';
import { TikTokLiveEvent } from '@/types/tiktok';
import { audioEngine } from '@/lib/audioEngine';
import { ttsEngine } from '@/lib/ttsEngine';

interface SimulatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onEmitEvent: (event: TikTokLiveEvent) => void;
}

const RANDOM_USERS = [
  { name: 'Carlos Gamer', handle: 'carlos_pro99', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop' },
  { name: 'Ana Streamer', handle: 'anita_live', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
  { name: 'Mateo TikToker', handle: 'mateo_oficial', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop' },
  { name: 'Lucía Fans', handle: 'lucia_dance', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop' },
];

const RANDOM_COMMENTS = [
  '¡Saludos desde México! Excelente directo crack.',
  '¿A qué hora juegas la siguiente partida?',
  '¡Qué buena música pusiste hoy!',
  'Te sigo desde hace un año, sigue así.',
  '¡Hola! Acabo de llegar al directo.',
  'Jajaja qué épica esa jugada hermano.',
];

export default function SimulatorDrawer({
  isOpen,
  onClose,
  onEmitEvent,
}: SimulatorDrawerProps) {
  const [customText, setCustomText] = useState('');
  const [customUser, setCustomUser] = useState('EspectadorPro');

  // Estado para probar regalos personalizados y sus canciones
  const [customGiftName, setCustomGiftName] = useState('Rosa');
  const [customGiftCount, setCustomGiftCount] = useState<number>(1);
  const [customGiftDiamonds, setCustomGiftDiamonds] = useState<number>(1);
  const [simLikes, setSimLikes] = useState<number>(100);

  if (!isOpen) return null;

  const ensureAudioUnlocked = () => {
    try {
      audioEngine.init();
      audioEngine.unlockAudio();
      ttsEngine.unlockTTS();
    } catch (e) {
      console.warn('Audio unlock error:', e);
    }
  };

  const getRandomUser = () => {
    return RANDOM_USERS[Math.floor(Math.random() * RANDOM_USERS.length)];
  };

  const simulateChat = (text?: string) => {
    ensureAudioUnlocked();
    const u = getRandomUser();
    const comment = text || RANDOM_COMMENTS[Math.floor(Math.random() * RANDOM_COMMENTS.length)];
    onEmitEvent({
      type: 'chat',
      id: `sim-chat-${Date.now()}`,
      uniqueId: u.handle,
      nickname: u.name,
      profilePictureUrl: u.avatar,
      comment,
      isModerator: Math.random() > 0.7,
      isSubscriber: Math.random() > 0.5,
      timestamp: Date.now(),
    });
  };

  const simulateGift = (name: string, diamonds: number, count: number = 1, repeatEnd: boolean = true) => {
    ensureAudioUnlocked();
    const u = getRandomUser();
    onEmitEvent({
      type: 'gift',
      id: `sim-gift-${Date.now()}`,
      uniqueId: u.handle,
      nickname: u.name,
      profilePictureUrl: u.avatar,
      giftId: Math.floor(Math.random() * 9999),
      giftName: name,
      diamondCount: diamonds * count,
      repeatCount: count,
      repeatEnd,
      timestamp: Date.now(),
    });
  };

  const simulateFollow = () => {
    ensureAudioUnlocked();
    const u = getRandomUser();
    onEmitEvent({
      type: 'follow',
      id: `sim-follow-${Date.now()}`,
      uniqueId: u.handle,
      nickname: u.name,
      profilePictureUrl: u.avatar,
      timestamp: Date.now(),
    });
  };

  const simulateShare = () => {
    ensureAudioUnlocked();
    const u = getRandomUser();
    onEmitEvent({
      type: 'share',
      id: `sim-share-${Date.now()}`,
      uniqueId: u.handle,
      nickname: u.name,
      profilePictureUrl: u.avatar,
      timestamp: Date.now(),
    });
  };

  const simulateLikes = () => {
    ensureAudioUnlocked();
    const u = getRandomUser();
    const nextTotal = simLikes + 50;
    setSimLikes(nextTotal);
    onEmitEvent({
      type: 'like',
      id: `sim-like-${Date.now()}`,
      uniqueId: u.handle,
      nickname: u.name,
      likeCount: 50,
      totalLikeCount: nextTotal,
      timestamp: Date.now(),
    });
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    ensureAudioUnlocked();
    onEmitEvent({
      type: 'chat',
      id: `sim-custom-${Date.now()}`,
      uniqueId: customUser.toLowerCase().replace(/\s+/g, '_'),
      nickname: customUser,
      comment: customText.trim(),
      timestamp: Date.now(),
    });
    setCustomText('');
  };

  const handleCustomGiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customGiftName.trim();
    if (!name) return;
    simulateGift(name, Math.max(1, customGiftDiamonds), Math.max(1, customGiftCount), true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#191A23] border border-[#292A36] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#292A36] flex items-center justify-between bg-[#14151D] shrink-0">
          <div className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-[#B9FF66]" />
            <h2 className="text-sm sm:text-base font-bold text-[#F3F3F3]">
              Simulador de Eventos en Vivo
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#252631] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-4 space-y-4 text-xs overflow-y-auto">
          <div className="p-2.5 rounded-xl bg-[#B9FF66]/10 border border-[#B9FF66]/20 text-[#F3F3F3]">
            💡 <strong>Prueba en vivo:</strong> Haz clic en cualquier botón para escuchar tus alertas de voz (TTS) y las canciones personalizadas de tus regalos, incluso sin estar en directo.
          </div>

          {/* Quick Buttons Grid */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Eventos Rápidos
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => simulateChat()}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#111218] hover:bg-[#B9FF66]/10 border border-[#292A36] hover:border-[#B9FF66]/40 text-[#F3F3F3] transition font-medium text-left min-w-0"
              >
                <MessageSquare className="w-4 h-4 text-[#B9FF66] shrink-0" />
                <span className="truncate">💬 Chat</span>
              </button>

              <button
                onClick={() => simulateGift('Rosa', 1, 1)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#111218] hover:bg-amber-400/10 border border-[#292A36] hover:border-amber-400/40 text-[#F3F3F3] transition font-medium text-left min-w-0"
              >
                <Gift className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">🌹 Rosa (1x)</span>
              </button>

              <button
                onClick={() => simulateGift('Rosa', 1, 10)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#111218] hover:bg-rose-400/10 border border-[#292A36] hover:border-rose-400/40 text-[#F3F3F3] transition font-medium text-left min-w-0"
              >
                <Gift className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="truncate">🌹 10x Rosas</span>
              </button>

              <button
                onClick={() => simulateGift('Galaxia', 1000, 1)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#111218] hover:bg-purple-400/10 border border-[#292A36] hover:border-purple-400/40 text-[#F3F3F3] transition font-medium text-left min-w-0"
              >
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="truncate">🌌 Galaxia (1k 💎)</span>
              </button>

              <button
                onClick={() => simulateGift('Leon the Lion', 34000, 1)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#111218] hover:bg-amber-500/10 border border-[#292A36] hover:border-amber-500/40 text-[#F3F3F3] transition font-medium text-left min-w-0"
              >
                <span className="text-sm shrink-0">🦁</span>
                <span className="truncate">León (34k 💎)</span>
              </button>

              <button
                onClick={() => simulateGift('Money Gun', 500, 1)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#111218] hover:bg-emerald-400/10 border border-[#292A36] hover:border-emerald-400/40 text-[#F3F3F3] transition font-medium text-left min-w-0"
              >
                <span className="text-sm shrink-0">🔫</span>
                <span className="truncate">Money Gun</span>
              </button>

              <button
                onClick={simulateFollow}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#111218] hover:bg-purple-500/10 border border-[#292A36] hover:border-purple-500/40 text-[#F3F3F3] transition font-medium text-left min-w-0"
              >
                <UserPlus className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="truncate">⭐ Seguidor</span>
              </button>

              <button
                onClick={simulateLikes}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-[#111218] hover:bg-rose-500/10 border border-[#292A36] hover:border-rose-500/40 text-[#F3F3F3] transition font-medium text-left min-w-0"
              >
                <Heart className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="truncate">❤️ +50 Likes</span>
              </button>

              <button
                onClick={simulateShare}
                className="col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#111218] hover:bg-[#B9FF66]/10 border border-[#292A36] hover:border-[#B9FF66]/40 text-[#F3F3F3] transition font-medium min-w-0"
              >
                <Share2 className="w-4 h-4 text-[#B9FF66] shrink-0" />
                <span className="truncate">🚀 Compartir Transmisión</span>
              </button>
            </div>
          </div>

          {/* Probar Cualquier Regalo Personalizado */}
          <div className="pt-3 border-t border-[#292A36] space-y-2">
            <span className="text-[11px] font-semibold text-[#F3F3F3] uppercase tracking-wider flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-[#B9FF66]" />
              Probar Canción de Regalo Específico
            </span>
            <form onSubmit={handleCustomGiftSubmit} className="p-3 rounded-xl bg-[#111218] border border-[#292A36] space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Nombre del regalo:</label>
                  <input
                    type="text"
                    value={customGiftName}
                    onChange={(e) => setCustomGiftName(e.target.value)}
                    placeholder="ej. Rosa, Galaxy, Leon..."
                    className="w-full bg-[#191A23] border border-[#292A36] rounded-lg px-2.5 py-1.5 text-[#F3F3F3] outline-none focus:border-[#B9FF66]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Cantidad enviada:</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={customGiftCount}
                      onChange={(e) => setCustomGiftCount(parseInt(e.target.value) || 1)}
                      className="w-full bg-[#191A23] border border-[#292A36] rounded-lg px-2 py-1.5 text-[#F3F3F3] outline-none focus:border-[#B9FF66] text-center"
                    />
                    <button
                      type="submit"
                      disabled={!customGiftName.trim()}
                      className="px-3 py-1.5 rounded-lg bg-[#B9FF66] hover:bg-[#a6f44d] text-[#191A23] font-black transition flex items-center gap-1 shrink-0 disabled:opacity-50"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      Probar
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Custom Message input */}
          <div className="pt-3 border-t border-[#292A36] space-y-2">
            <span className="text-[11px] font-semibold text-[#B9FF66] uppercase tracking-wider block">
              Mensaje de Chat Personalizado (TTS)
            </span>
            <form onSubmit={handleCustomSubmit} className="space-y-2">
              <input
                type="text"
                value={customUser}
                onChange={(e) => setCustomUser(e.target.value)}
                placeholder="Nombre del usuario"
                className="w-full bg-[#111218] border border-[#292A36] rounded-lg px-2.5 py-1.5 text-[#F3F3F3] outline-none focus:border-[#B9FF66]"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Escribe lo que quieras que lea el TTS..."
                  className="flex-1 bg-[#111218] border border-[#292A36] rounded-lg px-2.5 py-1.5 text-[#F3F3F3] outline-none focus:border-[#B9FF66]"
                />
                <button
                  type="submit"
                  disabled={!customText.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#B9FF66] hover:bg-[#a6f44d] text-[#191A23] font-black transition disabled:opacity-50 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#292A36] bg-[#14151D] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#111218] hover:bg-[#252631] text-slate-300 hover:text-white border border-[#292A36] transition font-medium"
          >
            Cerrar Simulador
          </button>
        </div>
      </div>
    </div>
  );
}
