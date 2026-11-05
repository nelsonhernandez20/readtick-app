import { createClient, isSupabaseConfigured } from '@/utils/supabase/client';

/**
 * Consulta la biblioteca de palabras prohibidas guardadas en Supabase para el usuario.
 */
export async function fetchBannedWordsLibrary(userEmail?: string | null): Promise<string[]> {
  if (!userEmail || !isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('biblioteca_palabras')
      .select('palabras')
      .eq('user_email', userEmail.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      console.warn('Error al cargar biblioteca de palabras desde Supabase:', error.message);
      return [];
    }

    if (data && Array.isArray(data.palabras)) {
      return data.palabras.filter((w): w is string => typeof w === 'string' && w.trim().length > 0);
    }
    return [];
  } catch (err) {
    console.warn('Fallo al consultar biblioteca de palabras en Supabase:', err);
    return [];
  }
}

/**
 * Guarda o actualiza la biblioteca de palabras prohibidas en Supabase.
 */
export async function saveBannedWordsLibrary(userEmail: string, words: string[]): Promise<boolean> {
  if (!userEmail || !isSupabaseConfigured()) return false;
  try {
    const supabase = createClient();
    // Normalizar y deduplicar preservando el formato original limpio
    const seen = new Set<string>();
    const cleanList: string[] = [];

    for (const w of words) {
      if (typeof w !== 'string') continue;
      const trimmed = w.trim();
      const lower = trimmed.toLowerCase();
      if (trimmed.length > 0 && !seen.has(lower)) {
        seen.add(lower);
        cleanList.push(trimmed);
      }
    }

    const { error } = await supabase
      .from('biblioteca_palabras')
      .upsert(
        {
          user_email: userEmail.trim().toLowerCase(),
          palabras: cleanList,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_email' }
      );

    if (error) {
      console.error('Error al guardar biblioteca en Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Fallo al conectar con Supabase para guardar biblioteca:', err);
    return false;
  }
}
