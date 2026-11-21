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
const HOME_GUIDE_KEY = 'ultimate-field-home-guide-seen-v1';

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [homeGuideOpen, setHomeGuideOpen] = useState(false);
  const [homeGuideReady, setHomeGuideReady] = useState(false);
  const [homeGuideStep, setHomeGuideStep] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try { setHomeGuideOpen(localStorage.getItem(HOME_GUIDE_KEY) !== '1'); }
    catch { setHomeGuideOpen(true); }
    setHomeGuideReady(true);
  }, []);

  // Keep the fullscreen label correct when the user leaves with Esc.
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === heroRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) setSettingsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false);
        settingsButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [settingsOpen]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void Promise.resolve(heroRef.current?.requestFullscreen?.()).catch(() => undefined);
  };

  const finishHomeGuide = () => {
    setHomeGuideOpen(false);
    try { localStorage.setItem(HOME_GUIDE_KEY, '1'); } catch { /* ignore */ }
  };
  const homeGuideSteps = zh ? [
    { title: '先试试这片飞盘场', body: '拖动场地空白处环顾，再点一下飞盘查看；想试传盘时，按住飞盘拖出去。' },
    { title: '场景和控制都在这里', body: '右下角设置里可以换场景、盘色，开关音效和动效，也能复位视角与飞盘。' },
    { title: '准备好正式上场了吗？', body: '点右上角「上场」进入比赛；第一次进比赛还能选择新手教程。战术实验室是进阶玩法。' },
  ] : [
    { title: 'Try the disc playground', body: 'Drag the open field to look around, tap or click the disc to inspect it, then drag the disc to try a throw.' },
    { title: 'Scene and controls live here', body: 'Use Settings at the lower right to switch scenes and disc colors, toggle sound and motion, or reset the view and disc.' },
    { title: 'Ready for a match?', body: 'Choose Play at the upper right to enter a match. The beginner tutorial is there too; Tactics Lab is for later.' },
  ];
  const replayFlight = () => {
    setPaused(false);
    setReplayToken(value => value + 1);
  };
  const resetViewAndDisc = () => {
    replayFlight();
    setViewResetToken(value => value + 1);
  };

  const nextScene = () => {
    setPaused(false);
    const nextIndex = (sceneIndex + 1) % 8;
    const nextSeason = SEASONS[nextIndex % SEASONS.length];
    setSceneIndex(nextIndex);
    setDiscColor(defaultDiscColor(nextSeason));
  };
  const randomColor = () => setDiscColor(current => randomDiscColor(season, current));

  return <main className="aero-home aero-playground" data-home-guide-step={homeGuideOpen ? homeGuideStep + 1 : undefined}>
    <a className="aero-skip" href="#aero-controls">{zh ? '跳至试玩控制' : 'Skip to playground controls'}</a>
    <SiteHeader onPlay={onPlay} onLab={onLab} onCodex={onCodex} />
    <section className="aero-hero" id="aero-top" ref={heroRef} aria-label={zh ? '晴空飞盘游乐场' : 'The sunny disc playground'}>
      <GlassDisc
        paused={paused}
        replayToken={replayToken}
        season={season}
        sceneIndex={sceneIndex}
        showIntroHint={homeGuideReady && !homeGuideOpen}
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

      {homeGuideOpen && (
        <aside className="aero-home-guide" aria-label={zh ? '首页新手引导' : 'Homepage quick guide'} aria-live="polite">
          <div className="aero-home-guide-meta">
            <span>{zh ? `新手引导 ${homeGuideStep + 1} / ${homeGuideSteps.length}` : `QUICK GUIDE ${homeGuideStep + 1} / ${homeGuideSteps.length}`}</span>
            <button className="aero-home-guide-skip" type="button" onClick={finishHomeGuide}>{zh ? '跳过' : 'Skip'}</button>
          </div>
          <h2>{homeGuideSteps[homeGuideStep].title}</h2>
          <p>{homeGuideSteps[homeGuideStep].body}</p>
          <div className="aero-home-guide-actions">
            {homeGuideStep > 0 && <button type="button" onClick={() => setHomeGuideStep(value => value - 1)}>{zh ? '上一步' : 'Back'}</button>}
            {homeGuideStep < homeGuideSteps.length - 1 ? (
              <button className="is-primary" type="button" onClick={() => setHomeGuideStep(value => value + 1)}>{zh ? '继续' : 'Next'}</button>
            ) : (
              <button className="is-primary" type="button" onClick={finishHomeGuide}>{zh ? '完成引导' : 'Finish guide'}</button>
            )}
          </div>
        </aside>
      )}

      <div className="aero-settings-wrap" id="aero-controls" ref={settingsRef}>
        {discLanded && (
          <div className="aero-context-controls" role="group" aria-label={zh ? '飞盘操作' : 'Disc actions'}>
            {nearDisc && <button className="aero-play-control" type="button" onClick={() => setPickupToken(value => value + 1)}>{zh ? '拾起飞盘' : 'Pick up'}</button>}
            <button className="aero-play-control" type="button" onClick={() => setReturnToken(value => value + 1)}>{zh ? '盘来' : 'Fly back'}</button>
          </div>
        )}
        <button
          ref={settingsButtonRef}
          className="aero-play-control aero-settings-trigger"
          type="button"
          aria-label={zh ? '设置' : 'Settings'}
          aria-expanded={settingsOpen}
          aria-controls="aero-settings-panel"
          onClick={() => setSettingsOpen(value => !value)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 1 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 1 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 1 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 1 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" transform="translate(0 1) scale(.92)"/></svg>
        </button>
        <div className="aero-settings-panel" id="aero-settings-panel" hidden={!settingsOpen} role="group" aria-label={zh ? '场景设置' : 'Scene settings'}>
            <button className="aero-play-control" type="button"
              aria-label={zh ? `当前场景：${SCENE_NAMES_ZH[sceneIndex]}，点击切换` : `Current scene: ${SCENE_NAMES_EN[sceneIndex]}, click to change`}
              onPointerDown={() => { const nextIndex = (sceneIndex + 1) % 8; if (nextIndex >= 4 && soundOn) window.dispatchEvent(new Event('uf-starvalley-audio-gesture')); }}
              onClick={nextScene}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4" /></svg>
              <span>{zh ? `场景 ${sceneIndex + 1}/8 · ${SCENE_NAMES_ZH[sceneIndex]}` : `Scene ${sceneIndex + 1}/8 · ${SCENE_NAMES_EN[sceneIndex]}`}</span>
            </button>
            <button className="aero-play-control" type="button" onClick={randomColor}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l10 10h3M17 7h3v3M4 17h3L17 7h3M4 7l3 0" /></svg>
              <span>{zh ? '随机盘色' : 'Random disc color'}</span>
            </button>
            <button className="aero-play-control" type="button" onClick={() => setDiscColor(defaultDiscColor(season))}>
              <span>{zh ? '默认盘色' : 'Default disc color'}</span>
            </button>
            <button className="aero-play-control" type="button" aria-pressed={discStowed} onClick={() => setDiscStowed(value => !value)}>
              <span>{discStowed ? (zh ? '显示飞盘' : 'Show disc') : (zh ? '收起飞盘' : 'Hide disc')}</span>
            </button>
            <button className="aero-play-control" type="button" aria-pressed={soundOn}
              onPointerDown={() => { if (!soundOn && sceneIndex >= 4) window.dispatchEvent(new Event('uf-starvalley-audio-gesture')); }}
              onClick={() => setSoundOn(value => !value)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{soundOn ? <path d="M4 9h4l5-4v14l-5-4H4Z M16 9c1.5 1.5 1.5 4.5 0 6 M19 6c3 3 3 9 0 12" /> : <path d="M4 9h4l5-4v14l-5-4H4Z M16 9l5 6 M21 9l-5 6" />}</svg>
              <span>{soundOn ? (zh ? '音效开' : 'Sound on') : (zh ? '音效关' : 'Sound off')}</span>
            </button>
            <button className="aero-play-control" type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{paused ? <path d="m9 5 10 7-10 7Z" /> : <><path d="M8 5v14" /><path d="M16 5v14" /></>}</svg>
              <span>{paused ? (zh ? '继续动效' : 'Resume motion') : (zh ? '暂停动效' : 'Pause motion')}</span>
            </button>
            <button className="aero-play-control" type="button" onClick={resetViewAndDisc}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1.2 7M4 4v6h6" /></svg>
              <span>{zh ? '复位视角与飞盘' : 'Reset view & disc'}</span>
            </button>
            <button className="aero-play-control" type="button" aria-pressed={fullscreen} onClick={toggleFullscreen}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{fullscreen ? <path d="M9 4v5H4M15 4v5h5M15 20v-5h5M9 20v-5H4" /> : <path d="M4 9V4h5M20 9V4h-5M20 15v5h-5M4 15v5h5" />}</svg>
              <span>{fullscreen ? (zh ? '退出全屏' : 'Exit fullscreen') : (zh ? '全屏体验' : 'Fullscreen')}</span>
            </button>
        </div>
      </div>
    </section>
  </main>;
}
