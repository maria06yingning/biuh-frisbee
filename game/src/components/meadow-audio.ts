import type { MeadowSeason } from './meadow-season';

export type MeadowSound = {
  /** Call from a user gesture (key or pointer) so the browser allows audio. */
  resume(): void;
  /** One footstep in the sound of the current scene. */
  step(season: MeadowSeason): void;
  dispose(): void;
};

/**
 * Footsteps synthesised with Web Audio, so no audio files are needed. Each scene has its own
 * character: summer swishes, autumn crunches leaves,
 * winter squeaks in snow, and night gives a soft thump with a distant firefly chime.
 */
export function createMeadowSound(): MeadowSound {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noise: AudioBuffer | null = null;

  const ensure = () => {
    if (ctx) return ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  };

  const noiseBurst = (c: AudioContext, start: number, type: BiquadFilterType, freq: number, q: number, peak: number, length: number) => {
    if (!noise || !master) return;
    const src = c.createBufferSource();
    src.buffer = noise;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq * (0.92 + Math.random() * 0.16);
    filter.Q.value = q;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    src.connect(filter).connect(gain).connect(master);
    src.start(start, Math.random() * 0.5, length + 0.05);
    src.stop(start + length + 0.06);
  };

  const tone = (c: AudioContext, start: number, from: number, to: number, peak: number, length: number) => {
    if (!master) return;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + length);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(master);
    osc.start(start);
    osc.stop(start + length + 0.02);
  };

  return {
    resume() {
      const c = ensure();
      if (c && c.state === 'suspended') void c.resume();
    },
    step(season) {
      const c = ensure();
      if (!c || c.state !== 'running') return;
      const t = c.currentTime + 0.01;
      const r = Math.random();
      switch (season) {
        case 'summer':
          noiseBurst(c, t, 'bandpass', 900, 0.8, 0.1, 0.16);
          if (r < 0.2) tone(c, t + 0.06, 1100, 1300, 0.02, 0.2);
          break;
        case 'autumn':
          noiseBurst(c, t, 'highpass', 2600, 0.7, 0.2, 0.05);
          noiseBurst(c, t + 0.07, 'highpass', 2600, 0.7, 0.16, 0.05);
          break;
        case 'winter':
          noiseBurst(c, t, 'lowpass', 1800, 0.9, 0.18, 0.14);
          noiseBurst(c, t, 'highpass', 4000, 1, 0.05, 0.04);
          break;
        case 'night':
          tone(c, t, 85, 60, 0.22, 0.12);
          noiseBurst(c, t, 'lowpass', 500, 0.7, 0.06, 0.2);
          if (r < 0.25) tone(c, t + 0.1, 1500, 2000, 0.015, 0.3);
          break;
      }
    },
    dispose() {
      void ctx?.close();
      ctx = null;
      master = null;
      noise = null;
    },
  };
}
