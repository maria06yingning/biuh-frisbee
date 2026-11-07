'use client';

import { useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { pick, type Bi } from '@/content/shared';
import PageShell, { Section } from '@/components/PageShell';

/* ───────── Interactive "what happens after a call" (WFDF Rules 15/16) ───────── */
type Outcome = 'accepted' | 'contested' | 'retracted' | 'nostop';

function CallFlow() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  const [outcome, setOutcome] = useState<Outcome>('accepted');

  const options: { id: Outcome; label: Bi; result: Bi }[] = [
    {
      id: 'accepted',
      label: ['接受（accepted）', 'Accepted'],
      result: [
        '对方同意犯规成立。按规则恢复：比如被犯规的接盘者在犯规地点获得盘权，再做一次确认（check）后继续。',
        'The other player agrees. Play resumes per the rule — e.g. a fouled receiver gets the disc at the spot, and play restarts with a check.',
      ],
    },
    {
      id: 'contested',
      label: ['争议（contested）', 'Contested'],
      result: [
        '双方说不拢，也无法确定到底发生了什么——盘回到上一个无争议的持盘者，就像这次传球没发生过。',
        'No agreement, and it isn’t clear what happened — the disc goes back to the last undisputed thrower, as if the throw never happened.',
      ],
    },
    {
      id: 'retracted',
      label: ['撤回（retracted）', 'Retracted'],
      result: [
        '叫停的人想通了，觉得自己叫错了，主动撤回。比赛按“这一方犯规被接受”的方式恢复。',
        'The caller decides the call was wrong and takes it back. Play resumes as if that side had committed the breach.',
      ],
    },
    {
      id: 'nostop',
      label: ['不影响（didn’t affect）', 'Didn’t affect the play'],
      result: [
        '双方都同意这次接触没改变结果——那么结果照算，比赛继续。这条优先于几乎所有其他规则。',
        'Both agree the contact changed nothing — the result stands and play continues. This overrides almost everything else.',
      ],
    },
  ];
  const current = options.find((o) => o.id === outcome)!;

  const steps: { t: Bi; d: Bi }[] = [
    { t: ['叫停（call）', 'The call'], d: ['被犯规的一方喊出“Foul!”，场上所有人复述，比赛立即停止。', 'The fouled player calls “Foul!”, everyone echoes it, and play stops at once.'] },
    { t: ['说清楚', 'Explain'], d: ['两名当事人简短说明各自看到了什么；视角更好的队友可以补充。', 'The two players briefly say what they saw; teammates with a better view can add perspective.'] },
    { t: ['一起决定', 'Decide together'], d: ['对方选择下面四种回应之一。', 'The other player responds in one of four ways — pick one.'] },
  ];

  return (
    <div className="ap-call-practice">
      <div className="ap-call-scenario">
        <svg viewBox="0 0 520 150" aria-hidden="true">
          <rect width="520" height="150" rx="16" fill="#e5efcf" />
          <path d="M0 116 Q120 94 260 118 T520 110 V150 H0Z" fill="#c4dda2" />
          <g transform="translate(155 58)">
            <circle cy="-16" r="13" fill="#e7b88e" stroke="#1b1a2e" strokeWidth="2" />
            <path d="M-12-20 Q-9-38 5-32 Q15-27 12-14" fill="#3c2f3b" stroke="#1b1a2e" strokeWidth="2" />
            <path d="M-12 0 Q0-8 12 0 L17 42 H-17Z" fill="#ff826e" stroke="#1b1a2e" strokeWidth="2" />
            <path d="M12 7 L38-3" stroke="#e7b88e" strokeWidth="8" strokeLinecap="round" />
          </g>
          <g transform="translate(270 58)">
            <circle cy="-16" r="13" fill="#8a5842" stroke="#1b1a2e" strokeWidth="2" />
            <path d="M-13-19 Q-10-36 4-33 Q15-28 12-13" fill="#f0cb59" stroke="#1b1a2e" strokeWidth="2" />
            <path d="M-12 0 Q0-8 12 0 L17 42 H-17Z" fill="#69c6b7" stroke="#1b1a2e" strokeWidth="2" />
            <path d="M-12 6 L-39-2" stroke="#8a5842" strokeWidth="8" strokeLinecap="round" />
          </g>
          <path d="M200 53 l12-15 6 12 14-3-7 14 8 8-17 1-7 12-5-15-13-5Z" fill="#ffd23f" stroke="#1b1a2e" strokeWidth="2" />
          <g transform="translate(393 42) rotate(-12)"><ellipse rx="24" ry="8" fill="#ff826e" stroke="#1b1a2e" strokeWidth="2" /><ellipse rx="13" ry="4" fill="none" stroke="#fff8e6" strokeWidth="1.5" /></g>
          <path d="M355 31 Q382 12 407 24" fill="none" stroke="#1b1a2e" strokeWidth="2" strokeDasharray="4 5" />
          <path d="M62 35 Q45 16 73 15 Q99 15 87 35Z" fill="#fff8e6" stroke="#1b1a2e" strokeWidth="2" />
          <text x="74" y="29" textAnchor="middle" fontSize="12" fontWeight="800" fill="#1b1a2e">Foul!</text>
        </svg>
        <div>
          <strong>{zh ? '情景：接盘时发生接触，盘落地。' : 'Scenario: contact on the play; the disc falls.'}</strong>
          <p>{zh ? '接盘者喊出接盘犯规。选择对方的回应，看看通常如何恢复比赛。' : 'The receiver calls a receiving foul. Choose the response to see how play resumes.'}</p>
        </div>
      </div>
      <ol className="ap-rail">
        {steps.map((s, i) => (
          <li key={i}>
            <h3>{pick(lang, s.t)}</h3>
            <p>{pick(lang, s.d)}</p>
          </li>
        ))}
      </ol>

      <div className="ap-choice" role="group" aria-label={zh ? '对方的回应' : 'The response'}>
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={outcome === o.id} onClick={() => setOutcome(o.id)}>
            {pick(lang, o.label)}
          </button>
        ))}
      </div>

      <p className="ap-result" aria-live="polite">
        {pick(lang, current.result)}
      </p>
      <p className="ap-hint">
        {zh ? '讨论应尽量简短——建议不超过 45 秒。说不拢，就把盘还给上一个无争议的持盘者。' : 'Keep it brief — 45 seconds at most. If you can’t agree, the disc goes back to the last undisputed thrower.'}
      </p>
    </div>
  );
}

/* ───────── Content (WFDF Rules 15/17/18) ───────── */
const KINDS: { tag: Bi; t: Bi; d: Bi }[] = [
  {
    tag: ['有身体接触', 'Contact'],
    t: ['犯规（foul）', 'Foul'],
    d: ['两名对方球员之间的非轻微身体接触。意外的接触也算——极限飞盘本就不该有接触。只有被犯规的一方能喊“Foul”。', 'Non-minor contact between opposing players. Even accidental contact counts — there shouldn’t be any. Only the fouled player calls “Foul.”'],
  },
  {
    tag: ['标记 / 走步', 'Marking / travel'],
    t: ['违规（infraction）', 'Infraction'],
    d: ['标记（marking）和走步（travel）类的违反。违规本身不停表：纠正后接着打，持盘计数相应调整。', 'Marking and travel breaches. An infraction doesn’t stop play by itself — fix it and carry on, adjusting the stall count.'],
  },
  {
    tag: ['其他一切', 'Everything else'],
    t: ['违例（violation）', 'Violation'],
    d: ['其余所有违反规则的情况，比如掩护（pick）。任何对方球员都能喊出具体名称或“Violation”。', 'Every other breach, such as a pick. Any opposing player may call it by name or just “Violation.”'],
  },
];

const FOULS: { danger?: boolean; tag: Bi; t: Bi; d: Bi }[] = [
  { tag: ['接盘', 'Receiving'], t: ['接盘犯规', 'Receiving foul'], d: ['争抢飞盘的前、中、后发生非轻微接触。被接受时，被犯规者在犯规地点拿到盘。', 'Non-minor contact before, during or just after a play on the disc. If accepted, the fouled player gets it at the spot.'] },
  { tag: ['标记', 'Marking'], t: ['标记犯规', 'Marking foul'], d: ['防守者对持盘者造成接触，或站位违规时接触。持盘者也可只喊“Contact”而不停表，计数从 1 重来。', 'The marker contacts the thrower, or does so while illegally positioned. The thrower may instead call “Contact” without stopping — the count restarts at one.'] },
  { tag: ['夺盘', 'Strip'], t: ['夺盘犯规', 'Strip foul'], d: ['犯规导致已经接住的盘被打掉。如果本该是一记得分，判进球。', 'A foul that knocks the disc out of a completed catch. If it would have been a goal, a goal is awarded.'] },
  { tag: ['阻挡', 'Blocking'], t: ['阻挡犯规', 'Blocking foul'], d: ['占住对方按正常速度和方向无法避开的位置，造成接触。', 'Taking a spot an opponent — moving at their established speed and line — can’t avoid, causing contact.'] },
  { danger: true, tag: ['危险动作', 'Dangerous'], t: ['危险动作', 'Dangerous play'], d: ['不顾他人安全的鲁莽动作，无论是否发生接触都算犯规。这条凌驾于其他犯规之上。', 'Reckless play that risks injury is a foul whether or not contact occurs. This rule overrides the others.'] },
  { tag: ['双方', 'Offsetting'], t: ['双方犯规', 'Offsetting fouls'], d: ['两队在同一回合都被接受地叫了犯规，或两人同时冲向同一点——盘回到上一个无争议的持盘者。', 'Both teams have accepted calls on one play, or two players vie for the same point — the disc returns to the last undisputed thrower.'] },
];

const VIOLATIONS: { tag: Bi; t: Bi; d: Bi }[] = [
  { tag: ['走步', 'Travel'], t: ['走步（travel）', 'Travel'], d: ['没保持轴心脚，或接盘后没尽快减速。被喊出后回到正确位置，比赛多数情况下不停。', 'Moving the pivot foot, or not slowing down after a catch. Reset the pivot; usually play doesn’t stop.'] },
  { tag: ['快数', 'Fast count'], t: ['快数（fast count）', 'Fast count'], d: ['标记者数得太快、漏喊“stalling”、或没从正确的数字开始。喊出后计数要退回。', 'The marker counts too fast, skips “stalling,” or starts from the wrong number. The count is rolled back.'] },
  { tag: ['双人包夹', 'Double team'], t: ['双人包夹（double team）', 'Double team'], d: ['持盘者 3 米内有第二名防守者，且没在盯别的进攻者。', 'A second defender within 3 m of the thrower who isn’t guarding another offensive player.'] },
  { tag: ['距离', 'Marking space'], t: ['盘位空间 / 跨站 / 环抱', 'Disc space · straddle · wrapping'], d: ['标记者贴得太近：身体离躯干不足一个盘的直径、脚跨在轴心脚上、或用手臂环住持盘者。', 'The marker crowds the thrower — within a disc-diameter of the torso, straddling the pivot, or wrapping with the arms.'] },
  { tag: ['掩护', 'Pick'], t: ['掩护（pick）', 'Pick'], d: ['防守者盯人时被别的球员挡住去路，可以喊“Pick”。只有防守方能喊。', 'A defender blocked from following their mark may call “Pick.” Only the defense can.'] },
  { tag: ['开盘', 'Pull'], t: ['越位 / 抢跑', 'Offside · false start'], d: ['开盘时防守方提前过线（offside）或进攻方提前离线（false start）。必须在进攻方碰盘前喊出。', 'At the pull, the defense crosses early (offside) or the offense leaves early (false start). Call it before the offense touches the disc.'] },
];

function FoulScene({ index, danger = false }: { index: number; danger?: boolean }) {
  return (
    <svg className="ap-foul-scene" viewBox="0 0 300 118" aria-hidden="true">
      <rect width="300" height="118" rx="14" fill={danger ? '#ffddd1' : '#e7f1d4'} />
      <path d="M0 93 Q70 76 150 93 T300 89 V118 H0Z" fill="#c5dda4" />
      <g className="ap-scene-player" transform={`translate(${index % 2 ? 102 : 78} 39)`}>
        <circle cy="0" r="11" fill="#e9bd96" stroke="#1b1a2e" strokeWidth="2" />
        <path d="M-10-3 Q-7-17 4-14 Q12-11 10-2" fill="#3d3040" stroke="#1b1a2e" strokeWidth="2" />
        <path d="M-10 13 Q0 7 10 13 L14 44 H-14Z" fill="#ff826e" stroke="#1b1a2e" strokeWidth="2" />
        <path d="M-8 42 L-13 57 M8 42 L14 57 M-9 20 L-24 31 M9 20 L25 29" fill="none" stroke="#1b1a2e" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g className="ap-scene-player ap-scene-player-alt" transform={`translate(${index % 2 ? 207 : 220} 40)`}>
        <circle cy="0" r="11" fill="#956149" stroke="#1b1a2e" strokeWidth="2" />
        <path d="M-11-3 Q-8-17 4-14 Q11-11 10-2" fill="#efca58" stroke="#1b1a2e" strokeWidth="2" />
        <path d="M-10 13 Q0 7 10 13 L14 44 H-14Z" fill="#66c8b4" stroke="#1b1a2e" strokeWidth="2" />
        <path d="M-8 42 L-13 57 M8 42 L14 57 M-9 20 L-27 29 M9 20 L-17 27" fill="none" stroke="#1b1a2e" strokeWidth="4" strokeLinecap="round" />
      </g>
      {danger ? <path d="M145 22 l9 12 9-12-4 18 12 6-15 1-3 16-4-16-14-1 11-7Z" fill="#ff5a4a" stroke="#1b1a2e" strokeWidth="2" /> : <g className="ap-scene-disc" transform={`translate(${145 + (index % 3) * 12} 29) rotate(-13)`}><ellipse rx="20" ry="7" fill="#ff826e" stroke="#1b1a2e" strokeWidth="2" /><ellipse rx="11" ry="3.5" fill="none" stroke="#fff8e6" strokeWidth="1.5" /></g>}
      <path d="M140 69 Q150 60 163 69" fill="none" stroke="#1b1a2e" strokeWidth="2" strokeDasharray="3 4" />
    </svg>
  );
}

function FoulExplorer() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  const groups: { label: Bi; items: { tag: Bi; t: Bi; d: Bi; kind: string; index: number; danger?: boolean }[] }[] = [
    { label: ['身体接触', 'Contact fouls'], items: FOULS.map((item, index) => ({ ...item, kind: 'foul', index })) },
    { label: ['标记与比赛违规', 'Marking & violations'], items: VIOLATIONS.map((item, index) => ({ ...item, kind: 'violation', index })) },
    { label: ['先分清三类', 'Three types of breach'], items: KINDS.map((item, index) => ({ ...item, kind: 'kind', index })) },
  ];
  const [group, setGroup] = useState(0);
  const [open, setOpen] = useState<number | null>(0);
  const items = groups[group].items;
  return (
    <div className="ap-codex">
      <div className="ap-codex-tabs" role="tablist" aria-label={zh ? '犯规与违例分类' : 'Foul and violation categories'}>
        {groups.map((item, index) => <button key={index} type="button" role="tab" aria-selected={group === index} onClick={() => { setGroup(index); setOpen(null); }}>{pick(lang, item.label)}</button>)}
      </div>
      <div className="ap-codex-list">
        {items.map((item, index) => {
          const expanded = open === index;
          const panelId = `foul-panel-${group}-${index}`;
          return (
            <article key={`${group}-${index}`} className={`ap-codex-entry${expanded ? ' is-open' : ''}`}>
              <button className="ap-codex-trigger" type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setOpen(expanded ? null : index)}>
                <span className="ap-codex-mark ap-codex-dot" aria-hidden="true">{item.kind === 'foul' ? '!' : item.kind === 'violation' ? '↗' : 'i'}</span>
                <span><small>{pick(lang, item.tag)}</small><b>{pick(lang, item.t)}</b></span>
                <span className="ap-codex-plus" aria-hidden="true">{expanded ? '−' : '+'}</span>
              </button>
              <div className="ap-codex-panel" id={panelId} hidden={!expanded}>
                <FoulScene index={item.index} danger={'danger' in item && Boolean(item.danger)} />
                <p className="ap-codex-copy">{pick(lang, item.d)}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function HandSignals() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  const items: { title: Bi; note: Bi; icon: string }[] = [
    { title: ['违例', 'Violation'], note: ['双手举起，张开成 V 形。', 'Raise both hands in a V.'], icon: 'v' },
    { title: ['争议', 'Contest'], note: ['双方拳头相碰，表示有争议。', 'Bump fists to signal a contest.'], icon: 'fist' },
    { title: ['犯规', 'Foul'], note: ['一臂平伸，另一前臂横向示意。', 'One arm extended, the other forearm makes the call.'], icon: 'foul' },
  ];
  return <div className="ap-signal-grid">{items.map((item) => <article className="ap-signal-card" key={item.icon}>
    <svg viewBox="0 0 100 82" aria-hidden="true">
      <path d="M50 73 V45" stroke="#c9825e" strokeWidth="10" strokeLinecap="round" />
      {item.icon === 'v' && <><path d="M48 48 L29 17 M52 48 L71 17" stroke="#c9825e" strokeWidth="9" strokeLinecap="round" /><circle cx="28" cy="14" r="7" fill="#f0c9a2" stroke="#1b1a2e" strokeWidth="2"/><circle cx="72" cy="14" r="7" fill="#f0c9a2" stroke="#1b1a2e" strokeWidth="2"/></>}
      {item.icon === 'fist' && <><path d="M49 50 L24 35 M51 50 L76 35" stroke="#c9825e" strokeWidth="9" strokeLinecap="round"/><rect x="15" y="24" width="18" height="16" rx="6" fill="#f0c9a2" stroke="#1b1a2e" strokeWidth="2"/><rect x="67" y="24" width="18" height="16" rx="6" fill="#f0c9a2" stroke="#1b1a2e" strokeWidth="2"/></>}
      {item.icon === 'foul' && <><path d="M49 49 L17 49 M51 46 L74 22" stroke="#c9825e" strokeWidth="9" strokeLinecap="round"/><circle cx="13" cy="49" r="7" fill="#f0c9a2" stroke="#1b1a2e" strokeWidth="2"/><circle cx="78" cy="18" r="7" fill="#f0c9a2" stroke="#1b1a2e" strokeWidth="2"/></>}
      <path d="M39 75 Q50 67 61 75" fill="#ffd23f" stroke="#1b1a2e" strokeWidth="2" />
    </svg>
    <h3>{pick(lang, item.title)}</h3><p>{pick(lang, item.note)}</p>
  </article>)}</div>;
}

export default function Fouls() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  return (
    <PageShell slug="/fouls">
      <Section
        id="kinds"
        label={zh ? '互动图鉴' : 'Explore the guide'}
        heading={zh ? '点开一个动作，看看怎么判。' : 'Open a play to see how it is called.'}
        intro={zh ? '按类别浏览；展开条目查看情景示意和规则说明。' : 'Browse by category, then open an entry for its scene and explanation.'}
        full
      >
        <FoulExplorer />
      </Section>

      <Section
        id="flow"
        label={zh ? '情景练习' : 'Try a scenario'}
        heading={zh ? '一次叫停，怎么收场？' : 'A call — then what?'}
        intro={zh ? '选一个对方的回应，看看比赛怎么继续。' : 'Pick a response to see how play resumes.'}
        full
      >
        <CallFlow />
      </Section>

      <Section
        id="signals"
        label={zh ? '场上怎么沟通' : 'Calls on the field'}
        heading={zh ? '把动作和手势一起记住。' : 'Learn the words and the signals.'}
      >
        <div className="ap-prose">
          <p>
            {zh
              ? <>叫停的人要能简短说出<strong>客观依据</strong>，给对方说明视角的机会，并保持尊重。只在足以影响结果或涉及安全时叫停。</>
              : <>State the <strong>objective evidence</strong> briefly, let the other player explain their view, and stay respectful. Call only when a breach affects the outcome or safety.</>}
          </p>
          <p>{zh ? '标准手势让场上所有人迅速明白发生了什么。' : 'Standard signals help everyone on the field understand what happened.'}</p>
        </div>
        <HandSignals />
      </Section>

      <Section
        id="advisor"
        label={zh ? '补充说明' : 'A note'}
        heading={zh ? '他们不是裁判。' : 'They’re not referees.'}
      >
        <div className="ap-prose">
          <p>
            {zh
              ? '某些高级别 WFDF 赛事会配比赛顾问（Game Advisor）。被问到时，他们可以解释规则、提供自己的视角，但不做任何判罚——最终的叫停和决定，始终由场上球员负责。'
              : 'Some high-level WFDF events use Game Advisors. When asked, they can explain a rule or offer their perspective, but they make no rulings — the calls and the decision always stay with the players.'}
          </p>
          <p>
            {zh
              ? '规则是共享的，责任在每位球员手里。'
              : 'The rules are shared; responsibility belongs to every player.'}
          </p>
        </div>
      </Section>
    </PageShell>
  );
}
