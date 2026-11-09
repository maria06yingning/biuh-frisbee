'use client';

import { pick, type Bi } from '@/content/shared';
import { useI18n } from '@/i18n/I18nProvider';

export const SPIRIT_CATS: { t: Bi; q: Bi; example: Bi; color: string; label: Bi }[] = [
  {
    t: ['规则知识与运用', 'Rules knowledge & use'],
    q: ['他们是否了解并遵守规则？', 'Did they know and abide by the rules?'],
    example: ['发现队友作出不必要或错误的叫停，及时提醒；不再认可自己的叫停时主动撤回。', 'Gently flag an unnecessary call by a teammate; retract your own call when you no longer believe it was needed.'],
    color: '#8f7be8', label: ['规则知识', 'Know the rules'],
  },
  {
    t: ['犯规与身体接触', 'Fouls & body contact'],
    q: ['他们避免身体接触了吗？', 'Did they avoid body contact?'],
    example: ['争抢飞盘时注意彼此的路线与落点；危险动作即使没有发生接触，也违背比赛安全。', 'Respect each other’s line and landing space; dangerous play is contrary to Spirit even when no contact occurs.'],
    color: '#ff5a4a', label: ['避免接触', 'Avoid contact'],
  },
  {
    t: ['公平公正', 'Fair-mindedness'],
    q: ['他们公平公正吗？', 'Were they fair-minded?'],
    example: ['听完对方视角后，如果认同对方的判断，就承认并撤回自己的叫停。', 'After hearing the other view, acknowledge it and retract the call if you agree.'],
    color: '#ffd23f', label: ['公平公正', 'Be fair-minded'],
  },
  {
    t: ['积极态度与自控', 'Positive attitude & self-control'],
    q: ['他们展现了自控与积极态度吗？', 'Did they show self-control and a positive attitude?'],
    example: ['面对分歧或挑衅保持冷静；投入竞争，也不把比分置于比赛乐趣和相互尊重之上。', 'Stay calm through disagreement or provocation; compete hard without putting the score above respect or the joy of play.'],
    color: '#8fd17e', label: ['自控与态度', 'Self-control'],

  },
  {
    t: ['沟通', 'Communication'],
    q: ['他们沟通得当并尊重对方吗？', 'Did they communicate properly and respectfully?'],
    example: ['简短清楚地说明自己看到的情况，让对方有合理机会回应，并用尊重的语气解决分歧。', 'Explain what you saw clearly and briefly, allow the other player a reasonable chance to respond, and resolve disagreement respectfully.'],
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
          return <g key={cat.t[1]} className={`ap-spirit-sector${selected === i ? ' is-selected' : ''}`} role="button" tabIndex={0} aria-pressed={selected === i} aria-label={`${i + 1}. ${pick(lang, cat.t)}. ${pick(lang, cat.q)}`} onClick={() => onSelect(i)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(i); } }}>
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
      <p className="ap-spirit-official-q">“{pick(lang, current.q)}”</p>
      <p>{pick(lang, current.example)}</p>
      <small>{zh ? '赛后评分维度 · 依据 WFDF 飞盘精神页面' : 'Post-game scoring category · Based on WFDF Spirit of the Game'}</small>
    </article>
  </div>;
}

export { SPIRIT_CATS as spiritCategories };
