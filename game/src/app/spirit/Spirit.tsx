'use client';

import { useMemo, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { pick, type Bi } from '@/content/shared';
import PageShell, { Section } from '@/components/PageShell';

/* ───────── Interactive Spirit scorecard (WFDF SOTG: five categories, 0–4, 2 = good) ───────── */
const CATS: { t: Bi; q: Bi }[] = [
  { t: ['规则知识与运用', 'Rules knowledge & use'], q: ['他们懂规则、也照着做吗？', 'Did they know and use the rules?'] },
  { t: ['犯规与身体接触', 'Fouls & body contact'], q: ['他们尽量避免身体接触了吗？', 'Did they avoid body contact?'] },
  { t: ['公正心', 'Fair-mindedness'], q: ['他们公正、客观吗？', 'Were they fair-minded?'] },
  { t: ['积极态度与自控', 'Positive attitude & self-control'], q: ['他们保持了自控和积极的态度吗？', 'Did they show self-control and a positive attitude?'] },
  { t: ['沟通', 'Communication'], q: ['他们沟通得当、尊重对方吗？', 'Did they communicate properly and respectfully?'] },
];

function Scorecard() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  const [scores, setScores] = useState<number[]>([2, 2, 2, 2, 2]);
  const total = useMemo(() => scores.reduce((a, b) => a + b, 0), [scores]);
  const note: string =
    total < 10
      ? zh ? '低于“好”——值得在赛后的精神圈里聊一聊。' : 'Below “good” — worth raising in the spirit circle.'
      : total === 10
      ? zh ? '正好是一场“好”的比赛：每项都给 2 分。' : 'A “good” game: a 2 in every category.'
      : zh ? '出色的飞盘精神。' : 'Excellent Spirit.';

  return (
    <div className="ap-score">
      {CATS.map((c, i) => (
        <div className="ap-score-row" key={i}>
          <div>
            <h3>{pick(lang, c.t)}</h3>
            <p>{pick(lang, c.q)}</p>
          </div>
          <div className="ap-dots" role="group" aria-label={pick(lang, c.t)}>
            {[0, 1, 2, 3, 4].map((v) => (
              <button
                key={v}
                type="button"
                className="ap-dot"
                aria-pressed={scores[i] === v}
                aria-label={`${pick(lang, c.t)}: ${v}`}
                onClick={() => setScores((s) => s.map((x, j) => (j === i ? v : x)))}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="ap-score-total" aria-live="polite">
        <b>{total} / 20</b>
        <span className="ap-score-note">{note}</span>
      </div>
      <p className="ap-hint">
        {zh ? '每项 0–4 分，2 分代表“好”，4 分代表出色。赛后两队互评，也给自己打分。' : 'Each category is 0–4; 2 is “good,” 4 is excellent. After a game, teams rate each other — and themselves.'}
      </p>
    </div>
  );
}

/* Spirit circle: alternating players around a disc (from WFDF Spirit Circles) */
function SpiritCircle() {
  const dots = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2 - Math.PI / 2;
    return { x: 150 + Math.cos(a) * 118, y: 150 + Math.sin(a) * 118, us: i % 2 === 0 };
  });
  return (
    <svg viewBox="0 0 300 300" aria-hidden="true">
      <circle cx="150" cy="150" r="118" fill="none" stroke="#1b1a2e" strokeWidth="2" strokeDasharray="3 7" />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="13" fill={d.us ? '#14c2d8' : '#ff5a4a'} stroke="#1b1a2e" strokeWidth="2.5" />
      ))}
      <ellipse cx="150" cy="150" rx="34" ry="12" fill="#ffd23f" stroke="#1b1a2e" strokeWidth="2.5" />
      <ellipse cx="150" cy="150" rx="20" ry="6" fill="none" stroke="#1b1a2e" strokeWidth="1.5" />
    </svg>
  );
}

const GOOD: Bi[] = [
  ['不再确信时，主动撤回自己的叫停', 'Retract a call once you no longer believe it'],
  ['争议之后，到场边和对手聊两句', 'Check in with an opponent after a tense moment'],
  ['为对手的好球或好精神鼓掌', 'Compliment an opponent’s play or Spirit'],
  ['上场前先自我介绍', 'Introduce yourself before the point'],
  ['面对分歧与挑衅，保持冷静', 'Stay calm through disagreement or provocation'],
];
const BAD: Bi[] = [
  ['危险动作和攻击性行为', 'Dangerous play and aggression'],
  ['故意犯规或故意违规', 'Intentional fouling or rule-breaking'],
  ['嘲讽、恐吓对手', 'Taunting or intimidating opponents'],
  ['不尊重对手的得分庆祝', 'Disrespectful celebration'],
  ['为了报复对方的叫停而乱叫', 'Retaliatory calls'],
];

export default function Spirit() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  return (
    <PageShell slug="/spirit">
      <Section
        id="preamble"
        label={zh ? '规则的第一章' : 'The first chapter'}
        heading={zh ? '责任，交给每个人。' : 'The responsibility is yours.'}
      >
        <figure className="ap-quote">
          <blockquote>
            {zh
              ? '“我们相信没有球员会故意违反规则；因此对无心之失没有严厉的处罚，只有一种恢复比赛的方式——尽量还原没有违规时最可能出现的局面。”'
              : '“It is trusted that no player will intentionally break the rules; thus there are no harsh penalties for inadvertent breaches, but rather a method for resuming play in a manner which simulates what would most likely have occurred had there been no breach.”'}
          </blockquote>
          <cite>
            {zh
              ? 'WFDF《极限飞盘规则 2025–2028》第 1.2 条（中文为本站译意）'
              : 'WFDF Rules of Ultimate 2025–2028, Rule 1.2'}
          </cite>
        </figure>
        <div className="ap-prose">
          <p>
            {zh
              ? '鼓励激烈对抗，但永远不以牺牲相互尊重、规则、球员安全和比赛乐趣为代价。这句话是规则书的第一章，不是写在最后的客套。'
              : 'Highly competitive play is encouraged — but never at the cost of mutual respect, the rules, player safety or the basic joy of play. That line opens the rulebook; it isn’t a closing courtesy.'}
          </p>
        </div>
      </Section>

      <Section
        id="why"
        label={zh ? '场上的信任' : 'Trust on the field'}
        heading={zh ? '你同时是球员和裁判。' : 'You’re a player and a referee.'}
      >
        <div className="ap-prose">
          <p>
            {zh
              ? '在仲裁任何争议时，每个球员都是裁判。所以规则要求你：懂规则、公正客观、诚实、把自己的看法说得清楚简短、给对方说话的机会、并尊重对方。'
              : 'In any dispute, every player acts as a referee. So the rules ask you to know them, be fair-minded and truthful, explain your view clearly and briefly, let opponents speak, and stay respectful.'}
          </p>
          <p>
            {zh
              ? '球队是飞盘精神的守护者：教会队员规则、约束表现不好的队友、也给对手建设性的反馈。这让整场比赛建立在信任之上，而不是对裁判的提防。'
              : 'Teams are guardians of the Spirit: they teach the rules, hold their own players accountable, and give opponents constructive feedback. The whole game rests on trust, not on policing a referee.'}
          </p>
        </div>
      </Section>

      <Section
        id="dos"
        label={zh ? '一些具体的选择' : 'Small choices that matter'}
        heading={zh ? '好精神，和明显的违背。' : 'Good Spirit, and clear breaches.'}
        full
      >
        <div className="ap-cards is-wide">
          <article className="ap-card">
            <span className="ap-tag">{zh ? '这样做' : 'Do'}</span>
            <h3>{zh ? '好精神的样子' : 'Good Spirit looks like'}</h3>
            <ul className="ap-list">
              {GOOD.map((g, i) => <li key={i}>{pick(lang, g)}</li>)}
            </ul>
          </article>
          <article className="ap-card is-danger">
            <span className="ap-tag">{zh ? '别这样' : 'Don’t'}</span>
            <h3>{zh ? '明显违背飞盘精神' : 'Clear breaches of Spirit'}</h3>
            <ul className="ap-list">
              {BAD.map((b, i) => <li key={i}>{pick(lang, b)}</li>)}
            </ul>
          </article>
        </div>
      </Section>

      <Section
        id="score"
        label={zh ? '赛后聊一聊' : 'After the game'}
        heading={zh ? '给对手打个分，也给自己。' : 'Rate the other team — and yourself.'}
        intro={zh ? '试着给五个维度各打 0–4 分，看看总分。' : 'Give each of the five a 0–4 and watch the total.'}
      >
        <Scorecard />
      </Section>

      <Section
        id="circle"
        label={zh ? '精神圈' : 'Spirit circle'}
        heading={zh ? '比赛结束，站成一圈。' : 'After the game, a shared circle.'}
      >
        <div className="ap-duo is-circle">
          <div className="ap-figure is-bare ap-duo-a">
            <SpiritCircle />
          </div>
          <div className="ap-prose ap-duo-b">
            <p>
              {zh
                ? '比赛结束后，两队球员交替围成一圈——我方、对方、我方、对方。圈里既可以称赞比赛里的亮点，也可以把场上的小摩擦讲开、化解。'
                : 'After a game, both teams form one circle with players alternating — us, them, us, them. It’s a place to highlight the good moments and to talk through any friction from the match.'}
            </p>
            <p>
              {zh
                ? '如果比赛中精神出了问题，球队的精神队长（Spirit Captain）可以叫一次“精神暂停”，两队到场中央一起把问题谈清楚。'
                : 'If Spirit slips during a game, a team’s Spirit Captain can call a Spirit Time-out; both teams meet in the middle to work it out.'}
            </p>
          </div>
        </div>
      </Section>

      <Section
        id="here"
        label={zh ? '在本站的游戏里' : 'Inside the game'}
        heading={zh ? '游戏里也有飞盘精神。' : 'Spirit lives in the game, too.'}
      >
        <div className="ap-prose">
          <p>
            {zh
              ? '本站的 3D 游戏里，机器人偶尔会违规；你看到了就按 F 叫停。叫对加分，乱叫扣分，自己撞到对手后主动承认加分更多。真实比赛里不能给自己叫犯规，但规则要求你主动告诉对方——游戏把这份诚实换成了一个按键。'
              : 'In the 3D game here, the bots sometimes break a rule; spot it and press F to call it. Correct calls earn Spirit, false ones cost it, and owning up when you bump someone earns the most. In a real game you can’t call a foul on yourself, but the rules ask you to tell your opponent — the game turns that honesty into a key press.'}
          </p>
          <p>{zh ? '懂了规则、犯规和精神，剩下的，就是爱上它的理由。' : 'Rules, fouls, Spirit — all that’s left are the reasons to love it.'}</p>
        </div>
      </Section>
    </PageShell>
  );
}
