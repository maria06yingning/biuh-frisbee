import * as THREE from 'three';
import { PALETTE, resetGradientMap } from './toon';

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  resize(): void;
  dispose(): void;
}

// 天空分成几条平涂色带（不渐变），像 Sable 的淡彩天空
const SKY = [0xf8e0b6, 0xf6e6c4, 0xdcebe0, 0xb6e0e6, 0x8fd0e4];
const SUN_DIR = new THREE.Vector3(-150, 120, -150);

export function createScene(container: HTMLElement): SceneContext {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false; // 用圆形软影代替实时阴影：更干净，也更像插画
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.haze);
  scene.fog = new THREE.Fog(PALETTE.haze, 80, 300);

  // 第一人称相机：眼高 1.7m，YXZ 欧拉序（先左右转再抬头，最后侧倾）
  const camera = new THREE.PerspectiveCamera(75, 1, 0.05, 420);
  camera.rotation.order = 'YXZ';
  camera.position.set(0, 1.7, 0);
  scene.add(camera); // 相机要在场景里，挂在它上面的第一人称手臂才会被渲染

  // 色带天空
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: Object.fromEntries(SKY.map((c, i) => [`c${i}`, { value: new THREE.Color(c) }])),
    vertexShader: `varying float vY;
      void main() { vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying float vY;
      uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; uniform vec3 c4;
      void main() {
        vec3 c = c4;
        if (vY < 0.65) c = c3;
        if (vY < 0.40) c = c2;
        if (vY < 0.22) c = c1;
        if (vY < 0.10) c = c0;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(330, 24, 16), skyMat);
  sky.renderOrder = -10;
  scene.add(sky);

  // 平涂的太阳 + 云
  const sunDir = SUN_DIR.clone().normalize();
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false });
  const sun = new THREE.Mesh(new THREE.CircleGeometry(22, 48), sunMat);
  sun.position.copy(sunDir).multiplyScalar(290);
  sun.lookAt(0, 0, 0);
  scene.add(sun);
  const sunRing = new THREE.Mesh(
    new THREE.RingGeometry(22, 24.5, 48),
    new THREE.MeshBasicMaterial({ color: 0xffe9a0, fog: false }),
  );
  sunRing.position.copy(sun.position);
  sunRing.lookAt(0, 0, 0);
  scene.add(sunRing);

  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xfffaf0, fog: false });
  const puff = new THREE.SphereGeometry(1, 12, 8);
  const cloudSpots: [number, number, number][] = [
    [0.2, 70, 0.9], [1.4, 95, 1.1], [2.5, 60, 0.8], [3.6, 100, 1.2], [4.7, 75, 1.0], [5.6, 88, 0.9],
  ];
  for (const [ang, y, s] of cloudSpots) {
    const c = new THREE.Group();
    for (const [dx, dy, r] of [[0, 0, 14], [14, -2, 11], [-14, -3, 10], [6, 5, 9]]) {
      const m = new THREE.Mesh(puff, cloudMat);
      m.position.set(dx * s, dy * s, 0);
      m.scale.set(r * s, r * s * 0.55, r * s * 0.7);
      c.add(m);
    }
    c.position.set(Math.cos(ang) * 270, y, Math.sin(ang) * 270);
    c.lookAt(0, y, 0);
    scene.add(c);
  }

  // 灯光：半球光打底 + 一盏方向光，让三档色阶有明暗方向
  scene.add(new THREE.HemisphereLight(0xfff6e0, 0x8fd17e, 1.9));
  const dirLight = new THREE.DirectionalLight(0xfff1d0, 2.3);
  dirLight.position.copy(sunDir).multiplyScalar(80);
  scene.add(dirLight);

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  window.addEventListener('resize', resize);

  const dispose = () => {
    ro.disconnect();
    window.removeEventListener('resize', resize);
    scene.traverse((obj) => {
      const o = obj as THREE.Object3D & {
        geometry?: THREE.BufferGeometry;
        material?: THREE.Material | THREE.Material[];
      };
      o.geometry?.dispose();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          const mm = m as THREE.Material & { map?: THREE.Texture | null; gradientMap?: THREE.Texture | null };
          mm.map?.dispose();
          mm.gradientMap?.dispose();
          m.dispose();
        });
      }
    });
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    resetGradientMap();
  };

  return { renderer, scene, camera, resize, dispose };
}
