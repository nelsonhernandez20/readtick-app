import { createClient } from '@/utils/supabase/server';
import { getAdminEmailAllowlist, isAdminEmail } from '@/lib/admin';

export type AdminSessionResult =
  | { ok: true; email: string; userId: string }
  | { ok: false; status: 401 | 403 | 503; message: string };

export async function requireAdminSession(): Promise<AdminSessionResult> {
  if (getAdminEmailAllowlist().length === 0) {
    return {
      ok: false,
      status: 503,
      message: 'ADMIN_EMAILS no está configurado en el servidor (.env.local).',
    };
  }

  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return { ok: false, status: 401, message: 'Debes iniciar sesión con una cuenta de administrador.' };
  }

  if (!isAdminEmail(user.email)) {
    return { ok: false, status: 403, message: 'Esta sección es solo para administradores.' };
  }

  return { ok: true, email: user.email, userId: user.id };
}
