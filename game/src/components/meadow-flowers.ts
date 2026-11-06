import type * as Three from 'three';

type ThreeModule = typeof Three;

/** A few instanced daisies at the lower edges, leaving the disc's play area clear.
 *  All blossoms stay below y = baseY + 3.0, preserving the meadow clearance.
 *  Fixed seeds keep the scene stable on resize; three draw calls, no textures.
 */
export function createMeadowFlowers(T: ThreeModule, baseY: number, count: number) {
  const group = new T.Group();
  group.name = 'meadow-wildflowers';
  const petalGeometry = new T.CircleGeometry(0.14, 7);
  const centerGeometry = new T.CircleGeometry(0.075, 9);
  const stemGeometry = new T.CylinderGeometry(0.016, 0.021, 1, 4);
  const petalMaterial = new T.MeshStandardMaterial({ color: 0xfff9df, roughness: 0.8, side: T.DoubleSide });
  const centerMaterial = new T.MeshStandardMaterial({ color: 0xffd564, roughness: 0.7, side: T.DoubleSide });
  const stemMaterial = new T.MeshStandardMaterial({ color: 0x658d4c, roughness: 0.9 });
  const petals = new T.InstancedMesh(petalGeometry, petalMaterial, count * 5);
  const centers = new T.InstancedMesh(centerGeometry, centerMaterial, count);
  const stems = new T.InstancedMesh(stemGeometry, stemMaterial, count);
  for (const mesh of [petals, centers, stems]) mesh.frustumCulled = false;
  group.add(petals, centers, stems);

  let seed = 0x5ad1e;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const seeds = Array.from({ length: count }, () => [random(), random(), random(), random()]);
  const root = new T.Object3D();
  const local = new T.Object3D();
  const matrix = new T.Matrix4();
  const forward = new T.Vector3();

  return {
    group,
    layout(camera: Three.PerspectiveCamera) {
      camera.updateMatrixWorld();
      camera.getWorldDirection(forward);
      const pitch = Math.asin(Math.max(-1, Math.min(1, -forward.y)));
      const tanV = Math.tan(camera.fov * Math.PI / 360);
      const tanH = tanV * camera.aspect;
      const bottom = Math.max(0.05, pitch + Math.atan(tanV));
      const near = Math.max(1, (camera.position.y - (baseY + 2.55)) / Math.tan(bottom));
      for (let i = 0; i < count; i++) {
        const [depth, lateral, height, spin] = seeds[i];
        const distance = near * (1.08 + depth * 0.58);
        const side = i % 2 ? 1 : -1;
        const x = camera.position.x + side * tanH * distance * (0.68 + lateral * 0.23);
        const z = camera.position.z - distance;
        const stemHeight = 2.35 + height * 0.36;
        const flowerScale = 0.8 + spin * 0.4;
        root.position.set(x, baseY + stemHeight, z);
        root.rotation.set(-0.85, (spin - 0.5) * 0.4, spin * Math.PI * 2);
        root.scale.setScalar(flowerScale);
        root.updateMatrix();
        for (let petal = 0; petal < 5; petal++) {
          const angle = petal / 5 * Math.PI * 2;
          local.position.set(Math.cos(angle) * 0.13, Math.sin(angle) * 0.13, 0);
          local.rotation.set(0, 0, angle);
          local.scale.set(1.16, 0.76, 1);
          local.updateMatrix();
          matrix.multiplyMatrices(root.matrix, local.matrix);
          petals.setMatrixAt(i * 5 + petal, matrix);
        }
        local.position.set(0, 0, 0.008);
        local.rotation.set(0, 0, 0);
        local.scale.setScalar(1);
        local.updateMatrix();
        matrix.multiplyMatrices(root.matrix, local.matrix);
        centers.setMatrixAt(i, matrix);
        local.position.set(x, baseY + stemHeight / 2, z);
        local.rotation.set(0, 0, 0);
        local.scale.set(1, stemHeight, 1);
        local.updateMatrix();
        stems.setMatrixAt(i, local.matrix);
      }
      for (const mesh of [petals, centers, stems]) mesh.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      for (const mesh of [petals, centers, stems]) mesh.dispose();
      petalGeometry.dispose();
      centerGeometry.dispose();
      stemGeometry.dispose();
      petalMaterial.dispose();
      centerMaterial.dispose();
      stemMaterial.dispose();
    },
  };
}
