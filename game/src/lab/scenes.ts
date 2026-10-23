/* 战术实验室的场景数据。坐标单位：米。场地窗口 37m × 64m，进攻方向向上（y 增大），
 * 得分线在 y = 46，往上是 18m 得分区。每个场景 7 打 7：进攻 o1–o7，防守 d1–d7。 */
export type Pt = [number, number];
export type SceneId = 'vstack' | 'hstack' | 'man' | 'zone' | 'cup';

export interface Beat {
  moves?: Record<string, Pt>; // 这一步里要移动的人（其余人原地不动）
  throw?: { from: string; to: string }; // 这一步里的传盘
  lines?: { from: string; to: string; kind: 'blocked' | 'open' }[]; // 这一步的标注线
}

export interface Scene {
  id: SceneId;
  group: 'offense' | 'defense';
  codexId: string;
  base: Record<string, Pt>;
  holder: string; // 开始时持盘的人
  beats: Beat[];
  marks: boolean; // 是否画"盯人关系"线（d_i — o_i）
  zones: boolean; // 是否画每个防守者的防守区域
  quiz: { options: string[]; correct: string[] };
}

export const FIELD_W = 37;
export const FIELD_H = 64;
export const GOAL_Y = 46;
export const ZONE_RADIUS = 6.5;

function team(prefix: 'o' | 'd', pts: Pt[]): Record<string, Pt> {
  return Object.fromEntries(pts.map((p, i) => [`${prefix}${i + 1}`, p]));
}

export const SCENES: Scene[] = [
  {
    id: 'vstack',
    group: 'offense',
    codexId: 'vstack',
    base: {
      ...team('o', [[14, 10], [24, 9], [18.5, 20], [18.5, 24], [18.5, 28], [18.5, 32], [18.5, 36]]),
      ...team('d', [[13, 11], [24.5, 10.8], [19.8, 21.6], [19.8, 25.6], [19.8, 29.6], [19.8, 33.6], [19.8, 37.6]]),
    },
    holder: 'o1',
    beats: [
      {},
      { moves: { o3: [26, 15], d3: [27.2, 16.5] } },
      { throw: { from: 'o1', to: 'o3' } },
      { moves: { o4: [9, 38], d4: [10.5, 34.8] } },
    ],
    marks: true,
    zones: false,
    quiz: { options: ['o4', 'o5', 'o6', 'o7'], correct: ['o4'] },
  },
  {
    id: 'hstack',
    group: 'offense',
    codexId: 'hstack',
    base: {
      ...team('o', [[18, 9], [10, 8], [27, 8], [5, 24], [14, 24], [23, 24], [32, 24]]),
      ...team('d', [[16.6, 10.8], [10.6, 9.8], [27.6, 9.8], [6, 25.6], [15, 25.6], [24, 25.6], [33, 25.6]]),
    },
    holder: 'o1',
    beats: [
      {},
      { moves: { o7: [32, 40], d7: [33.2, 36.5] } },
      { moves: { o5: [14, 15], d5: [15, 16.5] }, throw: { from: 'o1', to: 'o5' } },
    ],
    marks: true,
    zones: false,
    quiz: { options: ['o4', 'o6', 'o7'], correct: ['o7'] },
  },
  {
    id: 'man',
    group: 'defense',
    codexId: 'man',
    base: {
      ...team('o', [[18, 12], [29, 10], [7, 10], [27, 25], [9, 28], [18, 34], [10, 42]]),
      ...team('d', [[16.6, 13.4], [29.8, 11.8], [7.8, 11.8], [28, 26.6], [9.8, 29.6], [18.8, 35.6], [10.8, 43.6]]),
    },
    holder: 'o1',
    beats: [
      {},
      { moves: { o4: [24, 19], d4: [24.8, 20.4] } },
      { moves: { o4: [31, 40], d4: [29.4, 35.6] } },
    ],
    marks: true,
    zones: false,
    quiz: { options: ['o2', 'o3', 'o4', 'o5', 'o6', 'o7'], correct: ['o4'] },
  },
  {
    id: 'zone',
    group: 'defense',
    codexId: 'zone-d',
    base: {
      ...team('o', [[18.5, 10], [8, 9], [29, 9], [14.5, 17.5], [31, 24], [14, 33], [17.5, 46.5]]),
      ...team('d', [[13, 19], [18.5, 21], [24, 19], [8, 31], [29, 31], [13, 45], [24, 45]]),
    },
    holder: 'o1',
    beats: [
      {},
      {
        moves: { d1: [16, 19], d2: [23.5, 21], d3: [29, 19], d4: [13, 31], d5: [33, 31], d6: [17, 45], d7: [29, 45] },
        throw: { from: 'o1', to: 'o3' },
      },
      { moves: { o5: [24, 38] } },
    ],
    marks: false,
    zones: true,
    quiz: { options: ['o4', 'o5', 'o6', 'o7'], correct: ['o5'] },
  },
  {
    id: 'cup',
    group: 'defense',
    codexId: 'cup',
    base: {
      ...team('o', [[18.5, 10], [5, 11], [32, 11], [18.5, 28], [14, 45], [33, 24], [23, 46]]),
      ...team('d', [[18.5, 20], [11, 17], [26, 17], [10, 32], [27, 33], [13, 44], [24, 44]]),
    },
    holder: 'o1',
    beats: [
      {},
      { lines: [{ from: 'o1', to: 'o4', kind: 'blocked' }] },
      {
        moves: { d1: [27, 19], d2: [23.5, 14], d3: [32.5, 20], d4: [17.5, 29.5] },
        throw: { from: 'o1', to: 'o3' },
      },
      { moves: { o6: [34.5, 31], d5: [26, 33] } },
    ],
    marks: false,
    zones: false,
    quiz: { options: ['o4', 'o5', 'o6', 'o7'], correct: ['o6'] },
  },
];

export interface Frames {
  starts: Record<string, Pt>[]; // 每一步开始时的站位
  ends: Record<string, Pt>[]; // 每一步结束时的站位
  holders: string[]; // 每一步开始时谁持盘
}

export function buildFrames(scene: Scene): Frames {
  const starts: Record<string, Pt>[] = [];
  const ends: Record<string, Pt>[] = [];
  const holders: string[] = [];
  let cur: Record<string, Pt> = { ...scene.base };
  let holder = scene.holder;
  for (const b of scene.beats) {
    starts.push(cur);
    holders.push(holder);
    cur = { ...cur, ...(b.moves ?? {}) };
    ends.push(cur);
    if (b.throw) holder = b.throw.to;
  }
  return { starts, ends, holders };
}

/** 题目判定点：最后一步结束时的站位，以及此时持盘的人 */
export function decisionFrame(scene: Scene): { pos: Record<string, Pt>; holder: string } {
  const f = buildFrames(scene);
  const last = scene.beats.length - 1;
  const lastThrow = scene.beats[last].throw;
  return { pos: f.ends[last], holder: lastThrow ? lastThrow.to : f.holders[last] };
}
