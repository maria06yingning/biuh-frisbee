'use client';

import { pick, type Bi } from '@/content/shared';
import { useI18n } from '@/i18n/I18nProvider';

export const SPIRIT_CATS: { t: Bi; q: Bi; details: Bi[]; color: string; label: Bi }[] = [
  {
    t: ['规则知识与运用', 'Rules knowledge & use'],
    q: ['他们是否了解并遵守规则？', 'Did they know and abide by the rules?'],
    details: [
      ['了解并遵守已约定的规则；即使违规对自己有利，也不故意忽略。', 'Know and follow the agreed rules; do not ignore a breach because it benefits your team.'],
      ['弄清叫停、回应和恢复比赛的程序；不确定时先询问或简短解释依据。', 'Know how calls, responses and restarts work; ask or briefly explain the rule when unsure.'],
      ['发现队友作出不必要或错误的叫停时，及时提醒。', 'Flag a teammate’s unnecessary or incorrect call.'],
      ['不再认为自己的叫停必要时，主动撤回。', 'Retract your own call when you no longer believe it was necessary.'],
    ],
    color: '#8f7be8', label: ['规则知识', 'Know the rules'],
  },
  {
    t: ['犯规与身体接触', 'Fouls & body contact'],
    q: ['他们避免身体接触了吗？', 'Did they avoid body contact?'],
    details: [
      ['争抢前看清彼此路线和落点；给对手合理的移动与落地空间。', 'Read each other’s line and landing space; give opponents room to move and land.'],
      ['不推、撞、拉、绊或穿过对方已经占据且无法避开的空间。', 'Do not push, bump, grab, trip or move through space an opponent cannot reasonably avoid.'],
      ['如果对手觉得身体对抗过强，及时收敛强度，而不是继续升级。', 'Scale back if opponents say the physicality is too high; do not escalate it.'],
      ['区分偶发轻微接触与鲁莽、危险动作；危险动作即使没有接触也要严肃看待。', 'Distinguish incidental contact from reckless or dangerous play; dangerous play matters even without contact.'],
    ],
    color: '#ff5a4a', label: ['避免接触', 'Avoid contact'],
  },
  {
    t: ['公平公正', 'Fair-mindedness'],
    q: ['他们公平公正吗？', 'Were they fair-minded?'],
    details: [
      ['如实描述自己看到的动作，不把推测或传闻当成事实。', 'Describe what you actually saw; do not treat guesses or hearsay as facts.'],
      ['不为了获得盘权或得分而选择性叫停，也不因对手获利就改变标准。', 'Do not make selective calls to gain possession or a goal, or change the standard when an opponent benefits.'],
      ['认真考虑对方提供的信息；出现新证据时，愿意修正判断。', 'Consider the other player’s information and revise your view when new evidence changes it.'],
      ['确认自己的叫停有误时，主动撤回，即使这会让结果对自己不利。', 'Retract a call you believe was wrong, even when that makes the outcome less favourable to your team.'],
    ],
    color: '#ffd23f', label: ['公平公正', 'Be fair-minded'],
  },
  {
    t: ['积极态度与自控', 'Positive attitude & self-control'],
    q: ['他们展现了自控与积极态度吗？', 'Did they show self-control and a positive attitude?'],
    details: [
      ['面对分歧或挑衅时保持冷静，控制语气和动作。', 'Stay calm and control your words and actions through disagreement or provocation.'],
      ['不嘲讽、不恐吓、不报复，也不以攻击性行为施压。', 'Do not taunt, intimidate, retaliate or pressure others with aggression.'],
      ['主动肯定对手的好球或良好飞盘精神。', 'Recognise an opponent’s good play or positive Spirit.'],
      ['投入竞争，但不以牺牲规则、安全、尊重和比赛乐趣为代价。', 'Compete hard without sacrificing the rules, safety, respect or joy of play.'],
    ],
    color: '#8fd17e', label: ['自控与态度', 'Self-control'],

  },
  {
    t: ['沟通', 'Communication'],
    q: ['他们沟通得当并尊重对方吗？', 'Did they communicate properly and respectfully?'],
    details: [
      ['用事实说明自己看到的情况，尽量清楚、简短。', 'Explain what you saw clearly and briefly, using specific facts.'],
      ['让对方有合理机会陈述视角，不打断，也不替对方下结论。', 'Give the other player a reasonable chance to speak; do not interrupt or decide their view for them.'],
      ['认真倾听并回应对方的要点，使用尊重的语言。', 'Listen and respond to their points using respectful language.'],
      ['尽快共同解决分歧，必要时在赛后给出建设性反馈。', 'Resolve the disagreement promptly and offer constructive feedback afterward when useful.'],
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
          return <g key={cat.t[1]} className={`ap-spirit-sector${selected === i ? ' is-selected' : ''}`} role="button" tabIndex={0} aria-pressed={selected === i} aria-label={`${i + 1}. ${pick(lang, cat.t)}. ${zh ? '官方评分问题：' : 'Official scoring question: '} ${pick(lang, cat.q)}. ${pick(lang, cat.details[0])}`} onClick={() => onSelect(i)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(i); } }}>
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
      <p className="ap-spirit-official-q"><b>{zh ? 'WFDF 评分问题' : 'WFDF scoring question'}</b><br />“{pick(lang, current.q)}”</p>
      <h4>{zh ? '场上观察细则' : 'What to look for'}</h4>
      <ul className="ap-spirit-wheel-details">
        {current.details.map((detail, index) => <li key={index}>{pick(lang, detail)}</li>)}
      </ul>
      <small>{zh ? '这些观察点按 WFDF 公开原则与示例整理；完整量表和行为示例见下方官方资源链接。' : 'These prompts summarise WFDF principles and examples; see the official resource link below for the complete forms and behaviour examples.'}</small>
    </article>
  </div>;
}

export { SPIRIT_CATS as spiritCategories };
