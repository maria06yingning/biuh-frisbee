'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

// three.js 只在浏览器里加载
const FieldExperience = dynamic(() => import('@/components/FieldExperience'), {
  ssr: false,
  loading: () => (
    <div className="exp-root">
      <div className="exp-card">正在铺草坪…</div>
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

export default function Home() {
  const [playing, setPlaying] = useState(false);
  if (playing) return <FieldExperience onExit={() => setPlaying(false)} />;

  return (
    <main className="home">
      <section className="home-hero">
        <div className="home-hero-text">
          <span className="home-tag">第一人称 · 3 对 3</span>
          <h1>
            没碰过飞盘？<br />
            <mark>先上场传几次。</mark>
          </h1>
          <p>
            对手会盯人、会拦截，队友会跑位——每一次传球都要自己判断：传给谁，什么时候传，传多远。
          </p>
          <button className="btn btn-primary btn-big" onClick={() => setPlaying(true)}>
            进入体验
          </button>
          <p className="home-note">需要电脑 + 鼠标 · 约 5 分钟一局</p>
        </div>
        <DiscArt />
      </section>

      <section className="home-rules">
        <h2>三分钟看懂规则</h2>
        <dl>
          <div className="c1">
            <dt>目标</dt>
            <dd>把盘传到对方得分区，并在区内接到它，得 1 分。</dd>
          </div>
          <div className="c2">
            <dt>持盘不能跑</dt>
            <dd>接到盘必须停下，只能转身；防守者贴上来后开始数秒，10 秒内必须传出去。</dd>
          </div>
          <div className="c3">
            <dt>什么时候换攻</dt>
            <dd>飞盘落地、被对手截走、飞出边线、持盘超时。</dd>
          </div>
          <div className="c4">
            <dt>没有身体接触</dt>
            <dd>防守靠站位和手上的功夫，不能推人、抢人。</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
