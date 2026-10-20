import * as THREE from 'three';
import { END_Z, FIELD_HALF_W, type Agent, type CurveType } from './types';

const SENS = 0.0022;
const WALK = 5.2;
const SPRINT = 7.6;

export interface InputState {
  keys: Set<string>;
  mouseDown: boolean;
  pressed: boolean; // 本帧刚按下
  released: boolean; // 本帧刚松开
  lookDX: number;
  lookDY: number;
  locked: boolean;
}

export interface UserControl {
  yaw: number;
  pitch: number;
  stamina: number; // 0..1
  exhausted: boolean;
  sprint: number; // 0..1 冲刺爬升（速度是逐渐加上去的，不是瞬间切换）
}

export function createUserControl(): UserControl {
  return { yaw: 0, pitch: 0, stamina: 1, exhausted: false, sprint: 0 };
}

export function createInput(
  canvas: HTMLElement,
  cb: {
    onLockChange(locked: boolean): void;
    onCurve(c: CurveType): void;
    onPass(slot: 1 | 2): void;
    onFake(): void;
    onCall(): void;
    onStep(dir: -1 | 1): void;
  },
) {
  const state: InputState = {
    keys: new Set(),
    mouseDown: false,
    pressed: false,
    released: false,
    lookDX: 0,
    lookDY: 0,
    locked: false,
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!state.locked) return;
    state.keys.add(e.code);
    if (e.code === 'KeyQ') cb.onCurve('backhand');
    if (e.code === 'KeyE') cb.onCurve('forehand');
    if (e.code === 'Digit1' || e.code === 'Numpad1') cb.onPass(1);
    if (e.code === 'Digit2' || e.code === 'Numpad2') cb.onPass(2);
    if (!e.repeat) {
      if (e.code === 'KeyV') cb.onFake();
      if (e.code === 'KeyF') cb.onCall();
      if (e.code === 'KeyA') cb.onStep(-1);
      if (e.code === 'KeyD') cb.onStep(1);
    }
    if (e.code === 'Space' || e.code === 'Tab') e.preventDefault();
  };
  const onKeyUp = (e: KeyboardEvent) => state.keys.delete(e.code);
  const onMouseMove = (e: MouseEvent) => {
    if (!state.locked) return;
    state.lookDX += e.movementX;
    state.lookDY += e.movementY;
  };
  const onMouseDown = (e: MouseEvent) => {
    if (!state.locked || e.button !== 0) return;
    state.mouseDown = true;
    state.pressed = true;
  };
  const onMouseUp = (e: MouseEvent) => {
    if (e.button !== 0) return;
    if (state.mouseDown) state.released = true;
    state.mouseDown = false;
  };
  const clear = () => {
    state.keys.clear();
    state.mouseDown = false;
    state.pressed = false;
    state.released = false;
    state.lookDX = 0;
    state.lookDY = 0;
  };
  const onLockChange = () => {
    state.locked = document.pointerLockElement === canvas;
    if (!state.locked) clear();
    cb.onLockChange(state.locked);
  };
  const onCtx = (e: Event) => e.preventDefault();

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', clear);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('pointerlockchange', onLockChange);
  canvas.addEventListener('contextmenu', onCtx);

  return {
    state,
    clear,
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clear);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('pointerlockchange', onLockChange);
      canvas.removeEventListener('contextmenu', onCtx);
    },
  };
}

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _want = new THREE.Vector3();
const _diff = new THREE.Vector3();

/** 鼠标视角 + WASD 移动 + 冲刺体力 + 边界；持盘时锁定位移（轴心脚），只能转视角 */
export function updateUserMovement(
  u: UserControl,
  agent: Agent,
  input: InputState,
  holding: boolean,
  frozen: boolean,
  dt: number,
): void {
  // 视角
  u.yaw -= input.lookDX * SENS;
  u.pitch = THREE.MathUtils.clamp(u.pitch - input.lookDY * SENS, -1.3, 1.3);
  input.lookDX = 0;
  input.lookDY = 0;

  _fwd.set(-Math.sin(u.yaw), 0, -Math.cos(u.yaw));
  _right.set(Math.cos(u.yaw), 0, -Math.sin(u.yaw));
  _want.set(0, 0, 0);
  if (!holding && !frozen) {
    const k = input.keys;
    if (k.has('KeyW')) _want.add(_fwd);
    if (k.has('KeyS')) _want.sub(_fwd);
    if (k.has('KeyD')) _want.add(_right);
    if (k.has('KeyA')) _want.sub(_right);
  }
  const moving = _want.lengthSq() > 0;
  if (moving) _want.normalize();

  const wantSprint =
    moving && (input.keys.has('ShiftLeft') || input.keys.has('ShiftRight')) && !u.exhausted && u.stamina > 0;
  if (wantSprint) {
    u.stamina = Math.max(0, u.stamina - 0.28 * dt);
    if (u.stamina <= 0) u.exhausted = true;
  } else {
    u.stamina = Math.min(1, u.stamina + (moving ? 0.1 : 0.18) * dt);
    if (u.exhausted && u.stamina >= 0.3) u.exhausted = false;
  }

  // 有惯性的移动：起步要加速，松手要滑一小段；冲刺速度逐渐爬升
  u.sprint = THREE.MathUtils.clamp(u.sprint + (wantSprint ? 2.2 : -3.0) * dt, 0, 1);
  const speed = WALK + (SPRINT - WALK) * u.sprint;
  _want.multiplyScalar(speed);
  const accel = moving ? 26 : holding ? 7 : 16; // 持盘时是"接盘后滑步停下"
  _diff.copy(_want).sub(agent.vel);
  const dl = _diff.length();
  const maxStep = accel * dt;
  if (dl <= maxStep) agent.vel.copy(_want);
  else agent.vel.addScaledVector(_diff, maxStep / dl);
  agent.pos.addScaledVector(agent.vel, dt);
  agent.pos.x = THREE.MathUtils.clamp(agent.pos.x, -(FIELD_HALF_W - 0.35), FIELD_HALF_W - 0.35);
  agent.pos.z = THREE.MathUtils.clamp(agent.pos.z, -(END_Z - 0.35), END_Z - 0.35);
  agent.yaw = u.yaw;
}
