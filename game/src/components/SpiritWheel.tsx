'use client';

import { pick, type Bi } from '@/content/shared';
import { useI18n } from '@/i18n/I18nProvider';

export const SPIRIT_CATS: { t: Bi; q: Bi; details: Bi[]; color: string; label: Bi }[] = [
  {
    t: ['规则知识与运用', 'Rules knowledge & use'],
    q: ['他们是否了解并遵守规则？', 'Did they know and abide by the rules?'],
    details: [
      ['弄清规则如何处理叫停、争议与恢复比赛；不要因为违规对自己有利就忽略它。', 'Know how calls, contests and restarts work; do not ignore a breach just because it benefits your team.'],
      ['发现队友作出不必要或错误的叫停时提醒；不再认为自己的叫停必要，就主动撤回。', 'Flag an unnecessary or incorrect call by a teammate; retract your own call when you no longer believe it was needed.'],
    ],
    color: '#8f7be8', label: ['规则知识', 'Know the rules'],
  },
  {
    t: ['犯规与身体接触', 'Fouls & body contact'],
    q: ['他们避免身体接触了吗？', 'Did they avoid body contact?'],
    details: [
      ['争抢前留意彼此的移动路线与落点，不推、撞、拉或占住对方无法避开的空间。', 'Read each other’s line and landing space; do not push, bump, grab or occupy an unavoidable path.'],
      ['避免鲁莽危险动作；即使没有发生接触，也要把安全放在得失分之前。', 'Avoid reckless dangerous play; safety comes before the result, even when no contact occurs.'],
    ],
    color: '#ff5a4a', label: ['避免接触', 'Avoid contact'],
  },
  {
    t: ['公平公正', 'Fair-mindedness'],
    q: ['他们公平公正吗？', 'Were they fair-minded?'],
    details: [
      ['只按自己实际看到的情况作决定，不替队友或球队的利益偏袒。', 'Make calls from what you actually saw, not from loyalty or what benefits your team.'],
      ['听取对方提供的事实；若发现自己判断有误，即使结果不利也按规则处理。', 'Consider the other player’s account; correct your view under the rules even when the outcome is unfavourable.'],
    ],
    color: '#ffd23f', label: ['公平公正', 'Be fair-minded'],
  },
  {
    t: ['积极态度与自控', 'Positive attitude & self-control'],
    q: ['他们展现了自控与积极态度吗？', 'Did they show self-control and a positive attitude?'],
    details: [
      ['面对分歧或挑衅时控制语气和动作，不嘲讽、不恐吓，也不报复。', 'Control your words and actions through disagreement or provocation; do not taunt, intimidate or retaliate.'],
      ['认真竞争，也能肯定对手的好球；不要把比分置于尊重与比赛乐趣之上。', 'Compete hard and recognise good play; do not put the score above respect or the joy of play.'],
    ],
    color: '#8fd17e', label: ['自控与态度', 'Self-control'],

  },
  {
    t: ['沟通', 'Communication'],
    q: ['他们沟通得当并尊重对方吗？', 'Did they communicate properly and respectfully?'],
    details: [
      ['说明具体看见了什么，表达清楚、简短，不加入指责或猜测。', 'State exactly what you saw, clearly and briefly, without accusation or speculation.'],
      ['给对方合理机会说明视角，认真倾听，并尽快用尊重的方式解决分歧。', 'Give the other player a fair chance to explain, listen carefully and resolve the disagreement respectfully.'],
    ],
    color: '#14c2d8', label: ['尊重沟通', 'Communicate'],
  },
];

const CX = 260, CY = 260, RO = 232, RI = 68;
const point = (radius: number, angle: number) => {
  const r = angle * Math.PI / 180;
  return [CX + radius * Math.cos(r), CY + radius * Math.sin(r)] as const;
};
const sectorPath = (i: number) => {
  const center = -90 + i * 72, a0 = center - 36, a1 = center + 36;
  const [x0, y0] = point(RO, a0), [x1, y1] = point(RO, a1);
  const [ix1, iy1] = point(RI, a1), [ix0, iy0] = point(RI, a0);
  return `M ${x0} ${y0} A ${RO} ${RO} 0 0 1 ${x1} ${y1} L ${ix1} ${iy1} A ${RI} ${RI} 0 0 0 ${ix0} ${iy0} Z`;
};

function SectorIcon({ index, x, y }: { index: number; x: number; y: number }) {
  const common = { fill: 'none', stroke: '#1b1a2e', strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return <g transform={`translate(${x - 14} ${y - 14})`} {...common} aria-hidden="true">
    {index === 0 && <><path d="M3 3h18v23H3z"/><path d="M7 8h10M7 13h10M7 18h7"/></>}
    {index === 1 && <><circle cx="6" cy="13" r="4"/><circle cx="22" cy="13" r="4"/><path d="M10 13h8M14 7l6 12"/></>}
    {index === 2 && <><path d="M14 3l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/><path d="M10 13l3 3 6-7"/></>}
    {index === 3 && <><path d="M14 25S3 19 3 11a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 8-11 14-11 14z"/><path d="M9 14h.1M19 14h.1"/></>}
    {index === 4 && <><path d="M3 5h22v15H12l-6 5v-5H3z"/><path d="M8 10h12M8 15h8"/></>}
  </g>;
}

export default function SpiritWheel({ selected, onSelect }: { selected: number; onSelect: (index: number) => void }) {
  const { lang } = useI18n();
  const current = SPIRIT_CATS[selected];
  const zh = lang === 'zh';
  return <div className="ap-spirit-wheel-layout">
    <div className="ap-spirit-wheel-wrap">
      <svg className="ap-spirit-wheel" viewBox="0 0 520 520" role="group" aria-label={zh ? '飞盘精神评分五个维度，选择一个查看官方说明' : 'Five Spirit of the Game scoring categories. Select one to read the official guidance.'}>
        <circle cx="260" cy="260" r="240" fill="#1b1a2e" />
        {SPIRIT_CATS.map((cat, i) => {
          const angle = -90 + i * 72;
          const [nx, ny] = point(98, angle);
          const [tx, ty] = point(168, angle);
          const label = zh ? cat.label[0] : cat.label[1];
          return <g key={cat.t[1]} className={`ap-spirit-sector${selected === i ? ' is-selected' : ''}`} role="button" tabIndex={0} aria-pressed={selected === i} aria-label={`${i + 1}. ${pick(lang, cat.t)}. ${pick(lang, cat.details[0])}`} onClick={() => onSelect(i)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(i); } }}>
            <path d={sectorPath(i)} fill={cat.color} stroke="#1b1a2e" strokeWidth="4" />
            <circle cx={nx} cy={ny} r="18" fill="#1b1a2e" stroke="#f6ecd2" strokeWidth="2" />
            <text x={nx} y={ny + 6} textAnchor="middle" fill="#fff8e6" fontSize="17" fontWeight="900">{i + 1}</text>
            <SectorIcon index={i} x={tx} y={ty - 12} />
            <text x={tx} y={ty + 24} className="ap-spirit-sector-label" textAnchor="middle" fill="#1b1a2e" fontSize="14" fontWeight="900">{label}</text>
            {selected === i && <path d={sectorPath(i)} fill="none" stroke="#fff8e6" strokeWidth="7" pointerEvents="none" />}
          </g>;
        })}
        <circle cx="260" cy="260" r="65" fill="#fff8e6" stroke="#1b1a2e" strokeWidth="5" />
        <text x="260" y="245" textAnchor="middle" fill="#1b1a2e" fontSize="12" fontWeight="900" letterSpacing="1">SPIRIT OF</text>
        <text x="260" y="263" textAnchor="middle" fill="#1b1a2e" fontSize="12" fontWeight="900" letterSpacing="1">THE GAME</text>
        <text x="260" y="286" textAnchor="middle" fill="#1b1a2e" fontSize="15" fontWeight="900">{zh ? '飞盘精神' : 'PLAY WITH SPIRIT'}</text>
      </svg>
    </div>
    <article className="ap-spirit-wheel-detail" style={{ '--spirit-color': current.color } as React.CSSProperties} aria-live="polite">
      <span className="ap-spirit-wheel-number">{String(selected + 1).padStart(2, '0')} / 05</span>
      <h3>{pick(lang, current.t)}</h3>
      <h4>{zh ? '场上观察细则' : 'What to look for'}</h4>
      <ul className="ap-spirit-wheel-details">
        {current.details.map((detail, index) => <li key={index}>{pick(lang, detail)}</li>)}
      </ul>
      <small>{zh ? '按 WFDF 飞盘精神原则整理的观察提示；官方评分问题与分值见下方。' : 'Practical prompts based on WFDF Spirit principles; the official scoring questions and scale are below.'}</small>
    </article>
  </div>;
}

export { SPIRIT_CATS as spiritCategories };
