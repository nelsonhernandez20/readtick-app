'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Settings,
  PlayCircle,
  Radio,
  LogOut,
  User as UserIcon,
  CreditCard,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { StatusEvent } from '@/types/tiktok';
import { createClient, isSupabaseConfigured } from '@/utils/supabase/client';

interface HeaderProps {
  status: StatusEvent['status'];
  ttsEnabled: boolean;
  onToggleTTS: () => void;
  soundsEnabled: boolean;
  onToggleSounds: () => void;
  onOpenSettings: () => void;
  onOpenSimulator: () => void;
  username: string;
  isPro?: boolean;
  daysRemaining?: number;
  voiceUsage?: {
    count: number;
    limit: number;
    remaining: number;
    isLimitReached: boolean;
  };
  onOpenPaywall?: () => void;
}

export default function Header({
  status,
  ttsEnabled,
  onToggleTTS,
  soundsEnabled,
  onToggleSounds,
  onOpenSettings,
  onOpenSimulator,
  username,
  isPro = false,
  daysRemaining = 0,
  voiceUsage,
  onOpenPaywall,
}: HeaderProps) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    router.push('/login');
    router.refresh();
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#B9FF66]/15 text-[#B9FF66] border border-[#B9FF66]/30">
            <span className="w-2 h-2 rounded-full bg-[#B9FF66] animate-ping" />
            <span className="w-2 h-2 rounded-full bg-[#B9FF66] -ml-3.5" />
            EN VIVO
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Conectando...
          </span>
        );
      case 'ended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Finalizado
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#111218] text-slate-400 border border-[#292A36]">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            Desconectado
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#191A23]/95 backdrop-blur-md border-b border-[#292A36] px-4 sm:px-6 py-2.5 sm:py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="hidden sm:flex relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#B9FF66] p-[2px] shadow-lg shadow-[#B9FF66]/20 shrink-0">
            <div className="w-full h-full bg-[#191A23] rounded-[10px] flex items-center justify-center">
              <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-[#B9FF66] animate-pulse" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-lg font-black tracking-tight text-[#F3F3F3] flex items-center gap-1 truncate">
                Read<span className="text-[#B9FF66]">Tik</span>
              </h1>
              {/* Indicador de estado compacto para móviles (solo el punto con color) */}
              <div className="sm:hidden flex items-center shrink-0" title={`Estado: ${status}`}>
                <span
                  className={`w-2 h-2 rounded-full ${
                    status === 'connected'
                      ? 'bg-[#B9FF66] animate-pulse'
                      : status === 'connecting'
                      ? 'bg-amber-400 animate-pulse'
                      : status === 'error'
                      ? 'bg-rose-400'
                      : 'bg-slate-500'
                  }`}
                />
              </div>
              {/* Status Badge completo en tablets / desktops */}
              <div className="hidden sm:block">{getStatusBadge()}</div>
            </div>
            <p className="text-[11px] text-slate-400 hidden md:block truncate">
              Sound Alerts & Text-to-Speech (TTS)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Quick Sound Toggle */}
          <button
            onClick={onToggleSounds}
            title={soundsEnabled ? 'Silenciar sonidos de alerta' : 'Activar sonidos de alerta'}
            className={`p-2 rounded-lg transition-colors border shrink-0 ${
              soundsEnabled
                ? 'bg-[#191A23] text-[#B9FF66] border-[#B9FF66]/40 hover:bg-[#B9FF66]/10'
                : 'bg-rose-950/40 text-rose-400 border-rose-800/40 hover:bg-rose-900/30'
            }`}
          >
            {soundsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Quick TTS Toggle */}
          <button
            onClick={onToggleTTS}
            title={ttsEnabled ? 'Desactivar voz TTS' : 'Activar voz TTS'}
            className={`p-2 rounded-lg transition-colors border shrink-0 ${
              ttsEnabled
                ? 'bg-[#191A23] text-[#B9FF66] border-[#B9FF66]/40 hover:bg-[#B9FF66]/10'
                : 'bg-rose-950/40 text-rose-400 border-rose-800/40 hover:bg-rose-900/30'
            }`}
          >
            {ttsEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          {/* Test / Simulator Trigger */}
          <button
            onClick={onOpenSimulator}
            title="Abrir Simulador de Eventos"
            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-lg bg-[#191A23] hover:bg-[#252631] text-[#F3F3F3] border border-[#292A36] text-xs font-medium transition-colors shrink-0"
          >
            <PlayCircle className="w-4 h-4 text-[#B9FF66]" />
            <span className="hidden md:inline">Simular</span>
          </button>

          {/* Subscription / PRO Button - visible en móvil y desktop */}
          {isPro ? (
            <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-[#B9FF66]/15 border border-[#B9FF66]/40 text-[#B9FF66] text-xs font-bold shadow-sm shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-[#B9FF66]" />
              <span className="hidden sm:inline">PRO Ilimitado</span>
              <span className="sm:hidden text-xs">PRO</span>
              <span className="text-[10px] text-[#191A23] bg-[#B9FF66] px-1.5 py-0.5 rounded font-mono font-bold">
                {daysRemaining}d
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenPaywall}
              title="Activar Plan PRO"
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#191A23] hover:bg-[#B9FF66]/10 text-[#B9FF66] border border-[#B9FF66] text-xs font-bold shadow-md transition-all active:scale-95 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B9FF66]" />
              <span className="hidden sm:inline">Activar PRO</span>
              <span className="sm:hidden text-xs">PRO</span>
            </button>
          )}

          <a
            href="/descargar"
            title="Descargar app Android"
            className="p-2 rounded-lg bg-[#191A23] hover:bg-[#252631] text-[#F3F3F3] border border-[#292A36] transition-colors shrink-0"
          >
            <Smartphone className="w-4 h-4 text-[#B9FF66]" />
          </a>

          {/* Settings Modal Button */}
          <button
            onClick={onOpenSettings}
            title="Configuración de TTS y Sonidos"
            className="p-2 rounded-lg bg-[#191A23] hover:bg-[#252631] text-[#F3F3F3] border border-[#292A36] transition-colors shrink-0"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Profile / Logout Button */}
          {userEmail && (
            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#191A23] border border-[#292A36] text-xs text-[#F3F3F3] shrink-0">
              <UserIcon className="w-3.5 h-3.5 text-[#B9FF66]" />
              <span className="max-w-[120px] truncate">{userEmail}</span>
            </div>
          )}

          <button
            onClick={handleSignOut}
            title="Cerrar Sesión"
            className="p-2 rounded-lg bg-[#191A23] hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-[#292A36] hover:border-rose-800/40 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
