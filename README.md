# 📱 TikFinity Mobile — Sound Alerts y TTS para TikTok Live (Next.js)

Una réplica de alta fidelidad y código abierto con las funciones esenciales de **TikFinity Mobile** ([tikfinity.zerody.one/mobile](https://tikfinity.zerody.one/mobile)), desarrollada con **Next.js 14**, **TypeScript**, **Tailwind CSS** y **tiktok-live-connector**.

Diseñada especialmente para creadores de contenido que transmiten en TikTok Live desde su teléfono móvil o PC y necesitan alertas de sonido y lectura de voz (TTS) en tiempo real para interactuar con su audiencia sin descuidar la pantalla.

---

## 🚀 Características Principales

### 1. 🎙️ Text-to-Speech (TTS) en Vivo
- **Lectura por voz del chat**: Escucha los mensajes de tus espectadores en tiempo real mientras juegas o transmites desde el móvil.
- **Alertas habladas de eventos**: Anuncia automáticamente nuevos regalos, seguidores y compartidos (*ej. "¡Carlos envió una Galaxia!"*).
- **Selector de voces**: Compatible con todas las voces del sistema del navegador (Español latino, España, Inglés, etc.).
- **Control de velocidad y tono**: Ajusta la velocidad de habla (0.5x a 2.0x) y el tono (pitch).
- **Filtro de spam y comandos**: Ignora automáticamente comandos que comiencen por `!` o `/` y limita la longitud máxima de caracteres.
- **Cola inteligente (Speech Queue)**: Las frases se forman en cola secuencial para no superponerse ni cortarse.

### 2. 🔊 Alertas de Sonido (Sound Alerts / SFX)
- **Sintetizador Web Audio nativo**: Sonidos nítidos y ultra rápidos generados en tiempo real sin depender de servidores de audio externos:
  - 🪙 **Coin**: Chime estilo Mario / TikTok para regalos.
  - 🎺 **Fanfarria de Victoria**: Ideal para regalos grandes (Galaxia, León, etc.).
  - 📢 **Airhorn Hype**: Clásico sonido de bocina de stream.
  - ⭐ **Level Up (8-bit)**: Chime retro para nuevos seguidores.
  - 🔔 **Ding**: Notificación limpia para likes.
  - 👏 **Aplausos / Ovación**: Sonido de multitud vitoreando.
  - ✨ **Chime**: Notificación brillante para compartidos.
- **Soporte para audios personalizados**: Puedes ingresar la URL de cualquier archivo `.mp3` o `.wav`.
- **Cola de reproducción**: Evita saturación y ruido caótico si llegan muchos regalos a la vez.

### 3. 📱 Interfaz Mobile-First Estilo TikTok
- **Conexión con 1 solo clic**: Solo ingresa tu nombre de usuario (`@tu_usuario`), sin contraseñas, tokens de API ni registros.
- **Contador en vivo**: Visualiza espectadores actuales, me gusta acumulados, número de regalos y diamantes totales.
- **Historial de eventos con pestañas**: Filtra por Todo, Chat, Regalos, Likes o Seguidores.
- **Replay**: Puedes volver a escuchar cualquier comentario con TTS o repetir el sonido de cualquier regalo con un botón.
- **Banner flotante con confeti**: Ventana emergente animada en pantalla y explosión de confeti en regalos importantes.

### 4. 🎮 Simulador de Eventos Integrado
- Permite probar **todo** (sonidos, voces, alertas visuales y confeti) incluso cuando no estés transmitiendo en vivo en TikTok.
- Botones de 1 clic:
  - Simular mensaje de chat
  - Simular Rosa (1 Diamante)
  - Simular Corona (99 Diamantes)
  - Simular Galaxia (1,000 Diamantes)
  - Simular Nuevo Seguidor
  - Simular Likes (+50)
  - Simular Compartido

### 5. 🎥 Overlay para OBS Studio y Navegador
- Ruta dedicada transparente: `/overlay?username=tu_usuario`
- Puedes agregarla como fuente de navegador en **OBS Studio**, **Streamlabs** o **TikTok LIVE Studio**.

### 6. 🔐 Autenticación con Supabase (Email y Contraseña)
- **Pantalla previa de Login / Registro**: Si el usuario no ha iniciado sesión, el middleware lo redirige automáticamente a `/login`.
- **Registro e inicio de sesión**: Con correo electrónico y contraseña.
- **Rutas públicas**: La pantalla de Overlay para OBS (`/overlay`) y la API de TikTok se mantienen accesibles sin forzar login.
- **Cierre de sesión**: Botón de Logout directo en la barra superior del dashboard.
- **Configuración rápida**: Basta con agregar tus claves en `.env.local`:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-publica
  ```

---

## 📂 Estructura del Proyecto

```text
readtick/
├── app/
│   ├── api/tiktok/stream/route.ts  # Endpoint SSE con WebcastPushConnection
│   ├── overlay/page.tsx            # Overlay transparente para OBS
│   ├── globals.css                 # Estilos globales y animaciones TikFinity
│   ├── layout.tsx                  # Layout con metadatos móviles
│   └── page.tsx                    # Dashboard principal TikFinity Mobile
├── components/
│   ├── AlertOverlay.tsx            # Alerta animada con confeti
│   ├── AudioUnlockBanner.tsx       # Desbloqueador de audio móvil
│   ├── EventFeed.tsx               # Feed de chat y eventos con filtros
│   ├── Header.tsx                  # Barra superior y accesos rápidos
│   ├── QuickStats.tsx              # Tarjetas de estadísticas (Viewers, Likes, etc)
│   ├── SettingsModal.tsx           # Modal completo de configuración TTS y Sonidos
│   ├── SimulatorDrawer.tsx         # Simulador de eventos para pruebas
│   └── StreamerConnect.tsx         # Formulario de conexión al Live
├── lib/
│   ├── audioEngine.ts              # Motor Web Audio y sintetizador de SFX
│   ├── soundConfig.ts              # Catálogo de sonidos y valores por defecto
│   └── ttsEngine.ts                # Motor de SpeechSynthesis con cola
├── types/
│   └── tiktok.ts                   # Tipos TypeScript para eventos y configs
├── package.json
└── tailwind.config.ts
```

---

## 🛠️ Instalación y Ejecución

### Prerrequisitos
- **Node.js** v18 o superior (v20 recomendado)
- **pnpm** (o npm / yarn)

### Pasos

1. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

2. **Ejecutar en modo desarrollo:**
   ```bash
   pnpm dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

3. **Compilar para producción:**
   ```bash
   pnpm build
   pnpm start
   ```

---

## 📱 Uso en Móvil (Smartphones)

1. Abre la aplicación en el navegador de tu teléfono móvil (Chrome o Safari).
2. Toca el botón superior **"Activar Audio y Voz"** (los navegadores móviles bloquean el audio automático hasta la primera interacción del usuario).
3. Escribe tu usuario de TikTok y pulsa **"Conectar al Live"**.
4. ¡Listo! Puedes minimizar o dejar la pantalla encendida mientras transmites, y escucharás las alertas y comentarios por el altavoz o auriculares.
