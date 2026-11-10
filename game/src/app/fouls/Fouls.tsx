'use client';

import { useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { pick, type Bi } from '@/content/shared';
import PageShell, { Section } from '@/components/PageShell';
import FoulIllustration, { CallDiagram, type FoulSceneId } from '@/components/FoulIllustrations';

/* ───────── Interactive "what happens after a call" (WFDF Rules 15/16) ───────── */
type Outcome = 'accepted' | 'contested' | 'retracted' | 'nostop';

function CallFlow() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  const [outcome, setOutcome] = useState<Outcome>('accepted');
  const [phase, setPhase] = useState(0);

  const options: { id: Outcome; label: Bi; result: Bi }[] = [
    {
      id: 'accepted',
      label: ['接受（accepted）', 'Accepted'],
      result: [
        '以本情景的接盘犯规为例：若对方接受，被犯规的接盘者在犯规地点获得盘权；按规则确认（check）后恢复比赛。',
        'The other player agrees. Play resumes per the rule — e.g. a fouled receiver gets the disc at the spot, and play restarts with a check.',
      ],
    },
    {
      id: 'contested',
      label: ['争议（contested）', 'Contested'],
      result: [
        '本情景是接盘犯规：若对方争议该叫停，WFDF 规定飞盘回到传球队员，由传球队员重新持盘并确认后恢复。',
        'No agreement, and it isn’t clear what happened — the disc goes back to the last undisputed thrower, as if the throw never happened.',
      ],
    },
    {
      id: 'retracted',
      label: ['撤回（retracted）', 'Retracted'],
      result: [
        '叫停者可在认为自己的叫停不正确时主动撤回；之后按“由叫停者造成的违规被接受”处理。具体恢复仍看对应规则。',
        'The caller decides the call was wrong and takes it back. Play resumes as if that side had committed the breach.',
      ],
    },
    {
      id: 'nostop',
      label: ['不影响（didn’t affect）', 'Didn’t affect the play'],
      result: [
        '只有当双方当事人都同意这次事件或叫停没有影响比赛结果时，结果才照算；若未得分，受影响球员可弥补位置劣势后确认恢复。',
        'Only if both players involved agree that the event or call did not affect the outcome does the play stand. If no goal resulted, affected players may make up positional disadvantage and restart with a check.',
      ],
    },
  ];
  const current = options.find((o) => o.id === outcome)!;

  const steps: { t: Bi; d: Bi }[] = [
    { t: ['叫停并复述', 'Call and echo'], d: ['只有被犯规的一方可叫“Foul!”；知道叫停后，场上球员应尽快停止并复述叫停。', 'Only the fouled player calls “Foul!”; once aware, players stop and echo the call.'] },
    { t: ['说明并倾听', 'Explain and listen'], d: ['当事人简短说明各自看到的情况，给对方回应机会，并考虑对方视角。', 'Players briefly explain what they saw, give the other person a chance to respond, and consider their view.'] },
    { t: ['选择回应', 'Choose a response'], d: ['接受、争议或撤回；若双方同意叫停未影响结果，则按该情况的规则处理。', 'Accept, contest or retract; if both agree the call did not affect play, apply that specific rule.'] },
    { t: ['按条款恢复', 'Resume under the rule'], d: ['恢复位置和持盘者取决于具体叫停。本例只演示接盘犯规，不代表其他犯规的处理。', 'The restart location and possession depend on the specific call. This example covers receiving fouls only.'] },
  ];

  return (
    <div className="ap-call-practice">
      <div className="ap-call-scenario">
        <CallDiagram stage={phase} outcome={outcome} status={pick(lang, current.label)} lang={lang} />
        <div>
          <strong>{zh ? '情景：两名球员争抢飞盘时发生接触，接盘者喊出接盘犯规。' : 'Scenario: contact occurs while two players play the disc; the receiver calls a receiving foul.'}</strong>
          <p>{zh ? '选择下方步骤看沟通流程，再选择对方回应，查看本情景对应的处理。' : 'Step through the discussion below, then choose a response to see the outcome for this scenario.'}</p>
        </div>
      </div>
      <div className="ap-call-steps" role="group" aria-label={zh ? '叫停处理步骤' : 'Steps after a call'}>
        {steps.map((s, i) => <button key={i} type="button" aria-current={phase === i ? 'step' : undefined} onClick={() => setPhase(i)}><b>{i + 1}. {pick(lang, s.t)}</b><span>{pick(lang, s.d)}</span></button>)}
      </div>

      <div className="ap-choice" role="group" aria-label={zh ? '回应方式与共同判定' : 'Responses and mutual agreement'}>
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
        {zh ? '沟通应清楚、简短、尊重对方。恢复位置与持盘归属要按具体条款判断；不要把所有争议都简化成“还给上一位持盘者”。' : 'Keep the discussion clear, brief and respectful. Apply the specific rule to possession and restart position; not every contested call simply returns to the previous thrower.'}
      </p>
      <p className="ap-diagram-source">{zh ? <>WFDF《极限飞盘规则 2025–2028》第 15.7、15.10、15.11、16.3、17.2.2 条。</> : <>WFDF Rules of Ultimate 2025–2028 · Rules 15.7, 15.10, 15.11, 16.3 and 17.2.2.</>}</p>
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
  { tag: ['接盘', 'Receiving'], t: ['接盘犯规', 'Receiving foul'], d: ['一名球员在对手争抢飞盘之前、过程中或紧接之后主动造成非轻微接触，可能构成接盘犯规。接住盘后发生的手臂接触，或对方已无法继续争盘后的接触，通常不足以单独据此叫接盘犯规（危险动作、夺盘犯规等另论）。接受后，被犯规者在犯规地点获得持盘权。', 'A player initiates non-minor contact before, during or directly after either player makes a play on the disc. Contact to the arms or hands after a catch, or after the opponent can no longer play the disc, is not by itself sufficient for a receiving-foul call (dangerous play and strip fouls are separate). If accepted, the fouled player gains possession at the breach location.'] },
  { tag: ['标记', 'Marking'], t: ['标记犯规', 'Marking foul'], d: ['防守者对持盘者造成接触，或站位违规时接触。持盘者也可只喊“Contact”而不停表，计数从 1 重来。', 'The marker contacts the thrower, or does so while illegally positioned. The thrower may instead call “Contact” without stopping — the count restarts at one.'] },
  { tag: ['夺盘', 'Strip'], t: ['夺盘犯规', 'Strip foul'], d: ['犯规导致已经接住的盘被打掉。如果本该是一记得分，判进球。', 'A foul that knocks the disc out of a completed catch. If it would have been a goal, a goal is awarded.'] },
  { tag: ['阻挡', 'Blocking'], t: ['阻挡犯规', 'Blocking foul'], d: ['占住对方按正常速度和方向无法避开的位置，造成接触。', 'Taking a spot an opponent — moving at their established speed and line — can’t avoid, causing contact.'] },
  { danger: true, tag: ['危险动作', 'Dangerous'], t: ['危险动作', 'Dangerous play'], d: ['不顾他人安全的鲁莽动作，无论是否发生接触都算犯规。这条凌驾于其他犯规之上。', 'Reckless play that risks injury is a foul whether or not contact occurs. This rule overrides the others.'] },
  { tag: ['双方', 'Offsetting'], t: ['双方犯规', 'Offsetting fouls'], d: ['同一回合双方球员都叫了并接受犯规，或双方球员同时冲向同一点而发生非轻微接触，通常按双方犯规处理，盘回到上一位无争议持盘者。若接触发生在接盘之后，可能应按间接犯规处理（危险动作除外）。', 'Accepted fouls called by both teams on the same play, or non-minor contact caused by opposing players moving toward the same point, are generally offsetting and return the disc to the last undisputed thrower. Contact after the catch may instead be an indirect foul, except for dangerous play.'] },
];

const VIOLATIONS: { tag: Bi; t: Bi; d: Bi }[] = [
  { tag: ['走步', 'Travel'], t: ['走步（travel）', 'Travel'], d: ['没保持轴心脚，或接盘后没尽快减速。被喊出后回到正确位置，比赛多数情况下不停。', 'Moving the pivot foot, or not slowing down after a catch. Reset the pivot; usually play doesn’t stop.'] },
  { tag: ['快数', 'Fast count'], t: ['快数（fast count）', 'Fast count'], d: ['标记者可能未先喊“stalling”、起始数字错误、未按要求调整计数，或相邻数字间隔不足 1 秒。叫出标记违规后，按规则将计数退回到此前已完整喊出的数字减一；先纠正违规再继续。', 'A marker may fail to say “Stalling”, start from the wrong number, fail to adjust the count correctly, or leave less than one second between number starts. After a marking-infraction call, resume at the last fully uttered number minus one, once the illegal position is corrected.'] }, 
  { tag: ['双人包夹', 'Double team'], t: ['双人包夹（double team）', 'Double team'], d: ['持盘者 3 米内有第二名防守者，且没在盯别的进攻者。', 'A second defender within 3 m of the thrower who isn’t guarding another offensive player.'] },
  { tag: ['距离', 'Marking space'], t: ['盘位空间 / 跨站 / 环抱', 'Disc space · straddle · wrapping'], d: ['标记者贴得太近：身体离躯干不足一个盘的直径、脚跨在轴心脚上、或用手臂环住持盘者。', 'The marker crowds the thrower — within a disc-diameter of the torso, straddling the pivot, or wrapping with the arms.'] },
  { tag: ['掩护', 'Pick'], t: ['掩护（pick）', 'Pick'], d: ['防守者正跟随一名进攻者，却被另一名球员挡住去路、无法继续跟上时，可叫“Pick”。如果被跟随者与挡路者当时都在争抢飞盘，则不算掩护；只有防守方可叫。', 'A defender guarding an offensive player may call “Pick” when another player prevents them moving toward or with that player. It is not a pick if both the guarded player and obstructing player are making a play on the disc. Only the defense may call it.'] }, 
  { tag: ['开盘', 'Pull'], t: ['越位 / 抢跑', 'Offside · false start'], d: ['开盘时防守方提前过线（offside）或进攻方提前离线（false start）。必须在进攻方碰盘前喊出。', 'At the pull, the defense crosses early (offside) or the offense leaves early (false start). Call it before the offense touches the disc.'] },
];

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
  const sceneIds: FoulSceneId[][] = [
    ['receiving', 'marking', 'strip', 'blocking', 'dangerous', 'offsetting'],
    ['travel', 'fast-count', 'double-team', 'marking-space', 'pick', 'pull'],
    ['kind-foul', 'kind-infraction', 'kind-violation'],
  ];
  const sourceRefs = [
    ['17.2', '17.6', '17.3', '17.4', '17.1', '17.9'],
    ['18.2', '18.1.1.1', '18.1.1.5', '18.1.1.2–18.1.1.4', '18.3', '7.4–7.8'],
    ['15.1、15.4', '15.2、15.5', '15.3、15.6'],
  ];
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
                <FoulIllustration
                  id={sceneIds[group][index]}
                  alt={`${pick(lang, item.t)} — ${pick(lang, item.d)}`}
                  lang={lang}
                />
                <small className="ap-diagram-source">{zh ? `WFDF《极限飞盘规则 2025–2028》· 第 ${sourceRefs[group][index]} 条` : `WFDF Rules of Ultimate 2025–2028 · Rule ${sourceRefs[group][index]}`}</small>
                <p className="ap-codex-copy">{pick(lang, item.d)}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function SignalArm({ d, skin }: { d: string; skin: string }) {
  return <><path d={d} fill="none" stroke="#1b1a2e" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"/><path d={d} fill="none" stroke={skin} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/></>;
}
function SignalFist({ x, y, skin, rotate = 0 }: { x: number; y: number; skin: string; rotate?: number }) {
  return <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
    <rect x="-9" y="-7" width="18" height="15" rx="4" fill={skin} stroke="#1b1a2e" strokeWidth="2.5"/>
    <path d="M-5 -3h10M-5 0h10" stroke="#1b1a2e" strokeWidth="1.2" strokeLinecap="round"/>
  </g>;
}
function SignalFigure({ gesture, skin, hair }: { gesture: 'violation'|'contest'|'foul'; skin: string; hair: string }) {
  return <svg viewBox="0 0 180 210" aria-hidden="true">
    <ellipse cx="90" cy="199" rx="29" ry="5" fill="#1b1a2e" opacity=".28"/>
    <path d="M78 139L70 181M102 139L110 181" fill="none" stroke="#1b1a2e" strokeWidth="15" strokeLinecap="round"/>
    <path d="M78 140L70 181M102 140L110 181" fill="none" stroke={skin} strokeWidth="9" strokeLinecap="round"/>
    <path d="M69 178l-5 8-12 4h27l-1-8M111 178l5 8 12 4h-27l1-8" fill="#fff8e6" stroke="#1b1a2e" strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M82 49v10q8 8 16 0V49Z" fill={skin} stroke="#1b1a2e" strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M68 119h44l-3 24q-19 8-38 0z" fill="#1b1a2e" stroke="#1b1a2e" strokeWidth="3"/>
    <path d="M72 63Q90 55 108 63L116 123Q90 131 64 123Z" fill="#14c2d8" stroke="#1b1a2e" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M81 63l9 7 9-7" fill="none" stroke="#1b1a2e" strokeWidth="2.5" strokeLinejoin="round"/>
    <circle cx="90" cy="37" r="17" fill={skin} stroke="#1b1a2e" strokeWidth="3"/>
    <path d="M73 36Q70 17 88 16Q108 16 107 34L99 28Q88 34 74 31Z" fill={hair} stroke="#1b1a2e" strokeWidth="2.5" strokeLinejoin="round"/>
    <circle cx="84" cy="39" r="1.6" fill="#1b1a2e"/><circle cx="96" cy="39" r="1.6" fill="#1b1a2e"/>
    <path d="M86 47q4 3 8 0" fill="none" stroke="#1b1a2e" strokeWidth="1.8" strokeLinecap="round"/>
    {gesture === 'violation' && <>
      <SignalArm d="M73 72L57 51L46 22" skin={skin}/><SignalArm d="M107 72L123 51L134 22" skin={skin}/>
      <SignalFist x={44} y={17} skin={skin} rotate={-18}/><SignalFist x={136} y={17} skin={skin} rotate={18}/>
    </>}
    {gesture === 'contest' && <>
      <SignalArm d="M73 73L63 88L82 99" skin={skin}/><SignalArm d="M107 73L117 88L98 99" skin={skin}/>
      <SignalFist x={82} y={100} skin={skin} rotate={-5}/><SignalFist x={98} y={100} skin={skin} rotate={5}/>
    </>}
    {gesture === 'foul' && <>
      <SignalArm d="M107 74L131 76L157 76" skin={skin}/><SignalArm d="M73 73L96 61L126 78" skin={skin}/>
      <SignalFist x={163} y={76} skin={skin}/><SignalFist x={132} y={81} skin={skin} rotate={12}/>
    </>}
  </svg>;
}
function HandSignals() {
  const { lang } = useI18n();
  const items: { title: Bi; note: Bi; icon: 'violation'|'contest'|'foul'; skin: string; hair: string }[] = [
    { title: ['违例（violation）', 'Violation'], note: ['双臂举过头顶成 V 形，双拳闭合。', 'Raise both arms in a V above the head, with closed fists.'], icon: 'violation', skin: '#e6b48d', hair: '#3a2b29' },
    { title: ['争议（contest）', 'Contest'], note: ['胸前两拳相碰，手背朝外。', 'Bump two fists together in front of the chest, backs of hands facing out.'], icon: 'contest', skin: '#c9825e', hair: '#5a352b' },
    { title: ['犯规（foul）', 'Foul'], note: ['一臂平伸，另一前臂横切过这只手臂。', 'Hold one arm straight out and chop the other forearm across it.'], icon: 'foul', skin: '#f0c9a2', hair: '#24202b' },
  ];
  return <div className="ap-signal-grid">{items.map((item) => <article className="ap-signal-card" key={item.icon}>
    <SignalFigure gesture={item.icon} skin={item.skin} hair={item.hair}/>
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
        <p className="ap-diagram-source">{zh ? <>手势依据 WFDF《极限飞盘规则 2025–2028》附录 F。可查看 <a href="https://rules.wfdf.sport/wp-content/uploads/2025/03/WFDF-Rules-of-Ultimate-2025-2028-Hand-Signals.pdf" target="_blank" rel="noopener noreferrer">WFDF 官方完整手势图</a>。</> : <>Signals follow WFDF Rules of Ultimate 2025–2028, Appendix F. See the <a href="https://rules.wfdf.sport/wp-content/uploads/2025/03/WFDF-Rules-of-Ultimate-2025-2028-Hand-Signals.pdf" target="_blank" rel="noopener noreferrer">official WFDF hand-signal sheet</a>.</>}</p>
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
