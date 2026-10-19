'use client';

import type { HudState, TipPayload, ToastPayload } from '@/game/types';

export interface ToastItem extends ToastPayload {
  id: number;
}

export interface TipItem extends TipPayload {
  id: number;
}

function tip(h: HudState): string {
  if (h.userHasDisc) return '按 1 / 2 传给队友（线红 = 会被截）· 或按住左键蓄力自己瞄准 · 持盘不能移动';
  if (h.possession === 'mate') return '队友持盘 · 跑向空当要球，靠近落点会自动接盘';
  if (h.possession === 'opp') return '对手持盘 · 盯住人，站到传球线路上';
  if (h.possession === 'loose') return h.offense === 0 ? '飞盘落地了 · 跑过去捡盘' : '对手去捡盘 · 趁机回防盯人';
  return h.offense === 0 ? '飞盘在空中 · 冲进青色圈接盘' : '对手传盘中 · 红圈是落点，冲过去拦截';
}

function possessionLabel(h: HudState): string {
  if (h.possession === 'user') return '你持盘';
  if (h.possession === 'mate') return '队友持盘';
  if (h.possession === 'opp') return '对手持盘';
  if (h.possession === 'loose') return '飞盘落地';
  return '飞盘在空中';
}

const STALL_R = 26;
const STALL_C = 2 * Math.PI * STALL_R;
const STAM_R = 27;
const STAM_C = 2 * Math.PI * STAM_R;

export default function GameHUD({ hud, toast, tips }: { hud: HudState; toast: ToastItem | null; tips: TipItem[] }) {
  const stallColor =
    hud.stallLeft === null ? '#f6ecd2' : hud.stallLeft > 5 ? '#14c2d8' : hud.stallLeft > 2.5 ? '#ffd23f' : '#ff5a4a';
  const stallFrac = hud.stallLeft === null ? 0 : hud.stallLeft / 10;
  const stamVisible = hud.stamina < 0.995 || hud.exhausted;
  const speedOp = Math.max(0, Math.min(1, (hud.speed - 0.6) / 0.4));
  const segs = 12;
  const lit = Math.round(hud.charge * segs);

  return (
    <div className="hud">
      {/* 速度线：冲刺时画面边缘的放射线（The Pathless 式的速度感） */}
      <div className="hud-speed" style={{ opacity: speedOp * 0.75 }} />

      {/* 准星 + 体力环 */}
      <div className="hud-cross">
        <svg viewBox="0 0 64 64" width="64" height="64">
          <g style={{ opacity: stamVisible ? 1 : 0, transition: 'opacity 0.25s' }}>
            <circle cx="32" cy="32" r={STAM_R} className="hud-ring-bg" />
            <circle
              cx="32"
              cy="32"
              r={STAM_R}
              className={`hud-ring-fg${hud.exhausted ? ' is-bad' : ''}`}
              strokeDasharray={STAM_C}
              strokeDashoffset={STAM_C * (1 - hud.stamina)}
              transform="rotate(-90 32 32)"
            />
          </g>
          <circle cx="32" cy="32" r="4.2" className="hud-dot" />
        </svg>
      </div>

      {/* 蓄力条（分段） */}
      {hud.charge > 0 && (
        <div className="hud-charge" aria-label="蓄力">
          {Array.from({ length: segs }, (_, i) => (
            <i key={i} className={i < lit ? `on s${i < 5 ? 1 : i < 9 ? 2 : 3}` : ''} />
          ))}
        </div>
      )}

      {/* 比分 */}
      <div className="hud-score">
        <div className="hud-score-a">
          <span className="hud-score-name">我方</span>
          <span className="hud-score-num">{hud.scoreA}</span>
        </div>
        <div className="hud-score-mid">先到 {hud.winScore}</div>
        <div className="hud-score-b">
          <span className="hud-score-num">{hud.scoreB}</span>
          <span className="hud-score-name">对手</span>
        </div>
      </div>
      <div className="hud-poss">{possessionLabel(hud)}</div>

      {/* 连传计数 */}
      {hud.chain >= 2 && (
        <div key={`${hud.chainTeam}-${hud.chain}`} className={`hud-chain ${hud.chainTeam === 0 ? 'is-a' : 'is-b'}`}>
          连传 ×{hud.chain}
        </div>
      )}

      {/* 数秒 */}
      {hud.stallLeft !== null && (
        <div className={`hud-stall${hud.stallRunning ? '' : ' is-idle'}`} aria-label="数秒">
          <svg viewBox="0 0 64 64" width="76" height="76">
            <circle cx="32" cy="32" r="30" className="hud-stall-face" />
            <circle cx="32" cy="32" r={STALL_R} className="hud-stall-bg" />
            <circle
              cx="32"
              cy="32"
              r={STALL_R}
              className="hud-stall-fg"
              stroke={stallColor}
              strokeDasharray={STALL_C}
              strokeDashoffset={STALL_C * (1 - stallFrac)}
              transform="rotate(-90 32 32)"
            />
          </svg>
          <span className="hud-stall-num">{Math.ceil(hud.stallLeft)}</span>
          <span className="hud-stall-label">{hud.stallRunning ? '数秒中' : '无人贴防'}</span>
        </div>
      )}

      {/* 进攻方向 */}
      <div className="hud-compass">
        <div className="hud-compass-face">
          <div style={{ transform: `rotate(${hud.goalAngle}rad)`, display: 'flex' }}>
            <svg viewBox="0 0 24 24" width="30" height="30">
              <path d="M12 2 L21 21 L12 16 L3 21 Z" fill="#ffcf4a" stroke="#1b1a2e" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <span>进攻方向</span>
      </div>

      {/* 反手 / 正手 + 冲刺提示 */}
      <div className="hud-curve">
        <span className={hud.curve === 'backhand' ? 'is-on' : ''}>Q 反手</span>
        <span className={hud.curve === 'forehand' ? 'is-on' : ''}>E 正手</span>
        <span className="is-plain">Shift 冲刺</span>
      </div>

      {/* 落点指示 */}
      {hud.landing && (
        <div className={`hud-landing${hud.landing.mine ? ' is-mine' : ' is-opp'}`}>
          <div className="hud-landing-arrow" style={{ transform: `rotate(${hud.landing.angle}rad)` }}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M12 2 L21 21 L12 16 L3 21 Z" fill="currentColor" stroke="#1b1a2e" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          <span>落点 {Math.round(hud.landing.dist)}m</span>
        </div>
      )}

      {/* 规则提醒（不暂停比赛） */}
      {tips.length > 0 && (
        <div className="hud-tips">
          {tips.map((t) => (
            <div key={t.id} className="hud-tip-card">
              <div className="hud-tip-title">{t.title}</div>
              <div className="hud-tip-text">{t.text}</div>
            </div>
          ))}
        </div>
      )}

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

      {/* 攻防转换 / 得分：漫画贴纸 */}
      {toast && (
        <div key={toast.id} className={`hud-toast hud-toast-${toast.kind}`}>
          <div className="hud-toast-title">{toast.title}</div>
          {toast.sub && <div className="hud-toast-sub">{toast.sub}</div>}
        </div>
      )}
    </div>
  );
}
