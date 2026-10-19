import * as THREE from 'three';
import {
  END_Z,
  FIELD_HALF_W,
  GOAL_Z,
  teamDir,
  type Agent,
  type AIHooks,
  type Dir,
  type TeamId,
  type World,
} from './types';
import { PALETTE, addOutline, addScaleOutline, blobShadow, toonMat } from './toon';

const clamp = THREE.MathUtils.clamp;
const TEAM_COLORS = [PALETTE.teamA, PALETTE.teamB];

/** 头顶数字标签（对应 1 / 2 键传球） */
function makeLabel(text: string): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = 'rgba(10,25,15,0.85)';
    g.beginPath();
    g.arc(32, 32, 28, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#ffffff';
    g.stroke();
    g.fillStyle = '#ffffff';
    g.font = 'bold 38px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 32, 34);
  }
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }),
  );
  sprite.scale.set(0.5, 0.5, 1);
  sprite.position.y = 0.45;
  sprite.renderOrder = 10;
  return sprite;
}

/* ───────── 工具 ───────── */
export function yawOf(dx: number, dz: number): number {
  // 相机/人物朝向约定：yaw=0 面向 -z；yaw=π 面向 +z
  return Math.atan2(-dx, -dz);
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function clampToField(p: THREE.Vector3): void {
  p.x = clamp(p.x, -(FIELD_HALF_W - 0.35), FIELD_HALF_W - 0.35);
  p.z = clamp(p.z, -(END_Z - 0.35), END_Z - 0.35);
}

export function nearestDefenderDist(w: World, x: number, z: number, offense: TeamId): number {
  let m = 99;
  for (const o of w.agents) {
    if (o.team === offense) continue;
    const d = Math.hypot(o.pos.x - x, o.pos.z - z);
    if (d < m) m = d;
  }
  return m;
}

/** 防守者到线段 A→B 的最小距离（传球线路是否被堵） */
export function laneClearance(
  w: World,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  offense: TeamId,
): number {
  const abx = bx - ax;
  const abz = bz - az;
  const len2 = abx * abx + abz * abz || 1e-6;
  let m = 99;
  for (const o of w.agents) {
    if (o.team === offense) continue;
    const t = clamp(((o.pos.x - ax) * abx + (o.pos.z - az) * abz) / len2, 0, 1);
    const d = Math.hypot(o.pos.x - (ax + abx * t), o.pos.z - (az + abz * t));
    if (d < m) m = d;
  }
  return m;
}

/* ───────── 创建 ───────── */
interface Rig {
  body: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  phase: number;
}

export function createPlayers(scene: THREE.Scene): Agent[] {
  const torsoGeo = new THREE.CapsuleGeometry(0.25, 0.5, 4, 12);
  const headGeo = new THREE.SphereGeometry(0.17, 16, 12);
  const legGeo = new THREE.CapsuleGeometry(0.085, 0.4, 3, 8);
  const armGeo = new THREE.CapsuleGeometry(0.06, 0.34, 3, 8);
  const bandGeo = new THREE.TorusGeometry(0.175, 0.03, 6, 20);
  const visorGeo = new THREE.BoxGeometry(0.22, 0.07, 0.12);
  const markerGeo = new THREE.OctahedronGeometry(0.14);
  const skinMat = toonMat(PALETTE.skin);
  const shortsMat = toonMat(PALETTE.shorts);
  const creamMat = toonMat(PALETTE.cream);
  const visorMat = new THREE.MeshBasicMaterial({ color: PALETTE.ink });
  const teamMats = TEAM_COLORS.map((c) => toonMat(c));

  const specs: { team: TeamId; isUser: boolean; name: string }[] = [
    { team: 0, isUser: true, name: '你' },
    { team: 0, isUser: false, name: '队友 A' },
    { team: 0, isUser: false, name: '队友 B' },
    { team: 1, isUser: false, name: '对手 1' },
    { team: 1, isUser: false, name: '对手 2' },
    { team: 1, isUser: false, name: '对手 3' },
  ];

  return specs.map((s, id) => {
    const group = new THREE.Group();
    const body = new THREE.Group(); // 躯干 + 头 + 手臂：前倾时整体一起动

    const torso = new THREE.Mesh(torsoGeo, teamMats[s.team]);
    torso.position.y = 1.02;
    addOutline(torso, 0.03);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.64;
    addOutline(head, 0.03);
    const band = new THREE.Mesh(bandGeo, creamMat); // 头带：远处也能看出是人
    band.position.y = 1.7;
    band.rotation.x = Math.PI / 2;
    const visor = new THREE.Mesh(visorGeo, visorMat); // 脸朝 -z
    visor.position.set(0, 1.64, -0.14);
    body.add(torso, head, band, visor);

    const mkArm = (x: number) => {
      const g = new THREE.Group();
      g.position.set(x, 1.38, 0);
      const m = new THREE.Mesh(armGeo, s.team === 0 ? teamMats[0] : teamMats[1]);
      m.position.y = -0.25;
      addOutline(m, 0.02);
      g.add(m);
      body.add(g);
      return g;
    };
    const armL = mkArm(-0.33);
    const armR = mkArm(0.33);

    const mkLeg = (x: number) => {
      const g = new THREE.Group();
      g.position.set(x, 0.62, 0);
      const m = new THREE.Mesh(legGeo, s.team === 0 ? shortsMat : shortsMat);
      m.position.y = -0.3;
      addOutline(m, 0.02);
      g.add(m);
      group.add(g);
      return g;
    };
    const legL = mkLeg(-0.12);
    const legR = mkLeg(0.12);

    group.add(body, blobShadow(0.46, 0.3));
    group.userData.rig = { body, legL, legR, armL, armR, phase: Math.random() * 6 } satisfies Rig;

    let marker: THREE.Mesh | null = null;
    if (s.team === 0 && !s.isUser) {
      marker = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0x3ddc84, fog: false }));
      marker.position.y = 2.2;
      marker.visible = false;
      addScaleOutline(marker, 1.4);
      marker.add(makeLabel(String(id)));
      group.add(marker);
    }
    scene.add(group);

    const skill = 0.88 + Math.random() * 0.12;
    return {
      id,
      team: s.team,
      isUser: s.isUser,
      name: s.name,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      yaw: 0,
      group,
      marker,
      skill,
      maxSpeed: 4.4 * skill, // 队友 / 对手比玩家慢（玩家走 5.2、冲刺 7.6）
      react: 0.3 + Math.random() * 0.25,
      goal: new THREE.Vector3(),
      replanT: 0,
      fakeT: 0,
      fakePos: new THREE.Vector3(),
      wantDeep: false,
      markId: -1,
      throwT: 2,
      evalT: 0,
      bestTarget: -1,
      bestScore: 0,
      openness: 6,
    } satisfies Agent;
  });
}

/** 跑步动画：摆腿、摆臂、前倾、起伏——速度越快幅度越大 */
export function animateAgents(agents: Agent[], dt: number): void {
  for (const a of agents) {
    const rig = a.group.userData.rig as Rig | undefined;
    if (!rig) continue;
    const speed = Math.hypot(a.vel.x, a.vel.z);
    const k = Math.min(1, speed / 5);
    rig.phase += speed * dt * 2.6;
    const sn = Math.sin(rig.phase);
    rig.legL.rotation.x = sn * 0.95 * k;
    rig.legR.rotation.x = -sn * 0.95 * k;
    rig.armL.rotation.x = -sn * 0.85 * k;
    rig.armR.rotation.x = sn * 0.85 * k;
    rig.body.rotation.x = -0.24 * k;
    rig.body.position.y = Math.abs(Math.cos(rig.phase)) * 0.05 * k;
  }
}

/** 第一人称手臂：挂在相机上，持盘时伸到画面右下方 */
export interface ViewArm {
  group: THREE.Group;
}

export function createViewArm(camera: THREE.Camera): ViewArm {
  const group = new THREE.Group();
  const dir = new THREE.Vector3(0.23, -0.4, 0.72).normalize(); // 从手指向肩膀
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.7, 4, 10), toonMat(PALETTE.teamA));
  arm.position.copy(dir).multiplyScalar(0.46);
  arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  addOutline(arm, 0.014);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), toonMat(PALETTE.skin));
  addOutline(hand, 0.014);
  group.add(arm, hand);
  group.scale.setScalar(0.62); // 手臂别太大，别挡视野
  group.visible = false;
  camera.add(group);
  return { group };
}

export function syncAgents(agents: Agent[]): void {
  for (const a of agents) {
    a.group.position.set(a.pos.x, 0, a.pos.z);
    a.group.rotation.y = a.yaw;
    a.group.visible = !a.isUser; // 第一人称：不渲染自己
  }
}

/* ───────── 开局站位 ───────── */
export function assignMarks(agents: Agent[], offense: TeamId): void {
  const defs = agents.filter((a) => a.team !== offense && !a.isUser);
  const offs = agents.filter((a) => a.team === offense);
  const pairs: { d: Agent; o: Agent; dist: number }[] = [];
  for (const d of defs)
    for (const o of offs)
      pairs.push({ d, o, dist: Math.hypot(d.pos.x - o.pos.x, d.pos.z - o.pos.z) });
  pairs.sort((a, b) => a.dist - b.dist);
  for (const a of agents) a.markId = -1;
  const usedD = new Set<number>();
  const usedO = new Set<number>();
  for (const p of pairs) {
    if (usedD.has(p.d.id) || usedO.has(p.o.id)) continue;
    p.d.markId = p.o.id;
    usedD.add(p.d.id);
    usedO.add(p.o.id);
  }
}

/** 重置一回合的站位，返回开盘持盘者 */
export function resetFormation(agents: Agent[], dirA: Dir, offense: TeamId): Agent {
  const dirOff = teamDir(dirA, offense);
  const zG = -dirOff * GOAL_Z; // 进攻方自己的得分线
  const off = agents.filter((a) => a.team === offense);
  const def = agents.filter((a) => a.team !== offense);
  const offSpots: [number, number][] = [
    [0, zG + dirOff * 1.2],
    [-7, zG + dirOff * 6],
    [7, zG + dirOff * 10],
  ];
  off.forEach((a, i) => a.pos.set(offSpots[i][0], 0, offSpots[i][1]));
  // 防守方站在自己的得分线上（进攻方要进攻的那条线）
  const defSpots: [number, number][] = [
    [0, 1.2],
    [-7, 2.4],
    [7, 2.4],
  ];
  def.forEach((a, i) => a.pos.set(defSpots[i][0], 0, dirOff * (GOAL_Z - defSpots[i][1])));
  for (const a of agents) {
    a.vel.set(0, 0, 0);
    a.yaw = yawOf(0, a.team === offense ? dirOff : -dirOff);
    a.goal.copy(a.pos);
    a.replanT = 0.4 + Math.random() * 0.8;
    a.fakeT = 0;
    a.wantDeep = false;
    a.bestTarget = -1;
    a.bestScore = 0;
  }
  assignMarks(agents, offense);
  return off[0]; // 玩家方开盘时即你本人（id 最小）
}

/* ───────── 移动 / 朝向 ───────── */
const _t = new THREE.Vector3();
const _d = new THREE.Vector3();
const _v = new THREE.Vector3();

function steer(a: Agent, target: THREE.Vector3, speed: number, dt: number, stop = 0.3): void {
  _t.set(target.x - a.pos.x, 0, target.z - a.pos.z);
  const d = _t.length();
  let want = 0;
  if (d > stop) want = speed * Math.min(1, d / 2);
  if (d > 1e-4) _t.multiplyScalar(1 / d);
  _v.set(_t.x * want, 0, _t.z * want);
  a.vel.lerp(_v, Math.min(1, 8 * dt));
  a.pos.addScaledVector(a.vel, dt);
  clampToField(a.pos);
  if (a.vel.lengthSq() > 0.3) a.yaw = lerpAngle(a.yaw, yawOf(a.vel.x, a.vel.z), Math.min(1, 10 * dt));
}

function faceToward(a: Agent, p: THREE.Vector3, dt: number): void {
  const dx = p.x - a.pos.x;
  const dz = p.z - a.pos.z;
  if (dx * dx + dz * dz < 0.01) return;
  a.yaw = lerpAngle(a.yaw, yawOf(dx, dz), Math.min(1, 8 * dt));
}

/* ───────── 进攻：无盘队友跑位 ───────── */
function planCut(a: Agent, w: World, dir: Dir): void {
  const ref = w.refPos;
  // 被紧盯：假动作（先回撤，再反切）
  if (a.openness < 2 && !a.wantDeep && Math.random() < 0.45) {
    a.fakeT = 0.45 + Math.random() * 0.2;
    a.fakePos.set(clamp(a.pos.x + (Math.random() < 0.5 ? -2 : 2), -11, 11), 0, a.pos.z - dir * 3.5);
    return;
  }
  let best = -Infinity;
  for (let i = 0; i < 6; i++) {
    const kind = i % 3;
    let x: number;
    let z: number;
    if (kind === 0 || (a.wantDeep && i < 4)) {
      // 深切
      x = (Math.random() * 2 - 1) * 9.5;
      z = ref.z + dir * (10 + Math.random() * 12);
    } else if (kind === 1) {
      // 侧向拉开 / 接应
      x = ref.x + (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 4);
      z = ref.z + dir * (2 + Math.random() * 6);
    } else {
      // 回撤接应
      x = ref.x + (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 3);
      z = ref.z - dir * (2 + Math.random() * 4);
    }
    x = clamp(x, -11.5, 11.5);
    z = clamp(z, -(END_Z - 2), END_Z - 2);
    let score = Math.min(nearestDefenderDist(w, x, z, a.team), 6);
    for (const m of w.agents) {
      if (m === a || m.team !== a.team) continue;
      const s = Math.hypot(m.pos.x - x, m.pos.z - z);
      if (s < 4) score -= (4 - s) * 0.5; // 队友之间别扎堆
    }
    score += dir * (z - a.pos.z) * 0.04 + Math.random() * 0.8;
    if (a.wantDeep && kind === 0) score += 2;
    if (score > best) {
      best = score;
      a.goal.set(x, 0, z);
    }
  }
  a.wantDeep = false;
  a.replanT = 1.2 + Math.random() * 1.4;
}

function cutter(a: Agent, w: World, dt: number): void {
  const dir = teamDir(w.dirA, a.team);
  a.openness = nearestDefenderDist(w, a.pos.x, a.pos.z, a.team);
  if (a.fakeT > 0) {
    a.fakeT -= dt;
    steer(a, a.fakePos, a.maxSpeed * 0.8, dt);
    if (a.fakeT <= 0) {
      a.replanT = 0;
      a.wantDeep = true;
    }
    return;
  }
  a.replanT -= dt;
  if (a.replanT <= 0) planCut(a, w, dir);
  steer(a, a.goal, a.maxSpeed, dt, 0.4);
  if (a.vel.lengthSq() < 0.5) faceToward(a, w.refPos, dt);
}

/* ───────── 防守：盯人 + 站在得分区一侧 ───────── */
function defender(a: Agent, w: World, dt: number): void {
  const dirOff = teamDir(w.dirA, w.offense);
  const ref = w.refPos;
  const mark = a.markId >= 0 ? w.agents[a.markId] : null;
  if (!mark) {
    _d.set(ref.x * 0.6, 0, ref.z + dirOff * 7);
    steer(a, _d, a.maxSpeed * 0.85 * (w.rush > 0 ? 1.7 : 1), dt, 0.5);
    faceToward(a, ref, dt);
    return;
  }
  // 站在对手靠得分区的一侧（1.5m），并稍微偏向传球线路
  _d.set(ref.x - mark.pos.x, 0, ref.z - mark.pos.z);
  const l = _d.length();
  if (l > 0.01) _d.multiplyScalar(1 / l);
  else _d.set(0, 0, -dirOff);
  const tx = mark.pos.x + mark.vel.x * 0.3 + _d.x * 0.6;
  const tz = mark.pos.z + mark.vel.z * 0.3 + _d.z * 0.6 + dirOff * 1.5;
  _v.set(tx, 0, tz);
  steer(a, _v, a.maxSpeed * 0.9 * (w.rush > 0 ? 1.7 : 1), dt, 0.25);
  if (a.vel.lengthSq() < 0.6) faceToward(a, mark.pos, dt);
}

/* ───────── 持盘 AI：评估传球目标 ───────── */
function evalTargets(a: Agent, w: World): void {
  const dir = teamDir(w.dirA, a.team);
  let best = -Infinity;
  let id = -1;
  for (const t of w.agents) {
    if (t === a || t.team !== a.team) continue;
    const px = t.pos.x + t.vel.x * 0.5;
    const pz = t.pos.z + t.vel.z * 0.5;
    const dist = Math.hypot(px - a.pos.x, pz - a.pos.z);
    if (dist < 4 || dist > 27) continue;
    const open = clamp(nearestDefenderDist(w, px, pz, a.team) / 6, 0, 1);
    const lane = clamp(laneClearance(w, a.pos.x, a.pos.z, px, pz, a.team) / 3, 0, 1);
    const progress = clamp(dir * (pz - a.pos.z), -6, 18) / 18;
    let s = 0.9 * open + 1.1 * lane + progress - dist / 45;
    if (pz * dir > GOAL_Z - 2) s += 0.6; // 接近得分区
    if (s > best) {
      best = s;
      id = t.id;
    }
  }
  a.bestTarget = id;
  a.bestScore = id >= 0 ? best : 0;
}

function holderAI(a: Agent, w: World, dt: number, hooks: AIHooks): void {
  a.vel.multiplyScalar(Math.max(0, 1 - 12 * dt)); // 轴心脚：不移动
  a.throwT -= dt;
  a.evalT -= dt;
  if (a.evalT <= 0) {
    a.evalT = 0.2;
    evalTargets(a, w);
  }
  const target = a.bestTarget >= 0 ? w.agents[a.bestTarget] : null;
  if (target) faceToward(a, target.pos, dt);
  if (a.throwT > 0) return;
  if (target && (a.bestScore > 0.85 || w.stallElapsed > 7.5 || a.throwT < -5)) {
    hooks.throwTo(a, target);
  } else if (!target && (w.stallElapsed > 9 || a.throwT < -6)) {
    // 没有合适目标：数秒快到了，就近传一个
    let near: Agent | null = null;
    let nd = Infinity;
    for (const t of w.agents) {
      if (t === a || t.team !== a.team) continue;
      const d = Math.hypot(t.pos.x - a.pos.x, t.pos.z - a.pos.z);
      if (d < nd) {
        nd = d;
        near = t;
      }
    }
    if (near) hooks.throwTo(a, near);
  }
}

/* ───────── 总入口 ───────── */
export function updateAI(w: World, dt: number, hooks: AIHooks): void {
  const disc = w.disc;
  const flying = disc.mode === 'flying';
  const landingInBounds =
    Math.abs(w.landing.x) <= FIELD_HALF_W + 0.5 && Math.abs(w.landing.z) <= END_Z + 0.5;

  // 每队派一个"最快到落点"的人去追盘（玩家若是最快的，AI 队友就不追）
  const chaser: (Agent | null)[] = [null, null];
  if (flying && !disc.dead && landingInBounds && disc.guidedTarget < 0) {
    const best = [Infinity, Infinity];
    const since = w.time - w.throwTime;
    for (const a of w.agents) {
      if (a.id === disc.throwerId && disc.flightTime < 0.8) continue;
      const spd = a.isUser ? 6.5 : a.maxSpeed * (a.team === disc.throwTeam ? 1 : 0.92);
      let eta = Math.hypot(a.pos.x - w.landing.x, a.pos.z - w.landing.z) / spd;
      if (a.team !== disc.throwTeam) eta += Math.max(0, a.react - since); // 防守者有反应延迟
      if (eta < best[a.team]) {
        best[a.team] = eta;
        chaser[a.team] = a;
      }
    }
  }

  // 飞盘在地上：进攻方里最快到的人去捡（玩家若最快则 AI 不抢）
  let fetcher: Agent | null = null;
  if (w.loose) {
    let bestEta = Infinity;
    for (const a of w.agents) {
      if (a.team !== w.pickupTeam) continue;
      const eta = Math.hypot(a.pos.x - w.refPos.x, a.pos.z - w.refPos.z) / (a.isUser ? 5.2 : a.maxSpeed);
      if (eta < bestEta) {
        bestEta = eta;
        fetcher = a;
      }
    }
  }

  for (const a of w.agents) {
    if (a.isUser) continue;
    if (w.frozen) {
      a.vel.multiplyScalar(Math.max(0, 1 - 6 * dt));
      continue;
    }
    if (w.holder === a && disc.mode === 'held') {
      holderAI(a, w, dt, hooks);
      continue;
    }
    if (w.loose && fetcher === a) {
      steer(a, w.refPos, a.maxSpeed, dt, 0.1);
      continue;
    }
    if (flying && chaser[a.team] === a) {
      steer(a, w.landing, a.maxSpeed * (a.team === disc.throwTeam ? 1 : 0.92), dt, 0.2);
      continue;
    }
    if (a.team === w.offense) cutter(a, w, dt);
    else defender(a, w, dt);
  }
}

/* ───────── 开放度指示（头顶彩色菱形） ───────── */
export function updateMarkers(w: World, time: number): void {
  const show = w.offense === 0 && w.disc.mode === 'held' && !w.frozen;
  for (const a of w.agents) {
    if (!a.marker) continue;
    const isHolder = w.holder === a;
    a.marker.visible = show && !isHolder;
    if (!a.marker.visible) continue;
    const open = nearestDefenderDist(w, a.pos.x, a.pos.z, 0);
    const color = open > 4.2 ? 0x3ddc84 : open > 2.2 ? 0xffd23f : 0xff4d4d;
    (a.marker.material as THREE.MeshBasicMaterial).color.setHex(color);
    a.marker.position.y = 2.15 + Math.sin(time * 4 + a.id) * 0.06;
    a.marker.rotation.y = time * 2;
  }
}
