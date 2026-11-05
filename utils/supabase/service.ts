import { createClient } from '@supabase/supabase-js';

/** Cliente con service role: solo en Route Handlers / Server Actions, nunca en el cliente. */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey || url.includes('tu-proyecto') || serviceKey.includes('placeholder')) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
