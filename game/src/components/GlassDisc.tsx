'use client';

import { useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { createOutsideInFlight, DISC_FLIGHT_DURATION } from './disc-flight';
import { createMeadowBackdrop } from './meadow-backdrop';
import { MEADOW_IMAGE_SRC } from './SunlitField';

/** Fixed-size disc, stable axial spin, and an OI approach through a sunlit field. */
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
      } catch { node.dataset.fallback = 'true'; return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.setClearColor(0, 0);
      renderer.domElement.setAttribute('aria-hidden', 'true');

      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(36, 1, 0.1, 180);
      camera.position.set(0, 0.18, 10.2);
      camera.lookAt(0, 0, 0);

      // An outdoor environment gives the underside grass reflections and a warm sun edge.
      const environment = new T.Scene();
      const envGeometry = new T.SphereGeometry(30, 32, 16);
      const envMaterial = new T.ShaderMaterial({
        side: T.BackSide,
        vertexShader: `varying vec3 vDirection; void main() { vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          varying vec3 vDirection;
          void main() {
            vec3 d = normalize(vDirection);
            vec3 sky = mix(vec3(0.82, 0.88, 0.86), vec3(0.42, 0.65, 0.86), smoothstep(0.0, 0.8, d.y));
            vec3 ground = mix(vec3(0.065, 0.12, 0.035), vec3(0.32, 0.39, 0.12), smoothstep(-0.8, 0.0, d.y));
            vec3 color = mix(ground, sky, smoothstep(-0.08, 0.06, d.y));
            float sun = pow(max(0.0, dot(d, normalize(vec3(-0.65, 0.72, 0.34)))), 160.0);
            color += vec3(7.0, 5.9, 3.8) * sun;
            gl_FragColor = vec4(color, 1.0);
          }
        `,
      });
      environment.add(new T.Mesh(envGeometry, envMaterial));
      const pmrem = new T.PMREMGenerator(renderer);
      const env = pmrem.fromScene(environment, 0.035, 0.1, 100);
      scene.environment = env.texture;
      envGeometry.dispose(); envMaterial.dispose(); pmrem.dispose();
      scene.add(new T.HemisphereLight(0xe8f2fc, 0x4d642e, 2.0));
      const sun = new T.DirectionalLight(0xffeed0, 3.6);
      sun.position.set(-6, 8, 4); scene.add(sun);
      const fill = new T.DirectionalLight(0xd4e8f5, 1.1);
      fill.position.set(4, 2, 2); scene.add(fill);

      // Attitude and self-spin are separate; the disc never tumbles end over end.
      const attitude = new T.Group();
      const spinner = new T.Group();
      attitude.add(spinner); scene.add(attitude);
      const glass = new T.MeshPhysicalMaterial({
        color: 0xc8eaff, metalness: 0.035, roughness: 0.16,
        transmission: 0.68, thickness: 0.26, ior: 1.46,
        clearcoat: 1, clearcoatRoughness: 0.12,
        attenuationColor: new T.Color(0x93cce2), attenuationDistance: 2.4,
        side: T.DoubleSide,
      });
      const section = [[0,0.11],[0.6,0.115],[1.3,0.1],[1.72,0.07],[1.88,0.035],[2,0],[2.12,-0.08],[2.19,-0.18],[2.18,-0.29],[2.1,-0.34],[2.02,-0.29],[1.98,-0.17],[1.86,-0.09],[1.5,-0.035],[0.6,0.025],[0,0.035]];
      spinner.add(new T.Mesh(new T.LatheGeometry(section.map(([x, y]) => new T.Vector2(x, y)), 144), glass));
      const blue = new T.MeshPhysicalMaterial({ color: 0x79bdd2, metalness: 0.22, roughness: 0.23, transparent: true, opacity: 0.68, clearcoat: 1 });
      const white = new T.MeshPhysicalMaterial({ color: 0xe6f3f5, metalness: 0.16, roughness: 0.17, transparent: true, opacity: 0.78 });
      for (let i = 0; i < 14; i++) {
        const ring = new T.Mesh(new T.TorusGeometry(1.76 + i * 0.028, i % 4 === 0 ? 0.008 : 0.0045, 6, 128), i % 3 === 0 ? blue : white);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.055 - Math.pow(i / 13, 2) * 0.24;
        spinner.add(ring);
      }
      // Quiet, asymmetric rim etchings make axial spin visible without adding a logo.
      const etching = new T.MeshStandardMaterial({ color: 0x88bac9, roughness: 0.4, transparent: true, opacity: 0.45, side: T.DoubleSide });
      for (const [start, arc] of [[0.3, 0.8], [3.4, 0.4]]) {
        const mark = new T.Mesh(new T.RingGeometry(1.56, 1.576, 48, 1, start, arc), etching);
        mark.rotation.x = -Math.PI / 2; mark.position.y = 0.089;
        spinner.add(mark);
      }

      let dirty = true;
      const meadow = createMeadowBackdrop(T, MEADOW_IMAGE_SRC, () => { dirty = true; });
      scene.add(meadow.mesh);
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      let reduced = mq.matches;
      let raf = 0, elapsed = reduced ? DISC_FLIGHT_DURATION : 0, windTime = 0;
      let last = performance.now(), lastRender = 0, active = true, contextLost = false;
      let seenReplay = replay.current, wasPaused = pause.current, ready = false;
      let tx = 0, ty = 0, px = 0, py = 0, spinAngle = 0;
      let rangeX = 1.8, rangeY = 0.9;
      let touchId: number | null = null;
      let sampleFlight = createOutsideInFlight(1, camera.position.z);

      const applyPose = () => {
        const pose = sampleFlight(elapsed);
        attitude.position.set(pose.position.x + px * rangeX, pose.position.y - py * rangeY, pose.position.z + px * 0.14 - py * 0.1);
        attitude.rotation.set(pose.pitch + py * 0.14, pose.yaw + px * 0.12, pose.bank - px * 0.16, 'YXZ');
        spinner.rotation.y = spinAngle;
        if (ready !== pose.ready || !node.dataset.flight) {
          ready = pose.ready;
          node.dataset.flight = ready ? 'settled' : 'flying';
        }
        node.dataset.interactive = String(ready && !reduced && !pause.current);
        return pose;
      };
      const resize = () => {
        const { width, height } = node.getBoundingClientRect();
        if (width <= 0 || height <= 0) return;
        camera.aspect = width / height;
        const tanHalfFov = Math.tan(camera.fov * Math.PI / 360);
        camera.position.z = Math.max(10.2, 3.15 / (tanHalfFov * camera.aspect));
        camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
        sampleFlight = createOutsideInFlight(camera.aspect, camera.position.z, camera.fov);
        rangeX = Math.min(2.4, Math.max(0.6, tanHalfFov * camera.position.z * camera.aspect - 2.5));
        rangeY = Math.min(0.95, Math.max(0.55, tanHalfFov * camera.position.z - 2.0));
        renderer.setSize(width, height, false); meadow.setSize(width, height);
        applyPose(); meadow.update(windTime, !reduced);
        if (!contextLost) renderer.render(scene, camera);
        dirty = false;
      };
      const observer = new ResizeObserver(resize); observer.observe(node);
      const visibility = new IntersectionObserver(([entry]) => { active = entry.isIntersecting; if (active) dirty = true; });
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
          elapsed = DISC_FLIGHT_DURATION; tx = ty = px = py = spinAngle = 0;
        }
        dirty = true;
      };
      const onContextLost = (event: Event) => {
        event.preventDefault(); contextLost = true; delete node.dataset.ready; node.dataset.fallback = 'true';
      };
      const onContextRestored = () => { contextLost = false; dirty = true; node.dataset.ready = 'true'; delete node.dataset.fallback; };
      node.addEventListener('pointermove', move); node.addEventListener('pointerdown', down);
      node.addEventListener('pointerleave', leave); node.addEventListener('pointerup', release); node.addEventListener('pointercancel', release);
      mq.addEventListener('change', onMotion);
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

      const tick = (now: number) => {
        const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
        if (seenReplay !== replay.current) {
          seenReplay = replay.current;
          elapsed = reduced ? DISC_FLIGHT_DURATION : 0;
          tx = ty = px = py = spinAngle = 0; dirty = true;
        }
        if (wasPaused !== pause.current) { wasPaused = pause.current; dirty = true; }
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
          const interacting = Math.abs(tx - px) + Math.abs(ty - py) > 0.002;
          const frameInterval = !pose.ready || interacting ? 1000 / 60 : 1000 / 30;
          if (dirty || (!pause.current && !reduced && now - lastRender >= frameInterval)) {
            meadow.update(windTime, !reduced);
            renderer.render(scene, camera); lastRender = now; dirty = false;
          }
        }
        raf = requestAnimationFrame(tick);
      };
      node.appendChild(renderer.domElement);
      resize(); node.dataset.ready = 'true'; raf = requestAnimationFrame(tick);
      cleanup = () => {
        cancelAnimationFrame(raf); observer.disconnect(); visibility.disconnect();
        node.removeEventListener('pointermove', move); node.removeEventListener('pointerdown', down);
        node.removeEventListener('pointerleave', leave); node.removeEventListener('pointerup', release); node.removeEventListener('pointercancel', release);
        mq.removeEventListener('change', onMotion);
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
        spinner.traverse(object => { if (object instanceof T.Mesh) object.geometry.dispose(); });
        glass.dispose(); blue.dispose(); white.dispose(); etching.dispose();
        meadow.dispose(); env.dispose(); renderer.dispose(); renderer.domElement.remove();
        delete node.dataset.ready; delete node.dataset.flight; delete node.dataset.interactive; delete node.dataset.fallback;
      };
    }).catch(() => {
      if (!disposed) node.dataset.fallback = 'true';
    });
    return () => { disposed = true; cleanup(); delete node.dataset.fallback; };
  }, []);

  return <div ref={host} className="aero-object" role="img" aria-label={lang === 'zh' ? '阳光草地上的浅蓝飞盘，从远处沿外弯弧线飞来，停稳后可随指针移动' : 'A pale blue disc approaches over a sunlit meadow on an outside-in curve and follows the pointer after settling'}>
    <svg className="aero-fallback" viewBox="0 0 800 500" aria-hidden="true">
      <defs><linearGradient id="disc-fallback"><stop stopColor="#e9f9ff"/><stop offset=".45" stopColor="#b4e5f4"/><stop offset="1" stopColor="#f9fdff"/></linearGradient></defs>
      <g transform="translate(400 250) rotate(-12)"><ellipse rx="240" ry="134" fill="url(#disc-fallback)" fillOpacity=".82" stroke="#70adbf" strokeWidth="2"/>
        {Array.from({length:12},(_,i)=><ellipse key={i} rx={235-i*2.6} ry={130-i*2.4} fill="none" stroke={i%3 ? '#d8f3fc':'#749eac'} strokeWidth="1"/>)}</g>
    </svg>
    <span className="aero-disc-hint" aria-hidden="true">
      <span className="aero-hint-desktop">{lang === 'zh' ? '移动鼠标，让飞盘跟随' : 'Move your mouse to guide the disc'}</span>
      <span className="aero-hint-touch">{lang === 'zh' ? '轻触并拖动，让飞盘跟随' : 'Touch and drag to guide the disc'}</span>
    </span>
  </div>;
}
