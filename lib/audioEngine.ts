// Web Audio Synthesizer & Sound Alert Engine for ReadTik
// High quality synthesized SFX + custom audio playback with mobile AudioContext unlocker

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private soundQueue: (() => Promise<void>)[] = [];
  private isPlayingQueue: boolean = false;
  private currentAudioElement: HTMLAudioElement | null = null;
  private activeAudioTimer: NodeJS.Timeout | null = null;
  private activeFadeInterval: NodeJS.Timeout | null = null;
  private hardSafetyTimeout: NodeJS.Timeout | null = null;
  private currentCustomAudioResolver: ((success: boolean) => void) | null = null;

  constructor() {
    // AudioContext will be initialized on user interaction to abide by mobile browser autoplay policies
  }

  public init(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioContextClass();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.isUnlocked = this.ctx.state === 'running';
      return this.isUnlocked;
    } catch (e) {
      console.warn('AudioContext init error:', e);
      return false;
    }
  }

  public async ensureRunning(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    this.init();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      try {
        // Safe timeout so resume never blocks the queue indefinitely
        await Promise.race([
          this.ctx.resume(),
          new Promise((r) => setTimeout(r, 200)),
        ]);
      } catch (e) {
        console.warn('AudioContext resume failed:', e);
      }
    }
    this.isUnlocked = this.ctx.state === 'running';
    return this.isUnlocked;
  }

  public isAudioUnlocked(): boolean {
    if (!this.ctx) return false;
    return this.ctx.state === 'running';
  }

  public async unlockAudio(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      this.init();
      if (!this.ctx) return false;

      if (this.ctx.state === 'suspended') {
        try {
          await Promise.race([
            this.ctx.resume(),
            new Promise((r) => setTimeout(r, 300)),
          ]);
        } catch (e) {
          // ignore
        }
      }

      // Play a tiny silent buffer to warm up Web Audio hardware
      const buffer = this.ctx.createBuffer(1, 1, 22050);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.ctx.destination);
      source.start(0);

      this.isUnlocked = this.ctx.state === 'running';
      return this.isUnlocked;
    } catch (err) {
      console.warn('Failed to unlock audio context:', err);
      return false;
    }
  }

  // Queue wrapper so sounds play in sequence or with controlled overlap
  public enqueue(playFn: () => Promise<void>) {
    this.soundQueue.push(playFn);
    this.processQueue();
  }

  private async processQueue() {
    if (this.isPlayingQueue || this.soundQueue.length === 0) return;
    this.isPlayingQueue = true;
    while (this.soundQueue.length > 0) {
      const task = this.soundQueue.shift();
      if (task) {
        try {
          // Timeout race: never let any sound task block the queue for more than 12 seconds
          await Promise.race([
            task(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Sound task timeout')), 12000)),
          ]);
        } catch (e) {
          console.warn('Error executing sound task:', e);
        }
      }
      // small delay between consecutive sounds
      await new Promise(r => setTimeout(r, 40));
    }
    this.isPlayingQueue = false;
  }

  public stopCurrentAudio() {
    if (this.activeAudioTimer) {
      clearTimeout(this.activeAudioTimer);
      this.activeAudioTimer = null;
    }
    if (this.activeFadeInterval) {
      clearInterval(this.activeFadeInterval);
      this.activeFadeInterval = null;
    }
    if (this.hardSafetyTimeout) {
      clearTimeout(this.hardSafetyTimeout);
      this.hardSafetyTimeout = null;
    }
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch (e) {
        // ignore
      }
      this.currentAudioElement = null;
    }
    // CRITICAL: Resolve pending custom audio promise so queue does NOT deadlock
    if (this.currentCustomAudioResolver) {
      const res = this.currentCustomAudioResolver;
      this.currentCustomAudioResolver = null;
      res(false);
    }
  }

  public stopAll() {
    this.soundQueue = [];
    this.stopCurrentAudio();
    this.isPlayingQueue = false;
  }

  // Play a named sound effect
  public async playSound(
    soundKey: string,
    volume: number = 0.8,
    customUrl?: string,
    interrupt: boolean = false,
    maxDurationSeconds?: number
  ): Promise<boolean> {
    if (soundKey === 'none') {
      return true;
    }

    if (interrupt) {
      this.stopCurrentAudio();
    }

    // 1. Audio personalizado (archivo MP3/WAV o Supabase URL)
    if (soundKey === 'custom') {
      if (customUrl && customUrl.trim()) {
        const played = await this.playCustomAudio(customUrl, volume, interrupt, maxDurationSeconds);
        if (!played) {
          // Si el audio remoto falló al cargar, reproducir sonido de respaldo (Moneda) para que el directo nunca se quede en silencio
          console.warn('El audio personalizado no se pudo reproducir, usando sonido de respaldo.');
          await this.ensureRunning();
          await this.synthesizeCoin(volume);
        }
        return played;
      } else {
        // Regla configurada como custom pero sin URL: sonar moneda de respaldo
        console.warn('playSound: "custom" sin URL válida, sonando moneda de respaldo.');
        await this.ensureRunning();
        await this.synthesizeCoin(volume);
        return true;
      }
    }

    // 2. Efectos sintetizados con Web Audio API: asegurar contexto activo
    await this.ensureRunning();
    if (!this.ctx) return false;

    switch (soundKey) {
      case 'coin':
        await this.synthesizeCoin(volume);
        break;
      case 'fanfare':
        await this.synthesizeFanfare(volume);
        break;
      case 'airhorn':
        await this.synthesizeAirhorn(volume);
        break;
      case 'ding':
        await this.synthesizeDing(volume);
        break;
      case 'levelup':
        await this.synthesizeLevelUp(volume);
        break;
      case 'applause':
        await this.synthesizeApplause(volume);
        break;
      case 'chime':
      default:
        await this.synthesizeChime(volume);
        break;
    }
    return true;
  }

  // 1. Crisp Coin sound (Classic Mario/TikTok gift alert)
  public async synthesizeCoin(volume: number = 0.8): Promise<void> {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(volume * 0.4, now);
    masterGain.connect(this.ctx.destination);

    // Tone 1: B5 (987.77 Hz)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, now);
    gain1.gain.setValueAtTime(1, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // Tone 2: E6 (1318.51 Hz) slightly delayed
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, now + 0.08);
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(1, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);

    return new Promise(res => setTimeout(res, 450));
  }

  // 2. Victory Fanfare (for big gifts like Galaxy, Lion, Universe)
  public async synthesizeFanfare(volume: number = 0.8): Promise<void> {
    if (!this.ctx) return;
    const notes = [
      { f: 523.25, d: 0.12, t: 0 },    // C5
      { f: 659.25, d: 0.12, t: 0.13 }, // E5
      { f: 783.99, d: 0.12, t: 0.26 }, // G5
      { f: 1046.50, d: 0.5, t: 0.39 }  // C6 (hold)
    ];

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(volume * 0.35, this.ctx.currentTime);
    masterGain.connect(this.ctx.destination);

    notes.forEach(note => {
      if (!this.ctx) return;
      const startTime = this.ctx.currentTime + note.t;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(1, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + note.d);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + note.d);
    });

    return new Promise(res => setTimeout(res, 950));
  }

  // 3. Ding (for Likes or quick notices)
  public async synthesizeDing(volume: number = 0.8): Promise<void> {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, now); // A6
    gain.gain.setValueAtTime(volume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);

    return new Promise(res => setTimeout(res, 350));
  }

  // 4. Level Up (for new Followers)
  public async synthesizeLevelUp(volume: number = 0.8): Promise<void> {
    if (!this.ctx) return;
    const chord = [440, 554.37, 659.25, 880]; // A major
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(volume * 0.3, this.ctx.currentTime);
    masterGain.connect(this.ctx.destination);

    chord.forEach((freq, idx) => {
      if (!this.ctx) return;
      const startTime = this.ctx.currentTime + (idx * 0.07);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.8, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });

    return new Promise(res => setTimeout(res, 600));
  }

  // 5. Chime (for Shares)
  public async synthesizeChime(volume: number = 0.8): Promise<void> {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(2400, now + 0.15);

    gain.gain.setValueAtTime(volume * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);

    return new Promise(res => setTimeout(res, 400));
  }

  // 6. Airhorn (Stream Hype sound)
  public async synthesizeAirhorn(volume: number = 0.8): Promise<void> {
    if (!this.ctx) return;
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(volume * 0.4, this.ctx.currentTime);
    masterGain.connect(this.ctx.destination);

    const blips = [0, 0.12, 0.24, 0.38];
    blips.forEach(startOffset => {
      if (!this.ctx) return;
      const st = this.ctx.currentTime + startOffset;
      const dur = 0.1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(466.16, st); // Bb4
      osc.frequency.linearRampToValueAtTime(440, st + dur);

      gain.gain.setValueAtTime(0.8, st);
      gain.gain.exponentialRampToValueAtTime(0.01, st + dur);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(st);
      osc.stop(st + dur);
    });

    return new Promise(res => setTimeout(res, 600));
  }

  // 7. Cheering / Applause noise
  public async synthesizeApplause(volume: number = 0.8): Promise<void> {
    if (!this.ctx) return;
    const dur = 1.2;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to sound like crowd applause
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 1.5;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + dur);

    return new Promise(res => setTimeout(res, dur * 1000));
  }

  // Play custom audio URL with maximum duration limit and smooth fade-out for alert sounds
  public playCustomAudio(
    url: string,
    volume: number = 0.8,
    interrupt: boolean = false,
    maxDurationSeconds?: number
  ): Promise<boolean> {
    if (interrupt) {
      this.stopCurrentAudio();
    }

    const cleanUrl = (url || '').trim();
    if (!cleanUrl) {
      console.warn('playCustomAudio: Empty URL provided');
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      let isResolved = false;

      const finish = (success: boolean = true) => {
        if (isResolved) return;
        isResolved = true;

        if (this.currentCustomAudioResolver === finish) {
          this.currentCustomAudioResolver = null;
        }
        if (this.activeAudioTimer) {
          clearTimeout(this.activeAudioTimer);
          this.activeAudioTimer = null;
        }
        if (this.activeFadeInterval) {
          clearInterval(this.activeFadeInterval);
          this.activeFadeInterval = null;
        }
        if (this.hardSafetyTimeout) {
          clearTimeout(this.hardSafetyTimeout);
          this.hardSafetyTimeout = null;
        }
        if (this.currentAudioElement === audio) {
          this.currentAudioElement = null;
        }

        try {
          audio.onended = null;
          audio.onerror = null;
          audio.onabort = null;
        } catch {}

        resolve(success);
      };

      this.currentCustomAudioResolver = finish;

      // Absolute safety timeout: guarantees promise resolution so queue NEVER freezes
      const limit = maxDurationSeconds !== undefined ? maxDurationSeconds : 5;
      const maxWait = ((limit > 0 ? limit : 25) + 3) * 1000;
      this.hardSafetyTimeout = setTimeout(() => {
        console.warn('Custom sound safety timeout reached for:', cleanUrl);
        finish(false);
      }, maxWait);

      let audio: HTMLAudioElement;
      try {
        audio = new Audio(cleanUrl);
        this.currentAudioElement = audio;
        audio.preload = 'auto';
        audio.volume = Math.max(0, Math.min(1, volume));

        audio.onended = () => {
          finish(true);
        };

        audio.onerror = () => {
          console.warn('Custom sound failed to load or decode:', cleanUrl);
          finish(false);
        };

        audio.onabort = () => {
          finish(false);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Límite de duración para alarmas (por defecto 10s si no se especifica, 0 = sin límite)
              if (limit > 0) {
                const fadeStart = Math.max(500, (limit - 0.5) * 1000);
                this.activeAudioTimer = setTimeout(() => {
                  if (isResolved) return;
                  // Fade out suave durante 500ms para que no se corte en seco
                  const initialVol = audio.volume;
                  let step = 0;
                  const totalSteps = 10;
                  this.activeFadeInterval = setInterval(() => {
                    step++;
                    audio.volume = Math.max(0, initialVol * (1 - step / totalSteps));
                    if (step >= totalSteps) {
                      if (this.activeFadeInterval) {
                        clearInterval(this.activeFadeInterval);
                        this.activeFadeInterval = null;
                      }
                      try {
                        audio.pause();
                        audio.currentTime = 0;
                      } catch {
                        // ignore
                      }
                      finish(true);
                    }
                  }, 50);
                }, fadeStart);
              }
            })
            .catch((err) => {
              console.warn('Audio play() error:', err);
              finish(false);
            });
        }
      } catch (err) {
        console.warn('Audio constructor failed:', err);
        finish(false);
      }
    });
  }
}

export const audioEngine = new AudioEngine();
