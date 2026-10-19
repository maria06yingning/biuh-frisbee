'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameHandle } from '@/game/createGame';
import type { HudState } from '@/game/types';
import GameHUD, { type TipItem, type ToastItem } from './GameHUD';
import PauseMenu from './PauseMenu';

type UI = 'loading' | 'ready' | 'playing' | 'paused' | 'over' | 'touch' | 'error';

export default function FieldExperience({ onExit }: { onExit: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameHandle | null>(null);
  const toastTimer = useRef<number>(0);
  const toastId = useRef(0);
  const tipId = useRef(0);
  const tipTimers = useRef<number[]>([]);

  const [ui, setUi] = useState<UI>('loading');
  const [hud, setHud] = useState<HudState | null>(null);
  const [toast, setToast] = useState<ToastItem | null>(null);
  const [tips, setTips] = useState<TipItem[]>([]);
  const [result, setResult] = useState<{ win: boolean; scoreA: number; scoreB: number } | null>(null);

  useEffect(() => {
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
        offs = [
          game.bus.on('hud', setHud),
          game.bus.on('toast', (t) => {
            window.clearTimeout(toastTimer.current);
            toastId.current += 1;
            setToast({ ...t, id: toastId.current });
            toastTimer.current = window.setTimeout(() => setToast(null), 2800);
          }),
          game.bus.on('tip', (t) => {
            tipId.current += 1;
            const id = tipId.current;
            // 同一条提醒不重复堆叠，最多同时显示 2 条，8 秒后自动消失
            setTips((prev) => [...prev.filter((x) => x.key !== t.key), { ...t, id }].slice(-2));
            tipTimers.current.push(
              window.setTimeout(() => setTips((prev) => prev.filter((x) => x.id !== id)), 8000),
            );
          }),
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
      tipTimers.current.forEach((t) => window.clearTimeout(t));
      tipTimers.current = [];
      gameRef.current?.dispose();
      gameRef.current = null;
    };
  }, []);

  const handleStart = useCallback(() => gameRef.current?.requestLock(), []);
  const handleRestart = useCallback(() => {
    setResult(null);
    setToast(null);
    setTips([]);
    gameRef.current?.restart();
    gameRef.current?.requestLock();
  }, []);

  return (
    <div className="exp-root">
      <div ref={mountRef} className="exp-canvas" />

      {hud && (ui === 'playing' || ui === 'paused' || ui === 'over') && <GameHUD hud={hud} toast={toast} tips={tips} />}

      {ui === 'loading' && <div className="exp-card">正在铺草坪…</div>}
      {ui === 'touch' && (
        <div className="exp-card">
          <h2>请在电脑上体验</h2>
          <p>第一人称飞盘需要键盘和鼠标。</p>
          <button className="btn btn-primary" onClick={onExit}>返回首页</button>
        </div>
      )}
      {ui === 'error' && (
        <div className="exp-card">
          <h2>球场加载失败</h2>
          <p>浏览器可能不支持 WebGL，请换用最新版 Chrome / Edge / Safari。</p>
          <button className="btn btn-primary" onClick={onExit}>返回首页</button>
        </div>
      )}

      {(ui === 'ready' || ui === 'paused' || ui === 'over') && (
        <PauseMenu
          mode={ui === 'ready' ? 'start' : ui === 'paused' ? 'paused' : 'over'}
          result={result}
          onResume={handleStart}
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
}
