'use client';

import { useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { pick, type Bi } from '@/content/shared';
import PageShell, { Section, Term } from '@/components/PageShell';

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
    <div>
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

export default function Fouls() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  return (
    <PageShell
      slug="/fouls"
      title={zh ? <>喊出来，<br />再说清楚。</> : <>Call it,<br />then explain.</>}
      lede={[
        '极限飞盘没有裁判。犯规和违例由场上球员自己叫停，再由当事双方一起解决。这页讲清楚：有哪些犯规和违例，以及一次叫停之后会发生什么。',
        'Ultimate has no referees. Players make the calls themselves, and the players involved resolve them together. Here’s what the calls are — and what happens after one.',
      ]}
    >
      <Section
        id="kinds"
        label={zh ? '01 · 三种违反' : '01 · Three kinds of breach'}
        heading={zh ? '犯规、违规、违例。' : 'Fouls, infractions, violations.'}
        intro={zh ? '先分清这三类，后面的流程才讲得通。' : 'Tell them apart first; the rest follows.'}
        full
      >
        <div className="ap-cards">
          {KINDS.map((k, i) => (
            <article key={i} className="ap-card">
              <span className="ap-tag">{pick(lang, k.tag)}</span>
              <h3>{pick(lang, k.t)}</h3>
              <p>{pick(lang, k.d)}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        id="flow"
        label={zh ? '02 · 叫停之后' : '02 · After a call'}
        heading={zh ? '一次叫停，怎么收场？' : 'A call — then what?'}
        intro={zh ? '选一个对方的回应，看看比赛怎么继续。' : 'Pick a response to see how play resumes.'}
        full
      >
        <CallFlow />
      </Section>

      <Section
        id="fouls"
        label={zh ? '03 · 常见犯规' : '03 · Common fouls'}
        heading={zh ? '都和身体接触有关。' : 'All about contact.'}
        full
      >
        <div className="ap-cards">
          {FOULS.map((c, i) => (
            <article key={i} className={`ap-card${c.danger ? ' is-danger' : ''}`}>
              <span className="ap-tag">{pick(lang, c.tag)}</span>
              <h3>{pick(lang, c.t)}</h3>
              <p>{pick(lang, c.d)}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        id="violations"
        label={zh ? '04 · 常见违规与违例' : '04 · Infractions & violations'}
        heading={zh ? '不涉及接触的那些。' : 'The ones without contact.'}
        full
      >
        <div className="ap-cards">
          {VIOLATIONS.map((c, i) => (
            <article key={i} className="ap-card">
              <span className="ap-tag">{pick(lang, c.tag)}</span>
              <h3>{pick(lang, c.t)}</h3>
              <p>{pick(lang, c.d)}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        id="speak"
        label={zh ? '05 · 怎么叫停' : '05 · How to make a call'}
        heading={zh ? '说事实，不说情绪。' : 'State facts, not feelings.'}
      >
        <div className="ap-prose">
          <p>
            {zh
              ? <>叫停的人要能简短说出<strong>客观依据</strong>：“我看到你出手时轴心脚抬起来了。”如果你连自己看到什么都说不清，就不该叫。</>
              : <>If you call, be ready to state the <strong>objective evidence</strong> briefly: “I saw your pivot foot lift as you threw.” If you can’t, you shouldn’t call.</>}
          </p>
          <p>
            {zh
              ? <>给对方说话的机会，听他的视角，用尊重的语气——哪怕有语言障碍，也可以用手势比划。只在<strong>足以影响结果</strong>或涉及安全时才叫停。</>
              : <>Give your opponent a chance to speak, listen, and use respectful words — gestures are fine across a language barrier. Only call when a breach is <strong>big enough to change the outcome</strong> or affects safety.</>}
          </p>
          <p>
            {zh
              ? <>WFDF 鼓励用标准<Term zh="手势" en="hand signals" />沟通：V 形双手 = 违例，双拳相碰 = 争议，一臂平伸、另一前臂横砍 = 犯规。</>
              : <>WFDF encourages the standard hand signals: a “V” for a violation, two fists bumped for a contest, one arm chopped by the other forearm for a foul.</>}
          </p>
        </div>
      </Section>

      <Section
        id="advisor"
        label={zh ? '06 · 比赛顾问' : '06 · Game advisors'}
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
              ? '这正是极限飞盘的底色：规则是共享的，责任在你。下一页，我们聊聊支撑这一切的飞盘精神。'
              : 'That’s the heart of ultimate: the rules are shared, the responsibility is yours. Next, the Spirit of the Game that holds it all together.'}
          </p>
        </div>
      </Section>
    </PageShell>
  );
}
