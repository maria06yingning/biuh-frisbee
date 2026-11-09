'use client';

import { useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { createOutsideInFlight, DISC_FLIGHT_DURATION } from './disc-flight';
import { createProceduralGrassField } from './procedural-grass';
import { classifyThrowStyle, createReturnFlight, createUserThrow, getThrowImpulse, type ThrowSample } from './disc-throw';
import type { MeadowSeason } from './meadow-season';
import { createMeadowSound, type MeadowSound } from './meadow-audio';

const WALK_SPEED = 7;
/** Pick-up range: how close the walker must stand to the landed disc. */
const PICKUP_RANGE = 9;
/** Distance walked between two footsteps. */
const STEP_LENGTH = 1.7;
const BASE_FOV = 36;

export type DiscCommand = { pickup: number; return: number };

/** The homepage disc and its procedural meadow share one lightweight Three.js scene. */
export default function GlassDisc({
  paused,
  replayToken = 0,
  season = 'summer',
  pickupToken = 0,
  returnToken = 0,
  onDiscLanded,
  onNearDisc,
  soundOn = true,
}: {
  paused: boolean;
  replayToken?: number;
  season?: MeadowSeason;
  pickupToken?: number;
  returnToken?: number;
  onDiscLanded?: (landed: boolean) => void;
  onNearDisc?: (near: boolean) => void;
  soundOn?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const pause = useRef(paused);
  const replay = useRef(replayToken);
  const seasonRef = useRef(season);
  const pickupRef = useRef(pickupToken);
  const returnRef = useRef(returnToken);
  const landedCallback = useRef(onDiscLanded);
  const nearCallback = useRef(onNearDisc);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  pause.current = paused;
  replay.current = replayToken;
  seasonRef.current = season;
  pickupRef.current = pickupToken;
  returnRef.current = returnToken;
  landedCallback.current = onDiscLanded;
  nearCallback.current = onNearDisc;
  const { lang } = useI18n();

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let disposed = false;
    let cleanup = () => {};

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
      renderer.domElement.setAttribute('aria-hidden', 'true');
      // Overlay holds the old frame during a soft-edged scene wipe.
      const overlay = document.createElement('canvas');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';
      const wipeTmp = document.createElement('canvas');

      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(36, 1, 0.5, 700);
      camera.position.set(0, -0.29, 10.2);
      camera.lookAt(0, 0, 0);

      const grass = createProceduralGrassField(T);
      scene.add(grass.group);

      const environment = grass.createEnvironment();
      const pmrem = new T.PMREMGenerator(renderer);
      const env = pmrem.fromScene(environment.scene, 0.035, 0.1, 100);
      scene.environment = env.texture;
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
      let discMaterial: InstanceType<typeof T.MeshPhysicalMaterial> | null = null;
      let discGlow: InstanceType<typeof T.MeshBasicMaterial> | null = null;
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
        if (discMaterial) discMaterial.emissiveIntensity = night ? 1.25 : 0;
        if (discGlow) discGlow.opacity = night ? 0.78 : 0;
      };
      updateLighting(seasonRef.current);

      // Attitude carries the disc's place and tilt; the spinner adds its axial spin.
      const attitude = new T.Group();
      const spinner = new T.Group();
      attitude.add(spinner); scene.add(attitude);
      const glass = new T.MeshPhysicalMaterial({
        color: 0xff3d7f, metalness: 0.015, roughness: 0.1,
        transmission: 0.68, thickness: 0.22, ior: 1.46,
        emissive: new T.Color(0xff3d7f), emissiveIntensity: 0,
        clearcoat: 1, clearcoatRoughness: 0.08,
        attenuationColor: new T.Color(0xff3d7f), attenuationDistance: 1.35,
        transparent: true, opacity: 0.95, side: T.DoubleSide,
      });
      discMaterial = glass;
      const section = [[0,0.11],[0.6,0.115],[1.3,0.1],[1.72,0.07],[1.88,0.035],[2,0],[2.12,-0.08],[2.19,-0.18],[2.18,-0.29],[2.1,-0.34],[2.02,-0.29],[1.98,-0.17],[1.86,-0.09],[1.5,-0.035],[0.6,0.025],[0,0.035]];
      spinner.add(new T.Mesh(new T.LatheGeometry(section.map(([x, y]) => new T.Vector2(x, y)), 144), glass));
      discGlow = new T.MeshBasicMaterial({ color: 0xff3d7f, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
      const glowRing = new T.Mesh(new T.TorusGeometry(2.24, 0.055, 8, 128), discGlow);
      glowRing.rotation.x = Math.PI / 2;
      spinner.add(glowRing);
      const pink = new T.MeshPhysicalMaterial({ color: 0xff3d7f, metalness: 0.18, roughness: 0.16, transparent: true, opacity: 0.76, clearcoat: 1 });
      const white = new T.MeshPhysicalMaterial({ color: 0xfff8e8, metalness: 0.08, roughness: 0.12, transparent: true, opacity: 0.84 });
      for (let i = 0; i < 14; i++) {
        const ring = new T.Mesh(new T.TorusGeometry(1.76 + i * 0.028, i % 4 === 0 ? 0.008 : 0.0045, 6, 128), i % 3 === 0 ? pink : white);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.055 - Math.pow(i / 13, 2) * 0.24;
        spinner.add(ring);
      }
      const etching = new T.MeshStandardMaterial({ color: 0xff3d7f, roughness: 0.33, transparent: true, opacity: 0.58, side: T.DoubleSide });
      for (const [start, arc] of [[0.3, 0.8], [3.4, 0.4]]) {
        const mark = new T.Mesh(new T.RingGeometry(1.56, 1.576, 48, 1, start, arc), etching);
        mark.rotation.x = -Math.PI / 2; mark.position.y = 0.089;
        spinner.add(mark);
      }

      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      let reduced = mq.matches;
      let raf = 0, elapsed = reduced ? DISC_FLIGHT_DURATION : 0, windTime = 0;
      let last = performance.now(), lastRender = 0, active = true, contextLost = false;
      let seenReplay = replay.current, seenPickup = pickupRef.current, seenReturn = returnRef.current;
      let wasPaused = pause.current, ready = false;
      let tx = 0, ty = 0, px = 0, py = 0, spinAngle = 0;
      let throwWind = 0;
      let lastSeason: MeadowSeason = seasonRef.current;
      let zoom = 1, zoomTarget = 1, stepDistance = 0;
      let wipe: { snap: HTMLCanvasElement; t: number } | null = null;
      let soundFx: MeadowSound | null = createMeadowSound();
      let lastGrassTime = 0;
      let hasGrassPosition = false;
      const lastGrassPosition = new T.Vector3();
      const grassVelocity = new T.Vector2();
      let rangeX = 2.4, rangeUp = 0.9, rangeDown = 0.85;
      const ease = (v: number) => Math.tanh(v * 1.25) / Math.tanh(1.25);
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
      const discPickSphere = new T.Sphere(new T.Vector3(), 2.7);
      const dragPlane = new T.Plane();
      const dragHit = new T.Vector3();
      const dragOffset = new T.Vector3();
      const dragPosition = new T.Vector3();
      const dragNormal = new T.Vector3();

      // Walker: WASD moves the camera over the meadow; the camera keeps its eye height above the ground.
      let homeZ = 10.2, homeY = -0.29, eyeOffset = 7.1;
      const player = { x: 0, z: 0 };
      const keys: Record<string, boolean> = { w: false, a: false, s: false, d: false };

      const placeCamera = () => {
        const cx = player.x;
        const cz = homeZ + player.z;
        camera.position.set(cx, grass.groundAt(cx, cz) + eyeOffset, cz);
        // Keep the home pitch: the look target moves with the walker, so the view angle never changes.
        camera.lookAt(cx, camera.position.y - homeY, cz - homeZ);
      };

      let sampleFlight = createOutsideInFlight(1, camera.position.z);

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
        if (touchId !== null && pressMode === 'locked') attitude.position.copy(dragPosition);
        if (userThrow) {
          const thrown = userThrow.sample(throwTime);
          attitude.position.set(thrown.position.x, thrown.position.y, thrown.position.z);
          attitude.quaternion.copy(throwStartRotation).slerp(throwRestRotation, thrown.orientationBlend);
        }
        spinner.rotation.y = spinAngle;
        if (ready !== pose.ready || !node.dataset.flight) {
          ready = pose.ready;
          node.dataset.flight = ready ? 'settled' : 'flying';
        }
        node.dataset.flight = userThrow ? (returningFlight ? 'returning' : 'thrown') : discLanded ? 'landed' : (ready ? 'settled' : 'flying');
        node.dataset.dragging = String(touchId !== null && pressMode === 'locked' && movedDuringPress);
        node.dataset.mode = inspecting ? 'inspect' : 'locked';
        node.dataset.interactive = String(ready && !userThrow && !discLanded && !reduced && !pause.current);
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
        grass.update(windTime, motion, pose, influence, { x: grassVelocity.x, z: grassVelocity.y },
          { x: camera.position.x, z: camera.position.z }, 1, seasonRef.current);
      };
      const resize = () => {
        const { width, height } = node.getBoundingClientRect();
        if (width <= 0 || height <= 0) return;
        camera.aspect = width / height;
        const tanHalfFov = Math.tan(camera.fov * Math.PI / 360);
        homeZ = Math.max(10.2, 3.15 / (tanHalfFov * camera.aspect));
        homeY = homeZ * -0.028;
        eyeOffset = homeY - grass.groundAt(0, homeZ);
        camera.updateProjectionMatrix();
        placeCamera();
        grass.layout();
        sampleFlight = createOutsideInFlight(camera.aspect, homeZ, camera.fov);
        const halfWidth = tanHalfFov * camera.aspect * homeZ;
        const halfHeight = tanHalfFov * homeZ;
        rangeX = Math.min(2.4, Math.max(0.8, halfWidth - 2.6));
        rangeUp = Math.min(1.1, Math.max(0.6, halfHeight - 2.4));
        rangeDown = 0.85;
        renderer.setSize(width, height, false);
        overlay.width = renderer.domElement.width;
        overlay.height = renderer.domElement.height;
        wipeTmp.width = overlay.width;
        wipeTmp.height = overlay.height;
        const pose = applyPose(); applyGrass(pose.position, !reduced && !pause.current);
        if (!contextLost) renderer.render(scene, camera);
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
              const handY = grass.groundAt(player.x, homeZ + player.z) + eyeOffset - homeY;
              dragPosition.y = Math.max(handY - 0.85, Math.min(handY + 3, dragPosition.y));
            }
          }
          remember(event);
          return;
        }
        if (inspecting && event.pointerType === 'mouse') updateInspection(event);
      };
      const down = (event: PointerEvent) => {
        if (touchId !== null || !event.isPrimary || event.button !== 0 || !ready || userThrow || discLanded || pause.current || reduced) return;
        aimRay(event);
        attitude.updateWorldMatrix(true, true);
        attitude.getWorldPosition(discPickSphere.center);
        if (!raycaster.ray.intersectsSphere(discPickSphere)) return;
        event.preventDefault();
        touchId = event.pointerId;
        pressMode = inspecting ? 'inspect' : 'locked';
        movedDuringPress = false;
        if (inspecting) { tx = px; ty = py; }
        camera.getWorldDirection(dragNormal);
        dragPlane.setFromNormalAndCoplanarPoint(dragNormal, attitude.position);
        raycaster.ray.intersectPlane(dragPlane, dragHit);
        dragOffset.copy(attitude.position).sub(dragHit);
        dragPosition.copy(attitude.position);
        gesture = []; remember(event);
        node.setPointerCapture(event.pointerId);
        node.dataset.dragging = 'false';
      };
      const leave = () => {
        if (touchId === null && inspecting) { tx = px; ty = py; }
      };
      const release = (event: PointerEvent) => {
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
          const travelDirection = new T.Vector3(impulse.x, 0, -1).normalize();
          const travelSide = new T.Vector3().crossVectors(travelDirection, AXIS_Y).normalize();
          const edgeTilt = faceNormal.dot(travelSide);
          const throwStyle = classifyThrowStyle(faceNormal.y, edgeTilt);
          userThrow = createUserThrow(dragPosition, impulse, camera.aspect, throwStyle, grass.groundAt);
          returningFlight = false;
          throwTime = 0;
        } else if (pressMode === 'locked' && validRelease && movedDuringPress) {
          lockedPosition.copy(dragPosition);
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
        grass.groundAt(player.x, homeZ + player.z) + eyeOffset - homeY, player.z);
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
          inspecting = false; lockedPosition.set(0, 0, 0);
          lockedRotation.setFromEuler(baseEuler.set(0.82, 0, -0.18, 'YXZ'));
          elapsed = DISC_FLIGHT_DURATION; windTime = 0; tx = ty = px = py = spinAngle = 0;
          if (discLanded) setLanded(false);
          player.x = 0; player.z = 0;
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
        if (key === 'w' || key === 'a' || key === 's' || key === 'd') keys[key] = true;
        if (key === 'e' && !event.repeat) sendBack();
        if (key === 'w' || key === 'a' || key === 's' || key === 'd') soundFx?.resume();
      };
      const onKeyUp = (event: KeyboardEvent) => {
        const key = event.key.toLowerCase();
        if (key === 'w' || key === 'a' || key === 's' || key === 'd') keys[key] = false;
      };
      const clearKeys = () => { keys.w = keys.a = keys.s = keys.d = false; };

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
        soundFx?.resume();
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
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', clearKeys);

      const tick = (now: number) => {
        const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
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

          // Command tokens from the buttons.
          if (seenPickup !== pickupRef.current) { seenPickup = pickupRef.current; pickUp(); }
          if (seenReturn !== returnRef.current) { seenReturn = returnRef.current; sendBack(); }

          // Recovery leaves the walker in place. Only WASD changes player position.
          if (!userThrow && !pause.current && !reduced) {
            const previousHand = handPosition();
            const dx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
            const dz = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
            if (dx || dz) {
              const len = Math.hypot(dx, dz);
              player.x = Math.max(-30, Math.min(30, player.x + dx / len * WALK_SPEED * dt));
              player.z = Math.max(-95, Math.min(0, player.z + dz / len * WALK_SPEED * dt));
              if (!discLanded) lockedPosition.add(handPosition().sub(previousHand));
              stepDistance += WALK_SPEED * dt;
              if (stepDistance >= STEP_LENGTH) {
                stepDistance = 0;
                if (soundRef.current) soundFx?.step(seasonRef.current);
              }
            }
          }
          // Scene change: capture the frame still on screen, then wipe it away to reveal the new scene.
          if (seasonRef.current !== lastSeason) {
            lastSeason = seasonRef.current;
            if (!reduced && renderer.domElement.width > 0) {
              const snap = document.createElement('canvas');
              snap.width = renderer.domElement.width;
              snap.height = renderer.domElement.height;
              snap.getContext('2d')?.drawImage(renderer.domElement, 0, 0);
              wipe = { snap, t: 0 };
            }
          }
          if (wipe) {
            wipe.t = Math.min(1, wipe.t + dt / 1.2);
            if (wipe.t >= 1) {
              wipe = null;
              overlay.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height);
            }
          }
          zoom += (zoomTarget - zoom) * (1 - Math.exp(-dt / 0.18));
          const fov = Math.min(52, Math.max(22, BASE_FOV * zoom));
          if (Math.abs(fov - camera.fov) > 0.01) {
            camera.fov = fov;
            camera.updateProjectionMatrix();
          }
          placeCamera();
          if (discLanded) {
            const dxp = camera.position.x - lockedPosition.x;
            const dzp = camera.position.z - lockedPosition.z;
            setNear(Math.hypot(dxp, dzp) < PICKUP_RANGE);
          } else {
            setNear(false);
          }

          const pose = applyPose();
          applyGrass(attitude.position, !reduced && !pause.current);
          const interacting = Math.abs(tx - px) + Math.abs(ty - py) > 0.002;
          const moving = keys.w || keys.a || keys.s || keys.d;
          const frameInterval = !pose.ready || userThrow || touchId !== null || interacting || moving || wipe !== null ? 1000 / 60 : 1000 / 30;
          if (now - lastRender >= frameInterval || wasPaused !== pause.current) {
            renderer.render(scene, camera); lastRender = now;
            drawWipe();
          }
        }
        raf = requestAnimationFrame(tick);
      };
      node.appendChild(renderer.domElement);
      node.appendChild(overlay);
      resize(); node.dataset.ready = 'true'; raf = requestAnimationFrame(tick);
      cleanup = () => {
        cancelAnimationFrame(raf); observer.disconnect(); visibility.disconnect();
        zone.removeEventListener('pointermove', move); zone.removeEventListener('pointerleave', leave);
        node.removeEventListener('pointerdown', down);
        node.removeEventListener('pointerup', release); node.removeEventListener('pointercancel', release); node.removeEventListener('lostpointercapture', release);
        mq.removeEventListener('change', onMotion);
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', clearKeys);
        node.removeEventListener('wheel', onWheel);
        soundFx?.dispose(); soundFx = null;
        spinner.traverse(object => { if (object instanceof T.Mesh) object.geometry.dispose(); });
        glass.dispose(); pink.dispose(); white.dispose(); etching.dispose(); discGlow?.dispose();
        grass.dispose(); env.dispose();
        renderer.dispose(); renderer.domElement.remove(); overlay.remove();
        delete node.dataset.ready; delete node.dataset.flight; delete node.dataset.interactive; delete node.dataset.fallback; delete node.dataset.dragging; delete node.dataset.mode;
      };
    }).catch((error: unknown) => {
      if (!disposed) {
        console.error('[GlassDisc] Three.js scene initialization failed', error);
        node.dataset.fallback = 'true';
      }
    });
    return () => { disposed = true; cleanup(); delete node.dataset.fallback; };
  }, []);

  return <div ref={host} className="aero-object" role="img" aria-label={lang === 'zh' ? '玫红色半透明飞盘位于草甸上；可用 WASD 行走，落地后按 E 或点击一键飞回，将飞盘收回当前位置' : 'A rose-magenta disc over a meadow; walk with WASD, and press E or Fly back to recall the landed disc to your current position'}>
    <svg className="aero-fallback" viewBox="0 0 800 500" aria-hidden="true">
      <g transform="translate(400 250) rotate(-12)"><ellipse rx="240" ry="134" fill="#ff3d7f" fillOpacity=".92" stroke="#1b1a2e" strokeWidth="5"/>
        {Array.from({length:12},(_,i)=><ellipse key={i} rx={235-i*2.6} ry={130-i*2.4} fill="none" stroke={i%3 ? '#fff8e8':'#ff3d7f'} strokeWidth={i%3 ? 2:3}/>)}</g>
    </svg>
    <span className="aero-disc-hint" aria-hidden="true">
      <span className="aero-hint-desktop">{lang === 'zh' ? '点击查看并调整盘体倾斜，再点锁定后甩出；WASD 行走，按 E 让落地飞盘飞回当前位置' : 'Inspect, lock, then throw; walk with WASD and press E to recall the landed disc to your current position'}</span>
      <span className="aero-hint-touch">{lang === 'zh' ? '轻点查看并锁定后甩出；飞盘落地后，可点“一键飞回”或走到它旁边拾起' : 'Tap to inspect, lock, and throw; after it lands, use One-click return or walk to it to pick it up'}</span>
    </span>
  </div>;
}
