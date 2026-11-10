'use client';

import { useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { pick, type Bi } from '@/content/shared';
import PageShell, { Section } from '@/components/PageShell';
import SpiritWheel from '@/components/SpiritWheel';

function SpiritExchange() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  return <div className="ap-spirit-exchange">
    <div className="ap-spirit-exchange-pair" role="group" aria-label={zh ? '两队赛后互评' : 'Reciprocal post-game team review'}>
      <article className="ap-spirit-exchange-team is-us">
        <span className="ap-spirit-exchange-mark">A</span>
        <h3>{zh ? '队伍 A' : 'Team A'}</h3>
      </article>
      <div className="ap-spirit-exchange-arrows">
        <svg viewBox="0 0 72 40" role="img" aria-label={zh ? '两队双向互评' : 'Two-way review'}>
          <path d="M8 12h48M50 6l8 6-8 6M64 28H16m6-6-8 6 8 6" fill="none" stroke="#1b1a2e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <b>{zh ? '赛后互评' : 'Post-game review'}</b>
        <small>{zh ? '对手 + 本队' : 'Opponent + own team'}</small>
      </div>
      <article className="ap-spirit-exchange-team is-opponent">
        <span className="ap-spirit-exchange-mark">B</span>
        <h3>{zh ? '队伍 B' : 'Team B'}</h3>
      </article>
    </div>
    <div className="ap-spirit-exchange-admin">
      <span className="ap-spirit-exchange-stamp">{zh ? '团队共同完成' : 'A team process'}</span>
      <p>{zh ? <>队员共同回顾具体表现；精神队长（Spirit Captain）负责收集评分。在联赛和大型赛事中，WFDF 特别推荐把结果交给赛事精神总监（Spirit Director）查看和跟进。</> : <>Players review specific moments together; the Spirit Captain collects the scores. For leagues and larger tournaments, WFDF especially recommends submitting them to a Spirit Director for review and follow-up.</>}</p>
    </div>
    <p className="ap-spirit-source">{zh ? <>这说明的是采用 WFDF 精神评分制度的赛后互评流程，并非所有赛事的强制要求。详见 <a href="https://wfdf.sport/organisation/spirit-of-the-game/" target="_blank" rel="noopener noreferrer">WFDF 飞盘精神官方页面</a>和 <a href="https://academy.wfdf.sport/course/section.php?id=291&lang=en" target="_blank" rel="noopener noreferrer">WFDF 精神评分资源库</a>。</> : <>This explains the post-game review used by events adopting WFDF Spirit scoring; it is not a mandatory procedure for every event. See the <a href="https://wfdf.sport/organisation/spirit-of-the-game/" target="_blank" rel="noopener noreferrer">WFDF Spirit of the Game page</a> and the <a href="https://academy.wfdf.sport/course/section.php?id=291&lang=en" target="_blank" rel="noopener noreferrer">WFDF SOTG Resource Hub</a>.</>}</p>
  </div>;
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
  ['以言语不尊重对手', 'Disrespectful conversations'],
  ['把“赢不惜一切代价”放在规则、公平、安全与乐趣之上', 'Win-at-all-costs behaviour over rules, fairness, safety or the joy of play'],
];

export default function Spirit() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  const [activeCategory, setActiveCategory] = useState(0);
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
        id="wheel"
        label={zh ? 'WFDF 赛后评分的五个维度' : 'WFDF’s five post-game categories'}
        heading={zh ? '五个维度，回看整场比赛。' : 'Five categories for the whole game.'}
        intro={zh ? '选择一个扇区查看该维度的详细观察点；下方说明正式比赛如何进行赛后精神互评。' : 'Choose a sector for detailed observations; the section below explains post-game Spirit review in competition.'}
        full
      >
        <SpiritWheel selected={activeCategory} onSelect={setActiveCategory} />
        <p className="ap-spirit-source">{zh ? <>五个维度与评分问题依据 <a href="https://wfdf.sport/organisation/spirit-of-the-game/" target="_blank" rel="noopener noreferrer">WFDF 飞盘精神官方页面</a>。轮盘把官方原则和公开示例整理成场上观察点，不是官方评分表的逐字复述；完整表格与行为示例见 <a href="https://academy.wfdf.sport/course/section.php?id=291&lang=en" target="_blank" rel="noopener noreferrer">WFDF 精神评分资源库</a>。</> : <>The five categories and scoring questions follow the <a href="https://wfdf.sport/organisation/spirit-of-the-game/" target="_blank" rel="noopener noreferrer">WFDF Spirit of the Game page</a>. The wheel turns its principles and public examples into field prompts rather than reproducing the scoring form verbatim; see the <a href="https://academy.wfdf.sport/course/section.php?id=291&lang=en" target="_blank" rel="noopener noreferrer">WFDF SOTG Resource Hub</a> for the full forms and examples.</>}</p>
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
        <p className="ap-spirit-source">{zh ? <>好精神与违背飞盘精神的例子依据 <a href="https://wfdf.sport/organisation/spirit-of-the-game/" target="_blank" rel="noopener noreferrer">WFDF 飞盘精神官方页面</a>及《极限飞盘规则 2025–2028》第 1.5–1.6 条。</> : <>Examples follow the <a href="https://wfdf.sport/organisation/spirit-of-the-game/" target="_blank" rel="noopener noreferrer">WFDF Spirit of the Game page</a> and Rules of Ultimate 2025–2028, 1.5–1.6.</>}</p>
      </Section>

      <Section
        id="score"
        label={zh ? '赛后聊一聊' : 'After the game'}
        heading={zh ? '给对手打个分，也给自己。' : 'Rate the other team — and yourself.'}
        intro={zh ? '在采用 WFDF 飞盘精神评分制度的赛事中，比赛结束后会进行这项团队互评。' : 'At events using WFDF Spirit scoring, teams complete this review after the game.'}
      >
        <SpiritExchange />
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
