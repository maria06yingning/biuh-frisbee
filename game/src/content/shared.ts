// Shared helpers for the four content pages (Rules / Fouls / Spirit / Why).
// Same [zh, en] tuple convention as i18n/dict.ts, but kept next to the long-form
// page copy so each page stays readable. UI chrome (header/footer) still reads
// the global i18n so language stays in sync with the game and homepage.
import type { Lang } from '@/i18n/dict';

export type Bi = [zh: string, en: string];
export const pick = (lang: Lang, b: Bi): string => (lang === 'zh' ? b[0] : b[1]);

/**
 * Deploy base path. Empty in local dev; "/<repo>" on a GitHub Pages project site
 * (see next.config.mjs). next/link applies this automatically — plain <a href>
 * does not, so those few links go through withBase().
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const withBase = (path: string): string => `${BASE_PATH}${path}`;

/** The four content pages, in reading order. Used by the nav and the "next page" footer. */
export interface PageLink {
  slug: '/rules' | '/fouls' | '/spirit' | '/why';
  num: string;
  label: Bi;
  tagline: Bi;
}

export const PAGES: PageLink[] = [
  {
    slug: '/rules',
    num: '02',
    label: ['规则', 'Rules'],
    tagline: ['一张盘怎么变成一场比赛', 'How one disc becomes a game'],
  },
  {
    slug: '/fouls',
    num: '03',
    label: ['犯规', 'Fouls'],
    tagline: ['没有裁判，怎么判', 'No referees — so who decides'],
  },
  {
    slug: '/spirit',
    num: '04',
    label: ['飞盘精神', 'Spirit'],
    tagline: ['规则共享，责任在你', 'The rules are shared, the responsibility is yours'],
  },
  {
    slug: '/why',
    num: '05',
    label: ['为何热爱', 'Why we love it'],
    tagline: ['不只是一项运动', 'More than a sport'],
  },
];
