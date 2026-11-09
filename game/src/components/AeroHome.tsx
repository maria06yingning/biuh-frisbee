'use client';

import { useEffect, useRef, useState } from 'react';
import type { MeadowSeason } from './meadow-season';
import GlassDisc from './GlassDisc';
import SiteHeader from './SiteHeader';
import { useI18n } from '@/i18n/I18nProvider';
import '@/styles/aero-home.css';
import '@/styles/aero-playground.css';

const SCENES: MeadowSeason[] = ['summer', 'autumn', 'winter', 'night'];

export default function AeroHome({ onPlay, onLab, onCodex }: { onPlay: () => void; onLab: () => void; onCodex: () => void }) {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  const [paused, setPaused] = useState(false);
  const [replayToken, setReplayToken] = useState(0);
  const [season, setSeason] = useState<MeadowSeason>('summer');
  const [discLanded, setDiscLanded] = useState(false);
  const [nearDisc, setNearDisc] = useState(false);
  const [pickupToken, setPickupToken] = useState(0);
  const [returnToken, setReturnToken] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  // Keep the fullscreen label correct when the user leaves with Esc.
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === heroRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void Promise.resolve(heroRef.current?.requestFullscreen?.()).catch(() => undefined);
  };

  const replayFlight = () => {
    setPaused(false);
    setReplayToken(value => value + 1);
  };

  const nextScene = () => setSeason(current => SCENES[(SCENES.indexOf(current) + 1) % SCENES.length]);

  return <main className="aero-home aero-playground">
    <a className="aero-skip" href="#aero-controls">{zh ? '跳至试玩控制' : 'Skip to playground controls'}</a>
    <SiteHeader onPlay={onPlay} onLab={onLab} onCodex={onCodex} />
    <section className="aero-hero" id="aero-top" ref={heroRef} aria-label={zh ? '晴空飞盘游乐场' : 'The sunny disc playground'}>
      <GlassDisc
        paused={paused}
        replayToken={replayToken}
        season={season}
        pickupToken={pickupToken}
        returnToken={returnToken}
        onDiscLanded={setDiscLanded}
        onNearDisc={setNearDisc}
        soundOn={soundOn}
      />

      <button className="aero-play-control aero-scene-switch" type="button" aria-label={zh ? '切换场景' : 'Switch scene'} onClick={nextScene}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4" /></svg>
        <span>{zh ? '切换场景' : 'Switch scene'}</span>
      </button>

      <button className="aero-play-control aero-fullscreen" type="button" aria-pressed={fullscreen} onClick={toggleFullscreen}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {fullscreen ? <path d="M9 4v5H4M15 4v5h5M15 20v-5h5M9 20v-5H4" /> : <path d="M4 9V4h5M20 9V4h-5M20 15v5h-5M4 15v5h5" />}
        </svg>
        <span>{fullscreen ? (zh ? '退出全屏' : 'Exit fullscreen') : (zh ? '全屏体验' : 'Fullscreen')}</span>
      </button>

      <div className="aero-playground-controls" id="aero-controls" tabIndex={-1} role="group" aria-label={zh ? '飞盘试玩控制' : 'Disc playground controls'}>
        {discLanded && nearDisc && (
          <button className="aero-play-control" type="button" onClick={() => setPickupToken(value => value + 1)}>
            <span>{zh ? '拾起飞盘' : 'Pick up'}</span>
          </button>
        )}
        {discLanded && (
          <button className="aero-play-control" type="button" onClick={() => setReturnToken(value => value + 1)}>
            <span>{zh ? '一键飞回' : 'Fly back'}</span>
          </button>
        )}
        <button className="aero-play-control" type="button" onClick={replayFlight}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1.2 7M4 4v6h6" /></svg>
          <span>{zh ? '再飞一次' : 'Replay'}</span>
        </button>
        <button className="aero-play-control" type="button" aria-pressed={soundOn} onClick={() => setSoundOn(value => !value)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{soundOn ? <path d="M4 9h4l5-4v14l-5-4H4Z M16 9c1.5 1.5 1.5 4.5 0 6 M19 6c3 3 3 9 0 12" /> : <path d="M4 9h4l5-4v14l-5-4H4Z M16 9l5 6 M21 9l-5 6" />}</svg>
          <span>{soundOn ? (zh ? '音效开' : 'Sound on') : (zh ? '音效关' : 'Sound off')}</span>
        </button>
        <button className="aero-play-control aero-play-control-pause" type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{paused ? <path d="m9 5 10 7-10 7Z" /> : <><path d="M8 5v14" /><path d="M16 5v14" /></>}</svg>
          <span>{paused ? (zh ? '继续动效' : 'Resume') : (zh ? '暂停动效' : 'Pause')}</span>
        </button>
      </div>
    </section>
  </main>;
}
