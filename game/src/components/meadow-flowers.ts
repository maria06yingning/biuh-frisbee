import type * as Three from 'three';
import { terrainHeight } from './meadow-terrain';

type ThreeModule = typeof Three;
const FLOWER_COLORS = [0xffd97b, 0xf5b5bf, 0xc5b4e8, 0x97bfd9, 0xf4e8cb];

/** Low five-petal wildflowers in loose patches, fixed to the slope rather than the camera. */
export function createMeadowFlowers(T: ThreeModule, baseY: number, count: number) {
  const group = new T.Group();
  group.name = 'meadow-wildflowers';
  const petalGeometry = new T.CircleGeometry(0.1, 8);
  const centerGeometry = new T.CircleGeometry(0.038, 8);
  const petalMaterial = new T.MeshStandardMaterial({ color: 0xffffff, side: T.DoubleSide, roughness: 0.92 });
  const centerMaterial = new T.MeshStandardMaterial({ color: 0xe8bc53, side: T.DoubleSide, roughness: 1 });
  const petals = new T.InstancedMesh(petalGeometry, petalMaterial, count * 5);
  const centers = new T.InstancedMesh(centerGeometry, centerMaterial, count);
  petals.frustumCulled = centers.frustumCulled = false;
  group.add(petals, centers);
  let seed = 0x5ad1e;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const patches = Array.from({ length: 30 }, () => ({ x: (random() - 0.5) * 110, z: 2 - random() * 115 }));
  const root = new T.Object3D();
  const local = new T.Object3D();
  const matrix = new T.Matrix4();
  const color = new T.Color();
  for (let i = 0; i < count; i++) {
    const patch = patches[i % patches.length];
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * 5.5;
    const x = patch.x + Math.cos(angle) * radius;
    const z = patch.z + Math.sin(angle) * radius;
    root.position.set(x, baseY + terrainHeight(x, z) + 0.32 + random() * 0.18, z);
    root.rotation.set((random() - 0.5) * 0.25, random() * Math.PI * 2, (random() - 0.5) * 0.25);
    root.scale.setScalar(0.9 + random() * 0.7);
    root.updateMatrix();
    color.set(FLOWER_COLORS[Math.floor(random() * FLOWER_COLORS.length)]);
    for (let p = 0; p < 5; p++) {
      const a = p / 5 * Math.PI * 2;
      local.position.set(Math.cos(a) * 0.077, 0, Math.sin(a) * 0.077);
      local.rotation.set(-Math.PI / 2, 0, a);
      local.scale.set(0.75, 1, 1);
      local.updateMatrix();
      matrix.multiplyMatrices(root.matrix, local.matrix);
      petals.setMatrixAt(i * 5 + p, matrix);
      petals.setColorAt(i * 5 + p, color);
    }
    local.position.set(0, 0.012, 0);
    local.rotation.set(-Math.PI / 2, 0, 0);
    local.scale.setScalar(1);
    local.updateMatrix();
    centers.setMatrixAt(i, matrix.multiplyMatrices(root.matrix, local.matrix));
  }
  petals.instanceMatrix.needsUpdate = centers.instanceMatrix.needsUpdate = true;
  if (petals.instanceColor) petals.instanceColor.needsUpdate = true;
  return {
    group,
    setSeason(season: number) { group.visible = season === 1; },
    dispose() {
      petals.dispose(); centers.dispose();
      petalGeometry.dispose(); centerGeometry.dispose();
      petalMaterial.dispose(); centerMaterial.dispose();
    },
  };
}
