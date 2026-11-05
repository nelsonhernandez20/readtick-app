'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from '@/components/Header';
import AudioUnlockBanner from '@/components/AudioUnlockBanner';
import StreamerConnect from '@/components/StreamerConnect';
import QuickStats from '@/components/QuickStats';
import EventFeed from '@/components/EventFeed';
import AlertOverlay from '@/components/AlertOverlay';
import SettingsModal from '@/components/SettingsModal';
import SimulatorDrawer from '@/components/SimulatorDrawer';
import ProModal from '@/components/ProModal';
import { TikTokLiveEvent, GiftEvent, FollowEvent, ShareEvent, TTSSettings, SoundSettings, StatusEvent, CustomGiftSoundRule } from '@/types/tiktok';
import { audioEngine } from '@/lib/audioEngine';
import { ttsEngine, DEFAULT_TTS_SETTINGS, containsBannedWord } from '@/lib/ttsEngine';
import { DEFAULT_SOUND_SETTINGS, POPULAR_TIKTOK_GIFTS } from '@/lib/soundConfig';
import { createClient, isSupabaseConfigured } from '@/utils/supabase/client';
import { Sparkles } from 'lucide-react';
import {
  checkUserSubscription,
  SubscriptionInfo,
} from '@/lib/subscription';

export default function ReadTikApp() {
  const [username, setUsername] = useState<string>('');
  const [status, setStatus] = useState<StatusEvent['status']>('disconnected');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Subscription State
  const [subscription, setSubscription] = useState<SubscriptionInfo>({
    isPro: false,
    plan: 'free',
    status: 'gratis',
    daysRemaining: 0,
    expiresAt: null,
    confirmedDate: null,
  });
  
  // Stats
  const [viewers, setViewers] = useState<number>(0);
  const [likes, setLikes] = useState<number>(0);
  const [giftsCount, setGiftsCount] = useState<number>(0);
  const [diamonds, setDiamonds] = useState<number>(0);

  // Events & Alerts
  const [events, setEvents] = useState<TikTokLiveEvent[]>([]);
  const [lastAlert, setLastAlert] = useState<TikTokLiveEvent | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isProModalOpen, setIsProModalOpen] = useState<boolean>(false);

  // Settings
  const [ttsSettings, setTtsSettings] = useState<TTSSettings>(DEFAULT_TTS_SETTINGS);
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(DEFAULT_SOUND_SETTINGS);

  const eventSourceRef = useRef<EventSource | null>(null);
  const isConnectingOrConnectedRef = useRef<boolean>(false);
  const lastLikeMilestoneRef = useRef<number>(0);

  // Load saved settings from localStorage
  useEffect(() => {
    try {
      const savedTTS = localStorage.getItem('tf_tts_settings');
      if (savedTTS) {
        const parsed = JSON.parse(savedTTS);
        const merged: TTSSettings = {
          ...DEFAULT_TTS_SETTINGS,
          ...parsed,
          filterEnabled: parsed.filterEnabled !== undefined ? parsed.filterEnabled : true,
          bannedWords: Array.isArray(parsed.bannedWords)
            ? parsed.bannedWords
                .flatMap((w: unknown) => (typeof w === 'string' ? w.split(/[\r\n,;]+/) : []))
                .map((w: string) => w.trim())
                .filter(Boolean)
            : [],
        };
        setTtsSettings(merged);
        ttsEngine.updateSettings(merged);
      }
      const savedSounds = localStorage.getItem('tf_sound_settings');
      if (savedSounds) {
        setSoundSettings((prev) => ({
          ...DEFAULT_SOUND_SETTINGS,
          ...JSON.parse(savedSounds),
        }));
      }
      // Asegurar que la zona de conexión inicie siempre vacía por defecto
      try {
        localStorage.removeItem('tf_streamer_username');
        localStorage.removeItem('readtik_username');
      } catch {
        // ignore
      }
      setUsername('');
    } catch (e) {
      console.warn('Failed to load settings from storage', e);
    }
  }, []);

  // Cargar estado de suscripción de Supabase y consumo de alertas de voz de hoy
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();

    const loadSub = async (email?: string | null) => {
      if (email) {
        setUserEmail(email);
        const sub = await checkUserSubscription(email);
        setSubscription(sub);
      }
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) loadSub(user.email);
    });

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((_ev, session) => {
      loadSub(session?.user?.email);
    });

    return () => {
      authSub.unsubscribe();
    };
  }, []);

  // Update TTS Settings helper
  const handleUpdateTTS = (updates: Partial<TTSSettings>) => {
    setTtsSettings((prev) => {
      const next = { ...prev, ...updates };
      ttsEngine.updateSettings(next);
      try {
        localStorage.setItem('tf_tts_settings', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Update Sound Settings helper
  const handleUpdateSounds = (updates: Partial<SoundSettings>) => {
    setSoundSettings((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('tf_sound_settings', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Disparador central de voz TTS (100% ilimitado para todos los usuarios)
  const triggerTTS = useCallback(
    (text: string, forcePriority = false, bypassDisabled = false) => {
      if ((!ttsSettings.enabled && !bypassDisabled) || !text.trim()) return;

      // Alertas de voz 100% ilimitadas para todos los usuarios (Free y PRO)
      ttsEngine.speak(text, forcePriority, bypassDisabled);
    },
    [ttsSettings.enabled]
  );

  // Helper para coincidencia flexible de reglas de regalo (nombres en inglés/español, tildes, combos)
  const isRuleMatchingGift = useCallback(
    (rule: CustomGiftSoundRule, gift: GiftEvent) => {
      const norm = (s?: string) =>
        (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

      const rName = norm(rule.giftName);
      const gName = norm(gift.giftName);

      // Comprobar coincidencia con la lista de regalos oficiales de TikTok (Inglés vs Español)
      const matchesPopular = POPULAR_TIKTOK_GIFTS.some((p) => {
        const pEn = norm(p.name);
        const pEs = norm(p.spanish);
        const rMatches = rName === pEn || rName === pEs || rName.includes(pEn) || rName.includes(pEs);
        const gMatches = gName === pEn || gName === pEs || gName.includes(pEn) || gName.includes(pEs);
        return rMatches && gMatches;
      });

      const matchesNameOrId =
        (rule.giftId && gift.giftId && String(rule.giftId) === String(gift.giftId)) ||
        matchesPopular ||
        (rName && gName && (
          rName === gName ||
          gName.includes(rName) ||
          rName.includes(gName)
        ));

      if (!matchesNameOrId) return false;

      // Comprobar cantidad mínima de regalos en el combo o envío
      const count = gift.repeatCount || 1;
      if (rule.minCount && count < rule.minCount) return false;

      // Si tiene activado esperar a terminar combo, solo sonar cuando repeatEnd sea true
      if (rule.waitForComboEnd && gift.repeatEnd === false) return false;

      return true;
    },
    []
  );

  // Core event dispatcher: executes TTS, sound alerts, overlays & feed updates
  const handleIncomingEvent = useCallback(
    (ev: TikTokLiveEvent) => {
      // 1. Status event
      if (ev.type === 'status') {
        setStatus(ev.status);
        if (ev.message) setStatusMessage(ev.message);
        return;
      }

      // 2. Viewer count event
      if (ev.type === 'roomUser') {
        setViewers(ev.viewerCount);
        return;
      }

      // Prepend to event feed (max 100 items)
      setEvents((prev) => [ev, ...prev.slice(0, 99)]);

      const isSim = typeof ev.id === 'string' && ev.id.startsWith('sim-');

      // 3. Chat Event -> TTS
      if (ev.type === 'chat') {
        if ((ttsSettings.enabled || isSim) && (ttsSettings.readChat || isSim)) {
          const comment = (ev.comment || (ev as any).content || '').trim();
          // Skip if comment text is empty to prevent saying dangling "dice:"
          if (!comment) return;

          // Filter out commands if enabled (unless simulated)
          const isCommand = comment.startsWith('!') || comment.startsWith('/');
          if (ttsSettings.ignoreCommands && isCommand && !isSim) {
            return;
          }

          // Filtro de Palabras (Opción 1: Exclusivo para usuarios PRO)
          const isFilterActive = (subscription.isPro || isSim) && ttsSettings.filterEnabled !== false;
          if (
            isFilterActive &&
            (containsBannedWord(comment, ttsSettings.bannedWords) ||
             containsBannedWord(ev.nickname, ttsSettings.bannedWords))
          ) {
            return;
          }

          let formatted = (ttsSettings.chatTemplate || '{user} dice: {comment}')
            .replace('{user}', ev.nickname)
            .replace('{comment}', comment);

          if (formatted.length > ttsSettings.maxCommentLength) {
            formatted = formatted.slice(0, ttsSettings.maxCommentLength) + '...';
          }

          triggerTTS(formatted, false, isSim);
        }
        return;
      }

      // 4. Gift Event -> Sound + TTS + Banner
      if (ev.type === 'gift') {
        const gift = ev as GiftEvent;
        setGiftsCount((g) => g + 1);
        setDiamonds((d) => d + (gift.diamondCount || 1));
        setLastAlert(gift);

        // Sound alert (en el simulador siempre suena para garantizar pruebas instantáneas)
        if (soundSettings.enabled || isSim) {
          const isCustomGiftAllowed = subscription.isPro || isSim;

          // 1. Buscar si existe una regla personalizada para este regalo específico (Exclusivo PRO)
          const matchedRule = isCustomGiftAllowed
            ? (soundSettings.customGiftRules || []).find((r) => isRuleMatchingGift(r, gift))
            : null;

          if (matchedRule) {
            // Si la regla tiene activado interrumpir música previa, cortar el sonido anterior
            if (matchedRule.interruptPrevious) {
              audioEngine.stopAll();
            }

            // Reproducir canción o sonido específico para este regalo con límite de duración para alarma
            audioEngine.enqueue(async () => {
              const ruleVolume = matchedRule.volume ?? soundSettings.volume ?? 0.8;
              const ruleLimit = matchedRule.maxDuration ?? soundSettings.maxAlertDuration ?? 5;
              await audioEngine.playSound(
                matchedRule.soundKey,
                ruleVolume,
                matchedRule.soundUrl,
                matchedRule.interruptPrevious,
                ruleLimit
              );
            });
          } else {
            // Sonido predeterminado general (Para usuarios no PRO siempre suena 'coin')
            const isProUser = subscription.isPro || isSim;
            const soundToPlay =
              soundSettings.giftSound === 'custom' && isCustomGiftAllowed
                ? 'custom'
                : !isProUser
                ? 'coin'
                : gift.diamondCount >= 100
                ? 'fanfare'
                : (soundSettings.giftSound !== 'none' && soundSettings.giftSound !== 'custom' ? soundSettings.giftSound : 'coin');

            audioEngine.enqueue(async () => {
              await audioEngine.playSound(
                soundToPlay,
                soundSettings.volume ?? 0.8,
                isCustomGiftAllowed ? soundSettings.customGiftSoundUrl : '',
                false,
                soundSettings.maxAlertDuration ?? 5
              );
            });
          }
        }

        // TTS announcement
        if (
          (ttsSettings.enabled || isSim) &&
          (ttsSettings.readGifts || isSim) &&
          (gift.diamondCount >= ttsSettings.minGiftDiamonds || isSim)
        ) {
          // Si el regalo tiene plantilla TTS personalizada en su regla, usarla
          const matchedRule = (soundSettings.customGiftRules || []).find((r) =>
            isRuleMatchingGift(r, gift)
          );

          const template = matchedRule?.customTTS || ttsSettings.giftTemplate || '¡{user} envió {gift}!';
          const formatted = template
            .replace('{user}', gift.nickname)
            .replace('{gift}', gift.giftName)
            .replace('{count}', String(gift.repeatCount));

          triggerTTS(formatted, gift.diamondCount >= 100, isSim);
        }
        return;
      }

      // 5. Like Event -> milestone sound
      if (ev.type === 'like') {
        setLikes(ev.totalLikeCount || ((l) => l + ev.likeCount));

        if (soundSettings.enabled || isSim) {
          const soundKey = soundSettings.likeMilestoneSound !== 'none' ? soundSettings.likeMilestoneSound : 'ding';
          const currentTotal = ev.totalLikeCount || likes + ev.likeCount;
          const step = soundSettings.likeMilestoneStep || 50;
          if (isSim || currentTotal - lastLikeMilestoneRef.current >= step) {
            lastLikeMilestoneRef.current = currentTotal;
            audioEngine.playSound(
              soundKey,
              (soundSettings.volume ?? 0.8) * 0.7,
              subscription.isPro ? soundSettings.customLikeSoundUrl : undefined,
              false,
              soundSettings.maxAlertDuration ?? 5
            );
          }
        }
        return;
      }

      // 6. Follow Event -> Sound + TTS + Banner
      if (ev.type === 'follow') {
        const follow = ev as FollowEvent;
        setLastAlert(follow);

        if (soundSettings.enabled || isSim) {
          audioEngine.enqueue(async () => {
            const soundKey = soundSettings.followSound !== 'none' ? soundSettings.followSound : 'levelup';
            await audioEngine.playSound(
              soundKey,
              soundSettings.volume ?? 0.8,
              subscription.isPro ? soundSettings.customFollowSoundUrl : undefined,
              false,
              soundSettings.maxAlertDuration ?? 5
            );
          });
        }

        if ((ttsSettings.enabled || isSim) && (ttsSettings.readFollows || isSim)) {
          const formatted = (ttsSettings.followTemplate || '¡Gracias {user} por seguirme!').replace('{user}', follow.nickname);
          triggerTTS(formatted, false, isSim);
        }
        return;
      }

      // 7. Share Event
      if (ev.type === 'share') {
        const share = ev as ShareEvent;
        setLastAlert(share);

        if (soundSettings.enabled || isSim) {
          audioEngine.enqueue(async () => {
            const soundKey = soundSettings.shareSound !== 'none' ? soundSettings.shareSound : 'chime';
            await audioEngine.playSound(
              soundKey,
              soundSettings.volume ?? 0.8,
              subscription.isPro ? soundSettings.customShareSoundUrl : undefined,
              false,
              soundSettings.maxAlertDuration ?? 5
            );
          });
        }

        if ((ttsSettings.enabled || isSim) && (ttsSettings.readShares || isSim)) {
          const formatted = (ttsSettings.shareTemplate || '¡{user} compartió el directo!').replace('{user}', share.nickname);
          triggerTTS(formatted, false, isSim);
        }
        return;
      }
    },
    [ttsSettings, soundSettings, likes, triggerTTS, subscription.isPro]
  );

  // Connect to live stream via SSE
  const connectToStream = (targetUser: string) => {
    disconnectStream();

    const clean = targetUser.trim().replace(/^@/, '');
    if (!clean) return;

    isConnectingOrConnectedRef.current = true;
    setStatus('connecting');
    setStatusMessage(`Conectando con @${clean}...`);

    // Initialize/unlock audio context as part of user gesture
    audioEngine.init();
    ttsEngine.unlockTTS();

    const es = new EventSource(`/api/tiktok/stream?username=${encodeURIComponent(clean)}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      if (!isConnectingOrConnectedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        handleIncomingEvent(data);
      } catch (err) {
        console.error('Error parsing SSE payload:', err);
      }
    };

    es.onerror = () => {
      // Only react to errors if we haven't manually disconnected!
      if (!isConnectingOrConnectedRef.current) return;
      setStatus('error');
      setStatusMessage('Conexión perdida con el servidor. Reintentando...');
    };
  };

  const disconnectStream = () => {
    isConnectingOrConnectedRef.current = false;
    const currentTarget = (username || '').trim().replace(/^@/, '');
    if (currentTarget) {
      fetch(`/api/tiktok/stream?username=${encodeURIComponent(currentTarget)}`, {
        method: 'POST',
      }).catch(() => {});
    }
    if (eventSourceRef.current) {
      const es = eventSourceRef.current;
      eventSourceRef.current = null;
      // Detach handlers before close so onerror never fires erroneously
      es.onmessage = null;
      es.onerror = null;
      es.onopen = null;
      try {
        es.close();
      } catch {
        // ignore
      }
    }
    setStatus('disconnected');
    setStatusMessage('Desconectado.');
    ttsEngine.stop();
    audioEngine.stopAll();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isConnectingOrConnectedRef.current = false;
      if (eventSourceRef.current) {
        const es = eventSourceRef.current;
        eventSourceRef.current = null;
        es.onmessage = null;
        es.onerror = null;
        es.onopen = null;
        try {
          es.close();
        } catch {
          // ignore
        }
      }
      ttsEngine.stop();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#191A23] text-[#F3F3F3] flex flex-col font-sans selection:bg-[#B9FF66] selection:text-[#191A23] pb-12">
      {/* Sound & TTS permission unlocker */}
      <AudioUnlockBanner />

      {/* Main App Bar */}
      <Header
        status={status}
        ttsEnabled={ttsSettings.enabled}
        onToggleTTS={() => handleUpdateTTS({ enabled: !ttsSettings.enabled })}
        soundsEnabled={soundSettings.enabled}
        onToggleSounds={() => handleUpdateSounds({ enabled: !soundSettings.enabled })}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        username={username}
        isPro={subscription.isPro}
        daysRemaining={subscription.daysRemaining}
        onOpenPaywall={() => setIsProModalOpen(true)}
      />

      {/* On-screen visual alert popup */}
      <AlertOverlay lastAlert={lastAlert} />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Connection Box */}
        <StreamerConnect
          username={username}
          setUsername={setUsername}
          status={status}
          statusMessage={statusMessage}
          onConnect={connectToStream}
          onDisconnect={disconnectStream}
        />

        {/* Banner para usuarios sin PRO hacia la zona de pagos */}
        {!subscription.isPro && (
          <div className="bg-[#191A23] border border-[#B9FF66]/40 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-[#B9FF66]/5">
            <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto text-left">
              <div className="w-10 h-10 rounded-xl bg-[#B9FF66] flex items-center justify-center text-[#191A23] shrink-0 shadow-md shadow-[#B9FF66]/20">
                <Sparkles className="w-5 h-5 fill-[#191A23]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-[#F3F3F3] flex items-center gap-1.5">
                  <span>Desbloquea ReadTik PRO</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-[#B9FF66] text-[#191A23] text-[9px] font-black uppercase">
                    PRO
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate sm:whitespace-normal">
                  Canciones para cada regalo, filtro de palabras prohibidas y almacenamiento en la nube.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsProModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#191A23] hover:bg-[#B9FF66]/10 text-[#B9FF66] border border-[#B9FF66] font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 shrink-0 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B9FF66]" />
              <span>Ir a la Zona de Pagos</span>
            </button>
          </div>
        )}

        {/* Quick Stats Grid */}
        <QuickStats
          viewers={viewers}
          likes={likes}
          giftsCount={giftsCount}
          diamonds={diamonds}
        />

        {/* Live Event Feed with Sound and TTS replay */}
        <EventFeed
          events={events}
          onClear={() => setEvents([])}
          onReplayTTS={(text) => triggerTTS(text, true)}
          onPlaySound={(key) => audioEngine.playSound(key, soundSettings.volume)}
        />
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        ttsSettings={ttsSettings}
        onUpdateTTS={handleUpdateTTS}
        soundSettings={soundSettings}
        onUpdateSounds={handleUpdateSounds}
        isPro={subscription.isPro}
        userEmail={userEmail}
        onOpenProModal={() => setIsProModalOpen(true)}
      />

      {/* Event Simulator Drawer */}
      <SimulatorDrawer
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onEmitEvent={handleIncomingEvent}
      />

      {/* Modal de Activación PRO en la misma página */}
      <ProModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        userEmail={userEmail}
      />
    </div>
  );
}
