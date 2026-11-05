'use client';

import React, { useState, useEffect } from 'react';
import { AtSign, Wifi, WifiOff, Loader2, Sparkles, X } from 'lucide-react';
import { StatusEvent } from '@/types/tiktok';

interface StreamerConnectProps {
  username: string;
  setUsername: (u: string) => void;
  status: StatusEvent['status'];
  statusMessage: string;
  onConnect: (user: string) => void;
  onDisconnect: () => void;
}

export default function StreamerConnect({
  username,
  setUsername,
  status,
  statusMessage,
  onConnect,
  onDisconnect,
}: StreamerConnectProps) {
  const [inputVal, setInputVal] = useState(username || '');

  useEffect(() => {
    setInputVal(username || '');
  }, [username]);

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  const handleAction = () => {
    if (isConnected || isConnecting) {
      onDisconnect();
    } else {
      const cleanUser = inputVal.trim().replace(/^@/, '');
      if (!cleanUser) return;
      setUsername(cleanUser);
      onConnect(cleanUser);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConnected || isConnecting) {
      return;
    }
    const cleanUser = inputVal.trim().replace(/^@/, '');
    if (!cleanUser) return;
    setUsername(cleanUser);
    onConnect(cleanUser);
  };

  return (
    <div className="bg-[#191A23] border border-[#292A36] rounded-2xl p-4 sm:p-5 shadow-xl">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-stretch">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <AtSign className="w-5 h-5 text-[#B9FF66]" />
          </div>
          <input
            type="text"
            name="readtik_streamer_search"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isConnected || isConnecting}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            data-lpignore="true"
            data-form-type="other"
            placeholder="Introduce tu usuario de TikTok o Room ID (ej. streamer123)"
            className="w-full bg-[#111218] border border-[#292A36] focus:border-[#B9FF66] focus:ring-1 focus:ring-[#B9FF66] rounded-xl pl-11 pr-10 py-3 text-sm text-[#F3F3F3] placeholder-slate-500 outline-none transition disabled:opacity-60"
          />
          {inputVal && !isConnected && !isConnecting && (
            <button
              type="button"
              onClick={() => {
                setInputVal('');
                setUsername('');
              }}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
              title="Borrar usuario"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAction();
            }}
            disabled={!isConnected && !isConnecting && !inputVal.trim()}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              isConnected || isConnecting
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30'
                : 'bg-[#B9FF66] hover:bg-[#a6f44d] text-[#191A23] shadow-lg shadow-[#B9FF66]/20'
            }`}
          >
            {isConnected || isConnecting ? (
              <>
                <WifiOff className="w-4 h-4" />
                {isConnecting ? 'Cancelar' : 'Desconectar'}
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                Conectar al Live
              </>
            )}
          </button>
        </div>
      </form>

      {/* Status & Help info */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          {status === 'connected' && (
            <span className="flex items-center gap-1.5 text-[#B9FF66] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#B9FF66] animate-pulse" />
              {statusMessage || `Conectado a @${username}`}
            </span>
          )}
          {status === 'connecting' && (
            <span className="flex items-center gap-1.5 text-amber-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              {statusMessage || 'Buscando transmisión en vivo...'}
            </span>
          )}
          {status === 'error' && (
            <span className="text-rose-400 font-medium">
              {statusMessage}
            </span>
          )}
          {status === 'disconnected' && (
            <span className="text-slate-400">
              {statusMessage || 'Sin conexión activa. Ingresa tu usuario y conéctate.'}
            </span>
          )}
          {status === 'ended' && (
            <span className="text-blue-400">
              {statusMessage || 'La transmisión ha finalizado.'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex items-center gap-1 text-slate-500">
            <Sparkles className="w-3 h-3 text-[#B9FF66]" />
            Sin contraseña ni token de stream
          </span>
        </div>
      </div>
    </div>
  );
}
