import { createClient, isSupabaseConfigured } from '@/utils/supabase/client';

export const DAILY_VOICE_LIMIT = 0; // 0 = Ilimitado para todos los usuarios

export interface SubscriptionInfo {
  isPro: boolean;
  plan: 'free' | 'mensual';
  status: 'activo' | 'gratis' | 'expirado';
  daysRemaining: number;
  expiresAt: string | null;
  confirmedDate: string | null;
}

export interface VoiceQuotaInfo {
  count: number;
  limit: number;
  remaining: number;
  isLimitReached: boolean;
  dateKey: string;
}

// Variables para debounce de sincronización hacia Supabase
let syncTimeout: NodeJS.Timeout | null = null;
let pendingSyncEmail: string | null = null;
let pendingSyncCount: number = 0;

// Genera la clave de fecha YYYY-MM-DD local (se reinicia automáticamente a las 00:00)
export function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Obtiene el uso de alertas de voz de hoy desde la caché local (siempre ilimitado)
export function getDailyVoiceUsage(userEmail?: string | null): VoiceQuotaInfo {
  if (typeof window === 'undefined') {
    return {
      count: 0,
      limit: 0,
      remaining: 999999,
      isLimitReached: false,
      dateKey: getTodayKey(),
    };
  }

  const dateKey = getTodayKey();
  const storageKey = `readtick_tts_${userEmail ? userEmail.trim().toLowerCase() : 'anon'}_${dateKey}`;
  const stored = localStorage.getItem(storageKey);
  const count = stored ? parseInt(stored, 10) || 0 : 0;

  return {
    count,
    limit: 0,
    remaining: 999999,
    isLimitReached: false, // Voz 100% ilimitada
    dateKey,
  };
}

// Sincroniza en segundo plano hacia Supabase (con debounce para no saturar la red)
export function scheduleCloudSync(userEmail: string, count: number) {
  if (!isSupabaseConfigured() || !userEmail) return;

  pendingSyncEmail = userEmail.trim().toLowerCase();
  pendingSyncCount = count;

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    if (!pendingSyncEmail) return;
    const emailToSync = pendingSyncEmail;
    const countToSync = pendingSyncCount;
    const dateKey = getTodayKey();

    try {
      const supabase = createClient();
      await supabase.from('uso_diario_tts').upsert(
        {
          user_email: emailToSync,
          date_key: dateKey,
          voice_count: countToSync,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_email,date_key' }
      );
    } catch (err) {
      console.warn('Sincronización de cuota con Supabase omitida (se mantiene en caché):', err);
    }
  }, 2000);
}

// Incrementa en 1 la cuota diaria y programa la sincronización con Supabase
export function incrementDailyVoiceUsage(userEmail?: string | null): VoiceQuotaInfo {
  if (typeof window === 'undefined') {
    return getDailyVoiceUsage(userEmail);
  }

  const dateKey = getTodayKey();
  const storageKey = `readtick_tts_${userEmail ? userEmail.trim().toLowerCase() : 'anon'}_${dateKey}`;
  const current = getDailyVoiceUsage(userEmail);
  const newCount = current.count + 1;
  localStorage.setItem(storageKey, String(newCount));

  if (userEmail) {
    scheduleCloudSync(userEmail, newCount);
  }

  return {
    count: newCount,
    limit: 0,
    remaining: 999999,
    isLimitReached: false,
    dateKey,
  };
}

// Consulta Supabase para obtener el uso real en la nube y blindar contra incógnito o borrado de cookies
export async function fetchCloudDailyVoiceUsage(userEmail?: string | null): Promise<VoiceQuotaInfo> {
  const localUsage = getDailyVoiceUsage(userEmail);

  if (!userEmail || !isSupabaseConfigured()) {
    return localUsage;
  }

  try {
    const supabase = createClient();
    const cleanEmail = userEmail.trim().toLowerCase();
    const dateKey = getTodayKey();

    const { data, error } = await supabase
      .from('uso_diario_tts')
      .select('voice_count')
      .eq('user_email', cleanEmail)
      .eq('date_key', dateKey)
      .maybeSingle();

    if (error) {
      return localUsage;
    }

    const cloudCount = data?.voice_count ?? 0;
    const highestCount = Math.max(cloudCount, localUsage.count);

    if (typeof window !== 'undefined') {
      const storageKey = `readtick_tts_${cleanEmail}_${dateKey}`;
      localStorage.setItem(storageKey, String(highestCount));
    }

    if (localUsage.count > cloudCount) {
      scheduleCloudSync(cleanEmail, localUsage.count);
    }

    return {
      count: highestCount,
      limit: 0,
      remaining: 999999,
      isLimitReached: false,
      dateKey,
    };
  } catch (err) {
    console.warn('Error al consultar uso en la nube:', err);
    return localUsage;
  }
}

// Consulta si el usuario tiene una suscripción PRO activa (confirmada) en Supabase
export async function checkUserSubscription(userEmail?: string | null): Promise<SubscriptionInfo> {
  const defaultFree: SubscriptionInfo = {
    isPro: false,
    plan: 'free',
    status: 'gratis',
    daysRemaining: 0,
    expiresAt: null,
    confirmedDate: null,
  };

  if (!userEmail || !isSupabaseConfigured()) {
    return defaultFree;
  }

  try {
    const supabase = createClient();
    const cleanEmail = userEmail.trim().toLowerCase();

    // Consultamos si tiene algún reporte de pago confirmado
    const { data: reports, error } = await supabase
      .from('reportes_pago')
      .select('id, created_at, status, plan_type')
      .or(`sender_user.eq.${cleanEmail},user_identifier.eq.${cleanEmail}`)
      .in('status', ['confirmado', 'aprobado'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !reports || reports.length === 0) {
      return defaultFree;
    }

    const latestReport = reports[0];
    const createdDate = new Date(latestReport.created_at);

    // Plan Mensual: 30 días continuos de acceso PRO
    const durationDays = 30;
    const expiresDate = new Date(createdDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    const diffMs = expiresDate.getTime() - now.getTime();
    const isPro = diffMs > 0;
    const daysRemaining = isPro ? Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24))) : 0;

    return {
      isPro,
      plan: isPro ? 'mensual' : 'free',
      status: isPro ? 'activo' : 'expirado',
      daysRemaining,
      expiresAt: expiresDate.toISOString(),
      confirmedDate: latestReport.created_at,
    };
  } catch (err) {
    console.warn('Error al verificar suscripción en Supabase:', err);
    return defaultFree;
  }
}
