'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { Gift, UserPlus, Share2, Gem } from 'lucide-react';
import { TikTokLiveEvent, GiftEvent, FollowEvent, ShareEvent } from '@/types/tiktok';
import { audioEngine } from '@/lib/audioEngine';
import { ttsEngine } from '@/lib/ttsEngine';

function OverlayContent() {
  const searchParams = useSearchParams();
  const username = searchParams.get('username') || '';
  const enableTTS = searchParams.get('tts') === '1';
  const enableSounds = searchParams.get('sounds') === '1';

  const [currentAlert, setCurrentAlert] = useState<TikTokLiveEvent | null>(null);
  const [recentChats, setRecentChats] = useState<{ id: string; user: string; text: string }[]>([]);
  const [status, setStatus] = useState<string>('Esperando conexión...');
  const [hasInteracted, setHasInteracted] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Load saved settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tf_tts_settings');
      if (saved) {
        ttsEngine.updateSettings(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // User click to unlock audio inside OBS if needed
  const handleUnlock = () => {
    audioEngine.unlockAudio();
    ttsEngine.unlockTTS();
    setHasInteracted(true);
  };

  useEffect(() => {
    if (!username) return;

    const es = new EventSource(`/api/tiktok/stream?username=${encodeURIComponent(username)}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: TikTokLiveEvent = JSON.parse(event.data);

        if (data.type === 'status') {
          setStatus(data.message || data.status);
          return;
        }

        if (data.type === 'chat') {
          const commentText = (data.comment || (data as any).content || '').trim();
          if (!commentText) return;
          setRecentChats((prev) => [
            { id: data.id, user: data.nickname, text: commentText },
            ...prev.slice(0, 4),
          ]);
          if (enableTTS) {
            ttsEngine.speak(`${data.nickname} dice: ${commentText}`);
          }
        }

        if (data.type === 'gift') {
          const gift = data as GiftEvent;
          setCurrentAlert(gift);
          if (enableSounds) {
            audioEngine.playSound(gift.diamondCount >= 100 ? 'fanfare' : 'coin', 0.9);
          }
          if (enableTTS) {
            ttsEngine.speak(`¡${gift.nickname} envió ${gift.giftName}!`, gift.diamondCount >= 100);
          }

          if (gift.diamondCount >= 5) {
            confetti({
              particleCount: 100,
              spread: 80,
              origin: { y: 0.4 },
              colors: ['#FE2C55', '#25F4EE', '#FFD700', '#ffffff'],
            });
          }

          setTimeout(() => setCurrentAlert(null), 5000);
        }

        if (data.type === 'follow') {
          const follow = data as FollowEvent;
          setCurrentAlert(follow);
          if (enableSounds) {
            audioEngine.playSound('levelup', 0.8);
          }
          if (enableTTS) {
            ttsEngine.speak(`¡Gracias ${follow.nickname} por seguir el canal!`);
          }
          setTimeout(() => setCurrentAlert(null), 4500);
        }

        if (data.type === 'share') {
          const share = data as ShareEvent;
          setCurrentAlert(share);
          if (enableSounds) {
            audioEngine.playSound('chime', 0.8);
          }
          setTimeout(() => setCurrentAlert(null), 4000);
        }
      } catch (err) {
        console.error('Error in overlay event source:', err);
      }
    };

    es.onerror = () => {
      setStatus('Reconectando...');
    };

    return () => {
      es.onmessage = null;
      es.onerror = null;
      es.close();
    };
  }, [username, enableTTS, enableSounds]);

  return (
    <div
      onClick={handleUnlock}
      className="w-screen h-screen bg-transparent overflow-hidden relative font-sans select-none cursor-pointer p-6 flex flex-col justify-between"
    >
      {/* OBS audio prompt if not unlocked */}
      {!hasInteracted && (
        <div className="absolute top-2 left-2 z-50 text-[10px] bg-black/60 text-slate-400 px-2 py-1 rounded backdrop-blur border border-slate-700/50">
          Haz clic una vez para autorizar audio OBS
        </div>
      )}

      {/* Center Alert Popup */}
      <div className="flex-1 flex items-center justify-center">
        {currentAlert && (
          <div className="animate-pop-alert flex items-center gap-4 bg-[#18181F]/95 border-2 border-[#FE2C55] rounded-3xl p-5 shadow-[0_0_50px_rgba(254,44,85,0.4)] backdrop-blur-xl min-w-[320px] max-w-lg">
            {('profilePictureUrl' in currentAlert && currentAlert.profilePictureUrl) ? (
              <img
                src={currentAlert.profilePictureUrl}
                alt="user"
                className="w-16 h-16 rounded-full object-cover border-2 border-[#25F4EE] shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#FE2C55] to-purple-600 flex items-center justify-center text-white">
                <Gift className="w-8 h-8" />
              </div>
            )}

            <div>
              {currentAlert.type === 'gift' && (
                <>
                  <div className="text-xs font-bold text-slate-300">
                    {(currentAlert as GiftEvent).nickname}
                  </div>
                  <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-[#FE2C55]">
                    {(currentAlert as GiftEvent).giftName} x{(currentAlert as GiftEvent).repeatCount}
                  </div>
                  <div className="text-sm font-bold text-[#25F4EE] flex items-center gap-1 mt-0.5">
                    <Gem className="w-4 h-4" />
                    {(currentAlert as GiftEvent).diamondCount} Diamantes
                  </div>
                </>
              )}

              {currentAlert.type === 'follow' && (
                <>
                  <div className="text-xs font-medium text-slate-300">¡NUEVO SEGUIDOR!</div>
                  <div className="text-lg font-black text-white">
                    {(currentAlert as FollowEvent).nickname}
                  </div>
                  <div className="text-xs text-[#25F4EE]">Se unió a la transmisión</div>
                </>
              )}

              {currentAlert.type === 'share' && (
                <>
                  <div className="text-xs font-medium text-slate-300">¡DIRECTO COMPARTIDO!</div>
                  <div className="text-lg font-black text-white">
                    {(currentAlert as ShareEvent).nickname}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom recent chat ticker */}
      <div className="space-y-1.5 max-w-md pointer-events-none">
        {recentChats.map((c) => (
          <div
            key={c.id}
            className="animate-slide-up flex items-center gap-2 bg-[#0F0F12]/85 border border-[#282834]/80 backdrop-blur-md rounded-xl px-3 py-1.5 text-xs shadow-lg"
          >
            <span className="font-bold text-[#25F4EE]">{c.user}:</span>
            <span className="text-white truncate">{c.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OverlayPage() {
  return (
    <Suspense fallback={<div className="bg-transparent" />}>
      <OverlayContent />
    </Suspense>
  );
}
