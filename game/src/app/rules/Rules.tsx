'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { pick, type Bi } from '@/content/shared';
import PageShell, { Section, Term } from '@/components/PageShell';

/* ───────── Interactive top-down field (facts from WFDF Rules 2.x) ───────── */
type Zone = 'central' | 'ez' | 'brick' | 'line';

function FieldDiagram() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  const [active, setActive] = useState<Zone | null>(null);
  const dim = (z: Zone) => (active && active !== z ? 0.25 : 1);

  const keys: { z: Zone; label: Bi; desc: Bi }[] = [
    { z: 'central', label: ['中央区 · 64 m', 'Central zone · 64 m'], desc: ['比赛的大部分时间在这里进行。', 'Where most of the game happens.'] },
    { z: 'ez', label: ['得分区 · 两端各 18 m', 'End zones · 18 m each'], desc: ['在你进攻的得分区内接到盘 = 1 分。', 'Catch a pass in the end zone you attack to score.'] },
    { z: 'brick', label: ['点球标记（brick mark）', 'Brick mark'], desc: ['开盘直接飞出界时，接盘方可选从这里开始；距每条得分线 18 m。', 'If the pull lands out untouched, the offense may start here — 18 m from each goal line.'] },
    { z: 'line', label: ['边线算界外', 'The lines are out'], desc: ['边线不属于场内，踩线接盘就是出界。', 'Perimeter lines aren’t part of the field: catch on the line and you’re out.'] },
  ];

  return (
    <div className="ap-duo is-field">
      <div className="ap-figure ap-duo-a">
        <svg viewBox="0 0 108 45" role="img" aria-label={zh ? '极限飞盘球场俯视图：100 × 37 米，两端各 18 米得分区' : 'Top-down ultimate field: 100 × 37 m with an 18 m end zone at each end'}>
          <rect className="ap-fz" x="22" y="4" width="64" height="37" fill="#9fc27a" style={{ opacity: dim('central') }} />
          <g className="ap-fz" style={{ opacity: dim('ez') }}>
            <rect x="4" y="4" width="18" height="37" fill="#86b6e2" />
            <rect x="86" y="4" width="18" height="37" fill="#86b6e2" />
          </g>
          <line x1="22" y1="4" x2="22" y2="41" stroke="#fff" strokeWidth="0.5" />
          <line x1="86" y1="4" x2="86" y2="41" stroke="#fff" strokeWidth="0.5" />
          <rect className="ap-fz" x="4" y="4" width="100" height="37" fill="none" stroke={active === 'line' ? '#c23b22' : '#fff'} strokeWidth={active === 'line' ? 1.2 : 0.6} style={{ opacity: dim('line') }} />
          {/* Brick marks: 18 m from each goal line (x = 40, 68), midway between the sidelines. */}
          <g className="ap-fz" stroke={active === 'brick' ? '#195de6' : '#2c3e32'} strokeWidth={active === 'brick' ? 1.3 : 0.7} style={{ opacity: dim('brick') }}>
            <path d="M39 22.5 h2 M40 21.5 v2" />
            <path d="M67 22.5 h2 M68 21.5 v2" />
          </g>
          <g fontSize="2.8" textAnchor="middle" fill="#1d3a2a">
            <text x="54" y="17" opacity={active && active !== 'central' ? 0.3 : 0.8}>64 m</text>
            <text x="13" y="17" opacity={active && active !== 'ez' ? 0.3 : 0.8}>18 m</text>
            <text x="95" y="17" opacity={active && active !== 'ez' ? 0.3 : 0.8}>18 m</text>
          </g>
          <text x="54" y="2.9" fontSize="2.4" textAnchor="middle" fill="#607886">100 m</text>
          <text x="106.2" y="22.5" fontSize="2.4" textAnchor="middle" fill="#607886" transform="rotate(90 106.2 22.5)">37 m</text>
        </svg>
      </div>
      <div className="ap-duo-b">
        {keys.map((k) => (
          <button key={k.z} type="button" className="ap-key" aria-pressed={active === k.z} onClick={() => setActive((a) => (a === k.z ? null : k.z))}>
            <b>{pick(lang, k.label)}</b>
            <span>{pick(lang, k.desc)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────── Interactive stall-count demo (WFDF Rules 9.1, 13.2.2) ───────── */
type StallPhase = 'idle' | 'counting' | 'thrown' | 'stalled';

function StallDemo() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  const [phase, setPhase] = useState<StallPhase>('idle');
  const [count, setCount] = useState(0);
  const [thrownAt, setThrownAt] = useState(0);
  const timer = useRef<number>(0);
  const countRef = useRef(0);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const start = () => {
    window.clearInterval(timer.current);
    countRef.current = 1;
    setCount(1);
    setPhase('counting');
    timer.current = window.setInterval(() => {
      const next = countRef.current + 1;
      countRef.current = next;
      setCount(next);
      // A stall-out happens as the marker starts to say "ten".
      if (next >= 10) {
        window.clearInterval(timer.current);
        setPhase('stalled');
      }
    }, 1000);
  };
  const release = () => {
    window.clearInterval(timer.current);
    setThrownAt(countRef.current);
    setPhase('thrown');
  };
  const reset = () => {
    window.clearInterval(timer.current);
    countRef.current = 0;
    setCount(0);
    setPhase('idle');
  };

  const C = 2 * Math.PI * 52;
  const frac = phase === 'idle' ? 0 : Math.min(count, 10) / 10;

  return (
    <div className="ap-stall">
      <svg className="ap-stall-ring" viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r="52" fill="none" stroke="var(--aero-line)" strokeWidth="10" />
        <circle
          className="ap-stall-arc"
          cx="70"
          cy="70"
          r="52"
          fill="none"
          stroke={phase === 'stalled' ? '#c23b22' : 'var(--aero-accent)'}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          transform="rotate(-90 70 70)"
        />
        <text className="ap-stall-word" x="70" y="52" textAnchor="middle">
          {phase === 'idle' ? '' : 'STALLING'}
        </text>
        <text className="ap-stall-num" x="70" y="88" textAnchor="middle">
          {phase === 'idle' ? '–' : count}
        </text>
      </svg>

      <p className={`ap-stall-msg${phase === 'stalled' ? ' is-bad' : phase === 'thrown' ? ' is-good' : ''}`} aria-live="polite">
        {phase === 'idle' && (zh ? '标记者从 1 数到 10，每个数至少隔 1 秒。赶在他喊出“10”之前把盘传出去。' : 'The marker counts 1 to 10, at least a second apart. Throw before they say “ten.”')}
        {phase === 'counting' && (zh ? `Stalling ${count}……快传！` : `Stalling ${count}… throw it!`)}
        {phase === 'thrown' && (zh ? `在“${thrownAt}”时出手——安全，比赛继续。` : `Released on “${thrownAt}” — safe, play continues.`)}
        {phase === 'stalled' && (zh ? '计数到限（stall-out）：“10”喊出时盘还在手里，盘权转换。' : 'Stall-out: the disc was still in hand at “ten” — turnover.')}
      </p>

      <div className="ap-cta-row">
        {phase === 'counting' ? (
          <button type="button" className="aero-primary" onClick={release}>
            {zh ? '传盘！' : 'Throw!'}
          </button>
        ) : (
          <button type="button" className="aero-primary" onClick={start}>
            {phase === 'idle' ? (zh ? '开始读秒' : 'Start the count') : zh ? '再来一次' : 'Again'}
          </button>
        )}
        {phase !== 'idle' && (
          <button type="button" className="ap-ghost" onClick={reset}>
            {zh ? '重置' : 'Reset'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────── Ten core rules + turnovers (WFDF Rules, condensed) ───────── */
const CORE: { t: Bi; d: Bi; why: Bi }[] = [
  {
    t: ['目标：把盘传进得分区', 'The goal: pass it into the end zone'],
    d: ['把飞盘传给队友，并由队友在对方得分区（end zone）内接住，得 1 分。', 'Move the disc by passing; a teammate who catches it in the end zone you’re attacking scores 1 goal.'],
    why: ['所有跑位和传球，最终都是为了这一次接盘。', 'Every cut and throw is building toward that one catch.'],
  },
  {
    t: ['持盘不能跑', 'No running with the disc'],
    d: ['接到盘必须尽快停下，之后只能以一只脚为轴心脚（pivot）转身，不能带盘跑。', 'Once you catch it, stop as soon as you can, then only pivot on one foot — you may not run with the disc.'],
    why: ['想摆脱防守，靠转身、跨步和假动作，而不是脚下加速。', 'You beat a defender with pivots and fakes, not by sprinting with it.'],
  },
  {
    t: ['持盘计数：10 秒', 'The stall count: ten seconds'],
    d: ['标记者（marker）在 3 米内时，从“stalling 1”数到 10，每个数至少隔 1 秒；没在“10”之前传出就计数到限（stall-out），盘权转换。', 'With the marker within 3 m, the count runs “stalling one … ten,” at least a second apart. Not released before “ten” is a stall-out turnover.'],
    why: ['逼着每个人不停做决定，比赛永远在动。', 'It forces a decision every few seconds, so the game never stalls.'],
  },
  {
    t: ['一个标记者', 'One marker at a time'],
    d: ['持盘者 3 米内只能有 1 名防守者；第二个人没在盯别的进攻者就是双人包夹（double team），属于标记违规（marking infraction）。', 'Only one defender may be within 3 m of the thrower. A second one not guarding someone else is a double team — a marking infraction.'],
    why: ['持盘者需要空间看场、出手，防守靠人数会破坏平衡。', 'The thrower needs room to see and throw; crowding would tip the balance.'],
  },
  {
    t: ['任何方向都能传', 'Pass in any direction'],
    d: ['飞盘可以向前、向后、横传给任意队友。比赛中没有越位——开盘前双方分站两条得分线，一旦开盘，人人都能跑动。', 'The disc may go forward, backward or sideways to any teammate. There’s no offside in play — only at the pull, where the teams line up on their goal lines.'],
    why: ['回传找空间，再纵深推进，是飞盘进攻的基本节奏。', 'Reset backward to find space, then attack deep — that’s the rhythm.'],
  },
  {
    t: ['盘权瞬间转换', 'Possession flips instantly'],
    d: ['传球没接住就是盘权转换（turnover）：落地、被拦截（interception）、出界、被封阻（block）、计数到限都算，防守方当场变进攻方。', 'An incomplete pass is a turnover — a drop, interception, out-of-bounds disc, block or stall-out — and the defense becomes the offense on the spot.'],
    why: ['没有停表、没有发球：攻守在一瞬间互换，这是飞盘独特的节奏。', 'No whistle, no reset — the switch is instant. That tempo is ultimate’s signature.'],
  },
  {
    t: ['死球后从哪开始', 'Where play restarts'],
    d: ['盘停在中央区就原地开球；出界则取最近的中央区边界点；在自己防守的得分区内则可选原地或走到最近得分线。', 'Pick up in the central zone where it stopped; if it went out, take the nearest point on the central zone; in your defending end zone, start there or walk to the nearest goal line.'],
    why: ['规则尽量“还原”没有失误时最可能出现的局面，而不是惩罚。', 'The rules try to restore what would most likely have happened, not to punish.'],
  },
  {
    t: ['没有身体接触', 'No contact'],
    d: ['极限飞盘是非身体接触运动（non-contact sport）：不能推、撞、抢，也不能做掩护（pick）。防守靠站位和手上的功夫。', 'Ultimate is a non-contact sport: no pushing, bumping, grabbing or picks. You defend with positioning and your hands.'],
    why: ['安全和尊重优先——这也是飞盘精神的一部分。', 'Safety and respect come first — part of the Spirit of the Game.'],
  },
  {
    t: ['自己裁判', 'You make the calls'],
    d: ['场上没有裁判。犯规、出界、得分，都由球员自己叫停（call）并一起解决，这叫自我裁决（self-officiating）。', 'There are no referees. Players call and resolve everything themselves — fouls, lines, goals. This is self-officiating.'],
    why: ['把公平的责任交到每个人手里。', 'It puts fairness in every player’s hands.'],
  },
  {
    t: ['飞盘精神贯穿始终', 'Spirit runs through all of it'],
    d: ['鼓励激烈对抗，但永远不以牺牲相互尊重、规则、安全和比赛乐趣为代价。这就是飞盘精神（Spirit of the Game）。', 'Highly competitive play is encouraged, but never at the cost of mutual respect, the rules, safety or the basic joy of play — the Spirit of the Game.'],
    why: ['它是规则书的第一章，不是附录。', 'It’s the first chapter of the rulebook, not a footnote.'],
  },
];

const TURNOVERS: { t: Bi; d: Bi }[] = [
  { t: ['传丢（throwaway）', 'Throwaway'], d: ['传出去没人接住，盘落地。', 'A pass nobody catches hits the ground.'] },
  { t: ['掉盘（drop）', 'Drop'], d: ['接盘失误，盘落地。', 'A catchable pass is dropped.'] },
  { t: ['拦截（interception）', 'Interception'], d: ['防守方在空中把盘截获。', 'A defender catches the pass in the air.'] },
  { t: ['封阻（block）', 'Block'], d: ['防守方把盘拍落。', 'A defender knocks the disc down.'] },
  { t: ['出界（out of bounds）', 'Out of bounds'], d: ['盘或接盘者碰到界外。', 'The disc or receiver touches out of bounds.'] },
  { t: ['计数到限（stall-out）', 'Stall-out'], d: ['没在“10”之前把盘传出去。', 'Not released before the marker says “ten.”'] },
];

const FLOW: { t: Bi; d: Bi }[] = [
  { t: ['列队', 'Line up'], d: ['双方各站在自己防守的得分线上。', 'Both teams stand on their defending goal lines.'] },
  { t: ['开盘（pull）', 'The pull'], d: ['防守方把盘远远掷向进攻方，比赛开始。', 'The defense throws the disc downfield to start the point.'] },
  { t: ['推进', 'Move it'], d: ['跑位、传盘，一路传向对方得分区。', 'Cut and pass the disc toward the far end zone.'] },
  { t: ['得分或转换', 'Score or turn'], d: ['区内接到盘得分；失误则盘权转换。', 'Catch in the end zone to score; a miss is a turnover.'] },
  { t: ['再来', 'Reset'], d: ['得分后换端、换攻防，重新开盘。', 'After a goal, swap ends, swap roles, pull again.'] },
];

export default function Rules() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  return (
    <PageShell
      slug="/rules"
      art="rules"
      title={zh ? <>规则很短，<br />判断很多。</> : <>Short rules,<br />lots of decisions.</>}
      lede={[
        '极限飞盘（ultimate frisbee）是 7 人一队、非身体接触、球员自己当裁判的运动。下面这些内容依据 WFDF《极限飞盘规则 2025–2028》，先看一张盘怎么变成一场比赛。',
        'Ultimate is a seven-a-side, non-contact sport that players officiate themselves. What follows tracks the WFDF Rules of Ultimate 2025–2028 — starting with how one disc becomes a game.',
      ]}
    >
      <Section
        id="overview"
        label={zh ? '01 · 一句话' : '01 · In one sentence'}
        heading={zh ? '在对方得分区接住盘，就得分。' : 'Catch it in their end zone to score.'}
        intro={zh ? '其余的规则，都是在保证这件事公平、流畅地发生。' : 'Everything else keeps that fair and flowing.'}
      >
        <div className="ap-prose">
          <p className="ap-lead">
            {zh
              ? <>两队各 7 人，在 100 × 37 米的场地上用一张飞盘比赛。持盘者不能跑，只能传；传球没接住就<Term zh="盘权转换" en="turnover" />，对方立刻转为进攻。</>
              : <>Two teams of seven play on a 100 × 37 m field with a single disc. The thrower can’t run, only pass; any incomplete pass is a turnover, and the other team attacks at once.</>}
          </p>
          <dl className="ap-specs">
            <div><dt>{zh ? '每队场上' : 'Players per side'}</dt><dd>7</dd></div>
            <div><dt>{zh ? '一局打到' : 'Game to'}</dt><dd>{zh ? '15 分' : '15 goals'}</dd></div>
            <div><dt>{zh ? '中场' : 'Half time'}</dt><dd>{zh ? '一方先到 8 分' : 'first team to 8'}</dd></div>
            <div><dt>{zh ? '时长' : 'Length'}</dt><dd>{zh ? '约 100 分钟（可设时间帽）' : '~100 min (optional cap)'}</dd></div>
          </dl>
        </div>
      </Section>

      <Section
        id="field"
        label={zh ? '02 · 球场' : '02 · The field'}
        heading={zh ? '100 × 37 米，两端各留 18 米。' : '100 × 37 m, 18 m at each end.'}
        intro={zh ? '点一点右边，看看每个区域是什么。' : 'Tap a label to light up each zone.'}
      >
        <FieldDiagram />
      </Section>

      <Section
        id="flow"
        label={zh ? '03 · 一分怎么打' : '03 · How a point plays'}
        heading={zh ? '每一分都从开盘开始。' : 'Every point starts with a pull.'}
        full
      >
        <ol className="ap-rail">
          {FLOW.map((s, i) => (
            <li key={i}>
              <h3>{pick(lang, s.t)}</h3>
              <p>{pick(lang, s.d)}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="core"
        label={zh ? '04 · 十条核心' : '04 · The core rules'}
        heading={zh ? '记住这些，就能上场。' : 'Know these, and you can play.'}
        intro={zh ? '每条都配一句“为什么这样设计”。' : 'Each one with a line on why it exists.'}
      >
        <ol className="ap-numbers">
          {CORE.map((r, i) => (
            <li key={i}>
              <span className="ap-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{pick(lang, r.t)}</h3>
                <p>{pick(lang, r.d)}</p>
                <span className="ap-why">{pick(lang, r.why)}</span>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="stall"
        label={zh ? '05 · 持盘计数' : '05 · The stall count'}
        heading={zh ? '试试看：10 秒内传出去。' : 'Try it: throw within ten.'}
        intro={zh ? '从“1”数起、每个数至少 1 秒，所以真正的窗口其实略多于 9 秒。' : 'It starts at “one” a second apart, so the real window is just over nine seconds.'}
      >
        <StallDemo />
      </Section>

      <Section
        id="turnovers"
        label={zh ? '06 · 盘权转换' : '06 · Turnovers'}
        heading={zh ? '六种常见的丢权方式。' : 'Six ways possession flips.'}
        full
      >
        <div className="ap-cards">
          {TURNOVERS.map((c, i) => (
            <article key={i} className="ap-card">
              <span className="ap-tag">{String.fromCharCode(65 + i)}</span>
              <h3>{pick(lang, c.t)}</h3>
              <p>{pick(lang, c.d)}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        id="sources"
        label={zh ? '07 · 来源与诚实标注' : '07 · Sources & honesty'}
        heading={zh ? '以官方规则为准。' : 'The official rules win.'}
      >
        <div className="ap-prose">
          <p>
            {zh
              ? <>本页依据 <a href="https://rules.wfdf.sport/" target="_blank" rel="noopener noreferrer">WFDF《极限飞盘规则 2025–2028》</a>（2025 年 1 月 1 日生效，采用 CC BY 4.0 许可）整理。</>
              : <>This page follows the <a href="https://rules.wfdf.sport/" target="_blank" rel="noopener noreferrer">WFDF Rules of Ultimate 2025–2028</a> (effective 1 January 2025, CC BY 4.0).</>}
          </p>
          <p>
            {zh
              ? '本站的 3D 游戏做了简化：没有真实的身体碰撞，持盘计数由程序自动进行。真实比赛的判罚以赛事规则为准。'
              : 'The 3D game here simplifies things: there’s no real physical contact and the stall count runs automatically. Real matches follow the event’s rules.'}
          </p>
        </div>
      </Section>
    </PageShell>
  );
}
