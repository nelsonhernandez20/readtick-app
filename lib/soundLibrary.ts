import { createClient, isSupabaseConfigured } from '@/utils/supabase/client';

export interface StoredSound {
  id: string;
  user_email: string;
  nombre: string;
  audio_url: string;
  file_size?: number;
  created_at: string;
}

/**
 * Consulta la lista de audios/canciones personalizadas guardadas en Supabase para el streamer.
 */
export async function fetchUserSounds(userEmail?: string | null): Promise<StoredSound[]> {
  if (!userEmail || !isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('biblioteca_sonidos')
      .select('*')
      .eq('user_email', userEmail.trim().toLowerCase())
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error al consultar biblioteca de sonidos en Supabase:', error.message);
      return [];
    }

    return (data as StoredSound[]) || [];
  } catch (err) {
    console.warn('Fallo de conexión al cargar biblioteca de sonidos:', err);
    return [];
  }
}

/**
 * Sube un archivo de audio a Supabase Storage (bucket 'sonidos') y guarda su registro en la tabla 'biblioteca_sonidos'.
 */
export async function uploadSoundToSupabase(
  userEmail: string,
  file: File,
  customName?: string
): Promise<{ success: boolean; sound?: StoredSound; error?: string }> {
  if (!userEmail || !isSupabaseConfigured()) {
    return { success: false, error: 'Supabase no está configurado o no has iniciado sesión.' };
  }

  // Validar tamaño máximo (1 MB)
  if (file.size > 1 * 1024 * 1024) {
    return { success: false, error: 'El archivo supera el límite permitido (máximo 1MB).' };
  }

  try {
    const supabase = createClient();
    const cleanEmail = userEmail.trim().toLowerCase();
    const safeEmailPrefix = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

    // Extension y nombre limpio
    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const storagePath = `${safeEmailPrefix}/${Date.now()}-${randomSuffix}.${ext}`;

    // Determinar MIME type exacto para que el navegador lo reconozca y reproduzca sin problemas
    let mimeType = file.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (ext === 'mp3') mimeType = 'audio/mpeg';
      else if (ext === 'wav') mimeType = 'audio/wav';
      else if (ext === 'ogg') mimeType = 'audio/ogg';
      else if (ext === 'm4a' || ext === 'aac') mimeType = 'audio/mp4';
      else if (ext === 'webm') mimeType = 'audio/webm';
      else mimeType = 'audio/mpeg';
    }

    // 1. Subir a Supabase Storage (bucket 'sonidos')
    const { error: uploadError } = await supabase.storage
      .from('sonidos')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: mimeType,
      });

    if (uploadError) {
      console.error('Error al subir archivo a Supabase Storage:', uploadError);
      if (uploadError.message.includes('Bucket not found')) {
        return {
          success: false,
          error: 'El bucket "sonidos" aún no existe en tu Supabase. Por favor ejecuta el script SQL en Supabase para crearlo.',
        };
      }
      return { success: false, error: `Error al subir audio: ${uploadError.message}` };
    }

    // 2. Obtener la URL pública permanente del audio
    const {
      data: { publicUrl },
    } = supabase.storage.from('sonidos').getPublicUrl(storagePath);

    if (!publicUrl) {
      return { success: false, error: 'No se pudo generar la URL pública de Supabase.' };
    }

    // 3. Registrar en la tabla 'biblioteca_sonidos'
    const displayName = (customName || file.name.replace(/\.[^/.]+$/, '')).trim();

    const { data: inserted, error: dbError } = await supabase
      .from('biblioteca_sonidos')
      .insert({
        user_email: cleanEmail,
        nombre: displayName,
        audio_url: publicUrl,
        file_size: file.size,
      })
      .select('*')
      .single();

    if (dbError) {
      console.error('Error al guardar registro en biblioteca_sonidos:', dbError);
      // Aunque falle la tabla, devolvemos el sound con la URL para que no se pierda la subida
      const fallbackSound: StoredSound = {
        id: `s-${Date.now()}`,
        user_email: cleanEmail,
        nombre: displayName,
        audio_url: publicUrl,
        file_size: file.size,
        created_at: new Date().toISOString(),
      };
      return { success: true, sound: fallbackSound };
    }

    return { success: true, sound: inserted as StoredSound };
  } catch (err: any) {
    console.error('Error general al subir sonido a Supabase:', err);
    return { success: false, error: err.message || 'Error inesperado al conectar con Supabase.' };
  }
}

/**
 * Elimina un sonido de la tabla 'biblioteca_sonidos' y de Supabase Storage.
 */
export async function deleteSoundFromSupabase(
  userEmail: string,
  sound: StoredSound
): Promise<boolean> {
  if (!userEmail || !isSupabaseConfigured()) return false;
  try {
    const supabase = createClient();
    const cleanEmail = userEmail.trim().toLowerCase();

    // 1. Eliminar de la base de datos
    await supabase
      .from('biblioteca_sonidos')
      .delete()
      .match({ id: sound.id, user_email: cleanEmail });

    // 2. Intentar eliminar del Storage si es URL de nuestro bucket
    try {
      if (sound.audio_url.includes('/sonidos/')) {
        const parts = sound.audio_url.split('/sonidos/');
        if (parts.length > 1) {
          const rawPath = decodeURIComponent(parts[1]);
          await supabase.storage.from('sonidos').remove([rawPath]);
        }
      }
    } catch {
      // Ignorar error de storage si ya no existe el archivo físico
    }

    return true;
  } catch (err) {
    console.error('Error al eliminar sonido de Supabase:', err);
    return false;
  }
}
