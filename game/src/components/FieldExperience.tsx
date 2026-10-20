'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameHandle } from '@/game/createGame';
import type { HudState } from '@/game/types';
import { CODEX, codexIdForTip } from '@/game/codex';
import { useI18n } from '@/i18n/I18nProvider';
import CodexPanel from './CodexPanel';
import GameHUD, { type TipItem, type ToastItem } from './GameHUD';
import PauseMenu, { type PauseResult } from './PauseMenu';

type UI = 'loading' | 'ready' | 'playing' | 'paused' | 'over' | 'touch' | 'error';
const CODEX_KEY = 'ufo-codex-v1';

export function loadUnlocked(): string[] {
  try {
    const raw = localStorage.getItem(CODEX_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export default function FieldExperience({ onExit }: { onExit: () => void }) {
  const { t } = useI18n();
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const toastTimer = useRef<number>(0);
  const toastId = useRef(0);
  const tipId = useRef(0);
  const tipTimers = useRef<number[]>([]);
  const unlockedRef = useRef<string[]>([]);
  const bannerTimer = useRef<number>(0);

  const [ui, setUi] = useState<UI>('loading');
  const [hud, setHud] = useState<HudState | null>(null);
  const [toast, setToast] = useState<ToastItem | null>(null);
  const [tips, setTips] = useState<TipItem[]>([]);
  const [result, setResult] = useState<PauseResult | null>(null);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [banner, setBanner] = useState<string | null>(null); // 刚解锁的图鉴条目 id
  const [showCodex, setShowCodex] = useState(false);

  const unlock = useCallback((id: string | undefined) => {
    if (!id || unlockedRef.current.includes(id)) return;
    unlockedRef.current = [...unlockedRef.current, id];
    setUnlocked(unlockedRef.current);
    try {
      localStorage.setItem(CODEX_KEY, JSON.stringify(unlockedRef.current));
    } catch {
      /* ignore */
    }
    setBanner(id);
    window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(null), 3500);
  }, []);

  useEffect(() => {
    unlockedRef.current = loadUnlocked();
    setUnlocked(unlockedRef.current);

    // 触屏设备：提示换电脑
    if (window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches) {
      setUi('touch');
      return;
    }
    const el = mountRef.current;
    if (!el) return;

    let disposed = false;
    let offs: Array<() => void> = [];

    import('@/game/createGame')
      .then(({ createGame }) => {
        if (disposed) return;
        const game = createGame(el);
        gameRef.current = game;
        if (new URLSearchParams(window.location.search).has('debug')) {
          (window as unknown as { __ufo?: unknown }).__ufo = game.debug;
        }
        offs = [
          game.bus.on('hud', setHud),
          game.bus.on('toast', (tp) => {
            window.clearTimeout(toastTimer.current);
            toastId.current += 1;
            setToast({ ...tp, id: toastId.current });
            toastTimer.current = window.setTimeout(() => setToast(null), 2800);
          }),
          game.bus.on('tip', (tp) => {
            tipId.current += 1;
            const id = tipId.current;
            // 同一条提醒不重复堆叠，最多同时显示 2 条，8 秒后自动消失
            setTips((prev) => [...prev.filter((x) => x.key !== tp.key), { ...tp, id }].slice(-2));
            tipTimers.current.push(window.setTimeout(() => setTips((prev) => prev.filter((x) => x.id !== id)), 8000));
            unlock(codexIdForTip(tp.key));
          }),
          game.bus.on('codex', (c) => unlock(c.id)),
          game.bus.on('pause', () => setUi('paused')),
          game.bus.on('resume', () => setUi('playing')),
          game.bus.on('gameover', (r) => {
            setResult(r);
            setUi('over');
          }),
        ];
        setUi('ready');
      })
      .catch((err) => {
        console.error(err);
        if (!disposed) setUi('error');
      });

    return () => {
      disposed = true;
      offs.forEach((off) => off());
      window.clearTimeout(toastTimer.current);
      window.clearTimeout(bannerTimer.current);
      tipTimers.current.forEach((x) => window.clearTimeout(x));
      tipTimers.current = [];
      gameRef.current?.dispose();
      gameRef.current = null;
    };
  }, [unlock]);

  const handleStart = useCallback(() => gameRef.current?.requestLock(), []);
  const handleRestart = useCallback(() => {
    setResult(null);
    setToast(null);
    setTips([]);
    gameRef.current?.restart();
    gameRef.current?.requestLock();
  }, []);

  const bannerEntry = banner ? CODEX.find((e) => e.id === banner) : null;

  return (
    <div className="exp-root">
      <div ref={mountRef} className="exp-canvas" />
      <div className="exp-halftone" />

      {hud && (ui === 'playing' || ui === 'paused' || ui === 'over') && <GameHUD hud={hud} toast={toast} tips={tips} />}

      {bannerEntry && (ui === 'playing' || ui === 'paused') && (
        <div className="exp-unlock">{t('exp.unlocked', { name: t(`tip.${bannerEntry.tipKey}.t`) })}</div>
      )}

      {ui === 'loading' && <div className="exp-card">{t('exp.loading')}</div>}
      {ui === 'touch' && (
        <div className="exp-card">
          <h2>{t('exp.touch.t')}</h2>
          <p>{t('exp.touch.d')}</p>
          <button className="btn btn-primary" onClick={onExit}>
            {t('exp.back')}
          </button>
        </div>
      )}
      {ui === 'error' && (
        <div className="exp-card">
          <h2>{t('exp.err.t')}</h2>
          <p>{t('exp.err.d')}</p>
          <button className="btn btn-primary" onClick={onExit}>
            {t('exp.back')}
          </button>
        </div>
      )}

      {(ui === 'ready' || ui === 'paused' || ui === 'over') && !showCodex && (
        <PauseMenu
          mode={ui === 'ready' ? 'start' : ui === 'paused' ? 'paused' : 'over'}
          result={result}
          onResume={handleStart}
          onRestart={handleRestart}
          onExit={onExit}
          onCodex={() => setShowCodex(true)}
        />
      )}
      {showCodex && <CodexPanel unlocked={unlocked} onClose={() => setShowCodex(false)} />}
    </div>
  );
}
