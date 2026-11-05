/**
 * Admins del panel /cobros (solo servidor). No afecta registro ni login de usuarios normales.
 * Debe coincidir con public.app_admins en Supabase para RLS.
 */
export function getAdminEmailAllowlist(): string[] {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = getAdminEmailAllowlist();
  if (allowlist.length === 0) return false;
  return allowlist.includes(email.trim().toLowerCase());
}
