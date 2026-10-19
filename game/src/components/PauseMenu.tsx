'use client';

export interface PauseMenuProps {
  mode: 'start' | 'paused' | 'over';
  result?: { win: boolean; scoreA: number; scoreB: number } | null;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export default function PauseMenu({ mode, result, onResume, onRestart, onExit }: PauseMenuProps) {
  const title =
    mode === 'start'
      ? '准备上场'
      : mode === 'paused'
        ? '已暂停'
        : result?.win
          ? '你们赢了！'
          : '这场惜败';

  return (
    <div className="pause">
      <div className="pause-card">
        <h2>{title}</h2>
        {mode === 'over' && result && (
          <p className="pause-final">
            最终比分 {result.scoreA} : {result.scoreB}
          </p>
        )}

        <div className="pause-actions">
          {mode !== 'over' && (
            <button className="btn btn-primary" onClick={onResume}>
              {mode === 'start' ? '点击开始（鼠标将被锁定）' : '继续比赛'}
            </button>
          )}
          {mode !== 'start' && (
            <button className={mode === 'over' ? 'btn btn-primary' : 'btn'} onClick={onRestart}>
              {mode === 'over' ? '再来一场' : '重新开始'}
            </button>
          )}
          <button className="btn btn-ghost" onClick={onExit}>
            退出
          </button>
        </div>

        <div className="pause-controls">
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移动</span>
          <span>鼠标 视角</span>
          <span><kbd>Shift</kbd> 冲刺</span>
          <span><kbd>1</kbd><kbd>2</kbd> 传给队友 A / B</span>
          <span>按住左键 蓄力瞄准传盘</span>
          <span><kbd>Q</kbd> 反手 / <kbd>E</kbd> 正手</span>
          <span><kbd>Esc</kbd> 暂停</span>
        </div>

        <p className="pause-rules">
          极限飞盘规则速览：持盘者不能跑动（只能转身）· 防守者贴近后开始数秒，10 秒内必须传出 · 在对方得分区内接到盘得 1 分 ·
          飞盘落地、被截、出界就换攻 · 全程无身体接触
        </p>
      </div>
    </div>
  );
}
