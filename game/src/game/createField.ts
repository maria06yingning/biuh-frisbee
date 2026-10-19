import * as THREE from 'three';
import { END_Z, FIELD_HALF_W, GOAL_Z, ZONE_DEPTH, type Dir } from './types';

export interface FieldHandle {
  group: THREE.Group;
  /** dir = 你的队伍当前进攻的方向；该侧得分区变金色，另一侧为蓝灰色 */
  setAttackZone(dir: Dir): void;
}

const ATTACK_COLOR = 0xffc83d;
const DEFEND_COLOR = 0x5b8def;

export function createField(scene: THREE.Scene): FieldHandle {
  const group = new THREE.Group();

  // 外围草地
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 420),
    new THREE.MeshStandardMaterial({ color: 0x4d9442, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  ground.receiveShadow = true;
  group.add(ground);

  // 割草条纹
  const stripeMats = [
    new THREE.MeshStandardMaterial({ color: 0x6cc05a, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x62b350, roughness: 1 }),
  ];
  const n = 10;
  const stripeLen = (END_Z * 2) / n;
  const stripeGeo = new THREE.PlaneGeometry(FIELD_HALF_W * 2, stripeLen);
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(stripeGeo, stripeMats[i % 2]);
    s.rotation.x = -Math.PI / 2;
    s.position.set(0, 0, -END_Z + stripeLen * (i + 0.5));
    s.receiveShadow = true;
    group.add(s);
  }

  // 得分区色块
  const zoneGeo = new THREE.PlaneGeometry(FIELD_HALF_W * 2, ZONE_DEPTH);
  const zonePos = new THREE.Mesh(
    zoneGeo,
    new THREE.MeshBasicMaterial({ color: ATTACK_COLOR, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  const zoneNeg = new THREE.Mesh(
    zoneGeo,
    new THREE.MeshBasicMaterial({ color: DEFEND_COLOR, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  for (const [m, sign] of [
    [zonePos, 1],
    [zoneNeg, -1],
  ] as const) {
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.015, sign * (GOAL_Z + ZONE_DEPTH / 2));
    group.add(m);
  }

  // 白线
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const faintMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
  const addLine = (w: number, l: number, x: number, z: number, mat: THREE.Material = lineMat) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.03, z);
    group.add(m);
  };
  const lw = 0.14;
  addLine(lw, END_Z * 2, -FIELD_HALF_W, 0); // 边线
  addLine(lw, END_Z * 2, FIELD_HALF_W, 0);
  for (const z of [-END_Z, END_Z, -GOAL_Z, GOAL_Z]) addLine(FIELD_HALF_W * 2, lw, 0, z); // 底线 / 得分线
  addLine(FIELD_HALF_W * 2, lw, 0, 0, faintMat); // 中线

  // 角锥
  const coneGeo = new THREE.ConeGeometry(0.2, 0.5, 14);
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.6 });
  for (const x of [-FIELD_HALF_W, FIELD_HALF_W]) {
    for (const z of [-END_Z, -GOAL_Z, GOAL_Z, END_Z]) {
      const c = new THREE.Mesh(coneGeo, coneMat);
      c.position.set(x, 0.25, z);
      c.castShadow = true;
      group.add(c);
    }
  }

  // 场外树木（固定伪随机，保证每次一致）
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 2.2, 8);
  const leafGeo = new THREE.ConeGeometry(1.6, 4.2, 10);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 1 });
  const leafMats = [
    new THREE.MeshStandardMaterial({ color: 0x2f7d3a, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x3a8f43, roughness: 1 }),
  ];
  for (let i = 0; i < 34; i++) {
    const side = rnd() < 0.5 ? -1 : 1;
    const x = side * (19 + rnd() * 18);
    const z = (rnd() * 2 - 1) * 70;
    const s = 0.8 + rnd() * 0.7;
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.1;
    const leaf = new THREE.Mesh(leafGeo, leafMats[i % 2]);
    leaf.position.y = 4.1;
    leaf.castShadow = true;
    tree.add(trunk, leaf);
    tree.scale.setScalar(s);
    tree.position.set(x, 0, z);
    group.add(tree);
  }

  scene.add(group);

  const setAttackZone = (dir: Dir) => {
    const apply = (mesh: THREE.Mesh, attack: boolean) => {
      const m = mesh.material as THREE.MeshBasicMaterial;
      m.color.setHex(attack ? ATTACK_COLOR : DEFEND_COLOR);
      m.opacity = attack ? 0.55 : 0.35;
    };
    apply(zonePos, dir === 1);
    apply(zoneNeg, dir === -1);
  };
  setAttackZone(1);

  return { group, setAttackZone };
}
