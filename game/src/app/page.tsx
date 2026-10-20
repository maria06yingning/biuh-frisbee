'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import CodexPanel from '@/components/CodexPanel';
import { useI18n } from '@/i18n/I18nProvider';

// three.js 只在浏览器里加载
const FieldExperience = dynamic(() => import('@/components/FieldExperience'), {
  ssr: false,
  loading: () => (
    <div className="exp-root">
      <div className="exp-card">…</div>
    </div>
  ),
});

function DiscArt() {
  return (
    <svg className="home-art" viewBox="0 0 360 260" aria-hidden="true">
      <g stroke="#1b1a2e" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 170 Q120 150 210 120" fill="none" stroke="#14c2d8" strokeWidth="14" />
        <path d="M30 200 Q140 185 215 140" fill="none" stroke="#ffd23f" strokeWidth="9" />
        <ellipse cx="250" cy="105" rx="82" ry="30" fill="#ffd23f" transform="rotate(-18 250 105)" />
        <ellipse cx="250" cy="100" rx="60" ry="19" fill="#ffd23f" transform="rotate(-18 250 100)" />
        <ellipse cx="250" cy="100" rx="60" ry="19" fill="none" stroke="#ff6a1a" strokeWidth="8" transform="rotate(-18 250 100)" />
      </g>
      <ellipse cx="262" cy="232" rx="60" ry="9" fill="#1b1a2e" opacity="0.25" />
    </svg>
  );
}

function readUnlocked(): string[] {
  try {
    const raw = localStorage.getItem('ufo-codex-v1');
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export default function Home() {
  const { t, lang, setLang } = useI18n();
  const [playing, setPlaying] = useState(false);
  const [codex, setCodex] = useState<string[] | null>(null);
  if (playing) return <FieldExperience onExit={() => setPlaying(false)} />;

  return (
    <main className="home">
      <nav className="home-nav">
        <button className="btn" onClick={() => setCodex(readUnlocked())}>
          {t('home.codex')}
        </button>
        <button className="btn" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>
          {t('lang.toggle')}
        </button>
      </nav>

      <section className="home-hero">
        <div className="home-hero-text">
          <span className="home-tag">{t('home.tag')}</span>
          <h1>
            {t('home.h1a')}
            <br />
            <mark>{t('home.h1b')}</mark>
          </h1>
          <p>{t('home.p')}</p>
          <button className="btn btn-primary btn-big" onClick={() => setPlaying(true)}>
            {t('home.enter')}
          </button>
          <p className="home-note">{t('home.note')}</p>
        </div>
        <DiscArt />
      </section>

      <section className="home-rules">
        <h2>{t('home.rulesTitle')}</h2>
        <dl>
          {(['r1', 'r2', 'r3', 'r4', 'r5'] as const).map((k, i) => (
            <div key={k} className={`c${(i % 4) + 1}`}>
              <dt>{t(`home.${k}.t`)}</dt>
              <dd>{t(`home.${k}.d`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {codex && <CodexPanel unlocked={codex} onClose={() => setCodex(null)} />}
    </main>
  );
}
