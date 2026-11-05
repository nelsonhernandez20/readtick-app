'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Gift,
  Heart,
  UserPlus,
  Share2,
  Volume2,
  Trash2,
  Search,
  Shield,
  Star,
  Sparkles,
} from 'lucide-react';
import { TikTokLiveEvent, ChatEvent, GiftEvent, LikeEvent, FollowEvent, ShareEvent } from '@/types/tiktok';

interface EventFeedProps {
  events: TikTokLiveEvent[];
  onClear: () => void;
  onReplayTTS: (text: string) => void;
  onPlaySound: (soundKey: string) => void;
}

type TabType = 'all' | 'chat' | 'gift' | 'like' | 'social';

export default function EventFeed({
  events,
  onClear,
  onReplayTTS,
  onPlaySound,
}: EventFeedProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = events.filter((ev) => {
    // Tab filter
    if (activeTab === 'chat' && ev.type !== 'chat') return false;
    if (activeTab === 'gift' && ev.type !== 'gift') return false;
    if (activeTab === 'like' && ev.type !== 'like') return false;
    if (activeTab === 'social' && ev.type !== 'follow' && ev.type !== 'share') return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if ('comment' in ev && ev.comment.toLowerCase().includes(q)) return true;
      if ('nickname' in ev && ev.nickname.toLowerCase().includes(q)) return true;
      if ('uniqueId' in ev && ev.uniqueId.toLowerCase().includes(q)) return true;
      if ('giftName' in ev && ev.giftName.toLowerCase().includes(q)) return true;
      return false;
    }

    return true;
  });

  return (
    <div className="bg-[#191A23] border border-[#292A36] rounded-2xl flex flex-col h-[520px] shadow-xl overflow-hidden">
      {/* Top Bar: Tabs & Search */}
      <div className="p-3 border-b border-[#292A36] flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-[#14151D]">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'all'
                ? 'bg-[#B9FF66] text-[#191A23] shadow-sm'
                : 'text-slate-400 hover:text-[#F3F3F3] hover:bg-[#252631]'
            }`}
          >
            Todo ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'chat'
                ? 'bg-[#B9FF66] text-[#191A23] shadow-sm'
                : 'text-slate-400 hover:text-[#F3F3F3] hover:bg-[#252631]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab('gift')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'gift'
                ? 'bg-[#B9FF66] text-[#191A23] shadow-sm'
                : 'text-slate-400 hover:text-[#F3F3F3] hover:bg-[#252631]'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            Regalos
          </button>
          <button
            onClick={() => setActiveTab('like')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'like'
                ? 'bg-[#B9FF66] text-[#191A23] shadow-sm'
                : 'text-slate-400 hover:text-[#F3F3F3] hover:bg-[#252631]'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            Likes
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'social'
                ? 'bg-[#B9FF66] text-[#191A23] shadow-sm'
                : 'text-slate-400 hover:text-[#F3F3F3] hover:bg-[#252631]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Seguidores
          </button>
        </div>

        {/* Search & Clear Feed */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-[#111218] border border-[#292A36] focus:border-[#B9FF66] rounded-lg pl-8 pr-2.5 py-1 text-xs text-[#F3F3F3] placeholder-slate-500 outline-none"
            />
          </div>

          <button
            onClick={onClear}
            title="Limpiar historial"
            className="p-1.5 rounded-lg bg-[#191A23] hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-[#292A36] hover:border-rose-800/40 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-[#292A36]/40">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Sparkles className="w-8 h-8 text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-400">Sin eventos en este momento</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Conéctate a un TikTok Live o pulsa en <strong>&quot;Simular&quot;</strong> para probar mensajes de chat, regalos y TTS.
            </p>
          </div>
        ) : (
          filteredEvents.map((ev, index) => {
            if (ev.type === 'chat') {
              const chat = ev as ChatEvent;
              return (
                <div key={chat.id || index} className="pt-2 flex items-start justify-between gap-3 group">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {chat.profilePictureUrl ? (
                      <img
                        src={chat.profilePictureUrl}
                        alt="avatar"
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-700"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                        {chat.nickname.slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-slate-300 hover:text-[#B9FF66] transition">
                          {chat.nickname}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          @{chat.uniqueId}
                        </span>
                        {chat.isModerator && (
                          <span className="inline-flex items-center gap-0.5 px-1 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            <Shield className="w-2.5 h-2.5" /> MOD
                          </span>
                        )}
                        {chat.isSubscriber && (
                          <span className="inline-flex items-center gap-0.5 px-1 rounded text-[9px] font-bold bg-[#B9FF66]/20 text-[#B9FF66] border border-[#B9FF66]/30">
                            <Star className="w-2.5 h-2.5" /> SUB
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-100 break-words mt-0.5">
                        {chat.comment || (chat as any).content || ''}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onReplayTTS(`${chat.nickname} dice: ${chat.comment || (chat as any).content || ''}`)}
                    title="Escuchar con TTS"
                    className="opacity-60 group-hover:opacity-100 p-1.5 rounded-lg bg-[#14151D] border border-[#292A36] hover:bg-[#B9FF66]/20 hover:text-[#B9FF66] text-slate-400 transition shrink-0"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }

            if (ev.type === 'gift') {
              const gift = ev as GiftEvent;
              return (
                <div
                  key={gift.id || index}
                  className="pt-2 flex items-center justify-between gap-3 bg-[#14151D]/60 border border-[#292A36]/60 p-2 rounded-xl group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative">
                      {gift.profilePictureUrl ? (
                        <img
                          src={gift.profilePictureUrl}
                          alt="avatar"
                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-[#B9FF66]/40"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#B9FF66]/20 flex items-center justify-center text-[#B9FF66] font-bold text-xs shrink-0">
                          🎁
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-[#B9FF66] text-[#191A23]">
                        <Gift className="w-3 h-3" />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">
                          {gift.nickname}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          envió
                        </span>
                        <span className="text-xs font-black text-[#B9FF66]">
                          {gift.giftName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#B9FF66]/20 text-[#B9FF66] border border-[#B9FF66]/30 font-bold">
                          x{gift.repeatCount}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#B9FF66] font-medium flex items-center gap-1">
                        <span>💎 {gift.diamondCount} diamantes</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onPlaySound('coin')}
                      title="Repetir sonido de regalo"
                      className="p-1.5 rounded-lg bg-[#111218] border border-[#292A36] hover:bg-[#B9FF66]/20 text-[#B9FF66] transition"
                    >
                      <Gift className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onReplayTTS(`¡${gift.nickname} envió ${gift.giftName}!`)}
                      title="Escuchar con TTS"
                      className="p-1.5 rounded-lg bg-[#111218] border border-[#292A36] hover:bg-[#B9FF66]/20 hover:text-[#B9FF66] text-slate-400 transition"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            }

            if (ev.type === 'like') {
              const like = ev as LikeEvent;
              return (
                <div key={like.id || index} className="pt-2 flex items-center justify-between gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-[#B9FF66]/15 text-[#B9FF66]">
                      <Heart className="w-3.5 h-3.5 fill-[#B9FF66]" />
                    </div>
                    <span>
                      <strong className="text-white">{like.nickname}</strong> le dio like al directo ({like.likeCount} me gusta)
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Total: {like.totalLikeCount}
                  </span>
                </div>
              );
            }

            if (ev.type === 'follow') {
              const follow = ev as FollowEvent;
              return (
                <div key={follow.id || index} className="pt-2 flex items-center justify-between gap-3 bg-[#14151D] border border-[#292A36]/60 p-2 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-[#B9FF66]/20 text-[#B9FF66]">
                      <UserPlus className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {follow.nickname}
                      </div>
                      <div className="text-[10px] text-[#B9FF66]">
                        ¡Comenzó a seguir el directo!
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onReplayTTS(`¡Gracias ${follow.nickname} por seguirme!`)}
                    title="Escuchar TTS"
                    className="p-1.5 rounded-lg bg-[#111218] border border-[#292A36] hover:bg-[#B9FF66]/20 text-[#B9FF66] transition"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }

            if (ev.type === 'share') {
              const share = ev as ShareEvent;
              return (
                <div key={share.id || index} className="pt-2 flex items-center justify-between gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-[#B9FF66]/15 text-[#B9FF66]">
                      <Share2 className="w-3.5 h-3.5" />
                    </div>
                    <span>
                      <strong className="text-white">{share.nickname}</strong> compartió la transmisión.
                    </span>
                  </div>
                </div>
              );
            }

            return null;
          })
        )}
      </div>
    </div>
  );
}
