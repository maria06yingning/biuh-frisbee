import type * as THREE from 'three';

/* ───────── 场地常量（按 WFDF 100×37m 约 0.5 比例缩小；7v7 用标准比例，3v3 用更紧凑的练习场） ─────────
 * 这几个是“可变绑定”：ESM 的具名导入是活引用，applyMatchConfig 改了之后各模块读到的就是新值。
 * 注意：不要在模块顶层把它们复制进 const，要在运行时读取。 */
export let FIELD_HALF_W = 13; // 场宽的一半（米）
export let GOAL_Z = 30; // 得分线：z = ±GOAL_Z（中场 = 2×GOAL_Z）
export let ZONE_DEPTH = 11; // 得分区深度
export let END_Z = GOAL_Z + ZONE_DEPTH; // 底线：z = ±END_Z
export const WIN_SCORE = 5;
export const STALL_LIMIT = 10; // 数秒 10 秒
export const EYE_HEIGHT = 1.7;
export const HAND_HEIGHT = 1.25;
export const NEXT_POINT_DELAY = 2.6;
export const STALL_RADIUS = 3; // 防守者在 3m 内才开始数秒
export const LANE_BLOCK_R = 1.0; // 防守者离传球线路 1m 内 = 线路被堵
export const MARKER_ZONE = 2.0; // 持盘者身前 2m 内的防守者算"盯防者"，只有概率碰到盘

/* ───────── 比赛模式 / 战术 ───────── */
export type MatchMode = '3v3' | '7v7';
// 进攻阵型 / 防守战术（名字和战术实验室一致）
export type OffenseTactic = 'vstack' | 'hstack';
export type DefenseTactic = 'man' | 'zone';

export interface MatchConfig {
  mode: MatchMode;
  teamSize: number; // 每队人数
  ourOffense: OffenseTactic;
  ourDefense: DefenseTactic;
  oppOffense: OffenseTactic; // 对手本分实际使用的战术
  oppDefense: DefenseTactic;
  // 对手选「随机」：每一分开始时重新抽（WFDF 7.1.1 注释：队伍在每分开盘前决定本分战术）
  oppOffenseRandom: boolean;
  oppDefenseRandom: boolean;
}

export let TEAM_SIZE = 3; // 每队人数（3 或 7）
export const defaultMatchConfig = (mode: MatchMode = '3v3'): MatchConfig => ({
  mode,
  teamSize: mode === '7v7' ? 7 : 3,
  ourOffense: 'vstack',
  ourDefense: 'man',
  oppOffense: 'hstack',
  oppDefense: 'man',
  oppOffenseRandom: true,
  oppDefenseRandom: true,
});

let matchConfig: MatchConfig = defaultMatchConfig('3v3');
export const getMatchConfig = (): MatchConfig => matchConfig;

/** 在创建一局游戏之前调用：根据模式设定场地尺寸和人数（活绑定会被各模块读到） */
export function applyMatchConfig(cfg: MatchConfig): void {
  matchConfig = cfg;
  TEAM_SIZE = cfg.teamSize;
  if (cfg.mode === '7v7') {
    // WFDF 标准 37×100m，约 0.5 比例：场宽 18.5、中场 64→GOAL_Z=32、得分区 18→END_Z=50
    FIELD_HALF_W = 18.5;
    GOAL_Z = 32;
    ZONE_DEPTH = 18;
  } else {
    FIELD_HALF_W = 13;
    GOAL_Z = 30;
    ZONE_DEPTH = 11;
  }
  END_Z = GOAL_Z + ZONE_DEPTH;
}

export type TeamId = 0 | 1; // 0 = 你的队伍，1 = 对手
export type Dir = 1 | -1; // 进攻方向（沿 z 轴）
export type Phase = 'ready' | 'playing' | 'scored' | 'gameover';
export type DiscMode = 'held' | 'flying' | 'grounded';
export type CurveType = 'backhand' | 'forehand';
export type TurnoverReason = 'intercept' | 'block' | 'ground' | 'out' | 'stall' | 'drop';

export type ViolationType = 'double' | 'travel' | 'contact' | 'self-contact';

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
  slot: number; // 在本队战术阵型里的位置编号（0..teamSize-1）
  throwT: number;
  evalT: number;
  bestTarget: number;
  bestScore: number;
  openness: number; // 与最近防守者的距离
  // —— 违规 / 假动作 ——
  cheat: number; // 0 无，1 双防，2 带盘走，3 贴身犯规（机器人偶尔犯规，玩家要自己喊）
  cheatT: number;
  cheatDelay: number;
  ox: number; // 带盘走前的原地
  oz: number;
  biteUntil: number; // 被假动作骗到，直到这个时间点
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
  shadow: THREE.Mesh; // 地面圆影（看影子大小判断盘的高度）
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
  passive: boolean; // 教程模式：除了玩家的盯防者和追盘的队友，其余人原地不动
  pullPending: boolean; // 本回合的开盘（pull）还没踢出
  pulling: boolean; // 开盘的盘在空中
  force: [number, number]; // 各队盯防者的"逼向"：-1 站在持盘者左侧（逼正手），+1 站在右侧（逼反手）
  rush: number; // 开盘后防守方回防冲刺的剩余秒数
  readyT: number; // 新一回合开始前的"各就各位"倒计时
  tacticGoal: THREE.Vector3 | null; // 玩家在当前战术里应该去的位置（紫色引导标）
}

export interface AIHooks {
  throwTo(from: Agent, to: Agent): void;
  pull(from: Agent): void;
  violation(type: ViolationType, who: Agent): void;
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
  pullPending: boolean; // 正在等待开盘
  pulling: boolean; // 开盘的盘在空中
  charge: number; // 0..1
  stallLeft: number | null; // 剩余秒数
  stallRunning: boolean; // 防守者是否贴近（不贴近时暂停计时）
  stamina: number; // 0..1
  exhausted: boolean;
  force: 'forehand' | 'backhand' | null; // 盯防者当前逼你用哪只手（只在你持盘且盯防者贴近时有值）
  spirit: number; // 体育精神分 0..10
  tutorial: { step: number; total: number; done: boolean } | null;
  curve: CurveType;
  goalAngle: number; // 进攻得分区相对视线方向的角度（弧度，顺时针为正）
  guide: boolean;
  landing: { angle: number; dist: number; mine: boolean } | null; // 空中飞盘的落点（相对视线）
  speed: number; // 0..1，相对冲刺速度
  chain: number; // 连续传球次数
  chainTeam: TeamId;
  mode: MatchMode;
  mates: number; // 队友人数（= 可用的传球键 1..mates）
  tactic: { ours: OffenseTactic | DefenseTactic; theirs: OffenseTactic | DefenseTactic } | null; // 只在 7v7 有值
  tacticGuide: { angle: number; dist: number } | null; // 战术引导标相对视线的方向和距离
  suggest: number; // 战术推荐的传球目标队友编号（1..mates），0 = 无
}

export interface ToastPayload {
  title: string; // i18n key
  sub: string; // i18n key（可为空）
  note?: string; // 追加在 sub 后面的 i18n key
  params?: Record<string, string | number>;
  kind: 'good' | 'bad' | 'info' | 'score';
}

export interface TipPayload {
  key: string; // 文案在 i18n 的 tip.<key>.t / tip.<key>.x
}

export interface GameEvents {
  hud: HudState;
  toast: ToastPayload;
  tip: TipPayload;
  pause: undefined;
  resume: undefined;
  codex: { id: string };
  tutorialDone: undefined;
  gameover: {
    win: boolean;
    scoreA: number;
    scoreB: number;
    spirit: number;
    calls: { correct: number; wrong: number; self: number; missed: number };
  };
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
