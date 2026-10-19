'use client';

import type { HudState, ToastPayload } from '@/game/types';

export interface ToastItem extends ToastPayload {
  id: number;
}

function tip(h: HudState): string {
  if (h.userHasDisc) return '按 1 / 2 直接传给队友（线红 = 有人站在线上会被截）· 或按住左键蓄力自己瞄准传盘 · 持盘不能移动';
  if (h.possession === 'mate') return '队友持盘 · 跑向空当要球，靠近落点会自动接盘';
  if (h.possession === 'opp') return '对手持盘 · 盯住人，站到传球线路上';
  if (h.possession === 'loose') return h.offense === 0 ? '飞盘落地了 · 跑过去捡盘（靠近自动拾取）' : '对手去捡盘 · 趁机回防盯人';
  return h.offense === 0 ? '飞盘在空中 · 冲向落点接盘' : '对手传盘中 · 冲向落点拦截或封堵';
}

function possessionLabel(h: HudState): string {
  if (h.possession === 'user') return '你持盘';
  if (h.possession === 'mate') return '队友持盘';
  if (h.possession === 'opp') return '对手持盘';
  if (h.possession === 'loose') return '飞盘落地';
  return '飞盘在空中';
}

const RING_R = 26;
const RING_C = 2 * Math.PI * RING_R;

export default function GameHUD({ hud, toast }: { hud: HudState; toast: ToastItem | null }) {
  const stallColor =
    hud.stallLeft === null ? '#fff' : hud.stallLeft > 5 ? '#3ddc84' : hud.stallLeft > 2.5 ? '#ffd23f' : '#ff4d4d';
  const stallFrac = hud.stallLeft === null ? 0 : hud.stallLeft / 10;

  return (
    <div className="hud">
      {/* 准星 */}
      <div className="hud-crosshair" />

      {/* 蓄力条 */}
      {hud.charge > 0 && (
        <div className="hud-charge" aria-label="蓄力">
          <div className="hud-charge-fill" style={{ width: `${Math.round(hud.charge * 100)}%` }} />
        </div>
      )}

      {/* 比分 */}
      <div className="hud-score">
        <div className="hud-score-row">
          <span className="hud-team hud-team-a">我方</span>
          <span className="hud-num">{hud.scoreA}</span>
          <span className="hud-colon">:</span>
          <span className="hud-num">{hud.scoreB}</span>
          <span className="hud-team hud-team-b">对手</span>
        </div>
        <div className="hud-score-sub">先到 {hud.winScore} 分获胜 · {possessionLabel(hud)}</div>
      </div>

      {/* 数秒圆环 */}
      {hud.stallLeft !== null && (
        <div className={`hud-stall${hud.stallRunning ? '' : ' is-idle'}`} aria-label="数秒">
          <svg viewBox="0 0 64 64" width="72" height="72">
            <circle cx="32" cy="32" r={RING_R} className="hud-stall-bg" />
            <circle
              cx="32"
              cy="32"
              r={RING_R}
              className="hud-stall-fg"
              stroke={stallColor}
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - stallFrac)}
              transform="rotate(-90 32 32)"
            />
          </svg>
          <span className="hud-stall-num" style={{ color: stallColor }}>
            {Math.ceil(hud.stallLeft)}
          </span>
          <span className="hud-stall-label">{hud.stallRunning ? '数秒中' : '无人贴防·暂停'}</span>
        </div>
      )}

      {/* 进攻方向箭头 */}
      <div className="hud-compass">
        <div className="hud-compass-arrow" style={{ transform: `rotate(${hud.goalAngle}rad)` }}>
          <svg viewBox="0 0 24 24" width="30" height="30">
            <path d="M12 2 L20 20 L12 15 L4 20 Z" fill="#ffc83d" stroke="#7a5a00" strokeWidth="1.2" />
          </svg>
        </div>
        <span>进攻方向</span>
      </div>

      {/* 体力 */}
      <div className="hud-stamina">
        <div
          className={`hud-stamina-fill${hud.exhausted ? ' is-exhausted' : ''}`}
          style={{ width: `${Math.round(hud.stamina * 100)}%` }}
        />
        <span>Shift 冲刺</span>
      </div>

      {/* 反手 / 正手 */}
      <div className="hud-curve">
        <span className={hud.curve === 'backhand' ? 'is-on' : ''}>Q 反手（左弯）</span>
        <span className={hud.curve === 'forehand' ? 'is-on' : ''}>E 正手（右弯）</span>
      </div>

      {/* 底部操作提示 */}
      <div className="hud-tip">{tip(hud)}</div>

      {/* 新手引导 */}
      {hud.guide && (
        <div className="hud-guide">
          <div className="hud-guide-title">三步上手</div>
          <ol>
            <li>持盘时不能跑，只能转身看场上形势</li>
            <li>按 <b>1</b> / <b>2</b> 传给头顶对应编号的队友：线绿 = 稳，线红 = 有人站在线上，会被截</li>
            <li>在金色得分区里接到盘就得 1 分（也可以按住左键蓄力，自己瞄准传）</li>
          </ol>
        </div>
      )}

      {/* 攻防转换 / 得分 toast */}
      {toast && (
        <div key={toast.id} className={`hud-toast hud-toast-${toast.kind}`}>
          <div className="hud-toast-title">{toast.title}</div>
          <div className="hud-toast-sub">{toast.sub}</div>
        </div>
      )}
    </div>
  );
}
