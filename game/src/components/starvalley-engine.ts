import htmlSource from '../../starvalley/index.html';
import type * as Three from 'three';

export type StarvalleyEngineApi = {
  boot(): Promise<void>;
  frame(now: number, season: number, paused: boolean, disc?: {
    position: { x: number; y: number; z: number };
    velocity: { x: number; z: number };
    influence: number;
    player: { x: number; z: number };
  }): void;
  resize(): void;
  setAudioEnabled(enabled: boolean): void;
  resumeAudio(): void;
  footstep(speed: number, x: number, z: number): void;
  activate(): void;
  deactivate(): void;
  sampleHeight(x: number, z: number): number;
  spawn: { x: number; z: number; heading: number; pitch: number };
  eyeHeight: number;
  sunDirection: Three.Vector3;
  createEnvironment(): { scene: Three.Scene; dispose(): void };
  dispose(): void;
};

type EngineOptions = {
  renderer: Three.WebGLRenderer;
  scene: Three.Scene;
  camera: Three.PerspectiveCamera;
  host: HTMLElement;
  onApi(api: StarvalleyEngineApi): void;
};

type BridgeWindow = Window & {
  __UF_THREE?: typeof Three;
  __UF_STARVALLEY_OPTIONS?: EngineOptions;
};

let engineQueue: Promise<void> = Promise.resolve();

async function startEngine(T: typeof Three, renderer: Three.WebGLRenderer, scene: Three.Scene, camera: Three.PerspectiveCamera, host: HTMLElement): Promise<StarvalleyEngineApi> {
  const script = htmlSource.match(/<script type="module">([\s\S]*?)<\/script>/);
  if (!script) throw new Error('Starvalley module script was not found');

  const moduleSource = script[1].replace("import * as THREE from 'three';", 'const THREE = window.__UF_THREE;');
  if (moduleSource === script[1]) throw new Error('Starvalley Three.js import could not be adapted');

  const bridge = window as BridgeWindow;
  bridge.__UF_THREE = T;
  const apiPromise = new Promise<StarvalleyEngineApi>(resolve => {
    bridge.__UF_STARVALLEY_OPTIONS = { renderer, scene, camera, host, onApi: resolve };
  });
  const moduleUrl = URL.createObjectURL(new Blob([moduleSource], { type: 'text/javascript' }));

  try {
    await import(/* webpackIgnore: true */ moduleUrl);
    const api = await apiPromise;
    try {
      await api.boot();
      return api;
    } catch (error) {
      api.dispose();
      throw error;
    }
  } finally {
    URL.revokeObjectURL(moduleUrl);
    delete bridge.__UF_THREE;
    delete bridge.__UF_STARVALLEY_OPTIONS;
  }
}

export function createStarvalleyEngine(T: typeof Three, renderer: Three.WebGLRenderer, scene: Three.Scene, camera: Three.PerspectiveCamera, host: HTMLElement): Promise<StarvalleyEngineApi> {
  const task = engineQueue.then(
    () => startEngine(T, renderer, scene, camera, host),
    () => startEngine(T, renderer, scene, camera, host),
  );
  engineQueue = task.then(() => undefined, () => undefined);
  return task;
}
