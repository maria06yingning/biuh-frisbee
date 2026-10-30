'use client';

import { useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { createOutsideInFlight, DISC_FLIGHT_DURATION } from './disc-flight';
import { createProceduralGrassField } from './procedural-grass';

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
      // Far plane reaches past the far hill ring; nothing sits closer than ~7 units.
      const camera = new T.PerspectiveCamera(36, 1, 0.5, 700);
      camera.position.set(0, 10.2 * 0.078, 10.2);
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

      const hemisphere = new T.HemisphereLight(0xeaf2f6, 0x4a5a3c, 1.55);
      scene.add(hemisphere);
      const sun = new T.DirectionalLight(0xfff0cf, 3.0);
      sun.position.copy(grass.sunDirection).multiplyScalar(12); scene.add(sun);
      const fill = new T.DirectionalLight(0xc3e5ee, 0.9);
      fill.position.set(-4, 3, 6); scene.add(fill);

      // Keep attitude and axial spin separate so the disc banks without tumbling.
      const attitude = new T.Group();
      const spinner = new T.Group();
      attitude.add(spinner); scene.add(attitude);
      // Clear glass, a little denser than before: low roughness keeps what lies behind sharp,
      // while less transmission and more opacity let the pale blue body read more solidly.
      const glass = new T.MeshPhysicalMaterial({
        color: 0xd0eff3, metalness: 0.015, roughness: 0.095,
        transmission: 0.76, thickness: 0.2, ior: 1.46,
        clearcoat: 1, clearcoatRoughness: 0.08,
        attenuationColor: new T.Color(0x86c9dd), attenuationDistance: 1.5,
        transparent: true, opacity: 0.93, side: T.DoubleSide,
      });
      const section = [[0,0.11],[0.6,0.115],[1.3,0.1],[1.72,0.07],[1.88,0.035],[2,0],[2.12,-0.08],[2.19,-0.18],[2.18,-0.29],[2.1,-0.34],[2.02,-0.29],[1.98,-0.17],[1.86,-0.09],[1.5,-0.035],[0.6,0.025],[0,0.035]];
      spinner.add(new T.Mesh(new T.LatheGeometry(section.map(([x, y]) => new T.Vector2(x, y)), 144), glass));
      const blue = new T.MeshPhysicalMaterial({ color: 0x45afcd, metalness: 0.18, roughness: 0.16, transparent: true, opacity: 0.7, clearcoat: 1 });
      const white = new T.MeshPhysicalMaterial({ color: 0xf2fbfc, metalness: 0.08, roughness: 0.12, transparent: true, opacity: 0.78 });
      for (let i = 0; i < 14; i++) {
        const ring = new T.Mesh(new T.TorusGeometry(1.76 + i * 0.028, i % 4 === 0 ? 0.008 : 0.0045, 6, 128), i % 3 === 0 ? blue : white);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.055 - Math.pow(i / 13, 2) * 0.24;
        spinner.add(ring);
      }
      const etching = new T.MeshStandardMaterial({ color: 0x6fb2c6, roughness: 0.33, transparent: true, opacity: 0.52, side: T.DoubleSide });
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
        tipTurn.setFromAxisAngle(AXIS_X, sy * (sy < 0 ? 1.75 : 0.8));
        sideTurn.setFromAxisAngle(AXIS_Y, sx * 1.7);
        attitude.quaternion.copy(sideTurn).multiply(tipTurn).multiply(baseTurn);
        spinner.rotation.y = spinAngle;
        if (ready !== pose.ready || !node.dataset.flight) {
          ready = pose.ready;
          node.dataset.flight = ready ? 'settled' : 'flying';
        }
        node.dataset.interactive = String(ready && !reduced && !pause.current);
        return pose;
      };
      const applyGrass = (pose: { x: number; y: number; z: number }, motion: boolean) => {
        const influence = pose.z < -0.5 && !ready ? Math.max(0, Math.min(1, 1 - elapsed / DISC_FLIGHT_DURATION)) : 0;
        grass.update(windTime, motion, pose, influence);
      };
      const resize = () => {
        const { width, height } = node.getBoundingClientRect();
        if (width <= 0 || height <= 0) return;
        camera.aspect = width / height;
        const tanHalfFov = Math.tan(camera.fov * Math.PI / 360);
        camera.position.z = Math.max(10.2, 3.15 / (tanHalfFov * camera.aspect));
        // Low, eye-level framing: a fixed small downward pitch keeps the horizon near 38%
        // from the top at every aspect ratio, with the disc centred above the meadow.
        camera.position.y = camera.position.z * 0.078;
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
      const move = (event: PointerEvent) => {
        if (!ready || pause.current || reduced) return;
        if (event.pointerType !== 'mouse' && event.pointerId !== touchId) return;
        const box = node.getBoundingClientRect();
        tx = Math.max(-1, Math.min(1, ((event.clientX - box.left) / Math.max(1, box.width) - 0.5) * 2));
        ty = Math.max(-1, Math.min(1, ((event.clientY - box.top) / Math.max(1, box.height) - 0.5) * 2));
      };
      const down = (event: PointerEvent) => {
        if (event.pointerType === 'mouse' || !ready || pause.current || reduced) return;
        touchId = event.pointerId; node.setPointerCapture(event.pointerId); move(event);
      };
      const leave = () => { tx = 0; ty = 0; };
      const release = (event: PointerEvent) => {
        if (event.pointerId !== touchId) return;
        if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
        touchId = null; leave();
      };
      const onMotion = () => {
        reduced = mq.matches;
        if (reduced) {
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
      node.addEventListener('pointerup', release); node.addEventListener('pointercancel', release);
      mq.addEventListener('change', onMotion);
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

      const tick = (now: number) => {
        const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
        if (seenReplay !== replay.current) {
          seenReplay = replay.current;
          elapsed = reduced ? DISC_FLIGHT_DURATION : 0;
          windTime = 0; tx = ty = px = py = spinAngle = 0;
        }
        if (wasPaused !== pause.current) wasPaused = pause.current;
        if (active && !document.hidden && !contextLost) {
          if (!pause.current && !reduced) {
            elapsed = Math.min(DISC_FLIGHT_DURATION, elapsed + dt);
            windTime += dt;
            const pose = sampleFlight(elapsed);
            spinAngle += pose.spinRate * dt;
            if (pose.ready) {
              const damping = 1 - Math.exp(-dt / 0.22);
              px += (tx - px) * damping; py += (ty - py) * damping;
            }
          }
          const pose = applyPose();
          applyGrass(pose.position, !reduced && !pause.current);
          const interacting = Math.abs(tx - px) + Math.abs(ty - py) > 0.002;
          const frameInterval = !pose.ready || interacting ? 1000 / 60 : 1000 / 30;
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
        node.removeEventListener('pointerup', release); node.removeEventListener('pointercancel', release);
        mq.removeEventListener('change', onMotion);
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
        spinner.traverse(object => { if (object instanceof T.Mesh) object.geometry.dispose(); });
        glass.dispose(); blue.dispose(); white.dispose(); etching.dispose();
        grass.dispose(); env.dispose();
        renderer.dispose(); renderer.domElement.remove();
        delete node.dataset.ready; delete node.dataset.flight; delete node.dataset.interactive; delete node.dataset.fallback;
      };
    }).catch(() => {
      if (!disposed) node.dataset.fallback = 'true';
    });
    return () => { disposed = true; cleanup(); delete node.dataset.fallback; };
  }, []);

  return <div ref={host} className="aero-object" role="img" aria-label={lang === 'zh' ? '程序化草地上的浅蓝微透明玻璃飞盘，从远处沿外弯弧线飞来，停稳后可随指针转动，查看正面、侧边和底面' : 'A pale, lightly translucent glass disc approaches over a procedural grass field on an outside-in curve; once it settles, moving the pointer turns it to show its top, rim and underside'}>
    <svg className="aero-fallback" viewBox="0 0 800 500" aria-hidden="true">
      <defs><linearGradient id="disc-fallback"><stop stopColor="#eefcff"/><stop offset=".45" stopColor="#b9e6f0"/><stop offset="1" stopColor="#fbffff"/></linearGradient></defs>
      <g transform="translate(400 250) rotate(-12)"><ellipse rx="240" ry="134" fill="url(#disc-fallback)" fillOpacity=".78" stroke="#66b8ce" strokeWidth="2"/>
        {Array.from({length:12},(_,i)=><ellipse key={i} rx={235-i*2.6} ry={130-i*2.4} fill="none" stroke={i%3 ? '#d8f3fc':'#55a9c0'} strokeWidth="1"/>)}</g>
    </svg>
    <span className="aero-disc-hint" aria-hidden="true">
      <span className="aero-hint-desktop">{lang === 'zh' ? '移动鼠标，转动飞盘看看每一面' : 'Move your mouse to turn the disc and see every side'}</span>
      <span className="aero-hint-touch">{lang === 'zh' ? '左右拖动，转动飞盘' : 'Drag sideways to turn the disc'}</span>
    </span>
  </div>;
}
