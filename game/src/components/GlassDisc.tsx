'use client';

import { useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { createOutsideInFlight, DISC_FLIGHT_DURATION } from './disc-flight';
import { BASE_Y, createProceduralGrassField } from './procedural-grass';
import { createMeadowLandscape } from './meadow-landscape';
import type { StarvalleyEngineApi } from './starvalley-engine';
import { classifyThrowStyle, createReturnFlight, createUserThrow, getThrowImpulse, type ThrowSample } from './disc-throw';
import type { MeadowSeason } from './meadow-season';
import { createMeadowSound, type MeadowSound } from './meadow-audio';
import { defaultDiscColor } from './disc-palette';

const WALK_SPEED = 7;
const STARVALLEY_WALK_SPEED = WALK_SPEED * 1.1;
/** The meadow lawn is laid out across x ±200 and z -280…18. */
const MEADOW_WALK_BOUNDS = { minX: -180, maxX: 180, minZ: -280, maxZ: 18 } as const;
/** Local bounds cover the bridge, village, and both stretches of the valley around the spawn. */
const STARVALLEY_WALK_BOUNDS = { minX: -360, maxX: 360, minZ: -900, maxZ: 800 } as const;
/** Pick-up range: how close the walker must stand to the landed disc. */
const PICKUP_RANGE = 9;
const DISC_PICK_RADIUS = 2.7;
const BASE_FOV = 36;
const HOME_HINT_SEEN_KEY = 'ultimate-field-home-intro-hint-seen-v1';

export type DiscCommand = { pickup: number; return: number };

/** The homepage frisbee and full Starvalley world share one Three.js scene and render loop. */
export default function GlassDisc({
  paused,
  replayToken = 0,
  season = 'summer',
  sceneIndex = 0,
  discColor = defaultDiscColor(season),
  pickupToken = 0,
  returnToken = 0,
  viewResetToken = 0,
  onDiscLanded,
  onNearDisc,
  discStowed = false,
  onDiscStowedChange,
  soundOn = true,
}: {
  paused: boolean;
  replayToken?: number;
  season?: MeadowSeason;
  sceneIndex?: number;
  discColor?: number;
  pickupToken?: number;
  returnToken?: number;
  viewResetToken?: number;
  onDiscLanded?: (landed: boolean) => void;
  onNearDisc?: (near: boolean) => void;
  discStowed?: boolean;
  onDiscStowedChange?: (stowed: boolean) => void;
  soundOn?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const pause = useRef(paused);
  const replay = useRef(replayToken);
  const seasonRef = useRef(season);
  const sceneIndexRef = useRef(sceneIndex);
  const discColorRef = useRef(discColor);
  const pickupRef = useRef(pickupToken);
  const returnRef = useRef(returnToken);
  const viewResetRef = useRef(viewResetToken);
  const landedCallback = useRef(onDiscLanded);
  const nearCallback = useRef(onNearDisc);
  const discStowedRef = useRef(discStowed);
  const stowCallback = useRef(onDiscStowedChange);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  pause.current = paused;
  replay.current = replayToken;
  seasonRef.current = season;
  sceneIndexRef.current = sceneIndex;
  discColorRef.current = discColor;
  pickupRef.current = pickupToken;
  returnRef.current = returnToken;
  viewResetRef.current = viewResetToken;
  landedCallback.current = onDiscLanded;
  nearCallback.current = onNearDisc;
  discStowedRef.current = discStowed;
  stowCallback.current = onDiscStowedChange;
  const { lang } = useI18n();

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let disposed = false;
    let cleanup = () => {};
    let hintShown = false;
    let hintTimer: number | undefined;
    try {
      hintShown = window.sessionStorage.getItem(HOME_HINT_SEEN_KEY) === '1';
    } catch {}
    if (hintShown) node.dataset.hintDismissed = 'true';

    void import('three').then(T => {
      if (disposed) return;
      let renderer: InstanceType<typeof T.WebGLRenderer>;
      try {
        renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
      } catch {
        node.dataset.fallback = 'true';
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.setClearColor(0, 0);
      const fallbackRendererState = {
        outputColorSpace: renderer.outputColorSpace,
        toneMapping: renderer.toneMapping,
        toneMappingExposure: renderer.toneMappingExposure,
        autoClear: renderer.autoClear,
        pixelRatio: renderer.getPixelRatio(),
      };
      const restoreFallbackRendererState = () => {
        renderer.outputColorSpace = fallbackRendererState.outputColorSpace;
        renderer.toneMapping = fallbackRendererState.toneMapping;
        renderer.toneMappingExposure = fallbackRendererState.toneMappingExposure;
        renderer.autoClear = fallbackRendererState.autoClear;
        renderer.setPixelRatio(fallbackRendererState.pixelRatio);
      };
      renderer.domElement.setAttribute('aria-hidden', 'true');
      // Overlay holds the old frame during a soft-edged scene wipe.
      const overlay = document.createElement('canvas');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';
      const wipeTmp = document.createElement('canvas');

      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(36, 1, 0.5, 14000);
      camera.position.set(0, -0.29, 10.2);
      camera.lookAt(0, 0, 0);

      const grass = createProceduralGrassField(T);
      let grassDisposed = false;
      const disposeFallbackGrass = () => {
        if (grassDisposed) return;
        scene.remove(grass.group);
        grass.dispose();
        grassDisposed = true;
      };
      scene.add(grass.group);
      const homeFrame = new T.Group();
      homeFrame.name = 'frisbee-home-frame';
      homeFrame.userData.noCast = true;
      scene.add(homeFrame);
      const classicSeasonalEffects = createMeadowLandscape(T, BASE_Y, { groundAt: grass.groundAt, includeTree: true });
      homeFrame.add(classicSeasonalEffects.group);

      const environment = grass.createEnvironment();
      const pmrem = new T.PMREMGenerator(renderer);
      let environmentTarget = pmrem.fromScene(environment.scene, 0.035, 0.1, 100);
      const fallbackEnvironmentTarget = environmentTarget;
      scene.environment = environmentTarget.texture;
      environment.dispose(); pmrem.dispose();

      const hemisphere = new T.HemisphereLight(0xe9f1ec, 0x596545, 1.5);
      scene.add(hemisphere);
      const sun = new T.DirectionalLight(0xffedc8, 3.0);
      sun.position.copy(grass.sunDirection).multiplyScalar(12); scene.add(sun);
      const fill = new T.DirectionalLight(0xc9dfe5, 0.85);
      fill.position.set(-4, 3, 6); scene.add(fill);
      const daySun = new T.Color(0xffe4ba), duskSun = new T.Color(0xffc38d), moonSun = new T.Color(0x748eb8);
      const daySky = new T.Color(0xe9f1ec), nightSky = new T.Color(0x8798b8);
      const dayFill = new T.Color(0xc9dfe5), nightFill = new T.Color(0x526990);
      const dayGround = new T.Color(0x596545), nightGround = new T.Color(0x222d47);
      const lightScratch = new T.Color();
      const updateLighting = (currentSeason: MeadowSeason) => {
        const dusk = currentSeason === 'autumn' ? 0.78 : 0;
        const night = currentSeason === 'night' ? 1 : 0;
        const winter = currentSeason === 'winter' ? 1 : 0;
        sun.color.copy(lightScratch.copy(daySun).lerp(duskSun, dusk).lerp(moonSun, night));
        sun.intensity = (2.1 - winter * 0.8) * (1 - night) + 0.16 * night;
        fill.color.copy(lightScratch.copy(dayFill).lerp(nightFill, night));
        fill.intensity = 0.6 * (1 - night) + 0.32 * night;
        hemisphere.color.copy(lightScratch.copy(daySky).lerp(nightSky, night));
        hemisphere.groundColor.copy(lightScratch.copy(dayGround).lerp(nightGround, night));
        hemisphere.intensity = (1.5 - winter * 0.42) * (1 - night) + 0.75 * night;
      };
      updateLighting(seasonRef.current);

      // Attitude carries the disc's place and tilt; the spinner adds its axial spin.
      const attitude = new T.Group();
      const spinner = new T.Group();
      attitude.userData.noCast = true;
      attitude.add(spinner); homeFrame.add(attitude);
      const initialColor = discColorRef.current;
      const glass = new T.MeshPhysicalMaterial({
        color: initialColor, metalness: 0.015, roughness: 0.1,
        transmission: 0.68, thickness: 0.22, ior: 1.46,
        emissive: new T.Color(initialColor), emissiveIntensity: 0,
        clearcoat: 1, clearcoatRoughness: 0.08,
        attenuationColor: new T.Color(initialColor), attenuationDistance: 1.35,
        transparent: true, opacity: 0.95, side: T.DoubleSide,
      });
      const section = [[0,0.11],[0.6,0.115],[1.3,0.1],[1.72,0.07],[1.88,0.035],[2,0],[2.12,-0.08],[2.19,-0.18],[2.18,-0.29],[2.1,-0.34],[2.02,-0.29],[1.98,-0.17],[1.86,-0.09],[1.5,-0.035],[0.6,0.025],[0,0.035]];
      const discGeometry = new T.LatheGeometry(section.map(([x, y]) => new T.Vector2(x, y)), 144);
      const discBody = new T.Mesh(discGeometry, glass);
      spinner.add(discBody);

      const pink = new T.MeshPhysicalMaterial({ color: initialColor, metalness: 0.18, roughness: 0.16, transparent: true, opacity: 0.76, clearcoat: 1, emissive: initialColor, emissiveIntensity: 0 });
      const white = new T.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.08, roughness: 0.12, transparent: true, opacity: 0.84, emissive: initialColor, emissiveIntensity: 0 });
      const detailRings: Array<{ mesh: InstanceType<typeof T.Mesh>; highlight: boolean }> = [];
      for (let i = 0; i < 14; i++) {
        const highlight = i % 3 !== 0;
        const ring = new T.Mesh(new T.TorusGeometry(1.76 + i * 0.028, i % 4 === 0 ? 0.008 : 0.0045, 6, 128), highlight ? white : pink);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.055 - Math.pow(i / 13, 2) * 0.24;
        spinner.add(ring);
        detailRings.push({ mesh: ring, highlight });
      }
      const etching = new T.MeshStandardMaterial({ color: initialColor, roughness: 0.33, transparent: true, opacity: 0.58, side: T.DoubleSide, emissive: initialColor, emissiveIntensity: 0 });
      const etchedMarks: InstanceType<typeof T.Mesh>[] = [];
      for (const [start, arc] of [[0.3, 0.8], [3.4, 0.4]]) {
        const mark = new T.Mesh(new T.RingGeometry(1.56, 1.576, 48, 1, start, arc), etching);
        mark.rotation.x = -Math.PI / 2; mark.position.y = 0.089;
        spinner.add(mark);
        etchedMarks.push(mark);
      }

      const baseTint = new T.Color();
      const highlightTint = new T.Color();
      const etchingTint = new T.Color();
      let appliedColor = -1;
      const applyDiscAppearance = (color: number) => {
        if (appliedColor === color) return;
        appliedColor = color;
        baseTint.setHex(color);
        highlightTint.copy(baseTint).lerp(new T.Color(0xffffff), 0.56);
        etchingTint.copy(baseTint).multiplyScalar(0.82);

        // All four scenes share the same transparent glass material; only tint changes.
        glass.color.copy(baseTint);
        glass.attenuationColor.copy(baseTint);
        glass.emissive.copy(baseTint);
        glass.emissiveIntensity = 0;

        pink.color.copy(baseTint);
        pink.emissive.copy(baseTint);
        pink.emissiveIntensity = 0;
        white.color.copy(highlightTint);
        white.emissive.copy(baseTint);
        white.emissiveIntensity = 0;
        etching.color.copy(etchingTint);
        etching.emissive.copy(baseTint);
        etching.emissiveIntensity = 0;
        for (const detail of detailRings) detail.mesh.material = detail.highlight ? white : pink;
        for (const mark of etchedMarks) mark.material = etching;
      };
      applyDiscAppearance(initialColor);

      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      let reduced = mq.matches;
      let raf = 0, starEngineTimer = 0, elapsed = reduced ? DISC_FLIGHT_DURATION : 0, windTime = 0;
      let last = performance.now(), lastRender = 0, active = true, contextLost = false;
      let seenReplay = replay.current, seenPickup = pickupRef.current, seenReturn = returnRef.current, seenViewReset = viewResetRef.current;
      let wasPaused = pause.current, ready = false;
      let lastSceneIndex = sceneIndexRef.current;
      let tx = 0, ty = 0, px = 0, py = 0, spinAngle = 0;
      let throwWind = 0;
      let currentDiscInfluence = 0;
      let lastSeason: MeadowSeason = seasonRef.current;
      let zoom = 1, zoomTarget = 1;
      let viewYaw = 0, viewYawTarget = 0, viewPitch = 0, viewPitchTarget = 0;
      let walkCycle = 0, walkBlend = 0, walkBobOffset = 0, walkRoll = 0;
      let autoStowArmed = true;
      let lastDiscStowed = discStowedRef.current;
      let viewPointerId: number | null = null, viewLastX = 0, viewLastY = 0;
      let wipe: { snap: HTMLCanvasElement; t: number } | null = null;
      let soundFx: MeadowSound | null = createMeadowSound();
      let starFootstepTimer = 0;
      let lastGrassTime = 0;
      let hasGrassPosition = false;
      const lastGrassPosition = new T.Vector3();
      const grassVelocity = new T.Vector2();
      let rangeX = 2.4, rangeUp = 0.9, rangeDown = 0.85;
      const ease = (v: number) => Math.tanh(v * 1.25) / Math.tanh(1.25);
      const wrapAngle = (value: number) => Math.atan2(Math.sin(value), Math.cos(value));
      const baseEuler = new T.Euler(0, 0, 0, 'YXZ');
      const baseTurn = new T.Quaternion();
      const tipTurn = new T.Quaternion();
      const sideTurn = new T.Quaternion();
      const AXIS_X = new T.Vector3(1, 0, 0);
      const AXIS_Y = new T.Vector3(0, 1, 0);
      let touchId: number | null = null;
      let gesture: ThrowSample[] = [];
      let inspecting = false;
      let pressMode: 'inspect' | 'locked' = 'locked';
      let movedDuringPress = false;
      const lockedRotation = new T.Quaternion().setFromEuler(new T.Euler(0.82, 0, -0.18, 'YXZ'));
      const lockedPosition = new T.Vector3();
      let userThrow: ReturnType<typeof createUserThrow> | ReturnType<typeof createReturnFlight> | null = null;
      let returningFlight = false;
      let discLanded = false;
      let nearFlag = false;
      let throwTime = 0;
      const throwStartRotation = new T.Quaternion();
      const throwRestRotation = new T.Quaternion().setFromEuler(new T.Euler(0.82, 0, -0.18, 'YXZ'));
      const raycaster = new T.Raycaster();
      const pointer = new T.Vector2();
      const discPickSphere = new T.Sphere(new T.Vector3(), DISC_PICK_RADIUS);
      const dragPlane = new T.Plane();
      const dragHit = new T.Vector3();
      const dragOffset = new T.Vector3();
      const dragPosition = new T.Vector3();
      const dragLocalPosition = new T.Vector3();
      const dragNormal = new T.Vector3();

      // The local play frame keeps the existing disc physics and WASD controls intact.
      let homeZ = 10.2, homeY = -0.29, eyeOffset = 7.1;
      const player = { x: 0, z: 0 };
      const keys: Record<string, boolean> = { w: false, a: false, s: false, d: false };
      let starEngine: StarvalleyEngineApi | null = null;
      let starEnginePromise: Promise<StarvalleyEngineApi> | null = null;
      let starWorldReady = false;
      let starWorldActive = false;
      let starGroundWorldY = BASE_Y;
      let starSeasonalEffects: ReturnType<typeof createMeadowLandscape> | null = null;
      let starEnvironmentTarget: typeof environmentTarget | null = null;
      const frameOffset = new T.Vector3();
      const groundScratch = new T.Vector3();
      const walkDelta = new T.Vector3();
      const localCameraPosition = new T.Vector3();
      const localLookAt = new T.Vector3();
      const localViewDirection = new T.Vector3();
      const localViewRight = new T.Vector3();
      const worldLookAt = new T.Vector3();
      const worldDiscPosition = new T.Vector3();
      const worldDiscVelocity = new T.Vector3();
      const worldPlayerPosition = new T.Vector3();
      const showDiscDirection = new T.Vector3();
      const showDiscPosition = new T.Vector3();
      const cameraWorldQuaternion = new T.Quaternion();
      const frameWorldQuaternion = new T.Quaternion();
      const faceCameraRotation = new T.Quaternion().setFromEuler(new T.Euler(Math.PI / 2, 0, 0, 'YXZ'));
      const groundAt = (x: number, z: number) => {
        if (!starWorldActive || !starWorldReady || !starEngine) return grass.groundAt(x, z);
        groundScratch.set(x, 0, z);
        homeFrame.localToWorld(groundScratch);
        return starEngine.sampleWalkHeight(groundScratch.x, groundScratch.z, starGroundWorldY) - homeFrame.position.y;
      };
      const alignHomeFrame = () => {
        if (!starEngine) return;
        homeFrame.rotation.set(0, -starEngine.spawn.heading * Math.PI / 180, 0);
        frameOffset.set(0, 0, homeZ).applyQuaternion(homeFrame.quaternion);
        const spawnGround = starEngine.sampleHeight(starEngine.spawn.x, starEngine.spawn.z);
        starGroundWorldY = spawnGround;
        homeFrame.position.set(starEngine.spawn.x - frameOffset.x, spawnGround - BASE_Y, starEngine.spawn.z - frameOffset.z);
        homeFrame.updateMatrixWorld(true);
      };
      const updateStarGround = () => {
        if (!starWorldActive || !starWorldReady || !starEngine) return;
        worldPlayerPosition.set(player.x, 0, homeZ + player.z);
        homeFrame.localToWorld(worldPlayerPosition);
        starGroundWorldY = starEngine.sampleWalkHeight(worldPlayerPosition.x, worldPlayerPosition.z, starGroundWorldY);
      };
      const resolveStarWalk = (targetX: number, targetZ: number) => {
        if (!starEngine) return;
        worldPlayerPosition.set(player.x, 0, homeZ + player.z);
        homeFrame.localToWorld(worldPlayerPosition);
        let wx = worldPlayerPosition.x, wz = worldPlayerPosition.z, wy = starGroundWorldY;
        walkDelta.set(targetX - player.x, 0, targetZ - player.z).applyQuaternion(homeFrame.quaternion);
        const distance = Math.hypot(walkDelta.x, walkDelta.z);
        const steps = Math.max(1, Math.ceil(distance / 0.16));
        const stepX = walkDelta.x / steps, stepZ = walkDelta.z / steps;
        const attempt = (dx: number, dz: number) => {
          if (Math.abs(dx) + Math.abs(dz) < 1e-6) return false;
          const cx = wx + dx, cz = wz + dz;
          const resolved = starEngine!.resolveWalk(cx, cz, wy, 0.42);
          if (Math.hypot(resolved.x - cx, resolved.z - cz) > 0.75) return false;
          const nextGround = starEngine!.sampleWalkHeight(resolved.x, resolved.z, wy);
          if (Math.abs(nextGround - wy) > 2.5) return false;
          wx = resolved.x; wz = resolved.z; wy = nextGround;
          return true;
        };
        for (let i = 0; i < steps; i++) {
          if (!attempt(stepX, stepZ)) {
            if (Math.abs(stepX) >= Math.abs(stepZ)) {
              attempt(stepX, 0); attempt(0, stepZ);
            } else {
              attempt(0, stepZ); attempt(stepX, 0);
            }
          }
        }
        groundScratch.set(wx, 0, wz);
        homeFrame.worldToLocal(groundScratch);
        player.x = Math.max(STARVALLEY_WALK_BOUNDS.minX, Math.min(STARVALLEY_WALK_BOUNDS.maxX, groundScratch.x));
        player.z = Math.max(STARVALLEY_WALK_BOUNDS.minZ, Math.min(STARVALLEY_WALK_BOUNDS.maxZ, groundScratch.z - homeZ));
        starGroundWorldY = wy;
      };
      const placeCamera = () => {
        const cx = player.x;
        const cz = homeZ + player.z;
        homeFrame.updateMatrixWorld(true);
        localCameraPosition.set(cx, groundAt(cx, cz) + eyeOffset + walkBobOffset, cz);
        localLookAt.set(cx, localCameraPosition.y - homeY, cz - homeZ);
        localViewDirection.copy(localLookAt).sub(localCameraPosition).applyAxisAngle(AXIS_Y, viewYaw);
        localViewRight.copy(AXIS_X).applyAxisAngle(AXIS_Y, viewYaw);
        localViewDirection.applyAxisAngle(localViewRight, viewPitch);
        localLookAt.copy(localCameraPosition).add(localViewDirection);
        camera.position.copy(homeFrame.localToWorld(localCameraPosition));
        worldLookAt.copy(homeFrame.localToWorld(localLookAt));
        camera.lookAt(worldLookAt);
        if (walkRoll) camera.rotateZ(walkRoll);
      };
      let sampleFlight = createOutsideInFlight(1, homeZ);

      const applyPose = () => {
        const pose = sampleFlight(elapsed);
        const sx = ease(px), sy = ease(py);
        const offsetY = sy < 0 ? -sy * rangeUp : -sy * rangeDown;
        attitude.position.set(pose.position.x + sx * rangeX, pose.position.y + offsetY, pose.position.z + sy * 0.4);
        baseTurn.setFromEuler(baseEuler.set(pose.pitch, pose.yaw, pose.bank, 'YXZ'));
        tipTurn.setFromAxisAngle(AXIS_X, sy * (sy < 0 ? 2.75 : 0.8));
        sideTurn.setFromAxisAngle(AXIS_Y, sx * 1.7);
        attitude.quaternion.copy(sideTurn).multiply(tipTurn).multiply(baseTurn);
        if (pose.ready && !userThrow) {
          attitude.position.copy(lockedPosition);
          if (!inspecting) attitude.quaternion.copy(lockedRotation);
        }
        if (touchId !== null && pressMode === 'locked') {
          dragLocalPosition.copy(dragPosition);
          homeFrame.worldToLocal(dragLocalPosition);
          attitude.position.copy(dragLocalPosition);
        }
        if (userThrow) {
          const thrown = userThrow.sample(throwTime);
          attitude.position.set(thrown.position.x, thrown.position.y, thrown.position.z);
          attitude.quaternion.copy(throwStartRotation).slerp(throwRestRotation, thrown.orientationBlend);
        }
        attitude.visible = !discStowedRef.current;
        node.dataset.discStowed = String(discStowedRef.current);
        spinner.rotation.y = spinAngle;
        if (ready !== pose.ready || !node.dataset.flight) {
          ready = pose.ready;
          node.dataset.flight = ready ? 'settled' : 'flying';
        }
        node.dataset.flight = userThrow ? (returningFlight ? 'returning' : 'thrown') : discLanded ? 'landed' : (ready ? 'settled' : 'flying');
        node.dataset.dragging = String(touchId !== null && pressMode === 'locked' && movedDuringPress);
        node.dataset.mode = inspecting ? 'inspect' : 'locked';
        const interactive = !discStowedRef.current && ready && !userThrow && !discLanded && !reduced && !pause.current;
        node.dataset.interactive = String(interactive);
        if (interactive && !hintShown) {
          hintShown = true;
          try { window.sessionStorage.setItem(HOME_HINT_SEEN_KEY, '1'); } catch {}
          hintTimer = window.setTimeout(() => { node.dataset.hintDismissed = 'true'; }, 7000);
        }
        return pose;
      };
      const applyGrass = (pose: { x: number; y: number; z: number }, motion: boolean) => {
        const now = performance.now();
        const dt = lastGrassTime > 0 ? (now - lastGrassTime) / 1000 : 0;
        if (hasGrassPosition && dt > 0.001 && dt < 0.2) {
          grassVelocity.set((pose.x - lastGrassPosition.x) / dt, (pose.z - lastGrassPosition.z) / dt);
        } else {
          grassVelocity.set(0, 0);
        }
        lastGrassPosition.set(pose.x, pose.y, pose.z);
        lastGrassTime = now;
        hasGrassPosition = true;
        const arrivalGust = pose.z < -0.5 && !ready ? Math.max(0, Math.min(1, 1 - elapsed / DISC_FLIGHT_DURATION)) : 0;
        const influence = Math.max(arrivalGust, throwWind);
        currentDiscInfluence = motion ? influence : 0;
        const seasonIndex = { summer: 1, autumn: 2, winter: 3, night: 4 }[seasonRef.current];
        if (starWorldActive && starWorldReady) {
          starSeasonalEffects?.update(windTime, seasonIndex);
        } else {
          classicSeasonalEffects.update(windTime, seasonIndex);
          grass.update(windTime, motion, pose, influence, { x: grassVelocity.x, z: grassVelocity.y },
            { x: camera.position.x, z: camera.position.z }, 1, seasonRef.current);
        }
      };
      const renderStarvalley = (now: number) => {
        if (!starEngine || !starWorldReady || !starWorldActive) { renderer.render(scene, camera); return; }
        homeFrame.updateMatrixWorld(true);
        attitude.updateWorldMatrix(true, true);
        attitude.getWorldPosition(worldDiscPosition);
        worldDiscVelocity.set(grassVelocity.x, 0, grassVelocity.y).applyQuaternion(homeFrame.quaternion);
        worldPlayerPosition.set(player.x, 0, homeZ + player.z);
        homeFrame.localToWorld(worldPlayerPosition);
        const seasonIndex = { summer: 1, autumn: 2, winter: 3, night: 4 }[seasonRef.current];
        starEngine.frame(now, seasonIndex, pause.current || reduced, {
          position: { x: worldDiscPosition.x, y: worldDiscPosition.y, z: worldDiscPosition.z },
          velocity: { x: worldDiscVelocity.x, z: worldDiscVelocity.z },
          influence: currentDiscInfluence,
          player: { x: worldPlayerPosition.x, z: worldPlayerPosition.z },
        });
      };
      const resize = () => {
        const { width, height } = node.getBoundingClientRect();
        if (width <= 0 || height <= 0) return;
        camera.aspect = width / height;
        const tanHalfFov = Math.tan(camera.fov * Math.PI / 360);
        homeZ = Math.max(10.2, 3.15 / (tanHalfFov * camera.aspect));
        homeY = homeZ * -0.028;
        if (starWorldActive) {
          alignHomeFrame();
        } else {
          homeFrame.position.set(0, 0, 0);
          homeFrame.rotation.set(0, 0, 0);
          homeFrame.updateMatrixWorld(true);
        }
        eyeOffset = homeY - groundAt(0, homeZ);
        camera.updateProjectionMatrix();
        placeCamera();
        if (!starWorldReady) grass.layout();
        sampleFlight = createOutsideInFlight(camera.aspect, homeZ, camera.fov);
        const halfWidth = tanHalfFov * camera.aspect * homeZ;
        const halfHeight = tanHalfFov * homeZ;
        rangeX = Math.min(2.4, Math.max(0.8, halfWidth - 2.6));
        rangeUp = Math.min(1.1, Math.max(0.6, halfHeight - 2.4));
        rangeDown = 0.85;
        renderer.setSize(width, height, false);
        if (starWorldActive) starEngine?.resize();
        overlay.width = renderer.domElement.width;
        overlay.height = renderer.domElement.height;
        wipeTmp.width = overlay.width;
        wipeTmp.height = overlay.height;
        const pose = applyPose(); applyGrass(pose.position, !reduced && !pause.current);
        if (!contextLost) renderStarvalley(performance.now());
      };
      const observer = new ResizeObserver(resize); observer.observe(node);
      const visibility = new IntersectionObserver(([entry]) => { active = entry.isIntersecting; });
      visibility.observe(node);
      const aimRay = (event: PointerEvent) => {
        const box = node.getBoundingClientRect();
        pointer.set((event.clientX - box.left) / box.width * 2 - 1, -(event.clientY - box.top) / box.height * 2 + 1);
        camera.updateMatrixWorld();
        raycaster.setFromCamera(pointer, camera);
      };
      const remember = (event: PointerEvent) => {
        const time = performance.now();
        gesture.push({ x: event.clientX, y: event.clientY, time });
        if (gesture.length > 100) gesture.splice(1, gesture.length - 100);
      };
      const updateInspection = (event: PointerEvent) => {
        const box = node.getBoundingClientRect();
        tx = Math.max(-1, Math.min(1, ((event.clientX - box.left) / Math.max(1, box.width) - 0.5) * 2));
        ty = Math.max(-1, Math.min(1, ((event.clientY - box.top) / Math.max(1, box.height) - 0.5) * 2));
      };
      const move = (event: PointerEvent) => {
        if (viewPointerId !== null) {
          if (event.pointerId !== viewPointerId) return;
          const dx = event.clientX - viewLastX;
          const dy = event.clientY - viewLastY;
          viewYawTarget = wrapAngle(viewYawTarget + dx * 0.0045);
          viewPitchTarget = Math.max(-0.55, Math.min(0.55, viewPitchTarget - dy * 0.004));
          viewLastX = event.clientX;
          viewLastY = event.clientY;
          node.dataset.viewDragging = 'true';
          return;
        }
        if (!ready || userThrow || discLanded || pause.current || reduced) return;
        aimRay(event);
        if (touchId !== null) {
          if (event.pointerId !== touchId) return;
          const first = gesture[0];
          if (first && Math.hypot(event.clientX - first.x, event.clientY - first.y) > 8) movedDuringPress = true;
          if (pressMode === 'inspect') {
            if (movedDuringPress) updateInspection(event);
          } else if (movedDuringPress) {
            aimRay(event);
            if (raycaster.ray.intersectPlane(dragPlane, dragHit)) {
              dragPosition.copy(dragHit).add(dragOffset);
              const handY = groundAt(player.x, homeZ + player.z) + eyeOffset - homeY + homeFrame.position.y;
              dragPosition.y = Math.max(handY - 0.85, Math.min(handY + 3, dragPosition.y));
            }
          }
          remember(event);
          return;
        }
        if (inspecting && event.pointerType === 'mouse') updateInspection(event);
      };
      const down = (event: PointerEvent) => {
        if (touchId !== null || viewPointerId !== null || !event.isPrimary || event.button !== 0) return;
        aimRay(event);
        attitude.updateWorldMatrix(true, true);
        attitude.getWorldPosition(discPickSphere.center);
        const hitsDisc = !discStowedRef.current && raycaster.ray.intersectsSphere(discPickSphere);
        const canThrow = !discStowedRef.current && ready && !userThrow && !discLanded && !pause.current && !reduced;
        if (!hitsDisc) {
          event.preventDefault();
          if (inspecting) {
            lockedRotation.copy(attitude.quaternion);
            lockedPosition.copy(attitude.position);
            inspecting = false;
            tx = ty = px = py = 0;
          }
          viewPointerId = event.pointerId;
          viewLastX = event.clientX;
          viewLastY = event.clientY;
          node.dataset.viewDragging = 'false';
          node.setPointerCapture(event.pointerId);
          return;
        }
        if (!canThrow) return;
        event.preventDefault();
        touchId = event.pointerId;
        pressMode = inspecting ? 'inspect' : 'locked';
        movedDuringPress = false;
        if (inspecting) { tx = px; ty = py; }
        camera.getWorldDirection(dragNormal);
        dragPlane.setFromNormalAndCoplanarPoint(dragNormal, discPickSphere.center);
        raycaster.ray.intersectPlane(dragPlane, dragHit);
        dragOffset.copy(discPickSphere.center).sub(dragHit);
        dragPosition.copy(discPickSphere.center);
        gesture = []; remember(event);
        node.setPointerCapture(event.pointerId);
        node.dataset.dragging = 'false';
      };
      const leave = () => {
        if (touchId === null && inspecting) { tx = px; ty = py; }
      };
      const release = (event: PointerEvent) => {
        if (event.pointerId === viewPointerId) {
          viewPointerId = null;
          delete node.dataset.viewDragging;
          if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
          return;
        }
        if (event.pointerId !== touchId) return;
        remember(event);
        const box = node.getBoundingClientRect();
        const validRelease = event.type === 'pointerup' && !pause.current && !reduced;
        const first = gesture[0];
        const end = gesture[gesture.length - 1];
        const isClick = validRelease && !movedDuringPress && first && end && end.time - first.time < 500
          && Math.hypot(end.x - first.x, end.y - first.y) <= 8;
        const impulse = validRelease && pressMode === 'locked' && movedDuringPress
          ? getThrowImpulse(gesture, box.width, box.height) : null;
        if (isClick) {
          if (pressMode === 'inspect') {
            lockedRotation.copy(attitude.quaternion);
            lockedPosition.copy(attitude.position);
            inspecting = false;
          } else {
            inspecting = true;
          }
          tx = px; ty = py;
        } else if (impulse) {
          throwStartRotation.copy(lockedRotation);
          const faceNormal = new T.Vector3(0, 1, 0).applyQuaternion(lockedRotation).normalize();
          const travelDirection = new T.Vector3(
            -Math.sin(viewYaw) + Math.cos(viewYaw) * impulse.x * 0.25,
            0,
            -Math.cos(viewYaw) - Math.sin(viewYaw) * impulse.x * 0.25,
          ).normalize();
          const travelSide = new T.Vector3().crossVectors(travelDirection, AXIS_Y).normalize();
          const edgeTilt = faceNormal.dot(travelSide);
          const throwStyle = classifyThrowStyle(faceNormal.y, edgeTilt);
          const localRelease = homeFrame.worldToLocal(dragPosition.clone());
          userThrow = createUserThrow(localRelease, impulse, camera.aspect, throwStyle, groundAt, viewYaw);
          returningFlight = false;
          throwTime = 0;
        } else if (pressMode === 'locked' && validRelease && movedDuringPress) {
          lockedPosition.copy(homeFrame.worldToLocal(dragPosition.clone()));
        }
        touchId = null;
        gesture = [];
        if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
        node.dataset.dragging = 'false';
      };

      const setLanded = (landed: boolean) => {
        discLanded = landed;
        landedCallback.current?.(landed);
      };
      const setNear = (near: boolean) => {
        if (near === nearFlag) return;
        nearFlag = near;
        nearCallback.current?.(near);
      };
      const handPosition = () => new T.Vector3(player.x,
        groundAt(player.x, homeZ + player.z) + eyeOffset - homeY, player.z);
      lockedPosition.copy(handPosition());
      const showDiscInView = () => {
        userThrow = null; returningFlight = false; inspecting = false;
        throwTime = 0; throwWind = 0; spinAngle = 0;
        elapsed = DISC_FLIGHT_DURATION;
        tx = ty = px = py = 0;
        camera.updateMatrixWorld(true);
        homeFrame.updateMatrixWorld(true);
        camera.getWorldDirection(showDiscDirection);
        showDiscPosition.copy(camera.position).addScaledVector(showDiscDirection, 10.5);
        homeFrame.worldToLocal(showDiscPosition);
        lockedPosition.copy(showDiscPosition);
        camera.getWorldQuaternion(cameraWorldQuaternion);
        homeFrame.getWorldQuaternion(frameWorldQuaternion).invert();
        lockedRotation.copy(frameWorldQuaternion).multiply(cameraWorldQuaternion).multiply(faceCameraRotation);
        if (discLanded) setLanded(false);
        if (nearFlag) setNear(false);
      };
      const resetToHand = () => {
        userThrow = null; returningFlight = false; inspecting = false;
        lockedPosition.copy(handPosition());
        lockedRotation.setFromEuler(baseEuler.set(0.82, 0, -0.18, 'YXZ'));
        tx = ty = px = py = 0;
      };
      const sendBack = () => {
        if (!discLanded || userThrow || pause.current) return;
        throwStartRotation.copy(lockedRotation);
        const start = { x: lockedPosition.x, y: lockedPosition.y, z: lockedPosition.z };
        if (reduced) {
          resetToHand();
        } else {
          userThrow = createReturnFlight(start, handPosition());
          returningFlight = true;
          throwTime = 0;
        }
        setLanded(false);
        setNear(false);
      };
      const pickUp = () => {
        if (!discLanded || userThrow || !nearFlag) return;
        sendBack();
      };

      const onMotion = () => {
        reduced = mq.matches;
        if (reduced) {
          userThrow = null; returningFlight = false;
          if (touchId !== null && node.hasPointerCapture(touchId)) node.releasePointerCapture(touchId);
          touchId = null; gesture = []; node.dataset.dragging = 'false';
          inspecting = false;
          lockedRotation.setFromEuler(baseEuler.set(0.82, 0, -0.18, 'YXZ'));
          elapsed = DISC_FLIGHT_DURATION; windTime = 0; tx = ty = px = py = spinAngle = 0;
          if (discLanded) setLanded(false);
          player.x = 0; player.z = 0;
          lockedPosition.copy(handPosition());
        }
      };
      const onContextLost = (event: Event) => {
        event.preventDefault(); contextLost = true; delete node.dataset.ready; node.dataset.fallback = 'true';
      };
      const onContextRestored = () => { contextLost = false; node.dataset.ready = 'true'; delete node.dataset.fallback; };

      const isTyping = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      const onKeyDown = (event: KeyboardEvent) => {
        if (isTyping(event.target)) return;
        const key = event.key.toLowerCase();
        if (document.activeElement === node) {
          const viewStep = 0.1;
          if (key === 'arrowleft') { event.preventDefault(); viewYawTarget = wrapAngle(viewYawTarget - viewStep); }
          if (key === 'arrowright') { event.preventDefault(); viewYawTarget = wrapAngle(viewYawTarget + viewStep); }
          if (key === 'arrowup') { event.preventDefault(); viewPitchTarget = Math.min(0.55, viewPitchTarget + viewStep); }
          if (key === 'arrowdown') { event.preventDefault(); viewPitchTarget = Math.max(-0.55, viewPitchTarget - viewStep); }
          if (key === 'home') { event.preventDefault(); viewYawTarget = viewPitchTarget = 0; }
        }
        if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
          keys[key] = true;
          if (starWorldActive) {
            if (soundRef.current) starEngine?.resumeAudio();
          } else {
            soundFx?.resume(seasonRef.current, soundRef.current);
          }
        }
        if (key === 'e' && !event.repeat) sendBack();
      };
      const onStarvalleyAudioGesture = () => { starEngine?.resumeAudio(); };
      const onCanvasAudioGesture = () => {
        if (starWorldActive && soundRef.current) starEngine?.resumeAudio();
      };
      const onKeyUp = (event: KeyboardEvent) => {
        const key = event.key.toLowerCase();
        if (key === 'w' || key === 'a' || key === 's' || key === 'd') keys[key] = false;
      };
      const clearKeys = () => {
        keys.w = keys.a = keys.s = keys.d = false;
        soundFx?.setWalking(false, seasonRef.current);
      };
      const resetForWorldSwitch = (enteringStarvalley: boolean) => {
        clearKeys();
        if (enteringStarvalley) { player.x = 0; player.z = 0; }
        userThrow = null; returningFlight = false; inspecting = false;
        elapsed = DISC_FLIGHT_DURATION; throwTime = 0; throwWind = 0; spinAngle = 0;
        tx = ty = px = py = 0;
        if (discLanded) setLanded(false);
        if (nearFlag) setNear(false);
        walkCycle = 0; walkBlend = 0; walkBobOffset = 0; walkRoll = 0; starFootstepTimer = 0;
      };

      // Draws the old frame over the new scene, revealed left to right through a soft feathered edge.
      const drawWipe = () => {
        if (!wipe) return;
        const octx = overlay.getContext('2d');
        const tctx = wipeTmp.getContext('2d');
        if (!octx || !tctx) return;
        const W = overlay.width, H = overlay.height;
        const feather = W * 0.1;
        const eased = 1 - Math.pow(1 - wipe.t, 3);
        const edge = -feather + (W + 2 * feather) * eased;
        tctx.globalCompositeOperation = 'source-over';
        tctx.clearRect(0, 0, W, H);
        tctx.drawImage(wipe.snap, 0, 0, W, H);
        tctx.globalCompositeOperation = 'destination-in';
        const fade = tctx.createLinearGradient(edge - feather, 0, edge + feather, 0);
        fade.addColorStop(0, 'rgba(0,0,0,0)');
        fade.addColorStop(1, 'rgba(0,0,0,1)');
        tctx.fillStyle = fade;
        tctx.fillRect(0, 0, W, H);
        tctx.globalCompositeOperation = 'source-over';
        octx.clearRect(0, 0, W, H);
        octx.drawImage(wipeTmp, 0, 0);
      };
      // Wheel zooms the view (field of view only, so the disc keeps its place in the scene).
      const onWheel = (event: WheelEvent) => {
        if (reduced) return;
        event.preventDefault();
        zoomTarget = Math.min(1.45, Math.max(0.7, zoomTarget * Math.exp(event.deltaY * 0.0012)));
      };
      node.addEventListener('wheel', onWheel, { passive: false });
      const zone = node.parentElement ?? node;
      zone.addEventListener('pointermove', move); zone.addEventListener('pointerleave', leave);
      node.addEventListener('pointerdown', down);
      node.addEventListener('pointerup', release); node.addEventListener('pointercancel', release); node.addEventListener('lostpointercapture', release);
      mq.addEventListener('change', onMotion);
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);
      renderer.domElement.addEventListener('pointerdown', onCanvasAudioGesture);
      window.addEventListener('uf-starvalley-audio-gesture', onStarvalleyAudioGesture);
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', clearKeys);

      const tick = (now: number) => {
        const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
        let walkedThisFrame = false, walkedDistance = 0;
        if (seenReplay !== replay.current) {
          seenReplay = replay.current;
          elapsed = reduced ? DISC_FLIGHT_DURATION : 0;
          resetToHand();
          if (discLanded || nearFlag) { setLanded(false); setNear(false); }
          player.x = 0; player.z = 0;
          resetToHand();
          if (touchId !== null && node.hasPointerCapture(touchId)) node.releasePointerCapture(touchId);
          touchId = null; gesture = [];
          windTime = 0; throwWind = 0; hasGrassPosition = false; lastGrassTime = 0;
          spinAngle = 0;
        }
        if (wasPaused !== pause.current) wasPaused = pause.current;
        if (active && !document.hidden && !contextLost) {
          if (!pause.current && !reduced) {
            elapsed = Math.min(DISC_FLIGHT_DURATION, elapsed + dt);
            windTime += dt;
            updateLighting(seasonRef.current);
            const pose = sampleFlight(elapsed);
            if (userThrow) {
              throwTime += dt;
              const thrown = userThrow.sample(throwTime);
              throwWind = 1;
              spinAngle += thrown.spinRate * dt;
              if (thrown.done) {
                if (returningFlight) {
                  returningFlight = false; userThrow = null;
                  resetToHand();
                } else {
                  userThrow = null; inspecting = false;
                  lockedPosition.set(thrown.position.x, thrown.position.y, thrown.position.z);
                  lockedRotation.copy(throwStartRotation);
                  tx = ty = px = py = 0;
                  setLanded(true);
                }
              }
            } else {
              throwWind = Math.max(0, throwWind - dt * 0.9);
              spinAngle += pose.spinRate * dt;
            }
            if (pose.ready && !userThrow && inspecting) {
              const damping = 1 - Math.exp(-dt / 0.22);
              px += (tx - px) * damping; py += (ty - py) * damping;
            }
          }

          // Material updates only run when the selected scene or swatch changes.
          applyDiscAppearance(discColorRef.current);

          // Command tokens from the buttons.
          if (seenPickup !== pickupRef.current) { seenPickup = pickupRef.current; pickUp(); }
          if (seenReturn !== returnRef.current) { seenReturn = returnRef.current; sendBack(); }
          if (seenViewReset !== viewResetRef.current) {
            seenViewReset = viewResetRef.current;
            viewYawTarget = 0;
            viewPitchTarget = 0;
          }

          // Recovery leaves the walker in place. Only WASD changes player position.
          if (!returningFlight && !pause.current) {
            const previousHand = handPosition();
            const dx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
            const dz = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
            if (dx || dz) {
              const len = Math.hypot(dx, dz);
              const oldX = player.x, oldZ = player.z;
              const speed = starWorldActive ? STARVALLEY_WALK_SPEED : WALK_SPEED;
              const bounds = starWorldActive ? STARVALLEY_WALK_BOUNDS : MEADOW_WALK_BOUNDS;
              const nextX = Math.max(bounds.minX, Math.min(bounds.maxX, player.x + dx / len * speed * dt));
              const nextZ = Math.max(bounds.minZ, Math.min(bounds.maxZ, player.z + dz / len * speed * dt));
              if (starWorldActive && starEngine) resolveStarWalk(nextX, nextZ);
              else { player.x = nextX; player.z = nextZ; }
              walkedDistance = Math.hypot(player.x - oldX, player.z - oldZ);
              walkedThisFrame = walkedDistance > 0.0001;
              if (walkedThisFrame && !discLanded) lockedPosition.add(handPosition().sub(previousHand));
            }
          }
          if (starWorldActive && walkedThisFrame && !reduced) {
            walkCycle += walkedDistance * (Math.PI * 2 / Math.max(3.2, STARVALLEY_WALK_SPEED * 0.48));
          }
          const walkTarget = starWorldActive && walkedThisFrame && !reduced ? 1 : 0;
          walkBlend += (walkTarget - walkBlend) * (1 - Math.exp(-dt / (walkTarget ? 0.08 : 0.18)));
          walkBobOffset = walkBlend * Math.sin(walkCycle * 2) * 0.045;
          walkRoll = walkBlend * Math.sin(walkCycle) * 0.008;
          // Scene order: original meadow Summer/Autumn/Winter/Night, then Starvalley Summer/Autumn/Winter/Night.
          const selectedScene = sceneIndexRef.current;
          const sceneChanged = selectedScene !== lastSceneIndex;
          const seasonChanged = seasonRef.current !== lastSeason;
          let sceneSnapshot: HTMLCanvasElement | null = null;
          let recenterMeadow = false;
          let worldChanged = false;
          if ((sceneChanged || seasonChanged) && !reduced && renderer.domElement.width > 0) {
            sceneSnapshot = document.createElement('canvas');
            sceneSnapshot.width = renderer.domElement.width;
            sceneSnapshot.height = renderer.domElement.height;
            sceneSnapshot.getContext('2d')?.drawImage(renderer.domElement, 0, 0);
          }
          if (sceneChanged) {
            const wantsStarvalley = selectedScene >= 4;
            if (starEngine && starWorldReady && wantsStarvalley !== starWorldActive) {
              worldChanged = true;
              resetForWorldSwitch(wantsStarvalley);
              if (wantsStarvalley) {
                starWorldActive = true;
                alignHomeFrame();
                updateStarGround();
                classicSeasonalEffects.group.visible = false;
                if (starSeasonalEffects) starSeasonalEffects.group.visible = true;
                grass.group.visible = false;
                if (starEnvironmentTarget) {
                  environmentTarget = starEnvironmentTarget;
                  scene.environment = starEnvironmentTarget.texture;
                }
                sun.position.copy(starEngine.sunDirection).multiplyScalar(12);
                starEngine.activate();
              } else {
                starWorldActive = false;
                starEngine.deactivate();
                homeFrame.position.set(0, 0, 0);
                homeFrame.rotation.set(0, 0, 0);
                homeFrame.updateMatrixWorld(true);
                if (player.x < MEADOW_WALK_BOUNDS.minX || player.x > MEADOW_WALK_BOUNDS.maxX
                  || player.z < MEADOW_WALK_BOUNDS.minZ || player.z > MEADOW_WALK_BOUNDS.maxZ) {
                  player.x = 0; player.z = 0;
                  recenterMeadow = true;
                }
                if (starSeasonalEffects) starSeasonalEffects.group.visible = false;
                classicSeasonalEffects.group.visible = true;
                grass.group.visible = true;
                environmentTarget = fallbackEnvironmentTarget;
                scene.environment = fallbackEnvironmentTarget.texture;
                sun.position.copy(grass.sunDirection).multiplyScalar(12);
                restoreFallbackRendererState();
              }
              eyeOffset = homeY - groundAt(0, homeZ);
              if (worldChanged) resetToHand();
              else if (!userThrow && !discLanded) lockedPosition.copy(handPosition());
              if (recenterMeadow) {
                if (userThrow) { userThrow = null; returningFlight = false; }
                if (discLanded) setLanded(false);
                if (nearFlag) setNear(false);
                resetToHand();
              }
              updateLighting(seasonRef.current);
              placeCamera();
              resize();
            }
            lastSceneIndex = selectedScene;
            applyDiscAppearance(discColorRef.current);
          }
          if (seasonChanged) {
            lastSeason = seasonRef.current;
            updateLighting(lastSeason);
          }
          if (sceneSnapshot) wipe = { snap: sceneSnapshot, t: 0 };
          if (wipe) {
            wipe.t = Math.min(1, wipe.t + dt / 1.2);
            if (wipe.t >= 1) {
              wipe = null;
              overlay.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height);
            }
          }
          zoom += (zoomTarget - zoom) * (1 - Math.exp(-dt / 0.18));
          const viewEase = reduced ? 1 : 1 - Math.exp(-dt / 0.14);
          const yawDelta = wrapAngle(viewYawTarget - viewYaw);
          viewYaw = wrapAngle(viewYaw + yawDelta * viewEase);
          viewPitch += (viewPitchTarget - viewPitch) * viewEase;
          const fov = Math.min(52, Math.max(22, BASE_FOV * zoom));
          if (Math.abs(fov - camera.fov) > 0.01) {
            camera.fov = fov;
            camera.updateProjectionMatrix();
          }
          placeCamera();
          const discIsStowed = discStowedRef.current;
          if (lastDiscStowed && !discIsStowed) {
            autoStowArmed = false;
            showDiscInView();
          }
          lastDiscStowed = discIsStowed;
          const yawMagnitude = Math.abs(wrapAngle(viewYaw));
          const pitchMagnitude = Math.abs(viewPitch);
          const viewIsCentered = yawMagnitude < 0.52 && pitchMagnitude < 0.30;
          if (viewIsCentered) autoStowArmed = true;
          else if (autoStowArmed && !discIsStowed && ready && !userThrow && !discLanded
            && (yawMagnitude > 0.78 || pitchMagnitude > 0.42)) {
            autoStowArmed = false;
            stowCallback.current?.(true);
          }
          if (discLanded) {
            const dxp = player.x - lockedPosition.x;
            const dzp = homeZ + player.z - lockedPosition.z;
            setNear(Math.hypot(dxp, dzp) < PICKUP_RANGE);
          } else {
            setNear(false);
          }

          const pose = applyPose();
          applyGrass(attitude.position, !reduced && !pause.current);
          const interacting = Math.abs(tx - px) + Math.abs(ty - py) > 0.002;
          const turningView = Math.abs(wrapAngle(viewYawTarget - viewYaw)) + Math.abs(viewPitchTarget - viewPitch) > 0.002;
          const moving = keys.w || keys.a || keys.s || keys.d;
          const frameInterval = starWorldActive || !pose.ready || userThrow || touchId !== null || viewPointerId !== null || turningView || interacting || moving || wipe !== null
            ? 1000 / 60 : 1000 / 30;
          if (now - lastRender >= frameInterval || wasPaused !== pause.current) {
            renderStarvalley(now); lastRender = now;
            drawWipe();
          }
        }
        starEngine?.setAudioEnabled(starWorldActive && soundRef.current);
        if (starWorldActive && walkedThisFrame && soundRef.current && starEngine) {
          starFootstepTimer -= dt;
          if (starFootstepTimer <= 0) {
            worldPlayerPosition.set(player.x, 0, homeZ + player.z);
            homeFrame.localToWorld(worldPlayerPosition);
            starEngine.footstep(STARVALLEY_WALK_SPEED, worldPlayerPosition.x, worldPlayerPosition.z);
            starFootstepTimer = Math.max(0.24, 1.9 / STARVALLEY_WALK_SPEED);
          }
        } else {
          starFootstepTimer = 0;
        }
        soundFx?.setWalking(walkedThisFrame && soundRef.current && !starWorldActive, seasonRef.current);
        raf = requestAnimationFrame(tick);
      };
      node.appendChild(renderer.domElement);
      node.appendChild(overlay);
      resize(); node.dataset.ready = 'true'; raf = requestAnimationFrame(tick);
      const finishCleanup = () => {
        starEngine?.dispose(); starEngine = null;
        if (starSeasonalEffects) {
          homeFrame.remove(starSeasonalEffects.group);
          starSeasonalEffects.dispose();
          starSeasonalEffects = null;
        }
        homeFrame.remove(classicSeasonalEffects.group);
        classicSeasonalEffects.dispose();
        disposeFallbackGrass();
        spinner.traverse(object => { if (object instanceof T.Mesh) object.geometry.dispose(); });
        glass.dispose(); pink.dispose(); white.dispose(); etching.dispose();
        scene.environment = null;
        fallbackEnvironmentTarget.dispose();
        starEnvironmentTarget?.dispose();
        renderer.dispose(); renderer.domElement.remove(); overlay.remove();
        delete node.dataset.ready; delete node.dataset.engine; delete node.dataset.flight; delete node.dataset.interactive; delete node.dataset.fallback; delete node.dataset.dragging; delete node.dataset.mode; delete node.dataset.hintDismissed;
      };
      cleanup = () => {
        cancelAnimationFrame(raf); window.clearTimeout(starEngineTimer);
        if (hintTimer !== undefined) window.clearTimeout(hintTimer);
        observer.disconnect(); visibility.disconnect();
        zone.removeEventListener('pointermove', move); zone.removeEventListener('pointerleave', leave);
        node.removeEventListener('pointerdown', down);
        node.removeEventListener('pointerup', release); node.removeEventListener('pointercancel', release); node.removeEventListener('lostpointercapture', release);
        mq.removeEventListener('change', onMotion);
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
        renderer.domElement.removeEventListener('pointerdown', onCanvasAudioGesture);
        window.removeEventListener('uf-starvalley-audio-gesture', onStarvalleyAudioGesture);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', clearKeys);
        node.removeEventListener('wheel', onWheel);
        soundFx?.setWalking(false, seasonRef.current);
        soundFx?.dispose(); soundFx = null;
        if (starEnginePromise && !starEngine) {
          void starEnginePromise.then(api => api.dispose(), () => undefined).finally(finishCleanup);
        } else {
          finishCleanup();
        }
      };

      starEngineTimer = window.setTimeout(() => {
        const engineTask = import('./starvalley-engine').then(({ createStarvalleyEngine }) =>
          createStarvalleyEngine(T, renderer, scene, camera, node));
        starEnginePromise = engineTask;
        void engineTask.then(api => {
          if (disposed) return;
          const snap = document.createElement('canvas');
          snap.width = renderer.domElement.width;
          snap.height = renderer.domElement.height;
          snap.getContext('2d')?.drawImage(renderer.domElement, 0, 0);
          const previousEnvironment = environmentTarget;
          let nextEnvironment: typeof environmentTarget | null = null;
          try {
            starEngine = api;
            starWorldReady = true;
            starWorldActive = sceneIndexRef.current >= 4;
            if (starWorldActive) resetForWorldSwitch(true);
            alignHomeFrame();
            if (starWorldActive) updateStarGround();
            eyeOffset = homeY - groundAt(0, homeZ);
            if (starWorldActive) resetToHand();
            starSeasonalEffects = createMeadowLandscape(T, BASE_Y, { groundAt, includeTree: false });
            const skyEnvironment = api.createEnvironment();
            const nextPmrem = new T.PMREMGenerator(renderer);
            try {
              nextEnvironment = nextPmrem.fromScene(skyEnvironment.scene, 0.035, 0.1, 100);
            } finally {
              skyEnvironment.dispose(); nextPmrem.dispose();
            }
            homeFrame.add(starSeasonalEffects.group);
            starEnvironmentTarget = nextEnvironment;
            classicSeasonalEffects.group.visible = !starWorldActive;
            starSeasonalEffects.group.visible = starWorldActive;
            grass.group.visible = !starWorldActive;
            if (starWorldActive) {
              environmentTarget = nextEnvironment;
              scene.environment = nextEnvironment.texture;
              sun.position.copy(api.sunDirection).multiplyScalar(12);
              api.activate();
            } else {
              environmentTarget = fallbackEnvironmentTarget;
              scene.environment = fallbackEnvironmentTarget.texture;
              sun.position.copy(grass.sunDirection).multiplyScalar(12);
              restoreFallbackRendererState();
              api.deactivate();
            }
            updateLighting(seasonRef.current);
            api.setAudioEnabled(starWorldActive && soundRef.current);
            wipe = { snap, t: 0 };
            resize();
            starEnginePromise = null;
            node.dataset.engine = 'ready';
          } catch (error) {
            starWorldReady = false;
            starWorldActive = false;
            homeFrame.position.set(0, 0, 0); homeFrame.rotation.set(0, 0, 0); homeFrame.updateMatrixWorld(true);
            if (starSeasonalEffects) {
              homeFrame.remove(starSeasonalEffects.group);
              starSeasonalEffects.dispose();
              starSeasonalEffects = null;
            }
            api.deactivate(); api.dispose(); starEngine = null;
            starEnvironmentTarget = null;
            restoreFallbackRendererState();
            grass.group.visible = true;
            classicSeasonalEffects.group.visible = true;
            environmentTarget = previousEnvironment;
            scene.environment = previousEnvironment.texture;
            nextEnvironment?.dispose();
            eyeOffset = homeY - grass.groundAt(0, homeZ);
            placeCamera();
            resize();
            overlay.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height);
            wipe = null;
            starEnginePromise = null;
            console.error('[GlassDisc] Starvalley scene integration failed', error);
            node.dataset.engine = 'fallback';
          }
        }).catch(error => {
          starEnginePromise = null;
          restoreFallbackRendererState();
          if (!disposed) {
            console.error('[GlassDisc] Starvalley engine boot failed', error);
            node.dataset.engine = 'fallback';
          }
        });
      }, 0);
    }).catch((error: unknown) => {
      if (!disposed) {
        console.error('[GlassDisc] Three.js scene initialization failed', error);
        node.dataset.fallback = 'true';
      }
    });
    return () => { disposed = true; cleanup(); delete node.dataset.fallback; };
  }, []);

  const discColorCss = `#${discColor.toString(16).padStart(6, '0')}`;
  return <div ref={host} className="aero-object" role="group" tabIndex={0} aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home" aria-label={lang === 'zh' ? '季节草甸飞盘场景。拖动场地空白处可左右、上下环顾，滚轮缩放；聚焦场景后用方向键环顾、Home 复位。WASD 行走，落地后按 E 或点击“盘来”。' : 'Seasonal meadow disc scene. Drag open ground to look left, right, up and down; scroll to zoom. When focused, use arrow keys to look and Home to reset. Walk with WASD; press E or Fly back to recall a landed disc.'}>
    <svg className="aero-fallback" viewBox="0 0 800 500" aria-hidden="true">
      <g transform="translate(400 250) rotate(-12)"><ellipse rx="240" ry="134" fill={discColorCss} fillOpacity=".92" stroke="#1b1a2e" strokeWidth="5"/>
        {Array.from({length:12},(_,i)=><ellipse key={i} rx={235-i*2.6} ry={130-i*2.4} fill="none" stroke={i%3 ? '#fff8e8' : discColorCss} strokeWidth={i%3 ? 2:3}/>)}</g>
    </svg>
    <span className="aero-disc-hint" aria-hidden="true">
      <span className="aero-hint-desktop">{lang === 'zh' ? '拖动空地环顾；点击飞盘查看，再拖拽甩出。大幅转动视角会自动收起，右下按钮可显示。WASD 行走。' : 'Drag open ground to look around; click and drag the disc to inspect and throw. A wide turn stows it; use Show disc at the lower right to restore it.'}</span>
      <span className="aero-hint-touch">{lang === 'zh' ? '拖动空地环顾；轻点飞盘查看，再拖拽甩出。大幅转动视角会自动收起。' : 'Drag open ground to look around; tap and drag the disc. A wide turn stows it automatically.'}</span>
    </span>
  </div>;
}
