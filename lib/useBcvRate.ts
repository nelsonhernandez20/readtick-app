'use client';

import { useState, useEffect, useCallback } from 'react';

export interface BcvRateState {
  tasa: number | null;
  totalBs: number | null;
  fecha: string | null;
  fuente: string | null;
  isLoading: boolean;
  isFallback: boolean;
  error: string | null;
  formattedTasa: string;
  formattedTotalBs: string;
  refetch: () => Promise<void>;
}

const FALLBACK_TASA = 52.85;

export function useBcvRate(montoUsd: number = 3): BcvRateState {
  const [tasa, setTasa] = useState<number | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);
  const [fuente, setFuente] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // 1. Intentar endpoint interno de Next.js
    try {
      const res = await fetch('/api/tasa-bcv', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.tasa && typeof data.tasa === 'number') {
          setTasa(data.tasa);
          setFecha(data.fecha || null);
          setFuente(data.fuente || 'Banco Central de Venezuela');
          setIsFallback(Boolean(data.isFallback));
          setIsLoading(false);
          return;
        }
      }
    } catch (apiErr) {
      console.warn('Fallo ruta interna /api/tasa-bcv, intentando conexión directa con DolarApi:', apiErr);
    }

    // 2. Respaldo directo en cliente a DolarApi
    try {
      const directRes = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (directRes.ok) {
        const directData = await directRes.json();
        const rate = Number(directData.promedio || directData.venta || directData.compra);
        if (rate && !isNaN(rate)) {
          setTasa(rate);
          setFecha(directData.fechaActualizacion || null);
          setFuente('Banco Central de Venezuela (DolarApi)');
          setIsFallback(false);
          setIsLoading(false);
          return;
        }
      }
    } catch (directErr) {
      console.warn('Fallo conexión directa a DolarApi:', directErr);
    }

    // 3. Fallback estático
    setTasa(FALLBACK_TASA);
    setFecha(new Date().toISOString());
    setFuente('Tasa de referencia (Offline)');
    setIsFallback(true);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  const activeTasa = tasa || FALLBACK_TASA;
  const rawTotalBs = Number((montoUsd * activeTasa).toFixed(2));

  // Formato venezolano: miles con punto y decimales con coma (ej. 158,55)
  const formatBs = (num: number) => {
    return num.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return {
    tasa: activeTasa,
    totalBs: rawTotalBs,
    fecha,
    fuente,
    isLoading,
    isFallback,
    error,
    formattedTasa: formatBs(activeTasa),
    formattedTotalBs: formatBs(rawTotalBs),
    refetch: fetchRate,
  };
}
