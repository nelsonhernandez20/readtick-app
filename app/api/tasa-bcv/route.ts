import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface BcvRateData {
  tasa: number;
  fecha: string | null;
  fuente: string;
  montoUsd: number;
  totalBs: number;
}

// Valor de respaldo por si el BCV o las APIs externas están temporalmente inaccesibles
const FALLBACK_TASA = 52.85;

export async function GET() {
  try {
    // 1. Intentar consultar DolarApi Venezuela (oficial BCV)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ReadTik/1.0',
        },
        next: { revalidate: 1800 }, // Caché de 30 minutos
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const tasa = Number(data.promedio || data.venta || data.compra);
        if (tasa && !isNaN(tasa) && tasa > 0) {
          const totalBs = Number((3 * tasa).toFixed(2));
          return NextResponse.json({
            success: true,
            tasa,
            fecha: data.fechaActualizacion || new Date().toISOString(),
            fuente: 'Banco Central de Venezuela (vía DolarApi)',
            montoUsd: 3,
            totalBs,
          } satisfies { success: boolean } & BcvRateData);
        }
      }
    } catch (primaryErr) {
      console.warn('DolarApi no disponible, probando respaldo Chitty BCV:', primaryErr);
    }

    // 2. Intentar fuente secundaria (Chitty BCV en GitHub Pages)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const resSecondary = await fetch('https://chitty400.github.io/chitty-bcv-api/latest.json', {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 1800 },
      });

      clearTimeout(timeoutId);

      if (resSecondary.ok) {
        const data = await resSecondary.json();
        const rawRate = data?.usd?.rate || data?.rate || data?.usd;
        const tasa = typeof rawRate === 'number' ? rawRate : parseFloat(String(rawRate).replace(',', '.'));
        if (tasa && !isNaN(tasa) && tasa > 0) {
          const totalBs = Number((3 * tasa).toFixed(2));
          return NextResponse.json({
            success: true,
            tasa,
            fecha: data?.usd?.date || data?.date || new Date().toISOString(),
            fuente: 'Banco Central de Venezuela (vía Chitty BCV)',
            montoUsd: 3,
            totalBs,
          });
        }
      }
    } catch (secondaryErr) {
      console.warn('Respaldo Chitty BCV tampoco disponible:', secondaryErr);
    }

    // 3. Fallback seguro si no hay internet o ambas APIs fallan
    const totalBsFallback = Number((3 * FALLBACK_TASA).toFixed(2));
    return NextResponse.json({
      success: true,
      tasa: FALLBACK_TASA,
      fecha: new Date().toISOString(),
      fuente: 'Tasa estimada BCV (Respaldo)',
      montoUsd: 3,
      totalBs: totalBsFallback,
      isFallback: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Error al obtener la tasa',
        tasa: FALLBACK_TASA,
        totalBs: Number((3 * FALLBACK_TASA).toFixed(2)),
      },
      { status: 500 }
    );
  }
}
