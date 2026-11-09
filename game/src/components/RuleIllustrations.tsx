import type { ReactNode } from 'react';

const I = '#1b1a2e', C = '#14c2d8', R = '#ff5a4a', Y = '#ffd23f', G = '#8fd17e', P = '#fff8e6', O = '#ff6a1a';
export type RuleSceneId = 'goal'|'travel'|'stall'|'marker'|'directions'|'turnover'|'restart'|'contact'|'self-officiate'|'spirit'|'throwaway'|'drop'|'interception'|'block'|'out'|'stall-out';

function Field({ end = 'right', out = false }: { end?: 'left'|'right'; out?: boolean }) {
  const x = end === 'right' ? 292 : 0;
  return <g aria-hidden="true">
    <rect x="5" y="10" width="350" height="140" fill={G} stroke={I} strokeWidth="3" />
    <path d="M5 45h350M5 80h350M5 115h350" stroke="#7fc371" strokeWidth="16" opacity=".68" />
    <rect x={x + 5} y="10" width="58" height="140" fill={Y} stroke={I} strokeWidth="2" />
    <path d={`M${end==='right'?292:63} 10v140`} stroke={I} strokeWidth="3" />
    {out && <path d="M5 4h350" stroke={R} strokeWidth="5" strokeDasharray="10 6" />}
  </g>;
}
function Player({ x, y, n = 1, team = 'o' }: { x:number; y:number; n?:number; team?:'o'|'d' }) {
  return <g transform={`translate(${x} ${y})`} aria-hidden="true">
    {team === 'o' ? <circle r="13" fill={C} stroke={I} strokeWidth="3"/> : <rect x="-12" y="-12" width="24" height="24" rx="3" fill={R} stroke={I} strokeWidth="3"/>}
    <text y="4" textAnchor="middle" fontSize="12" fontWeight="900" fill={I}>{n}</text>
  </g>;
}
function ConversationPlayer({ x, y, team, pose, flip = false }: { x:number; y:number; team:'o'|'d'; pose:'call'|'listen'; flip?:boolean }) {
  const jersey = team === 'o' ? C : R;
  const skin = team === 'o' ? '#e6b48d' : '#c9825e';
  return <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`} aria-hidden="true">
    <ellipse cx="0" cy="104" rx="14" ry="4" fill={I} opacity=".25"/>
    <path d="M-7 73L-9 98M7 73L10 98" fill="none" stroke={I} strokeWidth="8" strokeLinecap="round"/>
    <path d="M-7 73L-9 98M7 73L10 98" fill="none" stroke={skin} strokeWidth="4" strokeLinecap="round"/>
    <path d="M-11 95h5l3 5h-15zM8 95h5l5 5H7z" fill={P} stroke={I} strokeWidth="2" strokeLinejoin="round"/>
    <path d="M-13 39Q0 33 13 39L16 72Q0 78-16 72Z" fill={jersey} stroke={I} strokeWidth="3" strokeLinejoin="round"/>
    <path d="M-15 69h30l-2 12Q0 85-13 81Z" fill={I} stroke={I} strokeWidth="2"/>
    <path d="M-10 16V39M10 16V39" stroke={skin} strokeWidth="6" strokeLinecap="round"/>
    <circle cy="18" r="11" fill={skin} stroke={I} strokeWidth="2.5"/>
    <path d="M-11 18Q-11 4 0 5Q12 5 11 18L5 13Q-2 18-10 15Z" fill={team==='o'?'#3a2b29':'#24202b'} stroke={I} strokeWidth="2" strokeLinejoin="round"/>
    <circle cx="4" cy="19" r="1.3" fill={I}/><path d="M5 24l3 1" stroke={I} strokeWidth="1.3" strokeLinecap="round"/>
    {pose === 'call' ? <>
      <path d="M11 43L20 35L21 18" fill="none" stroke={I} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11 43L20 35L21 18" fill="none" stroke={skin} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 18v-7m-4 8v-7m8 7v-7" stroke={skin} strokeWidth="3" strokeLinecap="round"/>
      <path d="M-11 43L-20 54L-24 62" fill="none" stroke={I} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M-11 43L-20 54L-24 62" fill="none" stroke={skin} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </> : <>
      <path d="M-11 43L-22 51L-30 46" fill="none" stroke={I} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M-11 43L-22 51L-30 46" fill="none" stroke={skin} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M-34 45l4-5m-2 7 6-6m-3 8 7-6" stroke={skin} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M11 43L20 53L24 63" fill="none" stroke={I} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11 43L20 53L24 63" fill="none" stroke={skin} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </>}
  </g>;
}
function Disc({ x, y, turn = 0 }: {x:number;y:number;turn?:number}) {
  return <g transform={`translate(${x} ${y}) rotate(${turn})`} aria-hidden="true"><ellipse rx="16" ry="7" fill={Y} stroke={I} strokeWidth="2.5"/><ellipse rx="10" ry="3.4" fill="none" stroke={O} strokeWidth="2"/></g>;
}
function Caption({ x=180, y=147, children }: {x?:number;y?:number;children:ReactNode}) {
  return <text x={x} y={y} textAnchor="middle" fontSize="12" fontWeight="900" fill={I}>{children}</text>;
}
function Base({ children, alt }: { children:ReactNode;alt:string }) {
  return <svg className="ap-rule-scene ap-specific-diagram" viewBox="0 0 360 160" role="img" aria-label={alt}><rect width="360" height="160" fill={P}/>{children}</svg>;
}
function Count({ terminal = false, zh }: {terminal?:boolean;zh:boolean}) {
  return <g aria-hidden="true">
    <text x="18" y="40" fontSize="12" fontWeight="900" fill={I}>STALLING</text>
    {Array.from({length:10},(_,i)=><g key={i} transform={`translate(${17+i*32} 58)`}>
      <rect width="27" height="36" fill={i<7?Y:i<9?P:R} stroke={I} strokeWidth="2"/>
      <text x="13.5" y="23" textAnchor="middle" fontSize="14" fontWeight="900" fill={I}>{i+1}</text>
    </g>)}
    <path d="M18 105H335" stroke={I} strokeWidth="2"/>
    <path d="M330 100l7 5-7 5" fill="none" stroke={I} strokeWidth="2"/>
    <text x="18" y="129" fontSize="11" fontWeight="800" fill={I}>{terminal ? (zh ? '未在“10”开始前出手 → 盘权转换' : 'Not released before “ten” → turnover') : (zh ? '相邻数字至少间隔 1 秒' : 'At least 1 second between number starts')}</text>
    {terminal&&<path d="M328 121l14 14m0-14-14 14" stroke={P} strokeWidth="5"/>}
  </g>;
}

export default function RuleIllustration({ id, alt, lang }: { id:RuleSceneId;alt:string;lang:'zh'|'en' }) {
  const zh = lang === 'zh';
  const label = (cn:string,en:string) => zh ? cn : en;
  switch(id) {
    case 'goal': return <Base alt={alt}><Field/><path d="M77 93Q164 62 264 62" fill="none" stroke={C} strokeWidth="5" strokeLinecap="round"/><path d="M256 55l13 6-12 8" fill={C} stroke={I} strokeWidth="2"/><Player x={74} y={93} n={1}/><Player x={276} y={62} n={2}/><Disc x={278} y={52}/><path d="M305 25h43v24h-43z" fill={Y} stroke={I} strokeWidth="2"/><text x="326" y="42" textAnchor="middle" fontSize="13" fontWeight="900" fill={I}>+1</text><Caption x={175} y={142}>{label('在进攻得分区内完成接盘','Complete the catch in the attacking end zone')}</Caption></Base>;
    case 'travel': return <Base alt={alt}>
      <path d="M12 124H348" stroke={I} strokeWidth="3"/><path d="M12 129H348" stroke={G} strokeWidth="12"/>
      <g aria-hidden="true">
        <path d="M148 54L133 64L128 73M176 53L191 48L204 51" fill="none" stroke={I} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M148 54L133 64L128 73M176 53L191 48L204 51" fill="none" stroke="#e6b48d" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M151 86L142 101L158 115M173 86L187 100L207 114" fill="none" stroke={I} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M151 86L142 101L158 115M173 86L187 100L207 114" fill="none" stroke="#e6b48d" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M146 47Q160 41 176 48L183 80Q169 88 145 82Z" fill={C} stroke={I} strokeWidth="3" strokeLinejoin="round"/>
        <path d="M146 79L182 79L178 91Q162 96 148 90Z" fill={I} stroke={I} strokeWidth="2"/>
        <path d="M151 114Q162 110 171 116L174 121H151Z M202 112Q211 111 216 117L218 121H204Z" fill="#fff8e6" stroke={I} strokeWidth="3" strokeLinejoin="round"/>
        <circle cx="128" cy="73" r="4.5" fill="#e6b48d" stroke={I} strokeWidth="2"/><circle cx="204" cy="51" r="4.5" fill="#e6b48d" stroke={I} strokeWidth="2"/>
        <path d="M164 42V47" stroke="#e6b48d" strokeWidth="6" strokeLinecap="round"/>
        <circle cx="164" cy="27" r="15" fill="#e6b48d" stroke={I} strokeWidth="3"/>
        <path d="M149 27Q148 11 163 11Q179 12 179 28L171 22Q161 27 150 24Z" fill="#3a2b29" stroke={I} strokeWidth="2" strokeLinejoin="round"/>
        <circle cx="168" cy="28" r="1.5" fill={I}/><path d="M171 34l4 1" stroke={I} strokeWidth="1.5" strokeLinecap="round"/>
        <Disc x={211} y={45}/>
      </g>
      <circle cx="121" cy="119" r="9" fill={P} stroke={R} strokeWidth="3" strokeDasharray="4 3"/>
      <path d="M132 119H148" stroke={R} strokeWidth="4" strokeLinecap="round"/><path d="M143 113l8 6-8 6" fill={R} stroke={I} strokeWidth="1.5"/>
      <circle cx="161" cy="118" r="12" fill="none" stroke={R} strokeWidth="3" strokeDasharray="4 3"/>
      <text x="103" y="148" textAnchor="middle" fontSize="10" fontWeight="900" fill={I}>{label('原轴心点','Original pivot')}</text>
      <text x="225" y="148" textAnchor="middle" fontSize="10" fontWeight="900" fill={R}>{label('轴心脚已移位','Pivot foot moved')}</text>
    </Base>;
    case 'stall': return <Base alt={alt}><Player x={35} y={20} team="d"/><Player x={70} y={20} team="o"/><Disc x={70} y={5}/><Count zh={zh}/></Base>;
    case 'marker': return <Base alt={alt}><Field end="left"/><circle cx="180" cy="81" r="55" fill={C} fillOpacity=".16" stroke={C} strokeWidth="3" strokeDasharray="7 5"/><Player x={180} y={81} n={1}/><Disc x={180} y={64}/><Player x={208} y={78} team="d" n={1}/><Player x={218} y={116} team="d" n={2}/><Player x={267} y={126} n={2}/><path d="M218 116L267 126" stroke={I} strokeWidth="2" strokeDasharray="3 5"/><path d="M180 137V26" stroke={I} strokeWidth="2" strokeDasharray="3 5"/><text x="181" y="25" textAnchor="middle" fontSize="11" fontWeight="900" fill={I}>3 m</text><text x="269" y="147" textAnchor="middle" fontSize="10" fontWeight="900" fill={I}>{label('第二名防守者须盯住其他进攻者','Second defender must guard another offensive player')}</text></Base>;
    case 'directions': return <Base alt={alt}><Field/><Player x={180} y={82} n={1}/><Disc x={180} y={64}/><Player x={70} y={48} n={2}/><Player x={285} y={48} n={3}/><Player x={80} y={123} n={4}/><Player x={286} y={120} n={5}/><path d="M164 76Q120 50 86 49M196 76Q235 47 270 48M164 90Q121 117 96 122M196 90Q238 116 273 119" fill="none" stroke={C} strokeWidth="4" strokeLinecap="round"/><path d="M86 43l-9 6 10 3m173-10 9 6-10 3m-166 66-10 8 12 1m164-4 11 4-7 8" fill={C} stroke={I} strokeWidth="1.5"/><Caption x={180} y={140}>{label('前、后、横向都能传','Pass forward, backward or sideways')}</Caption></Base>;
    case 'turnover': return <Base alt={alt}><Field/><Player x={75} y={95} n={1}/><Player x={230} y={65} team="d" n={1}/><Player x={305} y={110} n={2}/><path d="M91 91Q149 60 206 64" fill="none" stroke={C} strokeWidth="4" strokeDasharray="7 4"/><Disc x={223} y={63}/><path d="M230 91Q263 112 294 111" fill="none" stroke={R} strokeWidth="5"/><path d="M286 103l11 9-13 4" fill={R} stroke={I} strokeWidth="2"/><rect x="117" y="20" width="128" height="25" fill={Y} stroke={I} strokeWidth="2"/><text x="181" y="37" textAnchor="middle" fontSize="12" fontWeight="900" fill={I}>{label('盘权立即转换','Possession turns over immediately')}</text></Base>;
    case 'restart': return <Base alt={alt}><rect x="24" y="24" width="312" height="104" fill={G} stroke={I} strokeWidth="3"/><path d="M24 76h312" stroke={I} strokeWidth="2"/><path d="M238 24v104" stroke={I} strokeWidth="2" strokeDasharray="5 4"/><Player x={128} y={75} n={1}/><Disc x={129} y={57}/><Player x={182} y={75} team="d" n={1}/><path d="M196 74h42" stroke={Y} strokeWidth="6"/><path d="M232 67l10 7-10 7" fill={Y} stroke={I} strokeWidth="2"/><text x="129" y="111" textAnchor="middle" fontSize="11" fontWeight="900" fill={I}>{label('确认双方站位','Check that both teams are ready')}</text><text x="256" y="144" textAnchor="middle" fontSize="11" fontWeight="900" fill={I}>{label('按规则确定恢复点','Restart at the rule-specific location')}</text></Base>;
    case 'contact': return <Base alt={alt}><path d="M40 118H320" stroke={I} strokeWidth="3"/><Player x={105} y={82} n={1}/><Player x={255} y={82} team="d" n={1}/><circle cx="180" cy="82" r="31" fill={P} stroke={Y} strokeWidth="5" strokeDasharray="5 4"/><path d="M132 82h20m56 0h20" stroke={C} strokeWidth="4" strokeLinecap="round"/><path d="M169 62l22 40m0-40-22 40" stroke={I} strokeWidth="3"/><text x="180" y="138" textAnchor="middle" fontSize="12" fontWeight="900" fill={I}>{label('抢位，不撞人','Play the disc; avoid contact')}</text></Base>;
    case 'self-officiate': return <Base alt={alt}>
      <path d="M26 126H334" stroke={G} strokeWidth="12"/><ConversationPlayer x={105} y={26} team="o" pose="call"/><ConversationPlayer x={255} y={26} team="d" pose="listen" flip/>
      <path d="M70 3h83v20H82l-8 6v-6h-4zM207 3h83v20h-71l-8 6v-6h-4z" fill={P} stroke={I} strokeWidth="2.5"/>
      <text x="111" y="17" textAnchor="middle" fontSize="10" fontWeight="900" fill={I}>{label('说明所见','State what happened')}</text>
      <text x="248" y="17" textAnchor="middle" fontSize="10" fontWeight="900" fill={I}>{label('听取并回应','Listen and respond')}</text>
      <path d="M155 79H204" stroke={Y} strokeWidth="5" strokeLinecap="round"/><path d="M198 73l9 6-9 6" fill={Y} stroke={I} strokeWidth="2"/>
      <path d="M205 92H156" stroke={C} strokeWidth="4" strokeLinecap="round"/><path d="M162 86l-9 6 9 6" fill={C} stroke={I} strokeWidth="1.5"/>
      <Disc x={180} y={119}/><Caption x={180} y={151}>{label('球员共同解决叫停并恢复比赛','Players resolve the call and restart together')}</Caption>
    </Base>;
    case 'spirit': return <Base alt={alt}><Field/><Player x={122} y={76} n={1}/><Player x={208} y={76} team="d" n={1}/><Disc x={164} y={63}/><path d="M102 42q17-22 37 0M195 42q18-22 36 0" fill="none" stroke={I} strokeWidth="3" strokeLinecap="round"/><path d="M142 111l13 10 26-28" fill="none" stroke={Y} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/><Caption x={180} y={144}>{label('尊重 · 规则 · 安全 · 乐趣','Respect · Rules · Safety · Joy')}</Caption></Base>;
    case 'throwaway': return <Base alt={alt}><Field/><Player x={75} y={101} n={1}/><Player x={275} y={55} n={2}/><path d="M91 94Q171 42 239 56" fill="none" stroke={C} strokeWidth="4" strokeDasharray="7 4"/><Disc x={218} y={61} turn={28}/><path d="M221 72v35m-10-6 10 10 10-10" fill="none" stroke={R} strokeWidth="4" strokeLinecap="round"/><text x="231" y="131" fontSize="11" fontWeight="900" fill={I}>{label('未接住，落地','Incomplete pass hits the ground')}</text></Base>;
    case 'drop': return <Base alt={alt}><Field/><Player x={176} y={68} n={1}/><path d="M159 67l-12-12m37 12 13-12" stroke={I} strokeWidth="4" strokeLinecap="round"/><Disc x={174} y={97} turn={24}/><path d="M174 81v-9" stroke={Y} strokeWidth="3"/><path d="M164 114h20" stroke={R} strokeWidth="4"/><text x="180" y="139" textAnchor="middle" fontSize="11" fontWeight="900" fill={I}>{label('接盘未完成','Catch not established')}</text></Base>;
    case 'interception': return <Base alt={alt}><Field/><Player x={66} y={106} n={1}/><Player x={250} y={65} team="d" n={1}/><Player x={310} y={105} n={2}/><path d="M82 100Q167 42 236 64" fill="none" stroke={C} strokeWidth="4" strokeDasharray="7 4"/><Disc x={247} y={53}/><path d="M250 83v21" stroke={R} strokeWidth="4"/><text x="250" y="137" textAnchor="middle" fontSize="11" fontWeight="900" fill={I}>{label('防守方先建立持有','Defense establishes possession')}</text></Base>;
    case 'block': return <Base alt={alt}><Field/><Player x={75} y={91} n={1}/><Player x={263} y={77} team="d" n={1}/><path d="M92 87Q165 58 233 75" fill="none" stroke={C} strokeWidth="4"/><Disc x={242} y={67} turn={28}/><path d="M246 49l8 11 10-9-4 15 13 4-15 3-3 14-5-13-14-4 12-5Z" fill={Y} stroke={I} strokeWidth="2"/><path d="M247 103v26" stroke={R} strokeWidth="4"/><text x="250" y="145" textAnchor="middle" fontSize="11" fontWeight="900" fill={I}>{label('盘被拍落','Disc knocked down')}</text></Base>;
    case 'out': return <Base alt={alt}><Field out/><path d="M305 10v140" stroke={I} strokeWidth="4" strokeDasharray="5 4"/><Disc x={328} y={68} turn={18}/><path d="M299 65h-33" stroke={Y} strokeWidth="5"/><path d="M270 58l-10 7 10 7" fill={Y} stroke={I} strokeWidth="2"/><circle cx={296} cy={68} r="7" fill={R} stroke={I} strokeWidth="2"/><text x="323" y="100" textAnchor="middle" fontSize="11" fontWeight="900" fill={I}>{label('界外','Out')}</text><text x="230" y="138" textAnchor="middle" fontSize="11" fontWeight="900" fill={I}>{label('从盘最后位于场内的位置判断','Use the disc’s last in-bounds location')}</text></Base>;
    case 'stall-out': return <Base alt={alt}><Player x={34} y={20} team="d"/><Player x={70} y={20} team="o"/><Disc x={70} y={5}/><Count terminal zh={zh}/></Base>;
    default: return <Base alt={alt}><Caption>{label('示意图','Illustration')}</Caption></Base>;
  }
}
