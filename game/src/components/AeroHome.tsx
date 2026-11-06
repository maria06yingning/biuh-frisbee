'use client';

import { useState } from 'react';
import GlassDisc from './GlassDisc';
import SiteHeader from './SiteHeader';
import { useI18n } from '@/i18n/I18nProvider';
import '@/styles/aero-home.css';
import '@/styles/aero-playground.css';

export default function AeroHome({ onPlay, onLab, onCodex }: { onPlay: () => void; onLab: () => void; onCodex: () => void }) {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  const [paused, setPaused] = useState(false);
  const [replayToken, setReplayToken] = useState(0);
  const replayFlight = () => {
    setPaused(false);
    setReplayToken(value => value + 1);
  };

  return <main className="aero-home aero-playground">
    <a className="aero-skip" href="#aero-controls">{zh ? '跳至试玩控制' : 'Skip to playground controls'}</a>
    <SiteHeader onPlay={onPlay} onLab={onLab} onCodex={onCodex} />
    <section className="aero-hero" id="aero-top" aria-label={zh ? '晴空飞盘游乐场' : 'The sunny disc playground'}>
      <GlassDisc paused={paused} replayToken={replayToken} />
      <div className="aero-playground-caption" aria-hidden="true">
        <span className="aero-caption-dot" />
        {zh ? '一张盘，无数可能。' : 'A little disc. Every possibility.'}
      </div>
      <div className="aero-playground-controls" id="aero-controls" tabIndex={-1} role="group" aria-label={zh ? '飞盘试玩控制' : 'Disc playground controls'}>
        <button className="aero-play-control" type="button" onClick={replayFlight}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1.2 7M4 4v6h6" /></svg>
          <span>{zh ? '再飞一次' : 'Replay'}</span>
        </button>
        <button className="aero-play-control aero-play-control-pause" type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{paused ? <path d="m9 5 10 7-10 7Z" /> : <><path d="M8 5v14" /><path d="M16 5v14" /></>}</svg>
          <span>{paused ? (zh ? '继续动效' : 'Resume') : (zh ? '暂停动效' : 'Pause')}</span>
        </button>
      </div>
    </section>
  </main>;
}
