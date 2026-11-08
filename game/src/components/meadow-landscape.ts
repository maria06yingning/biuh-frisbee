import type * as Three from 'three';
import { terrainHeight } from './meadow-terrain';

type ThreeModule = typeof Three;

type LeafSeed = { x: number; z: number; height: number; phase: number; scale: number; spin: number };
type FireflySeed = { x: number; z: number; height: number; phase: number };

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function addTree(T: ThreeModule, group: InstanceType<ThreeModule['Group']>, baseY: number, x: number, z: number, scale: number) {
  const tree = new T.Group();
  tree.position.set(x, baseY + terrainHeight(x, z), z);
  tree.scale.setScalar(scale);
  const bark = new T.MeshStandardMaterial({ color: 0x674b3c, roughness: 0.95 });
  const branchGeo = new T.CylinderGeometry(0.14, 0.28, 4.6, 7);
  const trunkGeo = new T.CylinderGeometry(0.27, 0.42, 5.4, 8);
  const trunk = new T.Mesh(trunkGeo, bark);
  trunk.position.y = 2.7;
  tree.add(trunk);
  const branches = [
    { x: -1.0, y: 4.25, rz: -0.48, rx: 0.12 },
    { x: 0.85, y: 4.15, rz: 0.5, rx: -0.1 },
    { x: 0.12, y: 5.0, rz: 0.12, rx: 0.44 },
  ];
  for (const branch of branches) {
    const mesh = new T.Mesh(branchGeo, bark);
    mesh.position.set(branch.x, branch.y, 0);
    mesh.rotation.set(branch.rx, 0, branch.rz);
    tree.add(mesh);
  }

  const leafGeo = new T.IcosahedronGeometry(1, 1);
  const foliage = [
    new T.MeshStandardMaterial({ color: 0x4d6638, roughness: 0.9 }),
    new T.MeshStandardMaterial({ color: 0x657943, roughness: 0.9 }),
    new T.MeshStandardMaterial({ color: 0x3d5937, roughness: 0.95 }),
  ];
  const canopy = [
    [-2.1, 5.6, 0.1, 1.65, 1.15, 1.35], [-0.8, 6.1, 0.7, 1.75, 1.3, 1.5],
    [0.8, 6.0, 0.4, 1.75, 1.25, 1.45], [2.1, 5.55, -0.1, 1.45, 1.1, 1.25],
    [-1.55, 7.25, -0.1, 1.5, 1.2, 1.3], [0.2, 7.5, 0.3, 1.7, 1.4, 1.45],
    [1.75, 7.05, 0.05, 1.4, 1.2, 1.35], [-0.1, 5.2, -1.0, 1.5, 1.15, 1.2],
  ];
  canopy.forEach(([cx, cy, cz, sx, sy, sz], i) => {
    const crown = new T.Mesh(leafGeo, foliage[i % foliage.length]);
    crown.position.set(cx, cy, cz);
    crown.scale.set(sx, sy, sz);
    tree.add(crown);
  });
  group.add(tree);
  return tree;
}

/** Distant tree silhouettes, drifting leaves and dusk fireflies for the reference meadow. */
export function createMeadowLandscape(T: ThreeModule, baseY: number) {
  const group = new T.Group();
  group.name = 'rolling-meadow-landscape';
  const trees = [
    addTree(T, group, baseY, -5.5, -48, 1.15),
    addTree(T, group, baseY, -27, -93, 0.58),
    addTree(T, group, baseY, 26, -112, 0.72),
    addTree(T, group, baseY, 39, -139, 0.48),
  ];

  const random = seededRandom(0x71a2c9);
  const leafShape = new T.Shape();
  leafShape.moveTo(0, -0.5);
  leafShape.quadraticCurveTo(0.34, -0.08, 0.02, 0.52);
  leafShape.quadraticCurveTo(-0.3, 0.1, 0, -0.5);
  const leafGeometry = new T.ShapeGeometry(leafShape, 6);
  const leafMaterial = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: T.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false });
  const leafCount = 20;
  const leaves = new T.InstancedMesh(leafGeometry, leafMaterial, leafCount);
  leaves.frustumCulled = false;
  const leafSeeds: LeafSeed[] = [];
  const leafColors = [0xd77d4b, 0xe6a15e, 0xb96648, 0xe2bf78].map(color => new T.Color(color));
  for (let i = 0; i < leafCount; i++) {
    const seed = {
      x: (random() - 0.5) * 52,
      z: -6 - random() * 48,
      height: 7 + random() * 5,
      phase: random() * Math.PI * 2,
      scale: 0.55 + random() * 0.7,
      spin: random() * Math.PI * 2,
    };
    leafSeeds.push(seed);
    leaves.setColorAt(i, leafColors[i % leafColors.length]);
  }
  if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
  group.add(leaves);

  const fireflyGeometry = new T.SphereGeometry(0.075, 7, 5);
  const fireflyMaterial = new T.MeshBasicMaterial({ color: 0xffdca0, transparent: true, opacity: 0, depthWrite: false });
  const fireflyCount = 26;
  const fireflies = new T.InstancedMesh(fireflyGeometry, fireflyMaterial, fireflyCount);
  fireflies.frustumCulled = false;
  const fireflySeeds: FireflySeed[] = Array.from({ length: fireflyCount }, () => ({
    x: (random() - 0.5) * 42,
    z: -12 - random() * 72,
    height: 3.2 + random() * 5.5,
    phase: random() * Math.PI * 2,
  }));
  group.add(fireflies);

  const dummy = new T.Object3D();
  return {
    group,
    update(time: number, night: number) {
      trees.forEach((tree, i) => { tree.rotation.z = Math.sin(time * 0.23 + i * 1.7) * (0.014 + i * 0.002); });
      leafMaterial.opacity = 0.88 - night * 0.36;
      leafSeeds.forEach((seed, i) => {
        const drift = time * (0.18 + (i % 5) * 0.014) + seed.phase;
        const x = seed.x + Math.sin(drift) * 2.1 + Math.cos(drift * 0.63) * 0.8;
        const z = seed.z + Math.sin(drift * 0.45) * 1.2;
        const y = baseY + terrainHeight(x, z) + seed.height + Math.sin(drift * 1.7) * 0.55;
        dummy.position.set(x, y, z);
        dummy.rotation.set(0.2 + Math.sin(drift) * 0.55, drift, seed.spin + Math.cos(drift * 1.2) * 0.8);
        dummy.scale.set(seed.scale, seed.scale, seed.scale);
        dummy.updateMatrix();
        leaves.setMatrixAt(i, dummy.matrix);
      });
      leaves.instanceMatrix.needsUpdate = true;

      fireflyMaterial.opacity = night * 0.92;
      fireflySeeds.forEach((seed, i) => {
        const phase = time * 1.45 + seed.phase;
        const x = seed.x + Math.sin(phase * 0.52) * 0.8;
        const z = seed.z + Math.cos(phase * 0.37) * 0.7;
        const y = baseY + terrainHeight(x, z) + seed.height + Math.sin(phase) * 0.45;
        const pulse = 0.55 + 0.45 * Math.sin(phase * 1.7);
        dummy.position.set(x, y, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(night * (0.3 + pulse * 0.55));
        dummy.updateMatrix();
        fireflies.setMatrixAt(i, dummy.matrix);
      });
      fireflies.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      group.traverse(object => {
        if (object instanceof T.Mesh || object instanceof T.InstancedMesh) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach(item => item.dispose());
          else material.dispose();
        }
      });
    },
  };
}
