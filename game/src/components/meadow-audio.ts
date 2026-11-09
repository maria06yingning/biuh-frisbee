import type { MeadowSeason } from './meadow-season';

export type MeadowSound = {
  /** Unlock audio from the user's WASD key gesture and choose that scene's recording. */
  resume(season: MeadowSeason, enabled: boolean): void;
  /** Stream the matching long-form walk recording only while the player is moving. */
  setWalking(walking: boolean, season: MeadowSeason): void;
  dispose(): void;
};

const WALK_FILES: Record<MeadowSeason, string> = {
  summer: '草地-走路.wav',
  night: '草地-走路.wav',
  autumn: '秋季-走路.wav',
  winter: '雪地-走路.wav',
};

/** Stream the supplied long recordings instead of decoding them all into memory. */
export function createMeadowSound(): MeadowSound {
  const audio = new Audio();
  audio.preload = 'none';
  audio.loop = true;
  audio.volume = 1;

  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');
  let context: AudioContext | null = null;
  let gain: GainNode | null = null;
  let mediaSource: MediaElementAudioSourceNode | null = null;
  let graphAttempted = false;
  let currentFile: string | null = null;
  let walking = false;
  let playFailed = false;
  let pauseTimer: number | null = null;

  const ensureGraph = (): AudioContext | null => {
    if (graphAttempted) return context;
    graphAttempted = true;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      context = new Ctor();
      gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(context.destination);
      mediaSource = context.createMediaElementSource(audio);
      mediaSource.connect(gain);
      return context;
    } catch (error) {
      console.warn('[meadow-audio] Web Audio gain unavailable; using direct volume', error);
      gain = null;
      mediaSource?.disconnect();
      mediaSource = null;
      return context;
    }
  };

  const selectScene = (season: MeadowSeason): boolean => {
    const file = WALK_FILES[season];
    if (file === currentFile) return false;
    currentFile = file;
    audio.pause();
    const encodedFile = encodeURIComponent(file);
    audio.src = `${basePath}/sounds/${encodedFile}`;
    audio.load();
    playFailed = false;
    return true;
  };

  const setLevel = (level: number) => {
    if (gain && context) {
      const now = context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(level, now, level > 0 ? 0.07 : 0.045);
    } else {
      audio.volume = level;
    }
  };

  const play = () => {
    if (playFailed || !audio.paused) return;
    void audio.play().catch((error: unknown) => {
      playFailed = true;
      console.warn('[meadow-audio] Could not play the walking recording', error);
    });
  };

  const stopAfterFade = () => {
    if (pauseTimer !== null) window.clearTimeout(pauseTimer);
    pauseTimer = window.setTimeout(() => {
      pauseTimer = null;
      if (!walking) audio.pause();
    }, 180);
  };

  const startWalking = (season: MeadowSeason) => {
    const sceneChanged = selectScene(season);
    if (pauseTimer !== null) {
      window.clearTimeout(pauseTimer);
      pauseTimer = null;
    }
    const shouldStart = !walking || sceneChanged || audio.paused;
    walking = true;
    if (shouldStart) {
      const ctx = ensureGraph();
      if (ctx?.state === 'suspended') void ctx.resume().catch(() => undefined);
      setLevel(0.28);
      play();
    }
  };

  return {
    resume(season, enabled) {
      const ctx = ensureGraph();
      if (ctx?.state === 'suspended') void ctx.resume().catch(() => undefined);
      selectScene(season);
      if (enabled) {
        playFailed = false;
        startWalking(season);
      }
    },
    setWalking(shouldWalk, season) {
      if (shouldWalk) {
        startWalking(season);
        return;
      }
      selectScene(season);
      if (!walking) return;
      walking = false;
      setLevel(0);
      stopAfterFade();
    },
    dispose() {
      walking = false;
      if (pauseTimer !== null) window.clearTimeout(pauseTimer);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      mediaSource?.disconnect();
      gain?.disconnect();
      void context?.close();
      context = null;
      gain = null;
      mediaSource = null;
    },
  };
}
