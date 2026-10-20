/* 概率模型：所有"成功率"都集中在这里。
 *
 * 为什么用逻辑斯蒂（logit）空间相加，而不是直接乘 / 加概率？
 *  1. 不管叠多少个因素（假动作 + 跨步 + 出手方式 + 技术），结果永远落在 (0, 1) 内，不会出现 >100% 或 <0%。
 *  2. 每个因素的含义是"让胜算（odds）乘以多少倍"：exp(-1.7) ≈ 0.18，即假动作把盯防者碰到盘的胜算降到约 1/5。
 *  3. 调参有锚点：先定"基准概率"（正对盯防者、没任何技巧），再逐项加偏移，最后用 scripts/calibrate.ts 校准。
 */
export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));
export const logit = (p: number): number => Math.log(p / (1 - p));

export const BLOCK_BASE = 0.62; // 正对盯防者、没有任何技巧时，他碰到盘的概率
export const BLOCK_DECAY = 3.6; // 传球线每偏离盯防者 1 米，logit 下降多少
export const BITE_BASE = 0.72; // 假动作让盯防者上当的基准概率

export interface BlockParams {
  perp: number; // 盯防者离传球线的垂直距离（米）。跨步会改变它
  bite: boolean; // 盯防者刚被假动作骗到
  skill: number; // 盯防者技术 0.88–1.0
  protectedType: boolean | null; // 出手方式是否背向盯防者：true 更安全，false 更危险，null = 不适用
  level?: number; // 难度偏移（>0 更难），为以后的难度选项预留
}

export function markerBlockProb(b: BlockParams): number {
  if (b.perp >= 1.0) return 0; // 离线路 1m 以外：碰不到
  let z = logit(BLOCK_BASE) - BLOCK_DECAY * b.perp;
  if (b.bite) z -= 1.7; // 被假动作骗到：胜算 ×0.18
  if (b.protectedType === true) z -= 0.6; // 背向盯防者出手：胜算 ×0.55
  else if (b.protectedType === false) z += 0.45; // 迎着盯防者出手：胜算 ×1.57
  z += (b.skill - 0.94) * 8 + (b.level ?? 0);
  return sigmoid(z);
}

/** 假动作骗到盯防者的概率：技术越好越难骗，4 秒内每多一次假动作就更难骗 */
export function biteProb(skill: number, recentFakes: number): number {
  return sigmoid(logit(BITE_BASE) + (0.94 - skill) * 6 - 0.9 * recentFakes);
}

/** 出手误差（弧度）：反手最顺手；越接近数秒上限、过猛 / 过软、仰角怪、跨步时失去平衡，误差越大 */
export function releaseNoise(o: {
  type: 'backhand' | 'forehand';
  stall: number;
  power: number;
  pitch: number;
  stepOff: number;
}): number {
  let n = 0.012 + (o.type === 'forehand' ? 0.004 : 0);
  n += 0.07 * Math.max(0, (o.stall - 7) / 3);
  if (o.power > 0.95) n += 0.03;
  if (o.power < 0.15) n += 0.02;
  if (o.pitch > 0.6 || o.pitch < -0.12) n += 0.03;
  n += 0.012 * Math.min(1, Math.abs(o.stepOff));
  return n;
}
