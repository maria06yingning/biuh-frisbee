import {
  END_Z,
  FIELD_HALF_W,
  GOAL_Z,
  NEXT_POINT_DELAY,
  STALL_LIMIT,
  WIN_SCORE,
  otherTeam,
  type Dir,
  type Phase,
  type TeamId,
} from './types';

export type RuleEvent =
  | { type: 'stall' }
  | { type: 'score'; team: TeamId; scoreA: number; scoreB: number }
  | { type: 'nextPoint'; offense: TeamId }
  | { type: 'gameover'; winner: TeamId };

/** 比分、数秒、回合流转的纯逻辑状态机（不依赖 three / React） */
export class Rules {
  phase: Phase = 'ready';
  score: [number, number] = [0, 0];
  offense: TeamId = 0;
  dirA: Dir = 1; // 你的队伍当前的进攻方向（+z 或 -z）
  stallActive = false;
  stallElapsed = 0;
  private timer = 0;
  private conceding: TeamId = 1;

  constructor(private onEvent: (e: RuleEvent) => void) {}

  reset(): void {
    this.phase = 'ready';
    this.score = [0, 0];
    this.offense = 0;
    this.dirA = 1;
    this.stallActive = false;
    this.stallElapsed = 0;
    this.timer = 0;
  }

  begin(): void {
    this.phase = 'playing';
  }

  startStall(): void {
    this.stallElapsed = 0;
    this.stallActive = true;
  }

  stopStall(): void {
    this.stallActive = false;
  }

  /** markerNear：防守者是否在 3m 内；只有被贴防时才计时 */
  update(dt: number, markerNear = true): void {
    if (this.phase === 'playing' && this.stallActive) {
      if (markerNear) this.stallElapsed += dt;
      if (this.stallElapsed >= STALL_LIMIT) {
        this.stopStall();
        this.onEvent({ type: 'stall' });
      }
    } else if (this.phase === 'scored') {
      this.timer -= dt;
      if (this.timer <= 0) {
        // 得分后双方换边，由失分方在自己得分线开盘
        this.dirA = (-this.dirA) as Dir;
        this.offense = this.conceding;
        this.phase = 'playing';
        this.onEvent({ type: 'nextPoint', offense: this.offense });
      }
    }
  }

  /** 进攻方在对方得分区内接到盘 */
  scorePoint(team: TeamId): void {
    this.stopStall();
    this.score[team] += 1;
    this.conceding = otherTeam(team);
    this.onEvent({ type: 'score', team, scoreA: this.score[0], scoreB: this.score[1] });
    if (this.score[team] >= WIN_SCORE) {
      this.phase = 'gameover';
      this.onEvent({ type: 'gameover', winner: team });
    } else {
      this.phase = 'scored';
      this.timer = NEXT_POINT_DELAY;
    }
  }
}

/* ───────── 几何规则 ───────── */

/** z 是否位于 dir 方向的进攻得分区内 */
export function inAttackZone(z: number, dir: Dir): boolean {
  return z * dir > GOAL_Z && z * dir <= END_Z;
}

export function isOutOfBounds(x: number, z: number): boolean {
  return Math.abs(x) > FIELD_HALF_W || Math.abs(z) > END_Z;
}

/** 换攻后的持盘点：出界取边线内侧；落在得分区则回到得分线 */
export function restartSpot(x: number, z: number): { x: number; z: number } {
  const sx = Math.max(-(FIELD_HALF_W - 0.8), Math.min(FIELD_HALF_W - 0.8, x));
  let sz = z;
  if (Math.abs(sz) > GOAL_Z) sz = Math.sign(sz) * (GOAL_Z - 0.6);
  return { x: sx, z: sz };
}
