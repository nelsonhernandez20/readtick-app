import { NextRequest } from 'next/server';
import { WebcastPushConnection } from 'tiktok-live-connector/legacy';
import { RouteConfig, SignConfig } from 'tiktok-live-connector';
import { TikTokLiveEvent } from '@/types/tiktok';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Direct signature provider via our self-hosted signature microservice (or Render URL)
try {
  (RouteConfig as any).fetchWebcastSignatureFromProvider = async ({ url, userAgent }: any) => {
    const signServer = process.env.TIKTOK_SIGN_SERVER_URL || 'http://localhost:8080';
    const targetUrl = typeof url === 'string' ? url : url.toString();
    const ua =
      userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

    try {
      const res = await fetch(`${signServer}/tiktok/sign_url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, userAgent: ua }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.response?.signedUrl) {
          return data;
        }
      }
    } catch (err) {
      console.warn(`[Signer] Could not contact sign server at ${signServer}:`, err);
    }

    // Default fallback
    return {
      code: 200,
      message: 'OK',
      response: {
        signedUrl: targetUrl,
        userAgent: ua,
        tokens: { 'X-Bogus': 'bypass' },
      },
    };
  };
} catch (e) {
  console.warn('Could not override fetchWebcastSignatureFromProvider:', e);
}

function normalizeSignServerUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '');
}

/** Render Free apaga el signer tras ~15 min; el primer request puede tardar ~30–60s. */
async function ensureSignServerReady(signServerUrl: string): Promise<void> {
  const base = normalizeSignServerUrl(signServerUrl);
  if (base.startsWith('http://localhost') || base.startsWith('http://127.0.0.1')) {
    return;
  }

  const attempts = 4;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(`${base}/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(60_000),
      });
      if (res.ok) return;
    } catch (err) {
      console.warn(`[Signer] Health check ${i}/${attempts} failed for ${base}:`, err);
    }
    if (i < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  throw new Error(
    'El servidor de firmas (readtik-signer) no respondió. En Render Free puede tardar hasta 1 minuto en despertar: abre https://readtik-signer.onrender.com/health en el navegador y vuelve a conectar.',
  );
}

function configureSignServerBasePath(signServerUrl: string): void {
  const base = normalizeSignServerUrl(signServerUrl);
  const cfg = SignConfig as { basePath?: string; cachedInstance?: unknown };
  if (cfg.basePath !== base) {
    cfg.basePath = base;
    cfg.cachedInstance = undefined;
  }
}

// Global active streams registry to ensure clean disconnections
const activeStreamCleanupMap = new Map<string, () => void>();

export async function POST(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  let username = searchParams.get('username') || '';
  username = username.trim().replace(/^@/, '');

  if (username && activeStreamCleanupMap.has(username)) {
    const cleanup = activeStreamCleanupMap.get(username);
    if (cleanup) {
      try {
        cleanup();
      } catch (err) {
        console.warn(`Error cleaning up stream for ${username}:`, err);
      }
    }
    activeStreamCleanupMap.delete(username);
    return new Response(JSON.stringify({ success: true, message: `Desconectado @${username}` }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } else if (!username) {
    // Terminate all running streams
    activeStreamCleanupMap.forEach((cleanup, user) => {
      try {
        cleanup();
      } catch (err) {
        console.warn(`Error cleaning up stream for ${user}:`, err);
      }
    });
    activeStreamCleanupMap.clear();
    return new Response(JSON.stringify({ success: true, message: 'Todas las transmisiones desconectadas' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, message: 'No había conexiones activas' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  let username = searchParams.get('username') || '';

  // Clean username: remove @ and any whitespace
  username = username.trim().replace(/^@/, '');

  if (!username) {
    return new Response(JSON.stringify({ error: 'Username is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // If there was an existing connection for this username, cleanly abort it before starting a new one
  if (activeStreamCleanupMap.has(username)) {
    try {
      activeStreamCleanupMap.get(username)!();
    } catch (e) {
      console.warn('Error closing existing stream for user:', username, e);
    }
    activeStreamCleanupMap.delete(username);
  }

  const encoder = new TextEncoder();
  let tiktokConnection: WebcastPushConnection | null = null;
  let heartbeatInterval: NodeJS.Timeout | null = null;
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // tiktok-live-connector/legacy a veces lanza en mensajes "top viewer" sin romper el stream
      const onUnhandledRejection = (reason: unknown) => {
        console.warn('[TikTok] Parser non-fatal (top viewer / proto):', reason);
      };
      process.on('unhandledRejection', onUnhandledRejection);

      const cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        process.off('unhandledRejection', onUnhandledRejection);
        if (activeStreamCleanupMap.get(username) === cleanup) {
          activeStreamCleanupMap.delete(username);
        }
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        if (tiktokConnection) {
          try {
            tiktokConnection.removeAllListeners();
            (tiktokConnection as any).wsClient?.terminate?.();
            tiktokConnection.disconnect().catch(() => {});
          } catch (e) {
            console.warn('Error disconnecting TikTok client:', e);
          }
        }
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      activeStreamCleanupMap.set(username, cleanup);

      const sendEvent = (event: TikTokLiveEvent) => {
        if (isClosed) return;
        try {
          const payload = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (err) {
          cleanup();
        }
      };

      const sendComment = (comment: string) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`: ${comment}\n\n`));
        } catch {
          cleanup();
        }
      };

      // Heartbeat every 15 seconds to keep connection alive
      heartbeatInterval = setInterval(() => {
        sendComment('heartbeat');
      }, 15000);

      // Signal connecting status
      sendEvent({
        type: 'status',
        status: 'connecting',
        message: `Conectando con el directo de @${username}...`,
        timestamp: Date.now(),
      });

      try {
        const signServerUrl = process.env.TIKTOK_SIGN_SERVER_URL || 'http://localhost:8080';
        configureSignServerBasePath(signServerUrl);

        sendEvent({
          type: 'status',
          status: 'connecting',
          message: 'Preparando servidor de firmas (Render Free puede tardar ~30s)...',
          timestamp: Date.now(),
        });
        await ensureSignServerReady(signServerUrl);

        const apiKey = process.env.EULERSTREAM_API_KEY || searchParams.get('apiKey') || '';
        const sessionId = process.env.TIKTOK_SESSION_ID || searchParams.get('sessionId') || '';

        if (apiKey) {
          SignConfig.apiKey = apiKey;
        }

        const connectionConfig: Record<string, any> = {
          processInitialData: false,
          enableExtendedGiftInfo: false,
          fetchRoomInfoOnConnect: false,
        };

        if (apiKey) {
          connectionConfig.signApiKey = apiKey;
        }

        if (sessionId) {
          connectionConfig.session = {
            cookie: {
              type: 'cookie',
              value: {
                sessionId: sessionId,
                ttTargetIdc: 'useast1a',
              },
            },
          };
        }

        tiktokConnection = new WebcastPushConnection(username, connectionConfig);

        // Detect if username is a numeric roomId (e.g. 7701823477090683666)
        const isNumericRoomId = /^\d{15,}$/.test(username);
        const connectPromise = isNumericRoomId 
          ? tiktokConnection.connect(username) 
          : tiktokConnection.connect();

        // Event: Connected
        connectPromise
          .then((state) => {
            sendEvent({
              type: 'status',
              status: 'connected',
              roomId: state.roomId,
              message: `¡Conectado exitosamente al directo de @${username}!`,
              timestamp: Date.now(),
            });
          })
          .catch((err) => {
            const errMsg = err?.message || 'No se pudo conectar a la transmisión';
            let friendlyMsg = `Error al conectar: ${errMsg}`;

            if (errMsg.includes('isn\'t online') || errMsg.includes('offline') || errMsg.includes('Failed to retrieve Room ID') || errMsg.includes('LIVE has ended')) {
              friendlyMsg = `@${username} no está transmitiendo en vivo actualmente. Inicia tu directo en TikTok y vuelve a intentar, o ingresa el Room ID numérico del live.`;
            } else if (errMsg.includes('Business plan') || errMsg.includes('PremiumFeature') || errMsg.includes('Failed to sign')) {
              friendlyMsg = `No se pudo verificar la firma de la transmisión. Verifica que el directo esté público y vuelve a intentar.`;
            } else if (errMsg.includes('Rate Limited') || errMsg.includes('Too many connections')) {
              friendlyMsg = `Límite de solicitudes temporales alcanzado. Espera unos momentos antes de volver a conectar.`;
            } else if (errMsg.includes('502') || errMsg.includes('Bad Gateway')) {
              friendlyMsg =
                'El servidor de firmas está despertando o no está disponible (502). Espera ~1 minuto, abre https://readtik-signer.onrender.com/health y vuelve a conectar.';
            }

            sendEvent({
              type: 'status',
              status: 'error',
              message: friendlyMsg,
              timestamp: Date.now(),
            });
          });

        // Event: Chat Message
        tiktokConnection.on('chat', (data: any) => {
          const commentText = (data.comment || data.content || data.text || '').trim();
          sendEvent({
            type: 'chat',
            id: data.msgId || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            uniqueId: data.uniqueId || data.user?.displayId || 'anónimo',
            nickname: data.nickname || data.user?.nickname || data.uniqueId || 'Anónimo',
            comment: commentText,
            profilePictureUrl: data.profilePictureUrl || data.userDetails?.profilePictureUrls,
            isModerator: !!data.isModerator,
            isSubscriber: !!data.isSubscriber,
            timestamp: Date.now(),
          });
        });

        // Event: Emote Chat Message
        tiktokConnection.on('emote', (data: any) => {
          sendEvent({
            type: 'chat',
            id: data.msgId || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            uniqueId: data.uniqueId || data.user?.displayId || 'anónimo',
            nickname: data.nickname || data.user?.nickname || data.uniqueId || 'Anónimo',
            comment: '😊 (emoticono)',
            profilePictureUrl: data.profilePictureUrl || data.userDetails?.profilePictureUrls,
            isModerator: !!data.isModerator,
            isSubscriber: !!data.isSubscriber,
            timestamp: Date.now(),
          });
        });

        // Event: Gift
        tiktokConnection.on('gift', (data: any) => {
          // We pass gifts through. Streaks will have repeatEnd: true on final streak or giftType === 1
          const giftName = data.giftName || data.giftDetails?.giftName || data.extendedGiftInfo?.name || data.gift?.name || 'Regalo';
          const diamondUnit = data.diamondCount ?? data.giftDetails?.diamondCount ?? data.extendedGiftInfo?.diamond_count ?? data.gift?.diamond_count ?? 1;
          const repeatCount = data.repeatCount || data.gift?.repeat_count || 1;
          const giftPictureUrl = data.giftPictureUrl || data.giftDetails?.giftImage?.url?.[0] || data.extendedGiftInfo?.image?.url_list?.[0] || data.gift?.picture_url;

          sendEvent({
            type: 'gift',
            id: `${data.msgId || Date.now()}-${data.giftId || 'gift'}`,
            uniqueId: data.uniqueId || data.user?.displayId || 'anónimo',
            nickname: data.nickname || data.user?.nickname || data.uniqueId || 'Anónimo',
            profilePictureUrl: data.profilePictureUrl || data.userDetails?.profilePictureUrls,
            giftId: data.giftId || data.gift?.gift_id || '0',
            giftName,
            diamondCount: diamondUnit * repeatCount,
            repeatCount,
            repeatEnd: data.repeatEnd !== false,
            giftPictureUrl,
            timestamp: Date.now(),
          });
        });

        // Event: Like
        tiktokConnection.on('like', (data) => {
          sendEvent({
            type: 'like',
            id: `like-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            uniqueId: data.uniqueId || 'espectador',
            nickname: data.nickname || data.uniqueId || 'Espectador',
            profilePictureUrl: data.profilePictureUrl,
            likeCount: data.likeCount || 1,
            totalLikeCount: data.totalLikeCount || 0,
            timestamp: Date.now(),
          });
        });

        // Event: Follow
        tiktokConnection.on('follow', (data) => {
          sendEvent({
            type: 'follow',
            id: `follow-${Date.now()}-${data.uniqueId}`,
            uniqueId: data.uniqueId || 'espectador',
            nickname: data.nickname || data.uniqueId || 'Nuevo seguidor',
            profilePictureUrl: data.profilePictureUrl,
            timestamp: Date.now(),
          });
        });

        // Event: Share
        tiktokConnection.on('share', (data) => {
          sendEvent({
            type: 'share',
            id: `share-${Date.now()}-${data.uniqueId}`,
            uniqueId: data.uniqueId || 'espectador',
            nickname: data.nickname || data.uniqueId || 'Espectador',
            profilePictureUrl: data.profilePictureUrl,
            timestamp: Date.now(),
          });
        });

        // Event: Viewer count
        tiktokConnection.on('roomUser', (data) => {
          if (data && typeof data.viewerCount === 'number') {
            sendEvent({
              type: 'roomUser',
              viewerCount: data.viewerCount,
              timestamp: Date.now(),
            });
          }
        });

        // Event: Stream End
        tiktokConnection.on('streamEnd', () => {
          sendEvent({
            type: 'status',
            status: 'ended',
            message: `El directo de @${username} ha finalizado.`,
            timestamp: Date.now(),
          });
        });

        // Event: Disconnected
        tiktokConnection.on('disconnected', () => {
          sendEvent({
            type: 'status',
            status: 'disconnected',
            message: 'Desconectado de TikTok Live.',
            timestamp: Date.now(),
          });
        });

        // Event: Error
        tiktokConnection.on('error', (err) => {
          console.error('TikTok connection error:', err);
          sendEvent({
            type: 'status',
            status: 'error',
            message: err?.message || 'Error en la conexión con TikTok',
            timestamp: Date.now(),
          });
        });

      } catch (err: unknown) {
        const error = err as Error;
        console.error('Failed to initialize TikTok connection:', error);
        sendEvent({
          type: 'status',
          status: 'error',
          message: error?.message || 'Error al inicializar la conexión',
          timestamp: Date.now(),
        });
      }

      // Cleanup when request is aborted by client
      req.signal.addEventListener('abort', () => {
        cleanup();
      });
    },
    cancel() {
      // Stream canceled by runtime
      isClosed = true;
      activeStreamCleanupMap.delete(username);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (tiktokConnection) {
        try {
          tiktokConnection.removeAllListeners();
          (tiktokConnection as any).wsClient?.terminate?.();
          tiktokConnection.disconnect().catch(() => {});
        } catch {
          // ignore
        }
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
