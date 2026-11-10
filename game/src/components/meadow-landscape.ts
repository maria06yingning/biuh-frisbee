import type * as Three from 'three';
import { createMeadowLife } from './meadow-life';
import { HILL_CENTER, terrainHeight } from './meadow-terrain';

type ThreeModule = typeof Three;

/**
 * Season index: 1 summer, 2 autumn, 3 winter, 4 night.
 * One tree stands on the reference mound; falling leaves, snow and fireflies follow the reference.
 */
export function createMeadowLandscape(
  T: ThreeModule,
  baseY: number,
  options: { groundAt?: (x: number, z: number) => number; includeTree?: boolean } = {},
) {
  const group = new T.Group();
  group.name = 'reference-meadow-landscape';
  const groundAt = options.groundAt ?? ((x: number, z: number) => baseY + terrainHeight(x, z));

  // The reference tree: a thin trunk and eight flat-shaded crown blobs.
  const tree = new T.Group();
  const treeScale = 5.2;
  tree.position.set(HILL_CENTER.x, groundAt(HILL_CENTER.x, HILL_CENTER.z) - 0.04, HILL_CENTER.z);
  tree.scale.setScalar(treeScale);
  tree.visible = options.includeTree !== false;
  const bark = new T.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.88 });
  const trunk = new T.Mesh(new T.CylinderGeometry(0.11, 0.2, 1.55, 7), bark);
  trunk.position.y = 0.78;
  tree.add(trunk);
  const foliageMaterial = new T.MeshStandardMaterial({ color: 0x4ca03a, roughness: 0.82, flatShading: true });
  const crownGeometry = new T.IcosahedronGeometry(1, 1);
  const crownData: [number, number, number, number, number][] = [
    [0.0, 2.05, 0.0, 1.28, 1.05], [0.48, 1.78, 0.32, 0.82, 0.95],
    [-0.52, 1.82, -0.28, 0.88, 1.0], [0.28, 2.38, -0.38, 0.68, 0.9],
    [-0.32, 2.35, 0.42, 0.72, 0.92], [0.05, 2.68, 0.05, 0.62, 0.88],
    [0.55, 2.15, -0.15, 0.55, 0.85], [-0.45, 2.18, 0.18, 0.58, 0.87],
  ];
  const crowns: Three.Mesh[] = [];
  for (const [x, y, z, s, sy] of crownData) {
    const crown = new T.Mesh(crownGeometry, foliageMaterial);
    crown.position.set(x, y, z);
    crown.scale.set(s, s * sy, s);
    tree.add(crown);
    crowns.push(crown);
  }
  group.add(tree);

  // Soft circular particle sprites, avoiding square snowflakes and hard firefly pixels.
  const pixels = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const r = Math.hypot((x - 15.5) / 15.5, (y - 15.5) / 15.5);
    const k = (y * 32 + x) * 4;
    pixels[k] = pixels[k + 1] = pixels[k + 2] = 255;
    pixels[k + 3] = Math.round(Math.pow(Math.max(0, 1 - r), 1.8) * 255);
  }
  const particleMap = new T.DataTexture(pixels, 32, 32);
  particleMap.needsUpdate = true;

  // Falling leaves (autumn), same orange tones and drift as the reference.
  const leafCount = 160;
  const leafGeometry = new T.PlaneGeometry(0.14, 0.1);
  const leafMaterial = new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide, transparent: true, opacity: 0.88, depthWrite: false });
  const leaves = new T.InstancedMesh(leafGeometry, leafMaterial, leafCount);
  leaves.frustumCulled = false;
  leaves.visible = false;
  const leafColors = [0xd4782a, 0xe8a04a, 0xc0562a].map(c => new T.Color(c));
  const leafSeeds = Array.from({ length: leafCount }, (_, i) => ({
    x: (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * 40 - 20,
    z: (Math.sin(i * 78.233) * 43758.5453 % 1 + 1) % 1 * 90 - 80,
    h: (Math.sin(i * 39.346) * 43758.5453 % 1 + 1) % 1 * 9,
    s: 0.7 + (i % 7) * 0.08,
    r: i * 1.37,
  }));
  leafSeeds.forEach((_, i) => leaves.setColorAt(i, leafColors[i % leafColors.length]));
  if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
  group.add(leaves);

  // Snow (winter): 480 points falling through the view, as in the reference.
  const snowCount = 480;
  const snowPositions = new Float32Array(snowCount * 3);
  const snowGeometry = new T.BufferGeometry();
  snowGeometry.setAttribute('position', new T.BufferAttribute(snowPositions, 3));
  const snowMaterial = new T.PointsMaterial({ map: particleMap, color: 0xffffff, size: 0.18, transparent: true, opacity: 0.9, depthWrite: false, sizeAttenuation: true });
  const snow = new T.Points(snowGeometry, snowMaterial);
  snow.frustumCulled = false;
  snow.visible = false;
  const snowSeeds = Array.from({ length: snowCount }, (_, i) => ({
    x: (Math.sin(i * 91.7) * 43758.5453 % 1 + 1) % 1 * 36 - 18,
    z: (Math.sin(i * 27.3) * 43758.5453 % 1 + 1) % 1 * 90 - 80,
    h: (Math.sin(i * 5.1) * 43758.5453 % 1 + 1) % 1 * 9,
    v: 0.7 + (i % 5) * 0.06,
  }));
  group.add(snow);

  // Fireflies (night): additive glow points bobbing above the grass.
  const fireflyCount = 55;
  const fireflyPositions = new Float32Array(fireflyCount * 3);
  const fireflyGeometry = new T.BufferGeometry();
  fireflyGeometry.setAttribute('position', new T.BufferAttribute(fireflyPositions, 3));
  const fireflyMaterial = new T.PointsMaterial({ map: particleMap, color: 0xe0ec9c, size: 0.42, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true });
  const fireflies = new T.Points(fireflyGeometry, fireflyMaterial);
  fireflies.frustumCulled = false;
  fireflies.visible = false;
  const fireflySeeds = Array.from({ length: fireflyCount }, (_, i) => ({
    x: (Math.sin(i * 13.7) * 43758.5453 % 1 + 1) % 1 * 36 - 18,
    z: (Math.sin(i * 61.1) * 43758.5453 % 1 + 1) % 1 * 90 - 80,
    height: 1.6 + (Math.sin(i * 3.3) * 43758.5453 % 1 + 1) % 1 * 2.8,
    phase: i * 0.71,
  }));
  group.add(fireflies);

  const life = createMeadowLife(T, baseY, groundAt);
  group.add(life.group);
  // Stars use angular positions, so they remain visible just above the meadow horizon.
  const starGeometry = new T.BufferGeometry();
  const starPositions = new Float32Array(650 * 3);
  const starPhases = new Float32Array(650);
  for (let i = 0; i < 650; i++) {
    const azimuth = i * 2.399963;
    const elevation = 0.035 + ((i * 0.618034) % 1) * 1.3;
    const radius = 170;
    starPositions.set([Math.sin(azimuth) * Math.cos(elevation) * radius,
      Math.sin(elevation) * radius, Math.cos(azimuth) * Math.cos(elevation) * radius], i * 3);
    starPhases[i] = i * 1.73;
  }
  starGeometry.setAttribute('position', new T.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('aPhase', new T.BufferAttribute(starPhases, 1));
  const starMaterial = new T.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `attribute float aPhase; uniform float uTime; varying float vGlow;
      void main() { vGlow = 0.55 + 0.45 * sin(uTime * 0.7 + aPhase);
        vec3 world = position + cameraPosition;
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
        gl_PointSize = 1.4 + fract(aPhase) * 1.4; }`,
    fragmentShader: `varying float vGlow; void main() {
      float r = length(gl_PointCoord - vec2(0.5)) * 2.0;
      float alpha = (1.0 - smoothstep(0.1, 1.0, r)) * vGlow;
      gl_FragColor = vec4(0.85, 0.89, 1.0, alpha); }`,
    transparent: true, depthWrite: false, depthTest: false,
  });
  const stars = new T.Points(starGeometry, starMaterial);
  stars.frustumCulled = false;
  stars.renderOrder = -9;
  group.add(stars);

  const dummy = new T.Object3D();
  return {
    group,
    update(time: number, season: number) {
      const autumn = season === 2;
      const winter = season === 3;
      const night = season === 4;
      life.update(time, season);
      stars.visible = night;
      starMaterial.uniforms.uTime.value = time;

      foliageMaterial.color.setHex(winter ? 0xd2dae2 : autumn ? 0xd4782a : night ? 0x25402a : 0x4ca03a);
      crowns.forEach((crown, i) => {
        const [, , , s, sy] = crownData[i];
        // Preserve each lobe's reference proportions, with a smaller snow-covered crown in winter.
        const factor = winter ? 0.78 : 1;
        crown.scale.set(s * factor, s * sy * factor, s * factor);
      });
      tree.scale.setScalar(treeScale);
      tree.rotation.z = Math.sin(time * 0.38) * 0.006;
      tree.rotation.x = Math.cos(time * 0.31) * 0.004;

      leaves.visible = autumn;
      if (autumn) {
        leafSeeds.forEach((seed, i) => {
          const fall = ((seed.h - time * 0.55) % 9 + 9) % 9;
          const x = seed.x + Math.sin(time * 0.6 + seed.r) * 1.6;
          const z = seed.z + Math.cos(time * 0.4 + seed.r) * 1.0;
          dummy.position.set(x, groundAt(x, z) + 0.6 + fall, z);
          dummy.rotation.set(time * seed.s + seed.r, time * 1.3 + seed.r, seed.r * 0.5);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          leaves.setMatrixAt(i, dummy.matrix);
        });
        leaves.instanceMatrix.needsUpdate = true;
      }

      snow.visible = winter;
      if (winter) {
        snowSeeds.forEach((seed, i) => {
          const fall = ((seed.h - time * seed.v) % 9 + 9) % 9;
          const x = seed.x + Math.sin(time * 0.38 + i) * 0.8;
          const z = seed.z + Math.cos(time * 0.24 + i) * 0.7;
          snowPositions[i * 3] = x;
          snowPositions[i * 3 + 1] = groundAt(x, z) + 0.8 + fall;
          snowPositions[i * 3 + 2] = z;
        });
        snowGeometry.attributes.position.needsUpdate = true;
      }

      fireflies.visible = night;
      if (night) {
        fireflyMaterial.opacity = 0.5 + Math.sin(time * 2.8) * 0.35 + Math.sin(time * 5.1) * 0.12;
        fireflySeeds.forEach((seed, i) => {
          const phase = time * 1.45 + seed.phase;
          const x = seed.x + Math.sin(phase * 0.52) * 0.8;
          const z = seed.z + Math.cos(phase * 0.37) * 0.7;
          fireflyPositions[i * 3] = x;
          fireflyPositions[i * 3 + 1] = groundAt(x, z) + seed.height + Math.sin(phase) * 0.45;
          fireflyPositions[i * 3 + 2] = z;
        });
        fireflyGeometry.attributes.position.needsUpdate = true;
      }
    },
    dispose() {
      life.dispose();
      starGeometry.dispose(); starMaterial.dispose();
      particleMap.dispose();
      crownGeometry.dispose();
      foliageMaterial.dispose();
      bark.dispose();
      trunk.geometry.dispose();
      leafGeometry.dispose();
      leafMaterial.dispose();
      leaves.dispose();
      snowGeometry.dispose();
      snowMaterial.dispose();
      fireflyGeometry.dispose();
      fireflyMaterial.dispose();
    },
  };
}
