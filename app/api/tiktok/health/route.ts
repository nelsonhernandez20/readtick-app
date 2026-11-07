import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalize(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

/** Despierta readtik-web + signer en Render Free. La app móvil lo llama al conectar. */
export async function GET() {
  const signServer = normalize(process.env.TIKTOK_SIGN_SERVER_URL || '');
  if (!signServer || signServer.includes('localhost')) {
    return NextResponse.json({ ok: true, signer: 'local' });
  }

  for (let i = 1; i <= 4; i++) {
    try {
      const res = await fetch(`${signServer}/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(60_000),
      });
      if (res.ok) {
        return NextResponse.json({ ok: true, signer: true, attempt: i });
      }
    } catch (err) {
      console.warn(`[health] signer wake ${i}/4 failed:`, err);
    }
  }

  return NextResponse.json(
    { ok: false, signer: false, message: 'Signer aún despertando' },
    { status: 503 },
  );
}
