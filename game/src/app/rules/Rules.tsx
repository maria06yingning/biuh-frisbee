'use client';

import { useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { pick, type Bi } from '@/content/shared';
import PageShell, { Section, Term } from '@/components/PageShell';
import PointFlow from '@/components/PointFlow';
import RuleIllustration, { type RuleSceneId } from '@/components/RuleIllustrations';
import RuleCitation from '@/components/RuleCitation';

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
          <rect className="ap-fz" x="22" y="4" width="64" height="37" fill="#8fd17e" style={{ opacity: dim('central') }} />
          <g className="ap-fz" style={{ opacity: dim('ez') }}>
            <rect x="4" y="4" width="18" height="37" fill="#bff6ff" />
            <rect x="86" y="4" width="18" height="37" fill="#bff6ff" />
          </g>
          <line x1="22" y1="4" x2="22" y2="41" stroke="#1b1a2e" strokeWidth="0.7" />
          <line x1="86" y1="4" x2="86" y2="41" stroke="#1b1a2e" strokeWidth="0.7" />
          <rect className="ap-fz" x="4" y="4" width="100" height="37" fill="none" stroke={active === 'line' ? '#c23b22' : '#fff'} strokeWidth={active === 'line' ? 1.2 : 0.6} style={{ opacity: dim('line') }} />
          {/* Brick marks: 18 m from each goal line (x = 40, 68), midway between the sidelines. */}
          <g className="ap-fz" stroke={active === 'brick' ? '#14c2d8' : '#1b1a2e'} strokeWidth={active === 'brick' ? 1.3 : 0.7} style={{ opacity: dim('brick') }}>
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
    d: ['标记者（marker）在轴心点 3 米内时，可从“stalling 1”数到 10，相邻数字起始至少间隔 1 秒；未在“10”开始前出手，才构成计数到限（stall-out）。', 'The marker may count when within 3 m of the pivot point. Each number must start at least one second apart; a stall-out occurs if the throw is not released before the start of “ten”.'],
    why: ['逼着每个人不停做决定，比赛永远在动。', 'It forces a decision every few seconds, so the game never stalls.'],
  },
  {
    t: ['双人包夹（double team）', 'Double team'],
    d: ['除标记者外，另一名防守者若在持盘者轴心点 3 米内，且没有负责防守另一名进攻者，就构成双人包夹（double team）。仅仅跑过这片区域不算。', 'A defender other than the marker within 3 m of the thrower’s pivot point is a double team only if they are not guarding another offensive player. Merely running through the area is not a double team.'],
    why: ['持盘者需要空间看场、出手，防守靠人数会破坏平衡。', 'The thrower needs room to see and throw; crowding would tip the balance.'],
  },
  {
    t: ['任何方向都能传', 'Pass in any direction'],
    d: ['飞盘可以向前、向后、横传给任意队友。比赛中没有越位——开盘前双方分站两条得分线，一旦开盘，人人都能跑动。', 'The disc may go forward, backward or sideways to any teammate. There’s no offside in play — only at the pull, where the teams line up on their goal lines.'],
    why: ['回传找空间，再纵深推进，是飞盘进攻的基本节奏。', 'Reset backward to find space, then attack deep — that’s the rhythm.'],
  },
  {
    t: ['盘权转换（turnover）', 'Turnover'],
    d: ['传丢（throwaway）、接盘时掉盘（drop）、被拦截（interception）、出界（out of bounds）、被封阻（block）或计数到限（stall-out），都会导致盘权转换；防守方立即成为进攻方。', 'A throwaway, drop, interception, out-of-bounds disc, block or stall-out causes a turnover: the defense immediately becomes the offense.'],
    why: ['没有停表、没有发球：攻守在一瞬间互换，这是飞盘独特的节奏。', 'No whistle, no reset — the switch is instant. That tempo is ultimate’s signature.'],
  },
  {
    t: ['比赛停下后如何恢复', 'Where play restarts'],
    d: ['飞盘停在中央区，就在原地恢复比赛；出界时，在最近的中央区边界点恢复；若盘停在己方防守得分区，可从原地恢复，或拿盘走到最近得分线后恢复。', 'If the disc stops in the central zone, restart where it stopped; after it goes out, restart at the nearest point on the central-zone boundary. In your defending end zone, restart there or walk the disc to the nearest goal line.'],
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

const RULE_TOPICS: { label: Bi; indices: number[] }[] = [
  { label: ['得分与目标', 'Scoring'], indices: [0] },
  { label: ['持盘与推进', 'Possession & movement'], indices: [1, 2, 3, 4] },
  { label: ['转换与恢复', 'Turnovers & restarts'], indices: [5, 6] },
  { label: ['安全与公平', 'Safety & fairness'], indices: [7, 8, 9] },
  { label: ['常见转换', 'Common turnovers'], indices: [-1, -2, -3, -4, -5, -6] },
];

const RULE_SCENES: RuleSceneId[] = ['goal', 'travel', 'stall', 'marker', 'directions', 'turnover', 'restart', 'contact', 'self-officiate', 'spirit'];
const TURNOVER_SCENES: RuleSceneId[] = ['throwaway', 'drop', 'interception', 'block', 'out', 'stall-out'];
const RULE_SOURCES = ['14.1', '18.2', '9.1、9.3、13.2.2', '18.1.1.5', 'Introduction、7.1–7.3', '13.1–13.2', '8.5、13.7–13.11', '12.6、15.1', '1.1、1.3', '1.2–1.6'];
const TURNOVER_SOURCES = ['13.1.1', '12.1.1、13.1.1', '13.1.2', '13.1.1', '11.1、11.8、13.8', '9.1、13.2.2'];

function RuleManual() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  const [topic, setTopic] = useState(0);
  const [open, setOpen] = useState<number | null>(0);
  const rules = RULE_TOPICS[topic].indices;
  return (
    <div className="ap-codex">
      <div className="ap-codex-tabs" role="tablist" aria-label={zh ? '规则主题' : 'Rule topics'}>
        {RULE_TOPICS.map((item, i) => (
          <button key={i} type="button" role="tab" aria-selected={topic === i} onClick={() => { setTopic(i); setOpen(null); }}>
            {pick(lang, item.label)}
          </button>
        ))}
      </div>
      <div className="ap-codex-list">
        {rules.map((index) => {
          const turnover = index < 0;
          const item = turnover ? TURNOVERS[-index - 1] : CORE[index];
          const expanded = open === index;
          const panelId = `rule-panel-${index}`;
          return (
            <article key={index} className={`ap-codex-entry${expanded ? ' is-open' : ''}`}>
              <button className="ap-codex-trigger" type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setOpen(expanded ? null : index)}>
                <span className="ap-codex-mark" aria-hidden="true">{turnover ? '↻' : String(index + 1).padStart(2, '0')}</span>
                <span>{pick(lang, item.t)}</span>
                <span className="ap-codex-plus" aria-hidden="true">{expanded ? '−' : '+'}</span>
              </button>
              <div className="ap-codex-panel" id={panelId} hidden={!expanded}>
                <RuleIllustration
                  id={turnover ? TURNOVER_SCENES[-index - 1] : RULE_SCENES[index]}
                  alt={`${pick(lang, item.t)} — ${pick(lang, item.d)}`}
                  lang={lang}
                />
                <div className="ap-codex-copy">
                  <p>{pick(lang, item.d)}</p>
                  {!turnover && <p className="ap-codex-aside">{pick(lang, CORE[index].why)}</p>}
                  <RuleCitation reference={turnover ? TURNOVER_SOURCES[-index - 1] : RULE_SOURCES[index]} lang={lang} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

const TURNOVERS: { t: Bi; d: Bi }[] = [
  { t: ['传丢（throwaway）', 'Throwaway'], d: ['传出去没人接住，盘落地。', 'A pass nobody catches hits the ground.'] },
  { t: ['掉盘（drop）', 'Drop'], d: ['接盘失误，盘落地。', 'A catchable pass is dropped.'] },
  { t: ['拦截（interception）', 'Interception'], d: ['防守方在空中把盘截获。', 'A defender catches the pass in the air.'] },
  { t: ['封阻（block）', 'Block'], d: ['防守方把盘拍落。', 'A defender knocks the disc down.'] },
  { t: ['出界（out of bounds）', 'Out of bounds'], d: ['盘或接盘者碰到界外。', 'The disc or receiver touches out of bounds.'] },
  { t: ['计数到限（stall-out）', 'Stall-out'], d: ['没在“10”之前把盘传出去。', 'Not released before the marker says “ten.”'] },
];

export default function Rules() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  return (
    <PageShell slug="/rules">
      <Section
        id="overview"
        label={zh ? '比赛目标' : 'The objective'}
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
        label={zh ? '场地地图' : 'The field'}
        heading={zh ? '100 × 37 米，两端各留 18 米。' : '100 × 37 m, 18 m at each end.'}
        intro={zh ? '点一点右边，看看每个区域是什么。' : 'Tap a label to light up each zone.'}
      >
        <FieldDiagram />
      </Section>

      <Section
        id="flow"
        label={zh ? '一分的节奏' : 'A point in motion'}
        heading={zh ? '每一分都从开盘开始。' : 'Every point starts with a pull.'}
        full
      >
        <PointFlow />
      </Section>

      <Section
        id="core"
        label={zh ? '规则手册' : 'Rulebook'}
        heading={zh ? '从一个场景开始看规则。' : 'Explore the rules through play.'}
        intro={zh ? '按主题浏览，点开条目看动作图解与规则说明。' : 'Choose a topic, then open a rule for its scene and explanation.'}
        full
      >
        <RuleManual />
      </Section>

      <Section
        id="sources"
        label={zh ? '规则来源' : 'Sources'}
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
