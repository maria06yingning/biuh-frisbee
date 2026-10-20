/* 规则图鉴：条目、解锁条件。正文在 i18n/dict.ts 的 tip.<tipKey>.t / .x */
export interface CodexEntry {
  id: string;
  tipKey: string; // 对应 dict 里的 tip.<tipKey>.t / .x
}

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
];

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
