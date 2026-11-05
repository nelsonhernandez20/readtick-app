'use client';

import React from 'react';
import {
  MicOff,
  Sparkles,
  Check,
  ExternalLink,
  Clock,
  X,
  Zap,
  Volume2,
} from 'lucide-react';
import { VoiceQuotaInfo } from '@/lib/subscription';

interface DailyLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceUsage: VoiceQuotaInfo;
  userEmail?: string | null;
}

export default function DailyLimitModal({
  isOpen,
  onClose,
  voiceUsage,
  userEmail,
}: DailyLimitModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#191A23] border border-[#292A36] rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Background Effect */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-to-b from-[#B9FF66]/15 via-emerald-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#111218] hover:bg-[#14151D] text-slate-400 hover:text-white border border-[#292A36] transition z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="p-6 text-center space-y-3 relative">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#B9FF66] p-[1.5px] shadow-lg shadow-[#B9FF66]/20">
            <div className="w-full h-full bg-[#191A23] rounded-[14px] flex items-center justify-center">
              <MicOff className="w-7 h-7 text-[#B9FF66]" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#B9FF66]/15 border border-[#B9FF66]/30 text-[#B9FF66]">
            <Clock className="w-3.5 h-3.5" />
            Límite Diario Alcanzado ({voiceUsage.count} / {voiceUsage.limit})
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
            Tus 300 alertas de voz gratuitas de hoy han finalizado
          </h3>

          <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
            Para garantizar la estabilidad del servidor, el plan gratuito incluye hasta{' '}
            <strong className="text-slate-200">300 alertas de voz al día</strong>. Tu cuota se reiniciará automáticamente mañana a las{' '}
            <strong className="text-slate-200">00:00 (medianoche)</strong>.
          </p>
        </div>

        {/* PRO Plan Upgrade Card */}
        <div className="px-6 pb-6 space-y-4">
          <div className="p-4 rounded-2xl bg-[#111218] border-2 border-[#B9FF66]/50 shadow-xl shadow-[#B9FF66]/10 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#B9FF66]">
                  Recomendado para streamers
                </span>
                <h4 className="text-base font-black text-white flex items-center gap-1.5 mt-0.5">
                  <Sparkles className="w-4 h-4 text-[#B9FF66]" />
                  <span>Plan Mensual PRO</span>
                </h4>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black text-white">$3.00</span>
                <span className="text-[10px] text-slate-400 block -mt-1">USD / mes (30 días)</span>
              </div>
            </div>

            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#B9FF66] shrink-0" />
                <span>Alertas de voz TTS <strong>100% ILIMITADAS</strong> (sin cortes en tus directos)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#B9FF66] shrink-0" />
                <span>Sonidos de regalos prioritarios y sin retraso</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-[#B9FF66] shrink-0" />
                <span>Efectos de voz exclusivos y filtro de groserías</span>
              </li>
            </ul>

            <a
              href="/pagos"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#B9FF66] hover:bg-[#a6f44d] text-[#191A23] font-black text-xs shadow-lg shadow-[#B9FF66]/20 transition active:scale-95"
            >
              <span>Desbloquear Alertas Ilimitadas ($3.00)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>{userEmail ? `Cuenta: ${userEmail}` : 'Sesión iniciada'}</span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white font-medium hover:underline text-xs"
            >
              Entendido, esperar a mañana
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
