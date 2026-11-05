'use client';

import React, { useState } from 'react';
import { Calculator, Copy, Check, RotateCw, TrendingUp } from 'lucide-react';
import { useBcvRate } from '@/lib/useBcvRate';

interface BcvRateCardProps {
  montoUsd?: number;
  className?: string;
  compact?: boolean;
}

export default function BcvRateCard({
  montoUsd = 3,
  className = '',
  compact = false,
}: BcvRateCardProps) {
  const {
    tasa,
    totalBs,
    fecha,
    fuente,
    isLoading,
    isFallback,
    formattedTasa,
    formattedTotalBs,
    refetch,
  } = useBcvRate(montoUsd);

  const [copied, setCopied] = useState(false);

  const handleCopyAmount = () => {
    if (!totalBs) return;
    // Copiar el monto con formato o numérico directo para el banco
    navigator.clipboard.writeText(totalBs.toFixed(2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br from-[#14151D] to-[#111218] border border-[#292A36] p-4 sm:p-5 shadow-lg relative overflow-hidden ${className}`}
    >
      {/* Decorative glow */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#B9FF66]/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header with live status and refresh */}
      <div className="flex items-center justify-between gap-2 border-b border-[#292A36]/60 pb-3 mb-3.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#B9FF66]/15 text-[#B9FF66]">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-white">
                Conversión a Bolívares (BCV)
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B9FF66] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B9FF66]"></span>
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {fuente || 'Tasa Oficial del Banco Central de Venezuela'}
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="p-1.5 rounded-lg bg-[#191A23] hover:bg-[#20222e] border border-[#292A36] text-slate-400 hover:text-white transition disabled:opacity-40"
          title="Actualizar tasa"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#B9FF66]' : ''}`} />
        </button>
      </div>

      {/* Rate calculation layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        {/* Left: Current official rate */}
        <div className="p-3 rounded-xl bg-[#191A23]/80 border border-[#292A36]/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Tasa Oficial BCV
            </span>
            <div className="text-base sm:text-lg font-black text-white font-mono flex items-baseline gap-1 mt-0.5">
              <span>Bs. {isLoading ? '...' : formattedTasa}</span>
              <span className="text-[11px] font-medium text-slate-400 font-sans">/ USD</span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#B9FF66]/10 text-[#B9FF66]">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        {/* Right: Total to transfer with copy button */}
        <div className="p-3 rounded-xl bg-[#B9FF66]/10 border border-[#B9FF66]/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#B9FF66] block">
              Monto a Transferir ({montoUsd}$ USD)
            </span>
            <div className="text-base sm:text-lg font-black text-white font-mono mt-0.5">
              Bs. {isLoading ? '...' : formattedTotalBs}
            </div>
          </div>

          <button
            onClick={handleCopyAmount}
            disabled={isLoading || !totalBs}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#B9FF66] hover:bg-[#a8f54b] text-[#191A23] text-xs font-black shadow-md shadow-[#B9FF66]/20 transition active:scale-95 disabled:opacity-50"
            title="Copiar monto en Bolívares"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Bs.</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Formula breakdown */}
      <div className="mt-3 pt-2.5 border-t border-[#292A36]/50 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-mono">Fórmula:</span>
          <span className="font-mono text-slate-300">
            ${montoUsd}.00 USD × Bs. {formattedTasa} = <strong className="text-[#B9FF66]">Bs. {formattedTotalBs}</strong>
          </span>
        </div>

        {isFallback ? (
          <span className="text-amber-400 text-[10px] font-medium">
            * Modo referencial
          </span>
        ) : fecha ? (
          <span className="text-[10px] text-slate-500">
            Actualizado: {new Date(fecha).toLocaleDateString('es-VE')}
          </span>
        ) : null}
      </div>
    </div>
  );
}
