export type GameSoundCue = 'score' | 'opponentScore' | 'turnoverGain' | 'turnoverLoss' | 'catch' | 'throw' | 'pull' | 'foulCall';

/** Small synthesized match cues; AudioContext is created only from the start/resume gesture. */
export function createGameSounds() {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let noiseBuffer: AudioBuffer | null = null;
  let enabled = true;

  const ensureContext = (): AudioContext | null => {
    if (context || typeof window === 'undefined') return context;
    const AudioContextCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    context = new AudioContextCtor();
    master = context.createGain();
    master.gain.value = enabled ? 0.72 : 0;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 8;
    limiter.ratio.value = 5;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.14;
    master.connect(limiter);
    limiter.connect(context.destination);
    return context;
  };

  const unlock = (): void => {
    const ctx = ensureContext();
    if (ctx?.state === 'suspended') void ctx.resume().catch(() => undefined);
  };

  const tone = (
    startHz: number,
    endHz: number,
    delay: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
  ): void => {
    const ctx = context;
    if (!ctx || !master || !enabled || ctx.state !== 'running') return;
    const startAt = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(1, startHz), startAt);
    if (endHz !== startHz) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endHz), startAt + duration);
    envelope.gain.setValueAtTime(0.0001, startAt);
    envelope.gain.linearRampToValueAtTime(volume, startAt + Math.min(0.014, duration * 0.25));
    envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.015);
  };

  const noise = (delay: number, duration: number, startHz: number, endHz: number, volume: number): void => {
    const ctx = context;
    if (!ctx || !master || !enabled || ctx.state !== 'running') return;
    if (!noiseBuffer) {
      noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 1.2), ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.78));
    }
    const startAt = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const envelope = ctx.createGain();
    source.buffer = noiseBuffer;
    filter.type = 'bandpass';
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(Math.max(1, startHz), startAt);
    filter.frequency.exponentialRampToValueAtTime(Math.max(1, endHz), startAt + duration);
    envelope.gain.setValueAtTime(0.0001, startAt);
    envelope.gain.linearRampToValueAtTime(volume, startAt + Math.min(0.008, duration * 0.25));
    envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(master);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
    source.start(startAt);
    source.stop(startAt + duration + 0.015);
  };

  const play = (cue: GameSoundCue): void => {
    if (!enabled || !context || context.state !== 'running') return;
    switch (cue) {
      case 'score':
        // Arcade-style score: a bass hit, rising brass-like fanfare, and a short crowd-like swell.
        tone(104, 54, 0, 0.32, 0.26, 'sawtooth');
        noise(0, 0.15, 110, 720, 0.18);
        tone(392, 523.25, 0, 0.22, 0.20, 'sawtooth');
        tone(523.25, 659.25, 0.08, 0.25, 0.19, 'sawtooth');
        tone(659.25, 783.99, 0.17, 0.30, 0.20, 'triangle');
        tone(783.99, 1046.5, 0.27, 0.43, 0.23, 'sawtooth');
        tone(1046.5, 1318.5, 0.38, 0.55, 0.20, 'triangle');
        noise(0.10, 0.68, 460, 1900, 0.12);
        break;
      case 'opponentScore':
        // Dramatic descending buzzer and a low impact, rather than a quiet sad chime.
        tone(440, 110, 0, 0.52, 0.22, 'sawtooth');
        tone(311, 78, 0.07, 0.43, 0.16, 'square');
        tone(132, 58, 0, 0.34, 0.24, 'triangle');
        noise(0, 0.20, 900, 170, 0.16);
        break;
      case 'turnoverGain':
        tone(196, 392, 0, 0.15, 0.20, 'sawtooth');
        tone(392, 659.25, 0.08, 0.18, 0.19, 'sawtooth');
        tone(659.25, 987.77, 0.16, 0.25, 0.21, 'triangle');
        noise(0, 0.15, 120, 1650, 0.16);
        noise(0.06, 0.38, 650, 1700, 0.09);
        break;
      case 'turnoverLoss':
        tone(520, 150, 0, 0.36, 0.20, 'sawtooth');
        tone(280, 92, 0.06, 0.39, 0.15, 'square');
        noise(0, 0.18, 980, 190, 0.14);
        break;
      case 'catch':
        tone(148, 72, 0, 0.13, 0.25, 'sine');
        tone(680, 980, 0.01, 0.12, 0.16, 'triangle');
        noise(0, 0.12, 2800, 420, 0.20);
        break;
      case 'throw':
        tone(240, 92, 0, 0.18, 0.16, 'sawtooth');
        tone(510, 150, 0.015, 0.14, 0.10, 'triangle');
        noise(0, 0.24, 2600, 360, 0.18);
        break;
      case 'pull':
        tone(92, 48, 0, 0.42, 0.26, 'sawtooth');
        tone(174, 262, 0.12, 0.28, 0.15, 'triangle');
        noise(0, 0.34, 2400, 190, 0.21);
        noise(0.10, 0.48, 320, 1200, 0.10);
        break;
      case 'foulCall':
        // Short, soft whistle cue when the player stops play to call a foul.
        tone(2100, 1750, 0, 0.24, 0.16, 'sine');
        tone(2800, 2300, 0, 0.22, 0.06, 'triangle');
        noise(0, 0.16, 6000, 2800, 0.035);
        break;
    }
  };

  const toggle = (): boolean => {
    enabled = !enabled;
    if (master && context) master.gain.setTargetAtTime(enabled ? 0.72 : 0, context.currentTime, 0.018);
    if (enabled) unlock();
    return enabled;
  };

  const dispose = (): void => {
    const ctx = context;
    context = null;
    master = null;
    noiseBuffer = null;
    if (ctx) void ctx.close().catch(() => undefined);
  };

  return { unlock, play, toggle, dispose };
}
