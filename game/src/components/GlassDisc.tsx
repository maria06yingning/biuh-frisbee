'use client';

import { useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/I18nProvider';

/** Original procedural disc: no reference-site model, imagery or textures. */
export default function GlassDisc({ paused }: { paused: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const pause = useRef(paused);
  pause.current = paused;
  const { lang } = useI18n();
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let disposed = false;
    let cleanup = () => {};
    void Promise.all([import('three'), import('three/examples/jsm/environments/RoomEnvironment.js')]).then(([T, { RoomEnvironment }]) => {
      if (disposed) return;
      let renderer: InstanceType<typeof T.WebGLRenderer>;
      try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
      catch { return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      renderer.setClearColor(0, 0);
      renderer.domElement.setAttribute('aria-hidden', 'true');
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(35, 1, 0.1, 100);
      camera.position.set(0, 0.25, 9.5);
      camera.lookAt(0, 0, 0);
      const pmrem = new T.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      const env = pmrem.fromScene(room, 0.035);
      scene.environment = env.texture;
      room.dispose(); pmrem.dispose();
      scene.add(new T.HemisphereLight(0xc8f2ff, 0x4269a8, 2.5));
      const key = new T.DirectionalLight(0xffffff, 4); key.position.set(-4, 6, 5); scene.add(key);
      const rim = new T.DirectionalLight(0x75ddff, 3); rim.position.set(5, -1, 2); scene.add(rim);
      const group = new T.Group(); scene.add(group);
      const glass = new T.MeshPhysicalMaterial({
        color: 0xbdeaff, metalness: 0.12, roughness: 0.095,
        transmission: 0.83, thickness: 0.22, ior: 1.46,
        clearcoat: 1, clearcoatRoughness: 0.07,
        attenuationColor: new T.Color(0x79cae9), attenuationDistance: 1.4,
        transparent: true, opacity: 0.93, side: T.DoubleSide,
      });
      // Revolved cross-section: shallow crown, rolled lip and recessed underside.
      const section = [[0,0.11],[0.6,0.115],[1.3,0.1],[1.72,0.07],[1.88,0.035],[2,0],[2.12,-0.08],[2.19,-0.18],[2.18,-0.29],[2.1,-0.34],[2.02,-0.29],[1.98,-0.17],[1.86,-0.09],[1.5,-0.035],[0.6,0.025],[0,0.035]];
      const body = new T.Mesh(new T.LatheGeometry(section.map(([x,y]) => new T.Vector2(x,y)), 144), glass);
      group.add(body);
      const blue = new T.MeshPhysicalMaterial({ color: 0x51bce8, metalness: 0.6, roughness: 0.17, transparent: true, opacity: 0.7, clearcoat: 1 });
      const white = new T.MeshPhysicalMaterial({ color: 0xecfbff, metalness: 0.3, roughness: 0.1, transparent: true, opacity: 0.8 });
      for (let i = 0; i < 14; i++) {
        const r = 1.76 + i * 0.028;
        const ring = new T.Mesh(new T.TorusGeometry(r, i % 4 === 0 ? 0.008 : 0.0045, 6, 144), i % 3 === 0 ? blue : white);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.055 - Math.pow(i / 13, 2) * 0.24;
        group.add(ring);
      }
      group.rotation.set(0.65, 0, -0.36);
      // Start as a small, distant object so the arrival reads as a real flight.
      group.position.set(-5.6, 3.2, -15.5);
      group.scale.setScalar(0.04);
      let raf = 0, elapsed = 0, last = performance.now(), active = true;
      let tx = 0, ty = 0, px = 0, py = 0, scroll = 0;
      const introDuration = 3.2;
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      let reduced = mq.matches;
      if (reduced) {
        group.position.set(0, 0, 0);
        group.scale.setScalar(1);
      }
      const resize = () => {
        const { width, height } = node.getBoundingClientRect();
        renderer.setSize(width, height, false); camera.aspect = width / Math.max(1, height);
        camera.position.z = camera.aspect < 1 ? 12.3 : 9.5; camera.updateProjectionMatrix();
        renderer.render(scene, camera);
      };
      const observer = new ResizeObserver(resize); observer.observe(node);
      const visibility = new IntersectionObserver(([entry]) => { active = entry.isIntersecting; }); visibility.observe(node);
      const move = (event: PointerEvent) => { if (event.pointerType !== 'mouse') return; const b = node.getBoundingClientRect(); tx = (event.clientX-b.left)/b.width-0.5; ty = (event.clientY-b.top)/b.height-0.5; };
      const leave = () => { tx = 0; ty = 0; };
      const onScroll = () => { scroll = Math.max(0, Math.min(1, -node.getBoundingClientRect().top / window.innerHeight)); };
      const onMotion = () => {
        reduced = mq.matches;
        if (reduced) {
          group.position.set(0, 0, 0);
          group.scale.setScalar(1);
        }
      };
      node.addEventListener('pointermove', move); node.addEventListener('pointerleave', leave);
      window.addEventListener('scroll', onScroll, { passive: true }); mq.addEventListener('change', onMotion);
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now-last)/1000); last = now;
        if (active && !document.hidden && !pause.current && !reduced) {
          elapsed += dt; const damping = 1-Math.exp(-dt/0.24);
          px += (tx-px)*damping; py += (ty-py)*damping;
          const intro = Math.min(1, elapsed / introDuration);
          const introEase = 1 - Math.pow(1 - intro, 3);
          const flightArc = Math.sin(intro * Math.PI);
          const settle = Math.min(1, Math.max(0, (elapsed - (introDuration - 0.45)) / 0.45));
          const overshoot = Math.sin(settle * Math.PI) * 0.09;
          const flightX = -5.6 + introEase * 5.6 + flightArc * 0.7;
          const flightY = 3.2 - introEase * 3.2 + flightArc * 0.52;
          const flightZ = -15.5 + introEase * 15.5;
          const flightScale = 0.04 + introEase * 0.96 + overshoot;
          const flightSpin = (1 - intro) * Math.PI * 0.65;
          // A wider parallax field keeps the disc responsive across the whole hero.
          group.position.x = flightX + Math.sin(elapsed * Math.PI * 2 / 9) * 0.34 + px * 1.75;
          group.position.y = flightY + Math.sin(elapsed * Math.PI * 2 / 6.5) * 0.2 - py * 1.15 + scroll * 0.2;
          group.position.z = flightZ + Math.sin(elapsed * Math.PI * 2 / 11) * 0.28 + px * 0.34 - py * 0.18;
          group.scale.setScalar(flightScale);
          group.rotation.x = 0.65 + flightSpin + Math.sin(elapsed*Math.PI*2/7.5)*0.18 + py*0.42 + scroll*0.3;
          group.rotation.z = -0.36 - flightSpin * 0.3 + Math.sin(elapsed*Math.PI*2/10)*0.12 + px*0.46;
          group.rotation.y = flightSpin * 0.55 + Math.sin(elapsed*Math.PI*2/13)*0.11 + px*0.38;
          renderer.render(scene, camera);
        }
        raf = requestAnimationFrame(tick);
      };
      node.appendChild(renderer.domElement); node.dataset.ready = 'true'; resize(); raf = requestAnimationFrame(tick);
      cleanup = () => {
        cancelAnimationFrame(raf); observer.disconnect(); visibility.disconnect();
        node.removeEventListener('pointermove', move); node.removeEventListener('pointerleave', leave);
        window.removeEventListener('scroll', onScroll); mq.removeEventListener('change', onMotion);
        group.traverse(o => { if (o instanceof T.Mesh) o.geometry.dispose(); });
        glass.dispose(); blue.dispose(); white.dispose(); env.dispose(); renderer.dispose();
        renderer.domElement.remove(); delete node.dataset.ready;
      };
    }).catch(() => { /* Keep the SVG fallback when WebGL or lazy loading is unavailable. */ });
    return () => { disposed = true; cleanup(); };
  }, []);
  return <div ref={host} className="aero-object" role="img" aria-label={lang === 'zh' ? '浅蓝透明飞盘，带多层细密同心盘沿' : 'Translucent pale blue disc with concentric rim grooves'}>
    <svg className="aero-fallback" viewBox="0 0 800 500" aria-hidden="true">
      <defs><linearGradient id="disc-fallback"><stop stopColor="#e9f9ff"/><stop offset=".45" stopColor="#b4e5f4"/><stop offset="1" stopColor="#f9fdff"/></linearGradient></defs>
      <g transform="translate(400 250) rotate(-22)"><ellipse rx="300" ry="140" fill="url(#disc-fallback)" stroke="#5ab8d9" strokeWidth="2"/>
      {Array.from({length:12},(_,i)=><ellipse key={i} rx={295-i*3.2} ry={136-i*2.8} fill="none" stroke={i%3 ? '#d8f3fc':'#5498b6'} strokeWidth="1"/> )}</g>
    </svg>
  </div>;
}
