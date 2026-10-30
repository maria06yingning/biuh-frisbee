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
      const glass = new T.MeshPhysicalMaterial({
        color: 0xd6f4f7, metalness: 0.015, roughness: 0.085,
        transmission: 0.86, thickness: 0.14, ior: 1.46,
        clearcoat: 1, clearcoatRoughness: 0.08,
        attenuationColor: new T.Color(0x8fcde0), attenuationDistance: 1.9,
        transparent: true, opacity: 0.88, side: T.DoubleSide,
      });
      const section = [[0,0.11],[0.6,0.115],[1.3,0.1],[1.72,0.07],[1.88,0.035],[2,0],[2.12,-0.08],[2.19,-0.18],[2.18,-0.29],[2.1,-0.34],[2.02,-0.29],[1.98,-0.17],[1.86,-0.09],[1.5,-0.035],[0.6,0.025],[0,0.035]];
      spinner.add(new T.Mesh(new T.LatheGeometry(section.map(([x, y]) => new T.Vector2(x, y)), 144), glass));
      const blue = new T.MeshPhysicalMaterial({ color: 0x4eb5d2, metalness: 0.18, roughness: 0.16, transparent: true, opacity: 0.58, clearcoat: 1 });
      const white = new T.MeshPhysicalMaterial({ color: 0xf1fbfc, metalness: 0.08, roughness: 0.12, transparent: true, opacity: 0.67 });
      for (let i = 0; i < 14; i++) {
        const ring = new T.Mesh(new T.TorusGeometry(1.76 + i * 0.028, i % 4 === 0 ? 0.008 : 0.0045, 6, 128), i % 3 === 0 ? blue : white);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.055 - Math.pow(i / 13, 2) * 0.24;
        spinner.add(ring);
      }
      const etching = new T.MeshStandardMaterial({ color: 0x82bfd0, roughness: 0.33, transparent: true, opacity: 0.4, side: T.DoubleSide });
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
      // Separate up/down travel: the disc can rise far into the sky but only dip as far as the
      // meadow clearance allows. rangeX/rangeUp/rangeDown are world units, recomputed on resize.
      let rangeX = 3.4, rangeUp = 1.5, rangeDown = 1.4;
      // Per-axis gains (set on resize) keep the disc under the cursor near the centre, then ease
      // it into its range limit instead of stopping hard at the edge.
      let gainX = 1.5, gainUp = 2, gainDown = 2;
      let touchId: number | null = null;
      let sampleFlight = createOutsideInFlight(1, camera.position.z);

      const applyPose = () => {
        const pose = sampleFlight(elapsed);
        const sx = Math.tanh(px * gainX);
        const sy = Math.tanh(py * (py < 0 ? gainUp : gainDown));
        const offsetX = sx * rangeX;
        const offsetY = sy < 0 ? -sy * rangeUp : -sy * rangeDown; // pointer up -> disc up.
        // Pointer low pulls the disc a touch closer (bigger), high pushes it away: a sense of depth.
        const offsetZ = sx * 0.2 + (sy > 0 ? sy * 0.8 : sy * 0.5);
        attitude.position.set(pose.position.x + offsetX, pose.position.y + offsetY, pose.position.z + offsetZ);
        // Keep the disc roughly face-on across the range; edges turn slightly toward the camera.
        attitude.rotation.set(pose.pitch - sy * 0.12, pose.yaw + sx * 0.14, pose.bank - sx * 0.18, 'YXZ');
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
        // Let the disc reach close to the frame edges (center stops ~one radius short) and ride
        // the full sky above, while the downward dip stays within the meadow clearance.
        const halfWidth = tanHalfFov * camera.aspect * camera.position.z;
        const halfHeight = tanHalfFov * camera.position.z;
        rangeX = Math.max(1.6, halfWidth - 2.05);
        rangeUp = Math.max(1.0, Math.min(2.4, halfHeight - 1.7));
        rangeDown = 1.4;
        const gain = (half: number, range: number) => Math.min(2.2, Math.max(1.1, half / range));
        gainX = gain(halfWidth, rangeX); gainUp = gain(halfHeight, rangeUp); gainDown = gain(halfHeight, rangeDown);
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
              const damping = 1 - Math.exp(-dt / 0.17);
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

  return <div ref={host} className="aero-object" role="img" aria-label={lang === 'zh' ? '程序化草地上的浅蓝半透明飞盘，从远处沿外弯弧线飞来，停稳后可随指针移动' : 'A pale translucent disc approaches over a procedural grass field on an outside-in curve and follows the pointer after settling'}>
    <svg className="aero-fallback" viewBox="0 0 800 500" aria-hidden="true">
      <defs><linearGradient id="disc-fallback"><stop stopColor="#eefcff"/><stop offset=".45" stopColor="#b9e6f0"/><stop offset="1" stopColor="#fbffff"/></linearGradient></defs>
      <g transform="translate(400 250) rotate(-12)"><ellipse rx="240" ry="134" fill="url(#disc-fallback)" fillOpacity=".78" stroke="#66b8ce" strokeWidth="2"/>
        {Array.from({length:12},(_,i)=><ellipse key={i} rx={235-i*2.6} ry={130-i*2.4} fill="none" stroke={i%3 ? '#d8f3fc':'#55a9c0'} strokeWidth="1"/>)}</g>
    </svg>
    <span className="aero-disc-hint" aria-hidden="true">
      <span className="aero-hint-desktop">{lang === 'zh' ? '移动鼠标，让飞盘跟随' : 'Move your mouse to guide the disc'}</span>
      <span className="aero-hint-touch">{lang === 'zh' ? '轻触并拖动，让飞盘跟随' : 'Touch and drag to guide the disc'}</span>
    </span>
  </div>;
}
