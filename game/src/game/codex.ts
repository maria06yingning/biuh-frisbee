/* 规则图鉴：条目、解锁条件。正文在 i18n/dict.ts 的 tip.<tipKey>.t / .x */
export interface CodexEntry {
  id: string;
  tipKey: string; // 对应 dict 里的 tip.<tipKey>.t / .x
  lab?: string; // 战术实验室条目：标题 / 正文来自 lab.<lab>.name / lab.<lab>.use
}

export const titleKey = (e: CodexEntry): string => (e.lab ? `lab.${e.lab}.name` : `tip.${e.tipKey}.t`);
export const textKey = (e: CodexEntry): string => (e.lab ? `lab.${e.lab}.use` : `tip.${e.tipKey}.x`);

export const CODEX: CodexEntry[] = [
  { id: 'pull', tipKey: 'pull' },
  { id: 'stall', tipKey: 'stall' },
  { id: 'pivot', tipKey: 'pivot' },
  { id: 'stepout', tipKey: 'stepout' },
  { id: 'fake', tipKey: 'fake' },
  { id: 'marker', tipKey: 'marker' },
  { id: 'force', tipKey: 'force' },
  { id: 'throws', tipKey: 'throws' },
  { id: 'double', tipKey: 'double-opp' },
  { id: 'travel', tipKey: 'travel' },
  { id: 'contact', tipKey: 'contact' },
  { id: 'zone', tipKey: 'zone' },
  { id: 'turnover', tipKey: 'turnover' },
  { id: 'spirit', tipKey: 'spirit' },
  { id: 'vstack', tipKey: '', lab: 'vstack' },
  { id: 'hstack', tipKey: '', lab: 'hstack' },
  { id: 'man', tipKey: '', lab: 'man' },
  { id: 'zone-d', tipKey: '', lab: 'zone' },
  { id: 'cup', tipKey: '', lab: 'cup' },
];

const STORE_KEY = 'ufo-codex-v1';

export function loadUnlocked(): string[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** 解锁一条；如果是新解锁的返回 true */
export function addUnlocked(id: string): boolean {
  const cur = loadUnlocked();
  if (cur.includes(id)) return false;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify([...cur, id]));
  } catch {
    /* ignore */
  }
  return true;
}

/** 规则提示卡 key → 它解锁的图鉴条目 */
const TIP_TO_CODEX: Record<string, string> = {
  pull: 'pull',
  'pull-team': 'pull',
  receive: 'pull',
  stall: 'stall',
  pivot: 'pivot',
  stepout: 'stepout',
  fake: 'fake',
  marker: 'marker',
  lane: 'marker',
  'lane-marker': 'marker',
  force: 'force',
  throws: 'throws',
  'double-opp': 'double',
  'double-mine': 'double',
  'miss-double': 'double',
  travel: 'travel',
  'miss-travel': 'travel',
  contact: 'contact',
  'miss-contact': 'contact',
  'miss-self-contact': 'contact',
  'self-contact-now': 'contact',
  zone: 'zone',
  zoneTO: 'zone',
  turnover: 'turnover',
  spirit: 'spirit',
};

export function codexIdForTip(tipKey: string): string | undefined {
  return TIP_TO_CODEX[tipKey];
}
