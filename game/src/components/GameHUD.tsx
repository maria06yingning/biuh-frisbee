'use client';

import type { HudState, TipPayload, ToastPayload } from '@/game/types';
import { useI18n } from '@/i18n/I18nProvider';

export interface ToastItem extends ToastPayload {
  id: number;
}

export interface TipItem extends TipPayload {
  id: number;
}

function tipKey(h: HudState): string {
  if (h.pullPending) {
    if (h.userHasDisc) return 'tip.pull.you';
    return h.offense === 0 ? 'tip.pull.mate' : 'tip.pull.opp'; // 开盘等待期间 offense = 开盘一方
  }
  if (h.pulling) return h.offense === 0 ? 'tip.pulling.me' : 'tip.pulling.them'; // 开盘飞行中 offense = 接盘方
  if (h.userHasDisc) return 'tip.hold';
  if (h.possession === 'mate') return 'tip.mate';
  if (h.possession === 'opp') return 'tip.opp';
  if (h.possession === 'loose') return h.offense === 0 ? 'tip.looseMe' : 'tip.looseOpp';
  return h.offense === 0 ? 'tip.airMe' : 'tip.airOpp';
}

function possessionKey(h: HudState): string {
  if (h.pullPending) return h.userHasDisc ? 'hud.poss.pullYou' : 'hud.poss.pullOn';
  return `hud.poss.${h.possession}`;
}

const STALL_R = 26;
const STALL_C = 2 * Math.PI * STALL_R;
const STAM_R = 27;
const STAM_C = 2 * Math.PI * STAM_R;

export default function GameHUD({ hud, toast, tips }: { hud: HudState; toast: ToastItem | null; tips: TipItem[] }) {
  const { t } = useI18n();
  const stallColor =
    hud.stallLeft === null ? '#f6ecd2' : hud.stallLeft > 5 ? '#14c2d8' : hud.stallLeft > 2.5 ? '#ffd23f' : '#ff5a4a';
  const stallFrac = hud.stallLeft === null ? 0 : hud.stallLeft / 10;
  const stamVisible = hud.stamina < 0.995 || hud.exhausted;
  const speedOp = Math.max(0, Math.min(1, (hud.speed - 0.6) / 0.4));
  const segs = 12;
  const lit = Math.round(hud.charge * segs);

  return (
    <div className="hud">
      {/* 速度线：冲刺时画面边缘的放射线 */}
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
        <div className="hud-charge">
          {Array.from({ length: segs }, (_, i) => (
            <i key={i} className={i < lit ? `on s${i < 5 ? 1 : i < 9 ? 2 : 3}` : ''} />
          ))}
        </div>
      )}

      {/* 比分 */}
      <div className="hud-score">
        <div className="hud-score-a">
          <span className="hud-score-name">{t('hud.us')}</span>
          <span className="hud-score-num">{hud.scoreA}</span>
        </div>
        <div className="hud-score-mid">{t('hud.first', { n: hud.winScore })}</div>
        <div className="hud-score-b">
          <span className="hud-score-num">{hud.scoreB}</span>
          <span className="hud-score-name">{t('hud.them')}</span>
        </div>
      </div>
      <div className="hud-poss">{t(possessionKey(hud))}</div>

      {/* 盯防者"逼向"：空位在哪一侧 */}
      {hud.force && <div className="hud-force">{t(hud.force === 'forehand' ? 'hud.force.fh' : 'hud.force.bh')}</div>}

      {/* 连传计数 */}
      {hud.chain >= 2 && (
        <div key={`${hud.chainTeam}-${hud.chain}`} className={`hud-chain ${hud.chainTeam === 0 ? 'is-a' : 'is-b'}`}>
          {t('hud.chain', { n: hud.chain })}
        </div>
      )}

      {/* 数秒 */}
      {hud.stallLeft !== null && (
        <div className={`hud-stall${hud.stallRunning ? '' : ' is-idle'}`}>
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
          <span className="hud-stall-label">{t(hud.stallRunning ? 'hud.stall.on' : 'hud.stall.idle')}</span>
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
        <span>{t('hud.goal')}</span>
      </div>

      {/* 按键提示：正反手 + 技巧 + 喊违规 + 精神分 */}
      <div className="hud-curve">
        <span className={hud.curve === 'backhand' ? 'is-on' : ''}>{t('hud.curve.back')}</span>
        <span className={hud.curve === 'forehand' ? 'is-on' : ''}>{t('hud.curve.fore')}</span>
        <span className="is-plain">{t('hud.fake')}</span>
        <span className="is-plain">{t('hud.step')}</span>
        <span className="is-plain">{t('hud.sprint')}</span>
        <span className="is-call">{t('hud.call')}</span>
        <span className="is-spirit">{t('hud.spirit', { n: hud.spirit })}</span>
      </div>

      {/* 落点指示 */}
      {hud.landing && (
        <div className={`hud-landing${hud.landing.mine ? ' is-mine' : ' is-opp'}`}>
          <div className="hud-landing-arrow" style={{ transform: `rotate(${hud.landing.angle}rad)` }}>
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M12 2 L21 21 L12 16 L3 21 Z" fill="currentColor" stroke="#1b1a2e" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          <span>{t('hud.landing', { d: Math.round(hud.landing.dist) })}</span>
        </div>
      )}

      {/* 规则提醒（不暂停比赛） */}
      {tips.length > 0 && (
        <div className="hud-tips">
          {tips.map((tp) => (
            <div key={tp.id} className="hud-tip-card">
              <div className="hud-tip-title">{t(`tip.${tp.key}.t`)}</div>
              <div className="hud-tip-text">{t(`tip.${tp.key}.x`)}</div>
            </div>
          ))}
        </div>
      )}

      {/* 底部操作提示 */}
      <div className="hud-tip">{t(tipKey(hud))}</div>

      {/* 新手教程卡 */}
      {hud.tutorial && (
        <div className={`hud-tut${hud.tutorial.done ? ' is-done' : ''}`}>
          <div className="hud-tut-head">
            {t('tut.head', { n: hud.tutorial.step, m: hud.tutorial.total })}
            {hud.tutorial.done ? ' ✓' : ''}
          </div>
          <div className="hud-tut-body">
            <div className="hud-tut-title">{t(`tut.${hud.tutorial.step}.t`)}</div>
            <p>{t(`tut.${hud.tutorial.step}.x`)}</p>
            <div className="hud-tut-dots">
              {Array.from({ length: hud.tutorial.total }, (_, i) => (
                <i key={i} className={i + 1 < hud.tutorial!.step || (i + 1 === hud.tutorial!.step && hud.tutorial!.done) ? 'on' : i + 1 === hud.tutorial!.step ? 'cur' : ''} />
              ))}
            </div>
            <div className="hud-tut-skip">{t('tut.skip')}</div>
          </div>
        </div>
      )}

      {/* 新手引导 */}
      {hud.guide && (
        <div className="hud-guide">
          <div className="hud-guide-title">{t('guide.title')}</div>
          <ol>
            <li>{t('guide.1')}</li>
            <li>{t('guide.2')}</li>
            <li>{t('guide.3')}</li>
            <li>{t('guide.4')}</li>
          </ol>
        </div>
      )}

      {/* 攻防转换 / 得分：漫画贴纸 */}
      {toast && (
        <div key={toast.id} className={`hud-toast hud-toast-${toast.kind}`}>
          <div className="hud-toast-title">{t(toast.title, toast.params)}</div>
          {toast.sub && (
            <div className="hud-toast-sub">
              {t(toast.sub, toast.params)}
              {toast.note ? t(toast.note) : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
