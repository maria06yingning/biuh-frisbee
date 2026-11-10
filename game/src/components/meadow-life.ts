import type * as Three from 'three';
import { terrainHeight } from './meadow-terrain';

type ThreeModule = typeof Three;

/** Small, low-poly meadow life. All flight paths are anchored in world space. */
export function createMeadowLife(T: ThreeModule, baseY: number, groundSampler?: (x: number, z: number) => number) {
  const group = new T.Group();
  group.name = 'seasonal-meadow-life';
  let seed = 0x6bc451;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const groundAt = groundSampler ?? ((x: number, z: number) => baseY + terrainHeight(x, z));

  // Two shaped wings hinged at the body, rather than flat particles.
  const shape = new T.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.08, 0.29, 0.36, 0.3, 0.35, 0.13);
  shape.bezierCurveTo(0.34, 0.02, 0.22, -0.01, 0.19, -0.05);
  shape.bezierCurveTo(0.34, -0.21, 0.08, -0.29, 0, 0);
  const wingGeometry = new T.ShapeGeometry(shape, 8);
  const palette = [0xe8c583, 0xd3bbdf, 0xf0e6c4, 0xb6cbd8];
  const wingMaterials = palette.map(color => new T.MeshStandardMaterial({
    color, side: T.DoubleSide, roughness: 0.86,
  }));
  const bodyMaterial = new T.MeshStandardMaterial({ color: 0x514735, roughness: 1 });
  const bodyGeometry = new T.CylinderGeometry(0.016, 0.022, 0.2, 5);
  const butterflies = Array.from({ length: 28 }, (_, i) => {
    const insect = new T.Group();
    const left = new T.Mesh(wingGeometry, wingMaterials[i % palette.length]);
    const right = new T.Mesh(wingGeometry, wingMaterials[i % palette.length]);
    const body = new T.Mesh(bodyGeometry, bodyMaterial);
    left.scale.x = -1;
    body.rotation.x = Math.PI / 2;
    insect.add(left, right, body);
    insect.scale.setScalar(0.7 + random() * 0.55);
    group.add(insect);
    return { insect, left, right, x: (random() - 0.5) * 65,
      z: -5 - random() * 95, phase: random() * Math.PI * 2, speed: 0.5 + random() * 0.5 };
  });

  // Fine seed heads drift gently above the lawn in summer, like backlit pollen.
  const moteCount = 150;
  const moteGeometry = new T.BufferGeometry();
  const motePositions = new Float32Array(moteCount * 3);
  moteGeometry.setAttribute('position', new T.BufferAttribute(motePositions, 3));
  const moteMaterial = new T.PointsMaterial({ color: 0xf4e7bc, size: 0.045,
    transparent: true, opacity: 0.6, depthWrite: false });
  const motes = new T.Points(moteGeometry, moteMaterial);
  motes.frustumCulled = false;
  group.add(motes);
  const moteSeeds = Array.from({ length: moteCount }, () => ({
    x: (random() - 0.5) * 85, z: 8 - random() * 125,
    height: 0.5 + random() * 3, phase: random() * 6.28,
  }));

  // A few tiny birds cross the distant sky on broad loops, never close to the disc.
  const birdGeometry = new T.BufferGeometry();
  birdGeometry.setAttribute('position', new T.Float32BufferAttribute([
    -0.35, 0, 0, 0, -0.06, 0, 0.35, 0, 0,
  ], 3));
  const birdMaterial = new T.LineBasicMaterial({ color: 0x68635b, transparent: true, opacity: 0.65 });
  const birds = Array.from({ length: 5 }, (_, i) => {
    const bird = new T.Line(birdGeometry, birdMaterial);
    bird.scale.setScalar(0.9 + random() * 0.5);
    group.add(bird);
    return { bird, phase: i * 1.3 };
  });

  // Autumn leaves collect on the ground as well as falling through the air.
  const leafShape = new T.Shape();
  leafShape.moveTo(0, -0.14);
  leafShape.quadraticCurveTo(0.14, -0.03, 0, 0.2);
  leafShape.quadraticCurveTo(-0.14, -0.03, 0, -0.14);
  const litterGeometry = new T.ShapeGeometry(leafShape, 4);
  const litterMaterial = new T.MeshStandardMaterial({ color: 0xffffff,
    side: T.DoubleSide, roughness: 1 });
  const litter = new T.InstancedMesh(litterGeometry, litterMaterial, 1000);
  litter.frustumCulled = false;
  group.add(litter);
  const dummy = new T.Object3D();
  const color = new T.Color();
  for (let i = 0; i < 1000; i++) {
    const x = (random() - 0.5) * 100;
    const z = 6 - random() * 125;
    dummy.position.set(x, groundAt(x, z) + 0.045, z);
    dummy.rotation.set(-Math.PI / 2 + random() * 0.14, 0, random() * 6.28);
    dummy.scale.setScalar(0.7 + random() * 1.2);
    dummy.updateMatrix();
    litter.setMatrixAt(i, dummy.matrix);
    litter.setColorAt(i, color.setHSL(0.055 + random() * 0.065, 0.45, 0.32 + random() * 0.18));
  }
  litter.instanceMatrix.needsUpdate = true;
  if (litter.instanceColor) litter.instanceColor.needsUpdate = true;

  // Static glints across winter snow, with varied sizes and brightness.
  const crystalGeometry = new T.BufferGeometry();
  const crystals = new Float32Array(400 * 3);
  for (let i = 0; i < 400; i++) {
    const x = (random() - 0.5) * 100;
    const z = 8 - random() * 130;
    crystals.set([x, groundAt(x, z) + 0.06, z], i * 3);
  }
  crystalGeometry.setAttribute('position', new T.BufferAttribute(crystals, 3));
  const crystalMaterial = new T.PointsMaterial({ color: 0xe4f1ff, size: 0.055,
    transparent: true, opacity: 0.65, depthWrite: false, blending: T.AdditiveBlending });
  const snowGlints = new T.Points(crystalGeometry, crystalMaterial);
  group.add(snowGlints);

  return {
    group,
    update(time: number, season: number) {
      const summer = season === 1;
      const autumn = season === 2;
      const winter = season === 3;
      const night = season === 4;
      butterflies.forEach(({ insect, left, right, x, z, phase, speed }) => {
        insect.visible = summer;
        if (!summer) return;
        const a = time * speed + phase;
        const bx = x + Math.sin(a * 0.63) * 3;
        const bz = z + Math.cos(a * 0.48) * 2.4;
        insect.position.set(bx, groundAt(bx, bz) + 1.0 + (Math.sin(a) + 1) * 0.65, bz);
        insect.rotation.set(-0.2, a * 0.45, Math.sin(a) * 0.15);
        const flap = 0.3 + Math.sin(time * 15 + phase) * 0.85;
        left.rotation.y = flap;
        right.rotation.y = -flap;
      });
      motes.visible = summer;
      if (summer) {
        moteSeeds.forEach((s, i) => {
          const x = s.x + Math.sin(time * 0.12 + s.phase) * 2;
          const z = s.z + Math.cos(time * 0.1 + s.phase) * 1.5;
          motePositions.set([x, groundAt(x, z) + s.height + Math.sin(time * 0.5 + s.phase) * 0.3, z], i * 3);
        });
        moteGeometry.attributes.position.needsUpdate = true;
      }
      birds.forEach(({ bird, phase }) => {
        bird.visible = !winter && !night;
        const a = time * 0.045 + phase;
        bird.position.set(Math.sin(a) * 65, 6 + Math.sin(a * 0.7) * 2, -90 + Math.cos(a) * 12);
        bird.rotation.z = Math.sin(time * 2.5 + phase) * 0.15;
        bird.scale.y = 0.4 + Math.sin(time * 4 + phase) * 0.5;
      });
      litter.visible = autumn;
      snowGlints.visible = winter;
      crystalMaterial.opacity = 0.48 + Math.sin(time * 0.8) * 0.16;
    },
    dispose() {
      wingGeometry.dispose(); bodyGeometry.dispose(); bodyMaterial.dispose();
      wingMaterials.forEach(m => m.dispose());
      moteGeometry.dispose(); moteMaterial.dispose();
      birdGeometry.dispose(); birdMaterial.dispose();
      litter.dispose(); litterGeometry.dispose(); litterMaterial.dispose();
      crystalGeometry.dispose(); crystalMaterial.dispose();
    },
  };
}
