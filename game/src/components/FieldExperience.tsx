'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameHandle } from '@/game/createGame';
import type { HudState, MatchConfig } from '@/game/types';
import { CODEX, codexIdForTip, titleKey } from '@/game/codex';
import { useI18n } from '@/i18n/I18nProvider';
import CodexPanel from './CodexPanel';
import GameHUD, { type TipItem, type ToastItem } from './GameHUD';
import PauseMenu, { type MenuSetup, type PauseResult } from './PauseMenu';

type UI = 'loading' | 'ready' | 'playing' | 'paused' | 'over' | 'touch' | 'error';
const CODEX_KEY = 'ufo-codex-v1';

const DEFAULT_SETUP: MenuSetup = {
  mode: '3v3',
  ourOffense: 'vstack',
  ourDefense: 'man',
  oppOffense: 'random',
  oppDefense: 'random',
};

/** 菜单设置 → 游戏配置（把「随机」展开成具体战术 + 标记 random） */
function toConfig(s: MenuSetup): Partial<MatchConfig> {
  return {
    mode: s.mode,
    teamSize: s.mode === '7v7' ? 7 : 3,
    ourOffense: s.ourOffense,
    ourDefense: s.ourDefense,
    oppOffense: s.oppOffense === 'random' ? 'hstack' : s.oppOffense,
    oppDefense: s.oppDefense === 'random' ? 'man' : s.oppDefense,
    oppOffenseRandom: s.oppOffense === 'random',
    oppDefenseRandom: s.oppDefense === 'random',
  };
}

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
  // 重建游戏（切换 3v3 / 7v7）用
  const createRef = useRef<typeof import('@/game/createGame').createGame | null>(null);
  const wireRef = useRef<((g: GameHandle) => void) | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);

  const [ui, setUi] = useState<UI>('loading');
  const [hud, setHud] = useState<HudState | null>(null);
  const [toast, setToast] = useState<ToastItem | null>(null);
  const [tips, setTips] = useState<TipItem[]>([]);
  const [result, setResult] = useState<PauseResult | null>(null);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [banner, setBanner] = useState<string | null>(null); // 刚解锁的图鉴条目 id
  const [showCodex, setShowCodex] = useState(false);
  const [tutDone, setTutDone] = useState(false);
  const [tutorialSeen, setTutorialSeen] = useState(true);
  const [setup, setSetup] = useState<MenuSetup>(DEFAULT_SETUP);
  const setupRef = useRef<MenuSetup>(DEFAULT_SETUP);
  const builtModeRef = useRef<'3v3' | '7v7'>('3v3');

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
    try {
      setTutorialSeen(localStorage.getItem('ufo-tut-done') === '1');
    } catch {
      /* ignore */
    }

    // 触屏设备：提示换电脑
    if (window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches) {
      setUi('touch');
      return;
    }
    const el = mountRef.current;
    if (!el) return;

    let disposed = false;
    let offs: Array<() => void> = [];

    // 把事件线接到一个游戏实例上（重建时复用）
    const wire = (game: GameHandle) => {
      offs.forEach((off) => off());
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
          setTips((prev) => [...prev.filter((x) => x.key !== tp.key), { ...tp, id }].slice(-2));
          tipTimers.current.push(window.setTimeout(() => setTips((prev) => prev.filter((x) => x.id !== id)), 8000));
          unlock(codexIdForTip(tp.key));
        }),
        game.bus.on('codex', (c) => unlock(c.id)),
        game.bus.on('tutorialDone', () => {
          setTutDone(true);
          setTutorialSeen(true);
          try {
            localStorage.setItem('ufo-tut-done', '1');
          } catch {
            /* ignore */
          }
        }),
        game.bus.on('pause', () => setUi('paused')),
        game.bus.on('resume', () => setUi('playing')),
        game.bus.on('gameover', (r) => {
          setResult(r);
          setUi('over');
        }),
      ];
    };

    import('@/game/createGame')
      .then(({ createGame }) => {
        if (disposed) return;
        createRef.current = createGame;
        const game = createGame(el, toConfig(setupRef.current));
        gameRef.current = game;
        builtModeRef.current = setupRef.current.mode;
        if (new URLSearchParams(window.location.search).has('debug')) {
          (window as unknown as { __ufo?: unknown }).__ufo = game.debug;
        }
        wire(game);
        wireRef.current = wire;
        elRef.current = el;
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

  // 把本轮菜单设置 → 游戏：模式改变需要重建（玩家 / 场地重新生成），否则只换战术
  const applySetupToGame = useCallback((s: MenuSetup, tutorial: boolean): GameHandle | null => {
    const create = createRef.current;
    const el = elRef.current;
    if (!create || !el) return gameRef.current;
    const needMode = tutorial ? '3v3' : s.mode;
    if (needMode !== builtModeRef.current) {
      gameRef.current?.dispose();
      const game = create(el, toConfig({ ...s, mode: needMode }));
      gameRef.current = game;
      builtModeRef.current = needMode;
      if ((window as unknown as { __ufo?: unknown }).__ufo) {
        (window as unknown as { __ufo?: unknown }).__ufo = game.debug;
      }
      wireRef.current?.(game);
      return game;
    }
    return gameRef.current;
  }, []);

  // 开始菜单里点「开始」：按所选模式建好游戏（必要时重建），应用战术，再锁定鼠标
  const handleStart = useCallback(() => {
    const s = setupRef.current;
    const before = gameRef.current;
    const game = applySetupToGame(s, false);
    if (game && game === before && ui === 'ready') game.restart(toConfig(s));
    game?.requestLock();
  }, [applySetupToGame, ui]);
  const handleResume = useCallback(() => {
    if (ui === 'ready') handleStart();
    else gameRef.current?.requestLock();
  }, [handleStart, ui]);
  const handleTutorial = useCallback(() => {
    setResult(null);
    setToast(null);
    setTips([]);
    setTutDone(false);
    const game = applySetupToGame(setupRef.current, true); // 教程固定 3v3
    game?.startTutorial();
    game?.requestLock();
  }, [applySetupToGame]);
  const handleRestart = useCallback(() => {
    setTutDone(false);
    setResult(null);
    setToast(null);
    setTips([]);
    const game = applySetupToGame(setupRef.current, false);
    game?.restart(toConfig(setupRef.current));
    game?.requestLock();
  }, [applySetupToGame]);
  // 菜单里改设置：比赛中暂停时只改我方战术，下一分生效；其余情况等「开始 / 再来一场」时应用
  const handleSetup = useCallback(
    (s: MenuSetup) => {
      setupRef.current = s;
      setSetup(s);
      if (ui === 'paused') gameRef.current?.setTactics({ ourOffense: s.ourOffense, ourDefense: s.ourDefense });
    },
    [ui],
  );

  const bannerEntry = banner ? CODEX.find((e) => e.id === banner) : null;

  return (
    <div className="exp-root">
      <div ref={mountRef} className="exp-canvas" />
      <div className="exp-halftone" />

      {hud && (ui === 'playing' || ui === 'paused' || ui === 'over') && <GameHUD hud={hud} toast={toast} tips={tips} />}

      {bannerEntry && (ui === 'playing' || ui === 'paused') && (
        <div className="exp-unlock">{t('exp.unlocked', { name: t(titleKey(bannerEntry)) })}</div>
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
          onResume={handleResume}
          onRestart={handleRestart}
          onExit={onExit}
          onCodex={() => setShowCodex(true)}
          onTutorial={handleTutorial}
          tutorialSeen={tutorialSeen}
          tutDone={tutDone}
          setup={setup}
          onSetup={handleSetup}
        />
      )}
      {showCodex && <CodexPanel unlocked={unlocked} onClose={() => setShowCodex(false)} />}
    </div>
  );
}
