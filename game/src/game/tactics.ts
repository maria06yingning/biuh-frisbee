/* 7v7 战术（参照战术实验室的竖排 / 横排 / 人盯人 / 区域杯形）：
 * ① 进攻：持盘手站位、站排位、轮换切入点
 * ② 防守：区域防守（3-2-2 杯形）每个人守的位置
 * ③ 玩家在当前战术里该去的位置（紫色引导标）
 * 逻辑延续 3v3：这里只给“目标点”，真正的移动还是走 createPlayers 里的 steer。 */
import * as THREE from 'three';
import { END_Z, FIELD_HALF_W, TEAM_SIZE, type Dir, type OffenseTactic } from './types';

export type Spot = { x: number; z: number };

/** 站排位：没轮到切入时站的地方。竖排 = 中线上一列；横排 = 盘前方一横排 */
export function stackSpot(tactic: OffenseTactic, slot: number, ref: Spot, dirOff: Dir, out: THREE.Vector3): THREE.Vector3 {
  const h = handlerCount(tactic);
  if (slot < h) return handlerSpot(tactic, slot, ref, dirOff, out);
  const cutters = Math.max(1, TEAM_SIZE - h);
  const c = slot - h;
  if (tactic === 'vstack') {
    out.set(
      THREE.MathUtils.clamp(ref.x * 0.25, -(FIELD_HALF_W - 1.5), FIELD_HALF_W - 1.5),
      0,
      THREE.MathUtils.clamp(ref.z + dirOff * (9 + c * 3), -(END_Z - 2), END_Z - 2),
    );
  } else {
    const lane = cutters === 1 ? 0 : (c / (cutters - 1)) * 2 - 1;
    out.set(
      THREE.MathUtils.clamp(lane * (FIELD_HALF_W - 4), -(FIELD_HALF_W - 1.5), FIELD_HALF_W - 1.5),
      0,
      THREE.MathUtils.clamp(ref.z + dirOff * 12, -(END_Z - 2), END_Z - 2),
    );
  }
  return out;
}

/** 现在轮到哪个切入者切：竖排一次一个，横排一次两个（一内一外）。每 2.6 秒轮换 */
export function isActiveCutter(tactic: OffenseTactic, slot: number, time: number): boolean {
  const h = handlerCount(tactic);
  if (slot < h) return false;
  const cutters = Math.max(1, TEAM_SIZE - h);
  const c = slot - h;
  const turn = Math.floor(time / 2.6);
  if (tactic === 'vstack') return c === turn % cutters;
  const half = Math.ceil(cutters / 2);
  return c === turn % half || c === half + (turn % Math.max(1, cutters - half));
}

/** 进攻战术里第 slot 个人此刻该去的位置（AI 跑位和玩家引导标共用） */
export function offenseGoal(tactic: OffenseTactic, slot: number, ref: Spot, dirOff: Dir, time: number, out: THREE.Vector3): THREE.Vector3 {
  return isActiveCutter(tactic, slot, time)
    ? cutTarget(tactic, slot, ref, dirOff, out)
    : stackSpot(tactic, slot, ref, dirOff, out);
}

/** 区域防守（3-2-2）：盯持盘者的人是杯尖，其余 count 个守区的人里第 index 个该站在哪。
 *  前 2 个 = 杯形两翼（离持盘者 4m 以上，不会被判双防），接着一层中场，最后一层深防；整体跟着盘移动。 */
export function zoneAnchor(index: number, count: number, ref: Spot, dirOff: Dir, out: THREE.Vector3): THREE.Vector3 {
  const halfW = FIELD_HALF_W;
  let x: number;
  let depth: number; // 相对盘、朝进攻方向的纵深（米）
  if (index < 2) {
    x = ref.x + (index === 0 ? -3.4 : 3.4);
    depth = 2.6;
  } else {
    const rest = Math.max(1, count - 2);
    const midN = Math.ceil(rest / 2);
    const i2 = index - 2;
    if (i2 < midN) {
      const k = midN === 1 ? 0 : (i2 / (midN - 1)) * 2 - 1;
      x = k * (halfW - 5) * 0.8 + ref.x * 0.3;
      depth = 9;
    } else {
      const dN = Math.max(1, rest - midN);
      const k = dN === 1 ? 0 : ((i2 - midN) / (dN - 1)) * 2 - 1;
      x = k * (halfW - 7) + ref.x * 0.2;
      depth = 17;
    }
  }
  out.set(
    THREE.MathUtils.clamp(x, -(halfW - 1), halfW - 1),
    0,
    THREE.MathUtils.clamp(ref.z + dirOff * depth, -(END_Z - 1.5), END_Z - 1.5),
  );
  return out;
}

/** 进攻阵型里有几个持盘手（handler）：竖排 2 个，横排 3 个；slot < handlerCount 的人是持盘手 */
export function handlerCount(tactic: OffenseTactic): number {
  return Math.min(TEAM_SIZE - 1, tactic === 'hstack' ? 3 : 2);
}

/** 持盘手的接应位：在盘的侧后方拉开（reset / swing 的位置） */
export function handlerSpot(tactic: OffenseTactic, slot: number, ref: Spot, dirOff: Dir, out: THREE.Vector3): THREE.Vector3 {
  const h = handlerCount(tactic);
  const k = h <= 1 ? 1 : (slot / (h - 1)) * 2 - 1; // -1..1
  const side = k === 0 ? (ref.x > 0 ? -1 : 1) : Math.sign(k);
  out.set(
    THREE.MathUtils.clamp(ref.x + side * (5 + Math.abs(k) * 3), -(FIELD_HALF_W - 1.5), FIELD_HALF_W - 1.5),
    0,
    THREE.MathUtils.clamp(ref.z - dirOff * (k === 0 ? 5 : 2.5), -(END_Z - 2), END_Z - 2),
  );
  return out;
}

/** 玩家在当前进攻战术里该去的切入点（给紫色引导标用）。ref = 持盘者位置 */
export function cutTarget(tactic: OffenseTactic, slot: number, ref: Spot, dirOff: Dir, out: THREE.Vector3): THREE.Vector3 {
  const h = handlerCount(tactic);
  if (slot < h) return handlerSpot(tactic, slot, ref, dirOff, out);
  const cutters = Math.max(1, TEAM_SIZE - h);
  const c = slot - h; // 切入者序号 0..cutters-1
  if (tactic === 'vstack') {
    // 竖排：队列站在盘前方的中线上；前一半切近（under），后一半切深，左右交替走开放侧
    const side = c % 2 === 0 ? 1 : -1;
    const deep = c >= Math.ceil(cutters / 2);
    out.set(
      THREE.MathUtils.clamp(side * (deep ? FIELD_HALF_W * 0.45 : 6 + c), -(FIELD_HALF_W - 1.5), FIELD_HALF_W - 1.5),
      0,
      THREE.MathUtils.clamp(ref.z + dirOff * (deep ? 16 + c * 2 : 6 + c * 1.5), -(END_Z - 2), END_Z - 2),
    );
  } else {
    // 横排：切入者横着占满场宽，外侧的人切深、里侧的人近切
    const lane = cutters === 1 ? 0 : (c / (cutters - 1)) * 2 - 1; // -1..1
    const outside = Math.abs(lane) > 0.5;
    out.set(
      THREE.MathUtils.clamp(lane * (FIELD_HALF_W - 3), -(FIELD_HALF_W - 1.5), FIELD_HALF_W - 1.5),
      0,
      THREE.MathUtils.clamp(ref.z + dirOff * (outside ? 18 : 9), -(END_Z - 2), END_Z - 2),
    );
  }
  return out;
}
