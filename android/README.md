# ReadTik Android (Kotlin)

App nativa con los **mismos colores** y **mismas funciones** que la web: conexión al live, TTS, alertas de sonido, feed, simulador, ajustes y ReadTik PRO.

La diferencia clave frente al navegador: usa un **servicio en primer plano**. Puedes abrir TikTok y la voz **sigue leyendo** mientras la notificación de ReadTik esté activa.

## Qué incluye

- Login / registro con Supabase (mismas cuentas que la web)
- Conectar al live con tu `@usuario` (mismo endpoint SSE `/api/tiktok/stream`)
- Lectura de chat, regalos, follows y shares
- Efectos de voz, plantillas, filtro de palabras, ignorar comandos
- Sonidos sintetizados (coin, fanfare, airhorn, ding, levelup, applause, chime)
- Audio personalizado por URL (PRO) y reglas por regalo
- Stats, feed con pestañas, replay TTS
- Simulador de eventos
- Pago móvil / reporte PRO hacia `reportes_pago`

No replica el overlay de OBS ni el panel `/cobros` (son de escritorio / admin).

## Cómo abrirla

1. Instala [Android Studio](https://developer.android.com/studio).
2. Copia `android/local.properties.example` a `android/local.properties`.
3. Completa:
   ```
   sdk.dir=/Users/TU_USUARIO/Library/Android/sdk
   READTIK_API_URL=https://TU-APP.onrender.com
   SIGNER_URL=https://readtik-signer.onrender.com
   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   ```
   Usa **las mismas claves** que en `.env.local` de la web y la URL pública de Render.
4. En Android Studio: **Open** → carpeta `android/`.
5. Ejecuta en un teléfono o emulador.

## Uso con TikTok (segundo plano)

1. Entra con tu cuenta.
2. Conecta tu usuario de TikTok.
3. Acepta la notificación persistente (“ReadTik escuchando el live”).
4. Si Android pregunta por **batería / sin restricciones**, acepta Permitir. Sin eso, Xiaomi/Samsung/Honor suelen matar el audio.
5. Cambia a la app de TikTok. Debes seguir oyendo comentarios y alertas.
6. No deslices ReadTik para cerrarla; déjala en segundo plano con la notificación visible.

Si se corta el audio: Ajustes → Apps → ReadTik → Batería → **Sin restricciones**.
