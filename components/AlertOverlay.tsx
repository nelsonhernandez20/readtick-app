'use client';

import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Gift, UserPlus, Share2, Gem } from 'lucide-react';
import { TikTokLiveEvent, GiftEvent, FollowEvent, ShareEvent } from '@/types/tiktok';

interface AlertOverlayProps {
  lastAlert: TikTokLiveEvent | null;
}

export default function AlertOverlay({ lastAlert }: AlertOverlayProps) {
  const [currentAlert, setCurrentAlert] = useState<TikTokLiveEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lastAlert) return;
    if (lastAlert.type !== 'gift' && lastAlert.type !== 'follow' && lastAlert.type !== 'share') {
      return;
    }

    setCurrentAlert(lastAlert);
    setVisible(true);

    // If gift with >= 10 diamonds, fire celebratory confetti
    if (lastAlert.type === 'gift' && (lastAlert as GiftEvent).diamondCount >= 10) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.3 },
          colors: ['#B9FF66', '#ffffff', '#FFD700'],
        });
      } catch (e) {
        // ignore in case window/canvas not ready
      }
    }

    // Hide after 4.5 seconds
    const timer = setTimeout(() => {
      setVisible(false);
    }, 4500);

    return () => clearTimeout(timer);
  }, [lastAlert]);

  if (!visible || !currentAlert) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300">
      <div className="animate-pop-alert flex items-center gap-3.5 bg-[#191A23]/95 border-2 border-[#B9FF66] shadow-2xl shadow-[#B9FF66]/20 rounded-2xl px-5 py-3.5 backdrop-blur-xl min-w-[280px] max-w-[90vw]">
        {/* Avatar or Icon */}
        <div className="relative">
          {('profilePictureUrl' in currentAlert && currentAlert.profilePictureUrl) ? (
            <img
              src={currentAlert.profilePictureUrl}
              alt="avatar"
              className="w-12 h-12 rounded-full object-cover border-2 border-[#B9FF66] shadow-md"
              onError={(e) => {
                // fallback to icon on error
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#B9FF66] text-[#191A23] font-bold flex items-center justify-center">
              {currentAlert.type === 'gift' && <Gift className="w-6 h-6 text-[#191A23]" />}
              {currentAlert.type === 'follow' && <UserPlus className="w-6 h-6 text-[#191A23]" />}
              {currentAlert.type === 'share' && <Share2 className="w-6 h-6 text-[#191A23]" />}
            </div>
          )}

          <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#111218] border border-[#292A36]">
            {currentAlert.type === 'gift' && <Gift className="w-3.5 h-3.5 text-[#B9FF66]" />}
            {currentAlert.type === 'follow' && <UserPlus className="w-3.5 h-3.5 text-[#B9FF66]" />}
            {currentAlert.type === 'share' && <Share2 className="w-3.5 h-3.5 text-[#B9FF66]" />}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {currentAlert.type === 'gift' && (
            <div>
              <div className="text-xs font-semibold text-slate-300">
                {(currentAlert as GiftEvent).nickname}
              </div>
              <div className="text-sm font-black text-white flex items-center gap-1.5">
                <span>{(currentAlert as GiftEvent).giftName}</span>
                <span className="text-[#191A23] font-bold text-xs px-1.5 py-0.5 rounded bg-[#B9FF66] border border-[#B9FF66]/30">
                  x{(currentAlert as GiftEvent).repeatCount}
                </span>
              </div>
              <div className="text-[11px] text-[#B9FF66] font-bold flex items-center gap-1 mt-0.5">
                <Gem className="w-3 h-3" />
                {(currentAlert as GiftEvent).diamondCount} Diamantes
              </div>
            </div>
          )}

          {currentAlert.type === 'follow' && (
            <div>
              <div className="text-xs text-slate-300 font-medium">¡Nuevo Seguidor!</div>
              <div className="text-sm font-bold text-white">
                {(currentAlert as FollowEvent).nickname}
              </div>
              <div className="text-[11px] text-[#B9FF66]">Se unió a la comunidad</div>
            </div>
          )}

          {currentAlert.type === 'share' && (
            <div>
              <div className="text-xs text-slate-300 font-medium">¡Transmisión Compartida!</div>
              <div className="text-sm font-bold text-white">
                {(currentAlert as ShareEvent).nickname}
              </div>
              <div className="text-[11px] text-[#B9FF66]">Gracias por el apoyo</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
