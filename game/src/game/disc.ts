import * as THREE from 'three';
import type { Agent, DiscState } from './types';

/* 飞行物理：重力 + 升力（随水平速度） + 空气阻力 + 侧向弧线 */
const G = 9.8;
const LIFT = 0.62;
const DRAG = 0.012;
const CURVE_ACC = 1.8;
const GROUND_Y = 0.03;
const MAX_SIM_TIME = 7;

export const PHYS_STEP = 1 / 60;
export const MIN_SPEED = 9;
export const MAX_SPEED = 24;

const _a = new THREE.Vector3();
const _p = new THREE.Vector3();
const _v = new THREE.Vector3();

function accel(v: THREE.Vector3, curve: number, out: THREE.Vector3): void {
  const speed = v.length();
  const hs = Math.hypot(v.x, v.z);
  const lift = G * LIFT * Math.min(1, hs / 14);
  out.set(-DRAG * speed * v.x, -G + lift - DRAG * speed * v.y, -DRAG * speed * v.z);
  if (hs > 0.05) {
    // 水平速度的"右手方向" = (-vz, 0, vx)/hs；curve>0 向右弯，<0 向左弯
    const k = (curve * CURVE_ACC * Math.min(1, hs / 12)) / hs;
    out.x += -v.z * k;
    out.z += v.x * k;
  }
}

export function createDisc(scene: THREE.Scene): DiscState {
  const object = new THREE.Group();
  const spinner = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.035, 28),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }),
  );
  body.castShadow = true;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.19, 0.02, 8, 28),
    new THREE.MeshStandardMaterial({ color: 0xff5a1f, roughness: 0.5 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.018;
  spinner.add(body, rim);
  object.add(spinner);
  scene.add(object);

  return {
    mode: 'grounded',
    pos: new THREE.Vector3(0, GROUND_Y, 0),
    vel: new THREE.Vector3(),
    curve: 0,
    object,
    spinner,
    throwerId: -1,
    throwTeam: 0,
    flightTime: 0,
    landing: new THREE.Vector3(),
    dead: false,
    deadReason: null,
    guidedTarget: -1,
  };
}

/** 推进一步物理；落地返回 true */
export function updateDisc(d: DiscState, dt: number): boolean {
  if (d.mode !== 'flying') return false;
  d.flightTime += dt;
  accel(d.vel, d.curve, _a);
  d.vel.addScaledVector(_a, dt);
  d.pos.addScaledVector(d.vel, dt);
  if (d.pos.y <= GROUND_Y && d.vel.y < 0) {
    d.pos.y = GROUND_Y;
    return true;
  }
  return false;
}

export function syncDiscObject(d: DiscState, dt: number): void {
  d.object.position.copy(d.pos);
  if (d.mode === 'flying' && !d.dead) {
    d.spinner.rotation.y += 28 * dt;
    d.object.rotation.z = -d.curve * 0.28;
  } else {
    d.object.rotation.z *= 0.8;
  }
}

/** 预测飞行轨迹。out 可选：写入 (x,y,z) 折线点；返回点数与飞行时间 */
export function simulateFlight(
  origin: THREE.Vector3,
  vel: THREE.Vector3,
  curve: number,
  landing: THREE.Vector3,
  out?: Float32Array,
): { count: number; time: number } {
  _p.copy(origin);
  _v.copy(vel);
  const cap = out ? Math.floor(out.length / 3) : 0;
  let count = 0;
  let t = 0;
  let i = 0;
  const record = () => {
    if (out && count < cap) {
      out[count * 3] = _p.x;
      out[count * 3 + 1] = _p.y;
      out[count * 3 + 2] = _p.z;
      count++;
    }
  };
  record();
  while (t < MAX_SIM_TIME) {
    accel(_v, curve, _a);
    _v.addScaledVector(_a, PHYS_STEP);
    _p.addScaledVector(_v, PHYS_STEP);
    t += PHYS_STEP;
    i++;
    if (_p.y <= GROUND_Y && _v.y < 0) {
      _p.y = GROUND_Y;
      record();
      break;
    }
    if (i % 3 === 0) record();
  }
  landing.copy(_p);
  return { count, time: t };
}

/** 以给定方向/速度发射（AI 和玩家共用）。noise 为随机角度误差（弧度） */
export function launchDisc(
  d: DiscState,
  from: THREE.Vector3,
  thrower: Agent,
  dir: THREE.Vector3,
  speed: number,
  curve: number,
  noise = 0,
): void {
  let yaw = Math.atan2(dir.x, -dir.z);
  let pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
  if (noise > 0) {
    yaw += (Math.random() * 2 - 1) * noise;
    pitch += (Math.random() * 2 - 1) * noise * 0.7;
  }
  const cp = Math.cos(pitch);
  d.vel.set(Math.sin(yaw) * cp * speed, Math.sin(pitch) * speed, -Math.cos(yaw) * cp * speed);
  d.pos.copy(from);
  d.curve = curve;
  d.mode = 'flying';
  d.throwerId = thrower.id;
  d.throwTeam = thrower.team;
  d.flightTime = 0;
  d.dead = false;
  d.deadReason = null;
  d.guidedTarget = -1;
  simulateFlight(d.pos, d.vel, d.curve, d.landing);
}

/** 玩家投掷：power 0..1 → 速度 9~24 m/s */
export function throwDisc(
  d: DiscState,
  from: THREE.Vector3,
  thrower: Agent,
  power: number,
  direction: THREE.Vector3,
  curve: number,
  noise = 0,
): void {
  const speed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * THREE.MathUtils.clamp(power, 0, 1);
  launchDisc(d, from, thrower, direction, speed, curve, noise);
}

/** 弹道求解（AI 用）：找到能把盘落在 target 附近的 仰角 + 速度。返回落点误差(米) */
export function solveAim(
  origin: THREE.Vector3,
  target: THREE.Vector3,
  curve: number,
  out: { dir: THREE.Vector3; speed: number },
): number {
  const dx = target.x - origin.x;
  const dz = target.z - origin.z;
  const D = Math.hypot(dx, dz) || 0.001;
  const hx = dx / D;
  const hz = dz / D;
  const guess = THREE.MathUtils.clamp(7 + D * 0.6, MIN_SPEED, MAX_SPEED);
  const land = new THREE.Vector3();
  const v = new THREE.Vector3();
  let best = Infinity;
  out.speed = guess;
  out.dir.set(hx, 0.1, hz).normalize();
  for (const m of [0.9, 1, 1.1]) {
    const speed = THREE.MathUtils.clamp(guess * m, MIN_SPEED, MAX_SPEED);
    for (let p = -0.05; p <= 0.75; p += 0.025) {
      const cp = Math.cos(p);
      v.set(hx * cp * speed, Math.sin(p) * speed, hz * cp * speed);
      simulateFlight(origin, v, curve, land);
      const err = Math.hypot(land.x - target.x, land.z - target.z);
      if (err < best - 0.01) {
        best = err;
        out.speed = speed;
        out.dir.set(hx * cp, Math.sin(p), hz * cp);
      }
    }
  }
  return best;
}
