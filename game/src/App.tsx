import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Disc3, Maximize2, Mouse, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

type GameState = 'intro' | 'playing' | 'paused';

const FIELD_W = 36;
const FIELD_L = 60;

function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: PointerLockControls;
    disc: THREE.Group;
    keys: Set<string>;
    velocity: THREE.Vector3;
    discVelocity: THREE.Vector3;
    discFlying: boolean;
    discSpin: number;
    charge: number;
    charging: boolean;
    animationId: number;
    clock: THREE.Clock;
    throwDisc: () => void;
    resetDisc: () => void;
  } | null>(null);

  const [state, setState] = useState<GameState>('intro');
  const [charge, setCharge] = useState(0);
  const [message, setMessage] = useState('Walk around. Find a teammate. Throw the disc.');
  const [showHelp, setShowHelp] = useState(true);
  const [muted, setMuted] = useState(true);
  const [throws, setThrows] = useState(0);

  const resetDisc = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    game.discFlying = false;
    game.charging = false;
    game.charge = 0;
    game.discVelocity.set(0, 0, 0);
    game.disc.position.set(0.38, -0.22, -0.62);
    game.disc.rotation.set(-0.12, 0, -0.1);
    game.disc.visible = true;
    setCharge(0);
    setMessage('Disc ready. Aim at a teammate and throw.');
  }, []);

  const throwDisc = useCallback(() => {
    const game = gameRef.current;
    if (!game || game.discFlying || state !== 'playing') return;
    const power = THREE.MathUtils.clamp(game.charge, 0.22, 1);
    const direction = new THREE.Vector3();
    game.camera.getWorldDirection(direction);
    const origin = game.camera.position.clone().addScaledVector(direction, 0.75);
    origin.y -= 0.22;
    game.disc.position.copy(origin);
    game.discVelocity.copy(direction).multiplyScalar(8 + power * 16);
    game.discVelocity.y += 1.4 + power * 2.4;
    game.discSpin = 22 + power * 38;
    game.discFlying = true;
    game.charging = false;
    game.disc.visible = true;
    setCharge(0);
    setThrows((n) => n + 1);
    setMessage('Nice throw! Press R to get the disc back.');
  }, [state]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#dbe8ef');
    scene.fog = new THREE.Fog('#dbe8ef', 58, 120);

    const camera = new THREE.PerspectiveCamera(74, mount.clientWidth / mount.clientHeight, 0.1, 220);
    camera.position.set(0, 1.72, 19);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    mount.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight('#fff8e8', '#66846a', 2.15);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff1ce', 3.1);
    sun.position.set(-22, 34, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -42;
    sun.shadow.camera.right = 42;
    sun.shadow.camera.top = 42;
    sun.shadow.camera.bottom = -42;
    scene.add(sun);

    // Ground and field markings
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 220),
      new THREE.MeshStandardMaterial({ color: '#7ec66c', roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.045;
    ground.receiveShadow = true;
    scene.add(ground);

    const field = new THREE.Mesh(
      new THREE.PlaneGeometry(FIELD_W, FIELD_L),
      new THREE.MeshStandardMaterial({ color: '#66b85e', roughness: 1 })
    );
    field.rotation.x = -Math.PI / 2;
    field.position.y = -0.02;
    field.receiveShadow = true;
    scene.add(field);

    const lineMat = new THREE.MeshBasicMaterial({ color: '#fff7df' });
    const addLine = (x1: number, z1: number, x2: number, z2: number, width = 0.095) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const length = Math.hypot(dx, dz);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), lineMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = -Math.atan2(dx, dz);
      mesh.position.set((x1 + x2) / 2, 0.012, (z1 + z2) / 2);
      scene.add(mesh);
    };
    const x = FIELD_W / 2;
    const z = FIELD_L / 2;
    addLine(-x, -z, x, -z);
    addLine(-x, z, x, z);
    addLine(-x, -z, -x, z);
    addLine(x, -z, x, z);
    addLine(-x, -z + 9, x, -z + 9, 0.12);
    addLine(-x, z - 9, x, z - 9, 0.12);

    // End zones: bright but still grounded in a real field layout
    const endMatA = new THREE.MeshStandardMaterial({ color: '#2d58df', roughness: 0.88 });
    const endMatB = new THREE.MeshStandardMaterial({ color: '#f27d64', roughness: 0.88 });
    const endA = new THREE.Mesh(new THREE.PlaneGeometry(FIELD_W - 0.18, 9), endMatA);
    endA.rotation.x = -Math.PI / 2;
    endA.position.set(0, 0.002, -z + 4.5);
    scene.add(endA);
    const endB = new THREE.Mesh(new THREE.PlaneGeometry(FIELD_W - 0.18, 9), endMatB);
    endB.rotation.x = -Math.PI / 2;
    endB.position.set(0, 0.002, z - 4.5);
    scene.add(endB);

    // Simple readable team markers
    const makePlayer = (px: number, pz: number, color: string, rotation = 0) => {
      const group = new THREE.Group();
      group.position.set(px, 0, pz);
      group.rotation.y = rotation;
      const jersey = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.36, 0.78, 4, 8),
        new THREE.MeshStandardMaterial({ color, roughness: 0.82 })
      );
      jersey.position.y = 1.05;
      jersey.castShadow = true;
      group.add(jersey);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 16, 12),
        new THREE.MeshStandardMaterial({ color: '#d5a17c', roughness: 0.95 })
      );
      head.position.y = 1.88;
      head.castShadow = true;
      group.add(head);
      const legMat = new THREE.MeshStandardMaterial({ color: '#f7f1e5', roughness: 0.9 });
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.58, 3, 6), legMat);
        leg.position.set(side * 0.16, 0.38, 0);
        group.add(leg);
      }
      scene.add(group);
      return group;
    };

    const players = [
      makePlayer(-5, -13, '#2d58df', 0.2),
      makePlayer(7, -19, '#2d58df', -0.2),
      makePlayer(-10, -27, '#2d58df', 0.35),
      makePlayer(5, 5, '#f27d64', Math.PI),
      makePlayer(-7, -2, '#f27d64', Math.PI - 0.3),
      makePlayer(10, -8, '#f27d64', Math.PI + 0.2),
    ];
    // Tiny colored markers make player silhouettes legible at a distance.
    players.forEach((p, i) => {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 8, 8),
        new THREE.MeshBasicMaterial({ color: i < 3 ? '#d8f36c' : '#fff4d6' })
      );
      marker.position.set(0, 2.15, 0);
      p.add(marker);
    });

    // Disc model: flat white disc with a raised rim
    const disc = new THREE.Group();
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.31, 0.29, 0.055, 40),
      new THREE.MeshStandardMaterial({ color: '#fff9e9', roughness: 0.32, metalness: 0.04 })
    );
    plate.castShadow = true;
    disc.add(plate);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.285, 0.025, 8, 40),
      new THREE.MeshStandardMaterial({ color: '#2d58df', roughness: 0.35 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.015;
    disc.add(rim);
    disc.position.set(0.38, -0.22, -0.62);
    camera.add(disc);
    scene.add(camera);

    const controls = new PointerLockControls(camera, renderer.domElement);
    controls.pointerSpeed = 0.8;
    controls.minPolarAngle = 0.22;
    controls.maxPolarAngle = Math.PI - 0.22;

    const game = {
      renderer, scene, camera, controls, disc,
      keys: new Set<string>(),
      velocity: new THREE.Vector3(),
      discVelocity: new THREE.Vector3(),
      discFlying: false,
      discSpin: 0,
      charge: 0,
      charging: false,
      animationId: 0,
      clock: new THREE.Clock(),
      throwDisc: () => {},
      resetDisc: () => {},
    };
    game.throwDisc = () => {
      if (game.discFlying) return;
      const power = THREE.MathUtils.clamp(game.charge, 0.22, 1);
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      const origin = camera.position.clone().addScaledVector(direction, 0.75);
      origin.y -= 0.22;
      scene.attach(game.disc);
      game.disc.position.copy(origin);
      game.discVelocity.copy(direction).multiplyScalar(8 + power * 16);
      game.discVelocity.y += 1.4 + power * 2.4;
      game.discSpin = 22 + power * 38;
      game.discFlying = true;
      game.charging = false;
    };
    game.resetDisc = () => {
      game.discFlying = false;
      game.charging = false;
      game.charge = 0;
      game.discVelocity.set(0, 0, 0);
      camera.add(game.disc);
      game.disc.position.set(0.38, -0.22, -0.62);
      game.disc.rotation.set(-0.12, 0, -0.1);
      game.disc.visible = true;
    };
    gameRef.current = game;

    const onKeyDown = (event: KeyboardEvent) => {
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'Space'].includes(event.code)) event.preventDefault();
      game.keys.add(event.code);
      if (event.code === 'KeyR') {
        game.resetDisc();
        setCharge(0);
        setMessage('Disc back in your hand. Try another throw.');
      }
      if (event.code === 'Escape') {
        setState('paused');
      }
    };
    const onKeyUp = (event: KeyboardEvent) => game.keys.delete(event.code);
    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0 || !game.controls.isLocked || game.discFlying) return;
      game.charging = true;
      game.charge = 0.18;
    };
    const onMouseUp = (event: MouseEvent) => {
      if (event.button !== 0 || !game.charging) return;
      game.throwDisc();
      setThrows((n) => n + 1);
      setMessage('Disc away! Press R to retrieve it and throw again.');
      setCharge(0);
    };
    const onLock = () => setState('playing');
    const onUnlock = () => setState((current) => current === 'playing' ? 'paused' : current);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    controls.addEventListener('lock', onLock);
    controls.addEventListener('unlock', onUnlock);

    const clock = game.clock;
    const animate = () => {
      game.animationId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.04);

      if (controls.isLocked) {
        const direction = new THREE.Vector3();
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize().negate();
        const move = new THREE.Vector3();
        if (game.keys.has('KeyW')) move.add(forward);
        if (game.keys.has('KeyS')) move.sub(forward);
        if (game.keys.has('KeyD')) move.add(right);
        if (game.keys.has('KeyA')) move.sub(right);
        if (move.lengthSq() > 0) {
          move.normalize().multiplyScalar(5.2 * delta);
          camera.position.add(move);
        }
        camera.position.x = THREE.MathUtils.clamp(camera.position.x, -FIELD_W / 2 + 0.7, FIELD_W / 2 - 0.7);
        camera.position.z = THREE.MathUtils.clamp(camera.position.z, -FIELD_L / 2 + 0.7, FIELD_L / 2 - 0.7);
        camera.position.y = 1.72;

        if (game.charging && !game.discFlying) {
          game.charge = Math.min(1, game.charge + delta * 0.55);
          setCharge(game.charge);
        }
      }

      if (game.discFlying) {
        game.discVelocity.y -= 5.8 * delta;
        game.disc.position.addScaledVector(game.discVelocity, delta);
        game.disc.rotation.y += game.discSpin * delta;
        game.disc.rotation.z = THREE.MathUtils.lerp(game.disc.rotation.z, 0.3, delta * 1.6);
        if (game.disc.position.y < 0.16) {
          game.disc.position.y = 0.16;
          game.discFlying = false;
          game.discVelocity.set(0, 0, 0);
          setMessage('The disc landed. Press R to pick it up and try again.');
        }
        if (Math.abs(game.disc.position.x) > 70 || Math.abs(game.disc.position.z) > 90) {
          game.disc.visible = false;
          game.discFlying = false;
          setMessage('That one went a long way! Press R to reset.');
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(game.animationId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      controls.removeEventListener('lock', onLock);
      controls.removeEventListener('unlock', onUnlock);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const material = obj.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material.dispose();
        }
      });
      gameRef.current = null;
    };
  }, []);

  const enterField = () => {
    const game = gameRef.current;
    if (!game) return;
    game.controls.lock();
    setState('playing');
  };

  const togglePause = () => {
    const game = gameRef.current;
    if (!game) return;
    if (game.controls.isLocked) game.controls.unlock();
    else game.controls.lock();
  };

  const reset = () => {
    const game = gameRef.current;
    if (!game) return;
    game.resetDisc();
    setCharge(0);
    setMessage('Disc ready. Aim at a teammate and throw.');
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#" onClick={(e) => { e.preventDefault(); if (gameRef.current?.controls.isLocked) gameRef.current.controls.unlock(); setState('intro'); }}>
          <span className="mark"><Disc3 size={20} strokeWidth={2.5} /></span>
          <span>FIELD<span className="wordmark-light">NOTES</span></span>
        </a>
        <div className="topbar-right">
          <span className="pill"><span className="live-dot" /> 3D PLAYGROUND</span>
          <button className="icon-button" aria-label="Toggle sound" onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        </div>
      </header>

      <section className="game-frame">
        <div className="scene" ref={mountRef} />
        <div className="scene-vignette" />

        <div className="hud-top">
          <div className="hud-label">
            <span className="hud-kicker">ULTIMATE FRISBEE / 01</span>
            <strong>Find your line.</strong>
          </div>
          <div className="hud-stats">
            <span><b>{throws.toString().padStart(2, '0')}</b><small>THROWS</small></span>
            <span><b>∞</b><small>RETRIES</small></span>
          </div>
        </div>

        {state === 'playing' && (
          <>
            <div className="crosshair"><span /></div>
            <div className="bottom-hud">
              <div className="disc-status">
                <div className="disc-icon"><Disc3 size={24} /></div>
                <div><strong>DISC READY</strong><span>{message}</span></div>
              </div>
              <div className="charge-wrap">
                <div className="charge-label"><span>THROW POWER</span><b>{Math.round(charge * 100)}%</b></div>
                <div className="charge-track"><div className="charge-fill" style={{ width: `${charge * 100}%` }} /></div>
              </div>
            </div>
            {showHelp && (
              <div className="control-hint">
                <button className="hint-close" onClick={() => setShowHelp(false)}>×</button>
                <div className="hint-row"><span className="keycap">W</span><span className="keycap">A</span><span className="keycap">S</span><span className="keycap">D</span><span>Move</span></div>
                <div className="hint-row"><span className="mouse-icon"><Mouse size={17} /></span><span>Look around</span></div>
                <div className="hint-row"><span className="mouse-key">LMB</span><span>Hold to charge · Release to throw</span></div>
                <div className="hint-row"><span className="keycap">R</span><span>Reset disc</span></div>
              </div>
            )}
          </>
        )}

        {state !== 'playing' && (
          <div className={`overlay ${state === 'paused' ? 'overlay-paused' : ''}`}>
            <div className="overlay-content">
              <div className="eyebrow"><span className="eyebrow-line" /> A LITTLE FIELD, A LOT OF GAME</div>
              <h1>{state === 'intro' ? <>STEP ONTO<br /><em>THE FIELD.</em></> : <>TAKE A BREATH.<br /><em>RESET YOUR LINE.</em></>}</h1>
              <p>{state === 'intro'
                ? 'Walk the field. Find your teammate. Send the disc flying.'
                : 'The field is still here. Ready when you are.'}</p>
              <button className="primary-button" onClick={state === 'intro' ? enterField : togglePause}>
                {state === 'intro' ? <><Play size={17} fill="currentColor" /> Enter the field <span>↗</span></> : <><Play size={17} fill="currentColor" /> Back to play <span>↗</span></>}
              </button>
              <div className="overlay-foot"><span>NO SCORE. NO PRESSURE.</span><span>JUST THROW.</span></div>
            </div>
            <div className="overlay-note"><span className="note-dot" /> First-person field experience <span className="note-sep">/</span> Prototype 01</div>
          </div>
        )}

        <div className="scene-footer">
          <span><span className="footer-dot" /> OUTDOOR FIELD / SUNNY DAY</span>
          <button onClick={reset}><RotateCcw size={14} /> Reset disc</button>
          <button onClick={togglePause}><Pause size={14} /> {state === 'playing' ? 'Pause' : 'Play'}</button>
        </div>
      </section>

      <footer className="page-footer">
        <div className="footer-copy"><span className="footer-brand">FIELDNOTES®</span><span>Learn the game by stepping into it.</span></div>
        <div className="footer-links"><span>MOVE</span><span>LOOK</span><span>THROW</span><span className="footer-arrow">↗</span></div>
      </footer>
    </main>
  );
}

export default App;
