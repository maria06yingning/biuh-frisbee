/* 校验战术实验室的题目：正确答案必须"真的空"，错误选项必须"真的被盯着"，并且所有人都在场内。
 * 运行：npm run check-lab */
import { FIELD_H, FIELD_W, SCENES, buildFrames, decisionFrame } from '../src/lab/scenes';

const OPEN_MIN = 3.0; // 正确答案到最近防守者至少这么远（米）
const COVERED_MAX = 2.3; // 错误选项到最近防守者至多这么近
let bad = 0;
const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

for (const sc of SCENES) {
  const f = buildFrames(sc);
  // 1. 所有帧都在场内，同队队员不重叠
  for (const frame of [sc.base, ...f.ends]) {
    for (const [id, p] of Object.entries(frame)) {
      if (p[0] < 0.5 || p[0] > FIELD_W - 0.5 || p[1] < 0.5 || p[1] > FIELD_H - 0.5) {
        console.log(`✗ ${sc.id}: ${id} 出界 (${p})`);
        bad++;
      }
    }
    const ids = Object.keys(frame);
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++)
        if (ids[i][0] === ids[j][0] && dist(frame[ids[i]], frame[ids[j]]) < 1.2) {
          console.log(`✗ ${sc.id}: ${ids[i]} 和 ${ids[j]} 重叠`);
          bad++;
        }
  }
  // 2. 题目判定
  const { pos, holder } = decisionFrame(sc);
  const defs = Object.keys(pos).filter((k) => k[0] === 'd');
  const report: string[] = [];
  for (const o of sc.quiz.options) {
    const near = Math.min(...defs.map((d) => dist(pos[o], pos[d])));
    const isCorrect = sc.quiz.correct.includes(o);
    const ok = isCorrect ? near >= OPEN_MIN : near <= COVERED_MAX;
    report.push(`${o}:${near.toFixed(1)}m${isCorrect ? '(答案)' : ''}${ok ? '' : ' ✗'}`);
    if (!ok) bad++;
  }
  if (sc.quiz.options.includes(holder)) {
    console.log(`✗ ${sc.id}: 持盘者 ${holder} 不该出现在选项里`);
    bad++;
  }
  console.log(`${sc.id.padEnd(7)} 持盘 ${holder}  ${report.join('  ')}`);
}
console.log(bad === 0 ? '\n✓ 全部通过' : `\n✗ ${bad} 个问题`);
process.exit(bad === 0 ? 0 : 1);
