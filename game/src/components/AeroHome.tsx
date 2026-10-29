'use client';
import { useState } from 'react';
import GlassDisc from './GlassDisc';
import { useI18n } from '@/i18n/I18nProvider';
import '@/styles/aero-home.css';

export default function AeroHome({ onPlay, onLab, onCodex }: { onPlay: () => void; onLab: () => void; onCodex: () => void }) {
  const { lang, setLang } = useI18n();
  const zh = lang === 'zh';
  const [paused, setPaused] = useState(false);
  return <main className="aero-home">
    <a className="aero-skip" href="#aero-intro">{zh ? '跳至介绍' : 'Skip to introduction'}</a>
    <header className="aero-header">
      <a className="aero-brand" href="#aero-top">Ultimate Field<span aria-hidden="true">↗</span></a>
      <nav aria-label={zh ? '主导航' : 'Main navigation'}>
        <button onClick={onLab}>{zh ? '战术实验室' : 'Tactics Lab'}</button>
        <button onClick={onCodex}>{zh ? '规则图鉴' : 'Rule codex'}</button>
        <button onClick={() => setLang(zh ? 'en' : 'zh')}>{zh ? 'English' : '中文'}</button>
        <button className="aero-primary" onClick={onPlay}>{zh ? '上场' : 'Play'} <span aria-hidden="true">↗</span></button>
      </nav>
    </header>
    <section className="aero-hero" id="aero-top" aria-label={zh ? '飞盘首页' : 'Ultimate Field home'}>
      <div className="aero-eyebrow"><span>ULTIMATE FIELD</span><span>01 — {zh ? '一次出手，无数可能' : 'ONE THROW. EVERY POSSIBILITY.'}</span></div>
      <GlassDisc paused={paused}/>
      <div className="aero-hero-footer">
        <p>{zh ? '一张盘，让一切开始。' : 'It starts with a disc.'}</p>
        <div><button className="aero-motion" aria-pressed={paused} onClick={() => setPaused(p => !p)}>{paused ? (zh ? '继续动效' : 'Resume motion') : (zh ? '暂停动效' : 'Pause motion')}</button><a href="#aero-intro" aria-label={zh ? '向下探索' : 'Explore below'}>↓</a></div>
      </div>
    </section>
    <section className="aero-intro" id="aero-intro">
      <span className="aero-label">{zh ? '极限飞盘' : 'THE GAME OF ULTIMATE'}</span>
      <h1>{zh ? <>接住下一种<br/>可能。</> : <>Catch what<br/>comes next.</>}</h1>
      <div className="aero-intro-side"><p>{zh ? '跑出空当，传给队友，让飞盘把所有人连在一起。从第一传，到下一分。' : 'Find the space. Make the pass. Connect through a disc. From your first throw to your next point.'}</p>
      <button className="aero-primary" onClick={onPlay}>{zh ? '进入现有游戏' : 'Enter the game'} ↗</button>
      <button className="aero-text-link" onClick={onLab}>{zh ? '先去战术实验室' : 'Explore the Tactics Lab'} →</button>
      <small>{zh ? '游戏需要电脑和鼠标，战术实验室支持触屏。' : 'Game requires a computer and mouse. Tactics Lab supports touch.'}</small></div>
    </section>
    <footer className="aero-footer"><span>Ultimate Field</span><span>{zh ? '一起上场。' : 'A little disc. A world of possibilities.'}</span></footer>
  </main>;
}
