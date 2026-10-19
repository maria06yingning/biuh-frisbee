import type * as THREE from 'three';

/* ───────── 场地常量（按 100×37m 约 0.6 比例缩小） ───────── */
export const FIELD_HALF_W = 13; // 场宽 26m：x ∈ [-13, 13]
export const GOAL_Z = 30; // 得分线：z = ±30（中场 60m）
export const ZONE_DEPTH = 11; // 得分区深度
export const END_Z = GOAL_Z + ZONE_DEPTH; // 底线：z = ±41
export const WIN_SCORE = 5;
export const STALL_LIMIT = 10; // 数秒 10 秒
export const EYE_HEIGHT = 1.7;
export const HAND_HEIGHT = 1.25;
export const NEXT_POINT_DELAY = 2.6;
export const STALL_RADIUS = 3; // 防守者在 3m 内才开始数秒
export const LANE_BLOCK_R = 1.0; // 防守者离传球线路 1m 内 = 线路被堵

export type TeamId = 0 | 1; // 0 = 你的队伍，1 = 对手
export type Dir = 1 | -1; // 进攻方向（沿 z 轴）
export type Phase = 'ready' | 'playing' | 'scored' | 'gameover';
export type DiscMode = 'held' | 'flying' | 'grounded';
export type CurveType = 'backhand' | 'forehand';
export type TurnoverReason = 'intercept' | 'block' | 'ground' | 'out' | 'stall' | 'drop';

export const otherTeam = (t: TeamId): TeamId => (t === 0 ? 1 : 0);
export const teamDir = (dirA: Dir, team: TeamId): Dir => (team === 0 ? dirA : ((-dirA) as Dir));

/* ───────── 实体 ───────── */
export interface Agent {
  id: number; // 等于在 agents 数组里的下标
  team: TeamId;
  isUser: boolean;
  name: string;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  group: THREE.Group;
  marker: THREE.Mesh | null; // 开放度指示（仅你的队友）
  skill: number;
  maxSpeed: number;
  react: number; // 防守反应时间
  // —— AI 状态 ——
  goal: THREE.Vector3;
  replanT: number;
  fakeT: number;
  fakePos: THREE.Vector3;
  wantDeep: boolean;
  markId: number;
  throwT: number;
  evalT: number;
  bestTarget: number;
  bestScore: number;
  openness: number; // 与最近防守者的距离
}

export interface DiscState {
  mode: DiscMode;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  curve: number; // -1 反手(向左弯) / +1 正手(向右弯)
  object: THREE.Group;
  spinner: THREE.Object3D;
  throwerId: number;
  throwTeam: TeamId;
  flightTime: number;
  landing: THREE.Vector3; // 抛出时预测的落点
  dead: boolean; // 已被封堵 / 掉盘，不能再被接
  deadReason: TurnoverReason | null;
  guidedTarget: number; // >=0：玩家按键定向传球的目标队友 id（不走物理）
}

export interface World {
  agents: Agent[];
  holder: Agent | null;
  disc: DiscState;
  offense: TeamId;
  dirA: Dir;
  time: number;
  stallElapsed: number;
  refPos: THREE.Vector3; // 最近一次持盘者位置（空中时 AI 的参照）
  landing: THREE.Vector3;
  throwTime: number;
  frozen: boolean;
  loose: boolean; // 飞盘落在地上，等待 pickupTeam 的人去捡
  pickupTeam: TeamId;
  rush: number; // 开盘后防守方回防冲刺的剩余秒数
  readyT: number; // 新一回合开始前的"各就各位"倒计时
}

export interface AIHooks {
  throwTo(from: Agent, to: Agent): void;
}

/* ───────── 游戏 → UI 事件总线 ───────── */
export interface HudState {
  phase: Phase;
  scoreA: number;
  scoreB: number;
  winScore: number;
  possession: 'user' | 'mate' | 'opp' | 'air' | 'loose';
  offense: TeamId;
  userHasDisc: boolean;
  charge: number; // 0..1
  stallLeft: number | null; // 剩余秒数
  stallRunning: boolean; // 防守者是否贴近（不贴近时暂停计时）
  stamina: number; // 0..1
  exhausted: boolean;
  curve: CurveType;
  goalAngle: number; // 进攻得分区相对视线方向的角度（弧度，顺时针为正）
  guide: boolean;
  landing: { angle: number; dist: number; mine: boolean } | null; // 空中飞盘的落点（相对视线）
}

export interface ToastPayload {
  title: string;
  sub: string;
  kind: 'good' | 'bad' | 'info';
}

export interface TipPayload {
  key: string;
  title: string;
  text: string;
}

export interface GameEvents {
  hud: HudState;
  toast: ToastPayload;
  tip: TipPayload;
  pause: undefined;
  resume: undefined;
  gameover: { win: boolean; scoreA: number; scoreB: number };
}

export class Emitter<E> {
  private map = new Map<keyof E, Set<(p: never) => void>>();

  on<K extends keyof E>(key: K, handler: (payload: E[K]) => void): () => void {
    let set = this.map.get(key);
    if (!set) {
      set = new Set();
      this.map.set(key, set);
    }
    const h = handler as unknown as (p: never) => void;
    set.add(h);
    return () => {
      set?.delete(h);
    };
  }

  emit<K extends keyof E>(key: K, payload: E[K]): void {
    this.map.get(key)?.forEach((h) => (h as unknown as (p: E[K]) => void)(payload));
  }

  clear(): void {
    this.map.clear();
  }
}
