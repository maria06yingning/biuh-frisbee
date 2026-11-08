'use client';

import { useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { createOutsideInFlight, DISC_FLIGHT_DURATION } from './disc-flight';
import { createProceduralGrassField } from './procedural-grass';
import { classifyThrowStyle, createUserThrow, getThrowImpulse, type ThrowSample } from './disc-throw';

/** The homepage disc and its procedural field share one lightweight Three.js scene. */
export default function GlassDisc({ paused, replayToken = 0 }: { paused: boolean; replayToken?: number }) {
  const host = useRef<HTMLDivElement>(null);
  const pause = useRef(paused);
  const replay = useRef(replayToken);
  pause.current = paused;
  replay.current = replayToken;
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
        renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
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

      const scene = new T.Scene();
      // The grass/ground/sky shaders fade themselves into haze, so no scene-wide fog here
      // (scene fog would also dim the disc on its distant approach at z=-72).
      // Far plane sits just past where the meadow reaches full haze; nothing sits closer than ~7 units.
      const camera = new T.PerspectiveCamera(36, 1, 0.5, 700);
      camera.position.set(0, 10.2 * -0.028, 10.2);
      camera.lookAt(0, 0, 0);

      // The meadow module owns the sky dome, the ground, the blades and the sun direction.
      const grass = createProceduralGrassField(T);
      scene.add(grass.group);

      // Reflections for the glass disc come from the same sky with a lit sun and green ground.
      const environment = grass.createEnvironment();
      const pmrem = new T.PMREMGenerator(renderer);
      const env = pmrem.fromScene(environment.scene, 0.035, 0.1, 100);
      scene.environment = env.texture;
      environment.dispose(); pmrem.dispose();

      const hemisphere = new T.HemisphereLight(0xe9f1ec, 0x596545, 1.5);
      scene.add(hemisphere);
      // Warm clear daylight with enough sky fill to keep the scene open and cheerful.
      const sun = new T.DirectionalLight(0xffedc8, 3.0);
      sun.position.copy(grass.sunDirection).multiplyScalar(12); scene.add(sun);
      const fill = new T.DirectionalLight(0xc9dfe5, 0.85);
      fill.position.set(-4, 3, 6); scene.add(fill);
      const daySun = new T.Color(0xffedc8), duskSun = new T.Color(0xffa064), moonSun = new T.Color(0x748eb8);
      const daySky = new T.Color(0xe9f1ec), nightSky = new T.Color(0x8798b8);
      const dayFill = new T.Color(0xc9dfe5), nightFill = new T.Color(0x526990);
      const dayGround = new T.Color(0x596545), nightGround = new T.Color(0x222d47);
      const lightScratch = new T.Color();
      const smooth = (value: number, from: number, to: number) => {
        const t = Math.max(0, Math.min(1, (value - from) / (to - from)));
        return t * t * (3 - 2 * t);
      };
      const updateLighting = (time: number) => {
        const cycle = ((time / 38 + 0.08) % 1 + 1) % 1;
        const dusk = smooth(cycle, 0.02, 0.18) * (1 - smooth(cycle, 0.23, 0.34));
        const night = smooth(cycle, 0.16, 0.3) * (1 - smooth(cycle, 0.8, 0.98));
        sun.color.copy(lightScratch.copy(daySun).lerp(duskSun, dusk).lerp(moonSun, night));
        sun.intensity = 3 * (1 - night) + 0.1 * night;
        fill.color.copy(lightScratch.copy(dayFill).lerp(nightFill, night));
        fill.intensity = 0.85 * (1 - night) + 0.42 * night;
        hemisphere.color.copy(lightScratch.copy(daySky).lerp(nightSky, night));
        hemisphere.groundColor.copy(lightScratch.copy(dayGround).lerp(nightGround, night));
        hemisphere.intensity = 1.5 * (1 - night) + 0.75 * night;
      };
      updateLighting(0);

      // Keep attitude and axial spin separate so the disc banks without tumbling.
      const attitude = new T.Group();
      const spinner = new T.Group();
      attitude.add(spinner); scene.add(attitude);
      // Rose-magenta glass disc; preserve the site's transmission, roughness, IOR and geometry.
      const glass = new T.MeshPhysicalMaterial({
        color: 0xff3d7f, metalness: 0.015, roughness: 0.1,
        transmission: 0.68, thickness: 0.22, ior: 1.46,
        clearcoat: 1, clearcoatRoughness: 0.08,
        attenuationColor: new T.Color(0xff3d7f), attenuationDistance: 1.35,
        transparent: true, opacity: 0.95, side: T.DoubleSide,
      });
      const section = [[0,0.11],[0.6,0.115],[1.3,0.1],[1.72,0.07],[1.88,0.035],[2,0],[2.12,-0.08],[2.19,-0.18],[2.18,-0.29],[2.1,-0.34],[2.02,-0.29],[1.98,-0.17],[1.86,-0.09],[1.5,-0.035],[0.6,0.025],[0,0.035]];
      spinner.add(new T.Mesh(new T.LatheGeometry(section.map(([x, y]) => new T.Vector2(x, y)), 144), glass));
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
      let seenReplay = replay.current, wasPaused = pause.current, ready = false;
      let tx = 0, ty = 0, px = 0, py = 0, spinAngle = 0;
      let throwWind = 0;
      let lastGrassTime = 0;
      let hasGrassPosition = false;
      const lastGrassPosition = new T.Vector3();
      const grassVelocity = new T.Vector2();
      const grassPointerPosition = new T.Vector2();
      let grassPointerInfluence = 0;
      // A gentle drift toward the cursor (world units, recomputed on resize). Downward travel is
      // capped so that, however the disc is turned, its lowest point stays above the meadow.
      let rangeX = 2.4, rangeUp = 0.9, rangeDown = 0.85;
      // Eases toward the edges yet still reaches ±1 there, so every face can be reached.
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
      let userThrow: ReturnType<typeof createUserThrow> | null = null;
      let throwTime = 0;
      const throwStartRotation = new T.Quaternion();
      const throwRestRotation = new T.Quaternion().setFromEuler(new T.Euler(0.82, 0, -0.18, 'YXZ'));
      const raycaster = new T.Raycaster();
      const pointer = new T.Vector2();
      // A spherical pick volume makes the disc easy to select even when its face
      // is turned edge-on; the rendered lathe geometry becomes too thin to hit.
      const discPickSphere = new T.Sphere(new T.Vector3(), 2.7);
      const dragPlane = new T.Plane();
      const grassPointerPlane = new T.Plane(new T.Vector3(0, 1, 0), 7.4);
      const grassPointerHit = new T.Vector3();
      const dragHit = new T.Vector3();
      const dragOffset = new T.Vector3();
      const dragPosition = new T.Vector3();
      const dragNormal = new T.Vector3();

      let sampleFlight = createOutsideInFlight(1, camera.position.z);

      const applyPose = () => {
        const pose = sampleFlight(elapsed);
        const sx = ease(px), sy = ease(py);
        const offsetY = sy < 0 ? -sy * rangeUp : -sy * rangeDown; // pointer up -> disc up.
        // Low pulls the disc a little closer, high lets it drift away into the sky.
        attitude.position.set(pose.position.x + sx * rangeX, pose.position.y + offsetY, pose.position.z + sy * 0.4);
        // Turning is the main response, so every face can be inspected: moving up tips the disc
        // back through its rim to the underside (as if it flew overhead), moving down turns the
        // top face toward the viewer, and moving left/right swings it round until the rim shows.
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
        node.dataset.flight = userThrow ? (userThrow.sample(throwTime).returning ? 'returning' : 'thrown') : (ready ? 'settled' : 'flying');
        node.dataset.dragging = String(touchId !== null && pressMode === 'locked' && movedDuringPress);
        node.dataset.mode = inspecting ? 'inspect' : 'locked';
        node.dataset.interactive = String(ready && !userThrow && !reduced && !pause.current);
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
        grass.update(windTime, motion, pose, influence, { x: grassVelocity.x, z: grassVelocity.y }, { x: grassPointerPosition.x, z: grassPointerPosition.y }, grassPointerInfluence);
      };
      const resize = () => {
        const { width, height } = node.getBoundingClientRect();
        if (width <= 0 || height <= 0) return;
        camera.aspect = width / height;
        const tanHalfFov = Math.tan(camera.fov * Math.PI / 360);
        camera.position.z = Math.max(10.2, 3.15 / (tanHalfFov * camera.aspect));
        // Slightly upward framing leaves about 55% of the full-screen view to the sky.
        // The camera still aims at the disc; ground height and grass clearance are unchanged.
        camera.position.y = camera.position.z * -0.028;
        camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
        grass.layout(camera);
        sampleFlight = createOutsideInFlight(camera.aspect, camera.position.z, camera.fov);
        // Drift stays modest and the disc stays fully in frame; turning does the rest.
        const halfWidth = tanHalfFov * camera.aspect * camera.position.z;
        const halfHeight = tanHalfFov * camera.position.z;
        rangeX = Math.min(2.4, Math.max(0.8, halfWidth - 2.6));
        rangeUp = Math.min(1.1, Math.max(0.6, halfHeight - 2.4));
        rangeDown = 0.85; // Centre >= -0.85 and no vertex is farther than 2.2 from it: lowest >= -3.05.
        renderer.setSize(width, height, false);
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
        if (!ready || userThrow || pause.current || reduced) return;
        aimRay(event);
        if (raycaster.ray.intersectPlane(grassPointerPlane, grassPointerHit)
          && grassPointerHit.z < 14 && grassPointerHit.z > -160 && Math.abs(grassPointerHit.x) < 120) {
          grassPointerPosition.set(grassPointerHit.x, grassPointerHit.z);
          grassPointerInfluence = 1;
        }
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
              dragPosition.y = Math.max(-0.85, Math.min(3, dragPosition.y));
            }
          }
          remember(event);
          return;
        }
        if (inspecting && event.pointerType === 'mouse') updateInspection(event);
      };
      const down = (event: PointerEvent) => {
        if (touchId !== null || !event.isPrimary || event.button !== 0 || !ready || userThrow || pause.current || reduced) return;
        aimRay(event);
        attitude.updateWorldMatrix(true, true);
        attitude.getWorldPosition(discPickSphere.center);
        if (!raycaster.ray.intersectsSphere(discPickSphere)) return;
        event.preventDefault();
        touchId = event.pointerId;
        pressMode = inspecting ? 'inspect' : 'locked';
        movedDuringPress = false;
        // Stop easing immediately on the second click, preserving exactly the displayed angle.
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
        grassPointerInfluence = 0;
        // Leaving the scene pauses inspection at its current angle; it never resets a locked pose.
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
          userThrow = createUserThrow(dragPosition, impulse, camera.aspect, throwStyle);
          throwTime = 0;
        } else if (pressMode === 'locked' && validRelease && movedDuringPress) {
          // A gentle reposition keeps the chosen orientation instead of entering inspection.
          lockedPosition.copy(dragPosition);
        }
        touchId = null;
        gesture = [];
        if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
        node.dataset.dragging = 'false';
      };
      const onMotion = () => {
        reduced = mq.matches;
        if (reduced) {
          userThrow = null;
          if (touchId !== null && node.hasPointerCapture(touchId)) node.releasePointerCapture(touchId);
          touchId = null; gesture = []; node.dataset.dragging = 'false';
          inspecting = false; lockedPosition.set(0, 0, 0);
          lockedRotation.setFromEuler(baseEuler.set(0.82, 0, -0.18, 'YXZ'));
          elapsed = DISC_FLIGHT_DURATION; windTime = 0; tx = ty = px = py = spinAngle = 0;
        }
      };
      const onContextLost = (event: Event) => {
        event.preventDefault(); contextLost = true; delete node.dataset.ready; node.dataset.fallback = 'true';
      };
      const onContextRestored = () => { contextLost = false; node.dataset.ready = 'true'; delete node.dataset.fallback; };
      // Track over the whole hero, including the footer controls layered above the canvas;
      // otherwise hovering them re-centres the disc and leaves a dead band along the bottom.
      const zone = node.parentElement ?? node;
      zone.addEventListener('pointermove', move); zone.addEventListener('pointerleave', leave);
      node.addEventListener('pointerdown', down);
      node.addEventListener('pointerup', release); node.addEventListener('pointercancel', release); node.addEventListener('lostpointercapture', release);
      mq.addEventListener('change', onMotion);
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

      const tick = (now: number) => {
        const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
        if (seenReplay !== replay.current) {
          seenReplay = replay.current;
          elapsed = reduced ? DISC_FLIGHT_DURATION : 0;
          userThrow = null; inspecting = false; lockedPosition.set(0, 0, 0);
          lockedRotation.setFromEuler(baseEuler.set(0.82, 0, -0.18, 'YXZ'));
          if (touchId !== null && node.hasPointerCapture(touchId)) node.releasePointerCapture(touchId);
          touchId = null; gesture = [];
          windTime = 0; throwWind = 0; hasGrassPosition = false; lastGrassTime = 0;
          tx = ty = px = py = spinAngle = 0;
        }
        if (wasPaused !== pause.current) wasPaused = pause.current;
        if (active && !document.hidden && !contextLost) {
          if (!pause.current && !reduced) {
            elapsed = Math.min(DISC_FLIGHT_DURATION, elapsed + dt);
            windTime += dt;
            updateLighting(windTime);
            grassPointerInfluence = Math.max(0, grassPointerInfluence - dt * 0.72);
            const pose = sampleFlight(elapsed);
            if (userThrow) {
              throwTime += dt;
              const thrown = userThrow.sample(throwTime);
              throwWind = thrown.returning ? 0.34 : 1;
              spinAngle += thrown.spinRate * dt;
              if (thrown.done) {
                userThrow = null; inspecting = false;
                lockedPosition.set(0, 0, 0);
                lockedRotation.setFromEuler(baseEuler.set(0.82, 0, -0.18, 'YXZ'));
                tx = ty = px = py = 0;
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
          const pose = applyPose();
          applyGrass(attitude.position, !reduced && !pause.current);
          const interacting = Math.abs(tx - px) + Math.abs(ty - py) > 0.002;
          const frameInterval = !pose.ready || userThrow || touchId !== null || interacting ? 1000 / 60 : 1000 / 30;
          if (now - lastRender >= frameInterval || wasPaused !== pause.current) {
            renderer.render(scene, camera); lastRender = now;
          }
        }
        raf = requestAnimationFrame(tick);
      };
      node.appendChild(renderer.domElement);
      resize(); node.dataset.ready = 'true'; raf = requestAnimationFrame(tick);
      cleanup = () => {
        cancelAnimationFrame(raf); observer.disconnect(); visibility.disconnect();
        zone.removeEventListener('pointermove', move); zone.removeEventListener('pointerleave', leave);
        node.removeEventListener('pointerdown', down);
        node.removeEventListener('pointerup', release); node.removeEventListener('pointercancel', release); node.removeEventListener('lostpointercapture', release);
        mq.removeEventListener('change', onMotion);
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
        spinner.traverse(object => { if (object instanceof T.Mesh) object.geometry.dispose(); });
        glass.dispose(); pink.dispose(); white.dispose(); etching.dispose();
        grass.dispose(); env.dispose();
        renderer.dispose(); renderer.domElement.remove();
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

  return <div ref={host} className="aero-object" role="img" aria-label={lang === 'zh' ? '程序化草地上的玫红色半透明玻璃飞盘，从远处沿外弯弧线飞来，停稳后点击可转动查看各面，再次点击锁定朝向，锁定后拖动甩出，随后自动飞回' : 'A rose-magenta translucent glass disc approaches over a procedural grass field on an outside-in curve; once it settles, click to inspect its faces, click again to lock its orientation, then drag and release to throw'}>
    <svg className="aero-fallback" viewBox="0 0 800 500" aria-hidden="true">
      <g transform="translate(400 250) rotate(-12)"><ellipse rx="240" ry="134" fill="#ff3d7f" fillOpacity=".92" stroke="#1b1a2e" strokeWidth="5"/>
        {Array.from({length:12},(_,i)=><ellipse key={i} rx={235-i*2.6} ry={130-i*2.4} fill="none" stroke={i%3 ? '#fff8e8':'#ff3d7f'} strokeWidth={i%3 ? 2:3}/>)}</g>
    </svg>
    <span className="aero-disc-hint" aria-hidden="true">
      <span className="aero-hint-desktop">{lang === 'zh' ? '点击查看并调整盘体倾斜，再点锁定后甩出；甩得越快飞得越远，倒盘为 Hammer' : 'Inspect and tilt, lock, then throw; a faster flick travels farther, upside-down makes a Hammer'}</span>
      <span className="aero-hint-touch">{lang === 'zh' ? '轻点查看并调整盘体倾斜，再轻点锁定后甩出；甩得越快飞得越远' : 'Tap to inspect and tilt, tap to lock, then swipe; a faster flick travels farther'}</span>
    </span>
  </div>;
}
