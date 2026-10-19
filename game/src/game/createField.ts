import * as THREE from 'three';
import { END_Z, FIELD_HALF_W, GOAL_Z, ZONE_DEPTH, type Dir } from './types';
import { PALETTE, addScaleOutline, blobShadow, hatchTexture, toonMat } from './toon';

export interface FieldHandle {
  group: THREE.Group;
  /** dir = 你的队伍当前进攻的方向；该侧得分区变金色，另一侧为紫色 */
  setAttackZone(dir: Dir): void;
}

export function createField(scene: THREE.Scene): FieldHandle {
  const group = new THREE.Group();

  // 外围草地：纯平涂
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshBasicMaterial({ color: PALETTE.ground }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  group.add(ground);

  // 割草条纹：两种草色交替 + 斜线排线
  const stripeMats = [PALETTE.grassA, PALETTE.grassB].map(
    (c) => new THREE.MeshBasicMaterial({ color: c, map: hatchTexture(FIELD_HALF_W, 4) }),
  );
  const n = 10;
  const stripeLen = (END_Z * 2) / n;
  const stripeGeo = new THREE.PlaneGeometry(FIELD_HALF_W * 2, stripeLen);
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(stripeGeo, stripeMats[i % 2]);
    s.rotation.x = -Math.PI / 2;
    s.position.set(0, 0, -END_Z + stripeLen * (i + 0.5));
    group.add(s);
  }

  // 得分区：实色块 + 排线
  const zoneGeo = new THREE.PlaneGeometry(FIELD_HALF_W * 2, ZONE_DEPTH);
  const zoneMat = (c: number) =>
    new THREE.MeshBasicMaterial({
      color: c,
      map: hatchTexture(FIELD_HALF_W, ZONE_DEPTH / 2),
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
  const zonePos = new THREE.Mesh(zoneGeo, zoneMat(PALETTE.attack));
  const zoneNeg = new THREE.Mesh(zoneGeo, zoneMat(PALETTE.defend));
  for (const [m, sign] of [
    [zonePos, 1],
    [zoneNeg, -1],
  ] as const) {
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.015, sign * (GOAL_Z + ZONE_DEPTH / 2));
    group.add(m);
  }

  // 奶油白线（比纯白柔和，和整体色调一致）
  const lineMat = new THREE.MeshBasicMaterial({ color: PALETTE.cream });
  const faintMat = new THREE.MeshBasicMaterial({ color: PALETTE.cream, transparent: true, opacity: 0.4 });
  const addLine = (w: number, l: number, x: number, z: number, mat: THREE.Material = lineMat) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.03, z);
    group.add(m);
  };
  const lw = 0.2;
  addLine(lw, END_Z * 2, -FIELD_HALF_W, 0);
  addLine(lw, END_Z * 2, FIELD_HALF_W, 0);
  for (const z of [-END_Z, END_Z, -GOAL_Z, GOAL_Z]) addLine(FIELD_HALF_W * 2, lw, 0, z);
  addLine(FIELD_HALF_W * 2, lw, 0, 0, faintMat);

  // 角锥：卡通 + 描边
  const coneGeo = new THREE.ConeGeometry(0.2, 0.5, 14);
  const coneMat = toonMat(0xff7a1a);
  for (const x of [-FIELD_HALF_W, FIELD_HALF_W]) {
    for (const z of [-END_Z, -GOAL_Z, GOAL_Z, END_Z]) {
      const c = new THREE.Mesh(coneGeo, coneMat);
      c.position.set(x, 0.25, z);
      addScaleOutline(c, 1.18, 1.06, 1.18);
      group.add(c);
    }
  }

  // 远处的平涂山丘：层层叠叠的暖色剪影（雾气让它们渐隐）
  let seed = 11;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const hillMats = PALETTE.hills.map((c) => new THREE.MeshBasicMaterial({ color: c }));
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2 + rnd() * 0.2;
    const r = 175 + rnd() * 45;
    const h = 24 + rnd() * 42;
    const w = 34 + rnd() * 34;
    const hill = new THREE.Mesh(new THREE.ConeGeometry(w, h, 6), hillMats[i % 3]);
    hill.position.set(Math.cos(ang) * r, h / 2 - 1, Math.sin(ang) * r);
    hill.rotation.y = rnd() * 3;
    group.add(hill);
  }

  // 场外树木：平涂 + 描边 + 圆影
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 2.2, 8);
  const leafGeo = new THREE.ConeGeometry(1.6, 4.2, 10);
  const trunkMat = toonMat(PALETTE.trunk);
  const leafMats = PALETTE.leafs.map((c) => toonMat(c));
  for (let i = 0; i < 34; i++) {
    const side = rnd() < 0.5 ? -1 : 1;
    const x = side * (19 + rnd() * 18);
    const z = (rnd() * 2 - 1) * 70;
    const s = 0.8 + rnd() * 0.7;
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.1;
    addScaleOutline(trunk, 1.14, 1.01, 1.14);
    const leaf = new THREE.Mesh(leafGeo, leafMats[i % 2]);
    leaf.position.y = 4.1;
    addScaleOutline(leaf, 1.04, 1.025, 1.04);
    const blob = blobShadow(1.5, 0.28);
    tree.add(blob, trunk, leaf);
    tree.scale.setScalar(s);
    tree.position.set(x, 0, z);
    group.add(tree);
  }

  scene.add(group);

  const setAttackZone = (dir: Dir) => {
    const apply = (mesh: THREE.Mesh, attack: boolean) => {
      const m = mesh.material as THREE.MeshBasicMaterial;
      m.color.setHex(attack ? PALETTE.attack : PALETTE.defend);
    };
    apply(zonePos, dir === 1);
    apply(zoneNeg, dir === -1);
  };
  setAttackZone(1);

  return { group, setAttackZone };
}
