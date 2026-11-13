'use client';

import { useEffect, useRef, useState } from 'react';
import type { MeadowSeason } from './meadow-season';
import { defaultDiscColor, randomDiscColor } from './disc-palette';
import GlassDisc from './GlassDisc';
import SiteHeader from './SiteHeader';
import { useI18n } from '@/i18n/I18nProvider';
import '@/styles/aero-home.css';
import '@/styles/aero-playground.css';

const SEASONS: MeadowSeason[] = ['summer', 'autumn', 'winter', 'night'];
const SCENE_NAMES_ZH = ['原版·夏', '原版·秋', '原版·冬', '原版·夜', '星谷·夏', '星谷·秋', '星谷·冬', '星谷·夜'];
const SCENE_NAMES_EN = ['Meadow · Summer', 'Meadow · Autumn', 'Meadow · Winter', 'Meadow · Night', 'Valley · Summer', 'Valley · Autumn', 'Valley · Winter', 'Valley · Night'];

export default function AeroHome({ onPlay, onLab, onCodex }: { onPlay: () => void; onLab: () => void; onCodex: () => void }) {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  const [paused, setPaused] = useState(false);
  const [replayToken, setReplayToken] = useState(0);
  const [sceneIndex, setSceneIndex] = useState(0);
  const season = SEASONS[sceneIndex % SEASONS.length];
  const [discColor, setDiscColor] = useState(() => defaultDiscColor('summer'));
  const [discStowed, setDiscStowed] = useState(false);
  const [discLanded, setDiscLanded] = useState(false);
  const [nearDisc, setNearDisc] = useState(false);
  const [pickupToken, setPickupToken] = useState(0);
  const [returnToken, setReturnToken] = useState(0);
  const [viewResetToken, setViewResetToken] = useState(0);
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

  const nextScene = () => {
    setPaused(false);
    const nextIndex = (sceneIndex + 1) % 8;
    const nextSeason = SEASONS[nextIndex % SEASONS.length];
    setSceneIndex(nextIndex);
    setDiscColor(defaultDiscColor(nextSeason));
  };
  const randomColor = () => setDiscColor(current => randomDiscColor(season, current));

  return <main className="aero-home aero-playground">
    <a className="aero-skip" href="#aero-controls">{zh ? '跳至试玩控制' : 'Skip to playground controls'}</a>
    <SiteHeader onPlay={onPlay} onLab={onLab} onCodex={onCodex} />
    <section className="aero-hero" id="aero-top" ref={heroRef} aria-label={zh ? '晴空飞盘游乐场' : 'The sunny disc playground'}>
      <GlassDisc
        paused={paused}
        replayToken={replayToken}
        season={season}
        sceneIndex={sceneIndex}
        discColor={discColor}
        pickupToken={pickupToken}
        returnToken={returnToken}
        viewResetToken={viewResetToken}
        onDiscLanded={setDiscLanded}
        onNearDisc={setNearDisc}
        discStowed={discStowed}
        onDiscStowedChange={setDiscStowed}
        soundOn={soundOn}
      />

      <button className="aero-play-control aero-scene-switch" type="button"
        aria-label={zh ? `当前场景：${SCENE_NAMES_ZH[sceneIndex]}，第 ${sceneIndex + 1}/8 个。点击切换` : `Current scene: ${SCENE_NAMES_EN[sceneIndex]}, ${sceneIndex + 1} of 8. Click to switch`}
        onPointerDown={() => {
          const nextIndex = (sceneIndex + 1) % 8;
          if (nextIndex >= 4 && soundOn) window.dispatchEvent(new Event('uf-starvalley-audio-gesture'));
        }}
        onClick={nextScene}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4" /></svg>
        <span>{zh ? `场景 ${sceneIndex + 1}/8 · ${SCENE_NAMES_ZH[sceneIndex]}` : `Scene ${sceneIndex + 1}/8 · ${SCENE_NAMES_EN[sceneIndex]}`}</span>
      </button>

      <button className="aero-play-control aero-replay-reset" type="button" onClick={replayFlight} aria-label={zh ? '复位飞盘和玩家位置' : 'Reset disc and player position'}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1.2 7M4 4v6h6" /></svg>
        <span>{zh ? '复位' : 'Reset'}</span>
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
            <span>{zh ? '盘来' : 'Fly back'}</span>
          </button>
        )}
        <div className="aero-control-pair">
          <button className="aero-play-control aero-view-reset" type="button" onClick={() => setViewResetToken(value => value + 1)} aria-label={zh ? '将视角复位到正前方' : 'Reset view to center'}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.34-5.66L4 8.5M4 4v4.5h4.5" /></svg>
            <span>{zh ? '重置视角' : 'Reset view'}</span>
          </button>
          <button className="aero-play-control" type="button" onClick={randomColor}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l10 10h3M17 7h3v3M4 17h3L17 7h3M4 7l3 0" /></svg>
            <span>{zh ? '随机颜色' : 'Random color'}</span>
          </button>
        </div>
        <button className="aero-play-control" type="button" onClick={() => setDiscColor(defaultDiscColor(season))}>
          <span>{zh ? '默认颜色' : 'Default'}</span>
        </button>
        <button className="aero-play-control" type="button" aria-pressed={discStowed} onClick={() => setDiscStowed(value => !value)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {discStowed ? <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" /> : <path d="M3 3l18 18M10.6 6.2A11.7 11.7 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.1 3.7M6.2 6.2C3.5 8 2 12 2 12s3.5 6 10 6c1.8 0 3.4-.5 4.8-1.2" />}
          </svg>
          <span>{discStowed ? (zh ? '显示飞盘' : 'Show disc') : (zh ? '收起飞盘' : 'Stow disc')}</span>
        </button>
        <button className="aero-play-control" type="button" aria-pressed={soundOn}
          onPointerDown={() => { if (!soundOn && sceneIndex >= 4) window.dispatchEvent(new Event('uf-starvalley-audio-gesture')); }}
          onClick={() => setSoundOn(value => !value)}>
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
