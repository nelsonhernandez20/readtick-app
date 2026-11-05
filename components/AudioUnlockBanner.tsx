'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, CheckCircle2, Sparkles } from 'lucide-react';
import { audioEngine } from '@/lib/audioEngine';
import { ttsEngine } from '@/lib/ttsEngine';

export default function AudioUnlockBanner() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    // Check initial state
    if (audioEngine.isAudioUnlocked()) {
      setIsUnlocked(true);
    }
  }, []);

  const handleUnlock = async () => {
    const success = await audioEngine.unlockAudio();
    ttsEngine.unlockTTS();
    if (success) {
      setIsUnlocked(true);
      setHasInteracted(true);
      // Play a quick subtle confirmation ding
      audioEngine.synthesizeDing(0.5);
      // Auto-hide success after 3 seconds
      setTimeout(() => setHasInteracted(false), 3000);
    }
  };

  if (isUnlocked && !hasInteracted) {
    return null;
  }

  return (
    <div className="w-full bg-[#191A23] border-b border-[#292A36] px-4 py-2.5 backdrop-blur-md">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2.5 text-[#F3F3F3]">
          <div className="p-1.5 rounded-full bg-[#B9FF66]/20 text-[#B9FF66] animate-pulse">
            <Volume2 className="w-4 h-4" />
          </div>
          <span>
            {isUnlocked ? (
              <strong className="text-[#B9FF66] flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-4 h-4" /> ¡Audio y TTS activados en tu navegador!
              </strong>
            ) : (
              <span>
                Para escuchar <strong>Alertas de Sonido</strong> y <strong>TTS</strong> en vivo, toca para autorizar el audio móvil.
              </span>
            )}
          </span>
        </div>

        {!isUnlocked && (
          <button
            onClick={handleUnlock}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#191A23] hover:bg-[#B9FF66]/10 text-[#B9FF66] border border-[#B9FF66] font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#B9FF66]" />
            Activar Audio y Voz
          </button>
        )}
      </div>
    </div>
  );
}
