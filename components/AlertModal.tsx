'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, Info, Trash2, X } from 'lucide-react';

export interface AlertModalConfig {
  isOpen: boolean;
  type?: 'warning' | 'error' | 'success' | 'info' | 'danger';
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  isConfirm?: boolean;
}

interface AlertModalProps {
  config: AlertModalConfig | null;
  onClose: () => void;
}

export default function AlertModal({ config, onClose }: AlertModalProps) {
  useEffect(() => {
    if (!config?.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (config.onCancel) config.onCancel();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config, onClose]);

  if (!config || !config.isOpen) return null;

  const type = config.type || 'info';

  const icons = {
    warning: <AlertTriangle className="w-6 h-6 text-amber-400" />,
    error: <AlertCircle className="w-6 h-6 text-rose-400" />,
    danger: <Trash2 className="w-6 h-6 text-rose-400" />,
    success: <CheckCircle2 className="w-6 h-6 text-[#B9FF66]" />,
    info: <Info className="w-6 h-6 text-[#B9FF66]" />,
  };

  const badgeBorders = {
    warning: 'border-amber-500/30 bg-amber-500/10 shadow-amber-500/10 text-amber-400',
    error: 'border-rose-500/30 bg-rose-500/10 shadow-rose-500/10 text-rose-400',
    danger: 'border-rose-500/30 bg-rose-500/10 shadow-rose-500/10 text-rose-400',
    success: 'border-[#B9FF66]/30 bg-[#B9FF66]/10 shadow-[#B9FF66]/10 text-[#B9FF66]',
    info: 'border-[#B9FF66]/30 bg-[#B9FF66]/10 shadow-[#B9FF66]/10 text-[#B9FF66]',
  };

  const handleConfirm = () => {
    if (config.onConfirm) {
      config.onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    if (config.onCancel) {
      config.onCancel();
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={handleCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#191A23] border border-[#292A36] rounded-2xl shadow-2xl overflow-hidden p-6 relative animate-slide-up"
      >
        {/* Botón cerrar X */}
        <button
          type="button"
          onClick={handleCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-[#F3F3F3] p-1 rounded-lg hover:bg-[#252631] transition"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          {/* Icono con contenedor temático */}
          <div className={`p-3 rounded-2xl border ${badgeBorders[type]} shrink-0 shadow-lg`}>
            {icons[type]}
          </div>

          {/* Textos */}
          <div className="space-y-1.5 flex-1 min-w-0 pr-4">
            <h3 className="text-base font-bold text-[#F3F3F3] tracking-wide">
              {config.title}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed break-words whitespace-pre-line">
              {config.message}
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          {config.isConfirm ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-xl bg-[#111218] hover:bg-[#252631] text-slate-300 text-xs font-semibold border border-[#292A36] transition"
              >
                {config.cancelLabel || 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-lg ${
                  type === 'danger' || type === 'error'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                    : 'bg-[#B9FF66] hover:bg-[#a6f44d] text-[#191A23] font-black shadow-[#B9FF66]/20'
                }`}
              >
                {config.confirmLabel || 'Aceptar'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#B9FF66] hover:bg-[#a6f44d] text-[#191A23] text-xs font-black shadow-lg shadow-[#B9FF66]/20 transition"
            >
              {config.confirmLabel || 'Entendido'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
