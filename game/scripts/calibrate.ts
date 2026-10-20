/* 校准脚本：npm run calibrate
 * 用 Monte Carlo 估计"盯防者碰到盘"的概率，检查各因素组合是否落在预期范围。
 * 盯防者站位与游戏里一致：持盘者面前约 0.95m，向一侧偏 0.5m（逼向）。
 */
import { biteProb, markerBlockProb } from '../src/game/prob';

const N = 20000;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

interface Case {
  name: string;
  angleDeg: number; // 传球方向相对"正前方"偏向 开放侧(+) / 封锁侧(-) 的角度
  fake: boolean;
  step: boolean; // 向开放侧跨步 0.6m
  protectedType: boolean;
}

function run(c: Case): number {
  let hit = 0;
  for (let i = 0; i < N; i++) {
    const skill = rnd(0.88, 1.0);
    // 坐标：持盘者在原点，面向 +y；盯防者在封锁侧（x = -0.5），前方 0.95m
    const mx = -0.5;
    const my = 0.95;
    const ox = c.step ? 0.6 : 0; // 跨步：出手点向开放侧（+x）移动
    const a = (c.angleDeg * Math.PI) / 180;
    const ux = Math.sin(a);
    const uy = Math.cos(a);
    const rx = mx - ox;
    const ry = my;
    const perp = Math.abs(rx * uy - ry * ux);
    const bite = c.fake && Math.random() < biteProb(skill, 0);
    if (Math.random() < markerBlockProb({ perp, bite, skill, protectedType: c.protectedType })) hit++;
  }
  return hit / N;
}

const cases: Case[] = [
  { name: '正前方，无技巧，迎着盯防者出手', angleDeg: -15, fake: false, step: false, protectedType: false },
  { name: '正前方，无技巧，背向盯防者出手', angleDeg: -15, fake: false, step: false, protectedType: true },
  { name: '朝开放侧 30°，背向盯防者', angleDeg: 30, fake: false, step: false, protectedType: true },
  { name: '朝开放侧 60°（侧传），背向盯防者', angleDeg: 60, fake: false, step: false, protectedType: true },
  { name: '朝封锁侧 30°（break 传球），迎着盯防者', angleDeg: -30, fake: false, step: false, protectedType: false },
  { name: '正前方 + 假动作', angleDeg: -15, fake: true, step: false, protectedType: false },
  { name: '正前方 + 跨步', angleDeg: -15, fake: false, step: true, protectedType: false },
  { name: '正前方 + 假动作 + 跨步 + 背向出手', angleDeg: -15, fake: true, step: true, protectedType: true },
];

console.log('盯防者碰到盘的概率（Monte Carlo，每行 %d 次）\n', N);
for (const c of cases) {
  const p = run(c);
  console.log(`${(p * 100).toFixed(1).padStart(5)}%   传球完成率 ${((1 - p) * 100).toFixed(1).padStart(5)}%   ${c.name}`);
}
console.log('\n假动作骗到盯防者的概率：');
for (const k of [0, 1, 2, 3]) {
  let s = 0;
  for (let i = 0; i < N; i++) s += biteProb(rnd(0.88, 1.0), k);
  console.log(`  4 秒内已假动作 ${k} 次 → 上当概率 ${((s / N) * 100).toFixed(1)}%`);
}
