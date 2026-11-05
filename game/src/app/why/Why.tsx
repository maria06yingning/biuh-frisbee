'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { pick, withBase, type Bi } from '@/content/shared';
import PageShell, { Section } from '@/components/PageShell';

/* Seven reasons, each with a short personal note. */
const REASONS: { t: Bi; d: Bi }[] = [
  {
    t: ['门槛低到只要一张盘', 'All it takes is a disc'],
    d: [
      '一张盘、一块草地、几个人，就能开打。不需要球门、球网，也不用先学会复杂的装备。操场、海滩、公园都是球场。',
      'One disc, a patch of grass, a few friends — that’s a game. No goals, no nets, no gear to learn first. Campus fields, beaches and parks all work.',
    ],
  },
  {
    t: ['男女同场', 'Mixed, on the same field'],
    d: [
      '混合组是飞盘最常见的打法之一，男女队员同场竞技、互相传盘。在中国的正式联赛里，双方场上男女比例一致，常见 4 : 3。',
      'Mixed is one of the most common ways to play, with women and men on the field together. In Chinese leagues both teams field the same ratio, often 4 : 3.',
    ],
  },
  {
    t: ['每个人都会碰到盘', 'Everyone touches the disc'],
    d: [
      '持盘者不能跑，进攻只能靠传。所以盘必须在所有人之间流动——没有谁能一个人带着它冲到底。',
      'The thrower can’t run, so the only way forward is the pass. The disc has to move through everyone; no one carries it the whole way alone.',
    ],
  },
  {
    t: ['一传一接的自由', 'The freedom of the throw'],
    d: [
      '飞盘在空中会转、会飘、会拐弯。读懂风、读懂弧线，再在空当里一跃把它接住——那一刻很难用别的运动替代。',
      'A disc spins, floats and curves. Reading the wind and the arc, then leaping into space to pull it down — few other sports give you that moment.',
    ],
  },
  {
    t: ['默契是练出来的', 'Teamwork you can feel'],
    d: [
      '切入（cut）、回传、横向转移……好的进攻像一段对话。你跑向空当，队友在你到之前就已经出手。',
      'Cuts, resets, swings — a good offense is a conversation. You break for space, and the throw is already in the air before you arrive.',
    ],
  },
  {
    t: ['在自我裁决里学会信任', 'Trust, learned by self-officiating'],
    d: [
      '没有裁判，你得相信对手，对手也得相信你。会叫停、会讲道理、也会撤回自己的叫停，这些本事在场下同样有用。',
      'With no referee, you trust your opponent and they trust you. Calling, explaining, even retracting your own call — those skills travel well off the field.',
    ],
  },
  {
    t: ['比赛完，大家还是朋友', 'Friends after the final point'],
    d: [
      '赛后两队交替围成精神圈，互相称赞、把小摩擦说开。很多人是因为一场比赛，认识了一整个城市的飞盘圈。',
      'After the game, both teams form one spirit circle to praise and to clear the air. Plenty of people meet a whole city’s disc community through one match.',
    ],
  },
];

/* "Pass it on": a disc hops between seven players around a loop. */
function PassItOn() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  const [holder, setHolder] = useState(0);
  const [passes, setPasses] = useState(0);
  const [auto, setAuto] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const N = 7;
  const players = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    return { x: 200 + Math.cos(a) * 140, y: 150 + Math.sin(a) * 104 };
  });

  const pass = () => {
    // Never pass to yourself; skip one or two so the disc crosses the circle.
    setHolder((h) => (h + 2 + Math.floor(Math.random() * 3)) % N);
    setPasses((p) => p + 1);
  };

  useEffect(() => {
    if (!auto || reduced) return;
    const id = window.setInterval(pass, 900);
    return () => window.clearInterval(id);
  }, [auto, reduced]);

  const p = players[holder];
  return (
    <div className="ap-duo">
      <div className="ap-figure ap-duo-a">
        <svg viewBox="0 0 400 300" role="img" aria-label={zh ? `飞盘在七名队员之间传递，已传 ${passes} 次` : `A disc passing among seven players, ${passes} passes so far`}>
          <rect x="0" y="0" width="400" height="300" fill="#eef5ef" />
          <ellipse cx="200" cy="150" rx="140" ry="104" fill="none" stroke="var(--aero-line)" strokeWidth="1.5" strokeDasharray="2 7" />
          {players.map((pl, i) => (
            <g key={i}>
              <circle cx={pl.x} cy={pl.y} r="16" fill={i === holder ? '#195de6' : '#76ac56'} />
              <text x={pl.x} y={pl.y + 4.5} textAnchor="middle" fontSize="13" fontWeight="600" fill="#fff">{i + 1}</text>
            </g>
          ))}
          <g className="ap-pass-disc" style={{ transform: `translate(${p.x}px, ${p.y - 30}px)` }}>
            <ellipse rx="18" ry="6.5" fill="#bbe7f1" stroke="#66b8ce" strokeWidth="1.5" />
            <ellipse rx="10" ry="3.2" fill="none" stroke="#4eb5d2" strokeWidth="1" />
          </g>
        </svg>
      </div>
      <div className="ap-duo-b">
        <p className="ap-count" aria-live="polite">
          {passes}
          <small>{zh ? '次传递' : 'passes'}</small>
        </p>
        <p className="ap-pass-copy">
          {zh ? '持盘者不能跑，所以盘只能靠传向前走。点一下，把它传下去。' : 'The thrower can’t run, so the disc only moves by passing. Tap to pass it on.'}
        </p>
        <div className="ap-cta-row">
          <button type="button" className="aero-primary" onClick={pass}>{zh ? '传下去' : 'Pass it on'}</button>
          {!reduced && (
            <button type="button" className="ap-ghost" aria-pressed={auto} onClick={() => setAuto((a) => !a)}>
              {auto ? (zh ? '停下' : 'Stop') : (zh ? '自动传递' : 'Auto-pass')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Why() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  return (
    <PageShell
      slug="/why"
      art="why"
      title={zh ? <>为什么，<br />我们爱飞盘。</> : <>Why we<br />love the disc.</>}
      lede={[
        '规则、犯规、精神都讲完了。这一页不讲条文，只聊聊：一张塑料盘，为什么能让那么多人一到周末就往草地上跑。',
        'Rules, fouls and Spirit are covered. This page skips the fine print and asks one thing: why does a plastic disc pull so many people onto the grass every weekend?',
      ]}
    >
      <Section
        id="moment"
        label={zh ? '01 · 那一刻' : '01 · The moment'}
        heading={zh ? '盘在空中的那一秒。' : 'The second the disc hangs in the air.'}
      >
        <div className="ap-prose">
          <p className="ap-lead">
            {zh
              ? '你甩开防守冲向空当，回头时盘已经在飞。它慢慢转着、浮着，好像在等你。你起跳，指尖扣住它——整个场边都在为你喊。'
              : 'You shake your defender and break for space, and when you turn the disc is already flying — spinning, floating, almost waiting. You leave the ground, close your hands on it, and the whole sideline shouts.'}
          </p>
          <p>
            {zh
              ? '飞盘让很多人第一次觉得：运动不只是比谁更快更壮，也是比谁更会读空间、更会合作、更懂得尊重对手。'
              : 'For a lot of people, ultimate is the first sport that isn’t only about who’s faster or stronger — it’s about reading space, working together, and respecting the people across from you.'}
          </p>
        </div>
      </Section>

      <Section
        id="reasons"
        label={zh ? '02 · 七个理由' : '02 · Seven reasons'}
        heading={zh ? '我们爱它，因为……' : 'We love it because…'}
        full
      >
        <div className="ap-reasons">
          {REASONS.map((r, i) => (
            <article key={i} className="ap-reason">
              <span className="ap-reason-n">{String(i + 1).padStart(2, '0')}</span>
              <h3>{pick(lang, r.t)}</h3>
              <p>{pick(lang, r.d)}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        id="pass"
        label={zh ? '03 · 传下去' : '03 · Pass it on'}
        heading={zh ? '一张盘，把人连在一起。' : 'One disc, connecting everyone.'}
        full
      >
        <PassItOn />
      </Section>

      <Section
        id="world"
        label={zh ? '04 · 不止一块草地' : '04 · Bigger than one field'}
        heading={zh ? '从校园，到世界运动会。' : 'From campus to the World Games.'}
      >
        <div className="ap-prose">
          <p>
            {zh
              ? <>世界飞盘联合会（WFDF）成立于 1985 年，如今有 131 个会员协会，覆盖超过 127 个国家和地区，并获得国际奥委会承认。2025 年成都世界运动会上，团队飞盘以男女混合的形式登场。</>
              : <>The World Flying Disc Federation (WFDF), founded in 1985, now has 131 member associations across more than 127 countries and is recognised by the IOC. At the 2025 World Games in Chengdu, ultimate was played in the mixed division.</>}
          </p>
          <p>
            {zh
              ? '但大多数人爱上飞盘，并不是在大赛上，而是在某个傍晚的操场：有人喊一声“来一局吗”，你就上场了。'
              : 'Still, most people don’t fall for it at a big event. It happens on some evening field, when someone calls out “want to play?” — and you’re in.'}
          </p>
        </div>
      </Section>

      <Section
        id="start"
        label={zh ? '05 · 现在就开始' : '05 · Start now'}
        heading={zh ? '先在这里传几次。' : 'Throw a few here first.'}
      >
        <div className="ap-prose">
          <p>
            {zh
              ? '还没机会去草地上？先进本站的 3D 游戏感受传盘和跑位，或者去战术实验室看看七个人怎么配合。'
              : 'No field nearby yet? Try the passing and cutting in our 3D game, or open the Tactics Lab to see how seven players move together.'}
          </p>
          <div className="ap-cta-row">
            <a className="aero-primary" href={withBase('/?open=play')}>
              {zh ? '进入游戏' : 'Enter the game'} <span aria-hidden="true">↗</span>
            </a>
            <a className="aero-text-link" href={withBase('/?open=lab')}>
              {zh ? '去战术实验室' : 'Open the Tactics Lab'} <span aria-hidden="true">→</span>
            </a>
          </div>
          <p className="ap-hint">
            {zh ? '游戏需要电脑和鼠标，战术实验室支持触屏。' : 'The game needs a computer and mouse. The Tactics Lab supports touch.'}
          </p>
        </div>
      </Section>
    </PageShell>
  );
}
