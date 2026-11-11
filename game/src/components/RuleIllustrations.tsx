import type { ReactNode } from 'react';
import PlayerFigure from '@/components/PlayerFigure';

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
function Disc({ x, y, turn = 0 }: {x:number;y:number;turn?:number}) {
  return <g transform={`translate(${x} ${y}) rotate(${turn})`} aria-hidden="true"><ellipse rx="16" ry="7" fill={Y} stroke={I} strokeWidth="2.5"/><ellipse rx="10" ry="3.4" fill="none" stroke={O} strokeWidth="2"/></g>;
}
function fitFontSize(text:ReactNode,size:number,maxWidth=336) {
  if(typeof text!=='string'||!text.length) return size;
  const width=[...text].reduce((sum,char)=>sum+(/[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(char)?size:/\s/.test(char)?size*.32:/[MW@%]/.test(char)?size*.82:/[A-Z0-9]/.test(char)?size*.62:/[.,:;!'’]/.test(char)?size*.3:size*.52),0);
  return Math.min(size,Math.max(8,size*maxWidth/width));
}
function Caption({ x=180, y=170, children }: {x?:number;y?:number;children:ReactNode}) {
  return <text x={x} y={y} textAnchor="middle" fontSize={fitFontSize(children,12)} fontWeight="900" fill={I}>{children}</text>;
}
function Base({ children, alt }: { children:ReactNode;alt:string }) {
  return <svg className="ap-rule-scene ap-specific-diagram" viewBox="0 0 360 188" role="img" aria-label={alt}><rect width="360" height="188" fill={P}/>{children}</svg>;
}
function Count({ terminal = false, zh }: {terminal?:boolean;zh:boolean}) {
  const note=terminal?(zh?'未在“10”开始前出手 → 盘权转换':'Not released before “ten” → turnover'):(zh?'相邻数字至少间隔 1 秒':'At least 1 second between number starts');
  return <g aria-hidden="true">
    <text x="18" y="40" fontSize="12" fontWeight="900" fill={I}>STALLING</text>
    {Array.from({length:10},(_,i)=><g key={i} transform={`translate(${17+i*32} 58)`}>
      <rect width="27" height="36" fill={i<7?Y:i<9?P:R} stroke={I} strokeWidth="2"/>
      <text x="13.5" y="23" textAnchor="middle" fontSize="14" fontWeight="900" fill={I}>{i+1}</text>
    </g>)}
    <path d="M18 105H335" stroke={I} strokeWidth="2"/>
    <path d="M330 100l7 5-7 5" fill="none" stroke={I} strokeWidth="2"/>
    <text x="18" y="129" fontSize={fitFontSize(note,11,330)} fontWeight="800" fill={I}>{note}</text>
    {terminal&&<path d="M328 121l14 14m0-14-14 14" stroke={P} strokeWidth="5"/>}
  </g>;
}

export default function RuleIllustration({ id, alt, lang }: { id:RuleSceneId;alt:string;lang:'zh'|'en' }) {
  const zh = lang === 'zh';
  const label = (cn:string,en:string) => zh ? cn : en;
  switch(id) {
    case 'goal': return <Base alt={alt}><Field/><path d="M121 65Q220 35 320 44" fill="none" stroke={C} strokeWidth="5" strokeLinecap="round"/><path d="M312 37l12 7-13 6" fill={C} stroke={I} strokeWidth="2"/><PlayerFigure x={80} y={35} team="o" pose="hold" scale={.78}/><PlayerFigure x={305} y={34} team="o" pose="reach" scale={.8}/><Disc x={119} y={63}/><Disc x={330} y={43}/><path d="M306 13h42v22h-42z" fill={Y} stroke={I} strokeWidth="2"/><text x="327" y="29" textAnchor="middle" fontSize="13" fontWeight="900" fill={I}>+1</text><Caption x={175} y={170}>{label('队友在进攻得分区内接住飞盘','Teammate catches in the attacking end zone')}</Caption></Base>;
    case 'travel': return <Base alt={alt}>
      <path d="M12 124H348" stroke={I} strokeWidth="3"/><path d="M12 129H348" stroke={G} strokeWidth="12"/>
      <PlayerFigure x={158} y={40} team="o" pose="hold" scale={.95}/><Disc x={201} y={74}/>
      <circle cx="112" cy="126" r="10" fill={P} stroke={R} strokeWidth="3" strokeDasharray="4 3"/>
      <path d="M125 126H140" stroke={R} strokeWidth="4" strokeLinecap="round"/><path d="M135 120l8 6-8 6" fill={R} stroke={I} strokeWidth="1.5"/>
      <circle cx="149" cy="126" r="13" fill="none" stroke={R} strokeWidth="3" strokeDasharray="4 3"/>
      <text x="103" y="148" textAnchor="middle" fontSize="10" fontWeight="900" fill={I}>{label('原轴心点','Original pivot')}</text>
      <text x="225" y="148" textAnchor="middle" fontSize="10" fontWeight="900" fill={R}>{label('轴心脚已移位','Pivot foot moved')}</text>
    </Base>;
    case 'stall': return <Base alt={alt}><Count zh={zh}/></Base>;
    case 'marker': return <Base alt={alt}><Field end="left"/><circle cx="171" cy="83" r="51" fill={C} fillOpacity=".14" stroke={C} strokeWidth="3" strokeDasharray="7 5"/><PlayerFigure x={150} y={31} team="o" pose="hold" scale={.75}/><Disc x={175} y={58}/><PlayerFigure x={178} y={32} team="d" pose="block" flip scale={.75}/><PlayerFigure x={207} y={72} team="d" pose="stand" scale={.58}/><PlayerFigure x={297} y={72} team="o" pose="stand" scale={.58}/><path d="M213 111L282 111" stroke={I} strokeWidth="2" strokeDasharray="3 5"/><path d="M171 134V30" stroke={I} strokeWidth="2" strokeDasharray="3 5"/><text x="171" y="25" textAnchor="middle" fontSize="11" fontWeight="900" fill={I}>3 m</text><text x="180" y="170" textAnchor="middle" fontSize={fitFontSize(label('第二名防守者要盯住另一名进攻者','Second defender guards another attacker'),10)} fontWeight="900" fill={I}>{label('第二名防守者要盯住另一名进攻者','Second defender guards another attacker')}</text></Base>;
    case 'directions': return <Base alt={alt}><Field/><PlayerFigure x={180} y={36} team="o" pose="hold" scale={.62}/><Disc x={201} y={58}/><PlayerFigure x={70} y={27} team="o" scale={.55}/><PlayerFigure x={285} y={27} team="o" scale={.55}/><PlayerFigure x={80} y={75} team="o" scale={.55}/><PlayerFigure x={286} y={75} team="o" scale={.55}/><path d="M174 61Q126 43 87 39M198 61Q239 42 270 39M174 75Q128 91 96 95M198 75Q243 92 271 95" fill="none" stroke={C} strokeWidth="4" strokeLinecap="round"/><path d="M89 34l-9 5 10 3m179-8 10 5-10 3m-165 51-10 7 12 1m163-4 11 4-8 7" fill={C} stroke={I} strokeWidth="1.5"/><Caption x={180} y={170}>{label('前、后、横向都能传','Pass forward, backward or sideways')}</Caption></Base>;
    case 'turnover': return <Base alt={alt}><Field/><PlayerFigure x={72} y={37} team="o" pose="hold" scale={.72}/><PlayerFigure x={222} y={35} team="d" pose="reach" flip scale={.72}/><PlayerFigure x={300} y={71} team="d" pose="run" scale={.56}/><path d="M100 63Q151 35 198 43" fill="none" stroke={C} strokeWidth="4" strokeDasharray="7 4"/><Disc x={201} y={43}/><path d="M239 73Q267 91 293 105" fill="none" stroke={R} strokeWidth="5"/><path d="M286 94l11 12-14 1" fill={R} stroke={I} strokeWidth="2"/><rect x="119" y="18" width="128" height="24" fill={Y} stroke={I} strokeWidth="2"/><text x="183" y="34" textAnchor="middle" fontSize="12" fontWeight="900" fill={I}>{label('盘权转换','TURNOVER')}</text></Base>;
    case 'restart': return <Base alt={alt}><rect x="24" y="24" width="312" height="104" fill={G} stroke={I} strokeWidth="3"/><path d="M24 76h312" stroke={I} strokeWidth="2"/><path d="M238 24v104" stroke={I} strokeWidth="2" strokeDasharray="5 4"/><PlayerFigure x={126} y={32} team="o" pose="hold" scale={.68}/><Disc x={151} y={57}/><PlayerFigure x={194} y={32} team="d" pose="stand" scale={.68}/><path d="M213 74h34" stroke={Y} strokeWidth="6"/><path d="M241 67l10 7-10 7" fill={Y} stroke={I} strokeWidth="2"/><text x="129" y="116" textAnchor="middle" fontSize="10" fontWeight="900" fill={I}>{label('确认双方站位','Check both teams are ready')}</text><text x="180" y="170" textAnchor="middle" fontSize={fitFontSize(label('按具体规则选择恢复点','Choose the rule-specific restart point'),10)} fontWeight="900" fill={I}>{label('按具体规则选择恢复点','Choose the rule-specific restart point')}</text></Base>;
    case 'contact': return <Base alt={alt}><path d="M24 126H336" stroke={G} strokeWidth="12"/><PlayerFigure x={143} y={34} team="o" pose="run" scale={.82}/><PlayerFigure x={217} y={34} team="d" pose="run" flip scale={.82}/><path d="M117 116Q151 90 170 107M243 116Q209 90 190 107" fill="none" stroke={C} strokeWidth="4" strokeDasharray="7 4" strokeLinecap="round"/><path d="M169 87h22" stroke={Y} strokeWidth="5" strokeLinecap="round"/><text x="180" y="170" textAnchor="middle" fontSize="11" fontWeight="900" fill={I}>{label('为对手留出空间，不推撞','Leave space; do not push or bump')}</text></Base>;
    case 'self-officiate': return <Base alt={alt}>
      <path d="M26 126H334" stroke={G} strokeWidth="12"/><PlayerFigure x={105} y={26} team="o" pose="call"/><PlayerFigure x={255} y={26} team="d" pose="listen" flip/>
      <path d="M70 3h83v20H82l-8 6v-6h-4zM207 3h83v20h-71l-8 6v-6h-4z" fill={P} stroke={I} strokeWidth="2.5"/>
      <text x="111" y="17" textAnchor="middle" fontSize={fitFontSize(label('说明所见','State what happened'),10,74)} fontWeight="900" fill={I}>{label('说明所见','State what happened')}</text>
      <text x="248" y="17" textAnchor="middle" fontSize={fitFontSize(label('听取并回应','Listen and respond'),10,74)} fontWeight="900" fill={I}>{label('听取并回应','Listen and respond')}</text>
      <path d="M155 79H204" stroke={Y} strokeWidth="5" strokeLinecap="round"/><path d="M198 73l9 6-9 6" fill={Y} stroke={I} strokeWidth="2"/>
      <path d="M205 92H156" stroke={C} strokeWidth="4" strokeLinecap="round"/><path d="M162 86l-9 6 9 6" fill={C} stroke={I} strokeWidth="1.5"/>
      <Disc x={180} y={119}/><Caption x={180} y={170}>{label('球员共同解决叫停并恢复比赛','Players resolve the call and restart together')}</Caption>
    </Base>;
    case 'spirit': return <Base alt={alt}><Field/><PlayerFigure x={123} y={37} team="o" pose="listen" scale={.76}/><PlayerFigure x={237} y={37} team="d" pose="listen" flip scale={.76}/><Disc x={180} y={89}/><path d="M149 112l12 9 22-24" fill="none" stroke={Y} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/><Caption x={180} y={170}>{label('尊重 · 规则 · 安全 · 乐趣','Respect · Rules · Safety · Joy')}</Caption></Base>;
    case 'throwaway': return <Base alt={alt}><Field/><PlayerFigure x={70} y={38} team="o" pose="hold" scale={.72}/><PlayerFigure x={278} y={38} team="o" pose="run" scale={.65}/><path d="M97 65Q163 31 220 48" fill="none" stroke={C} strokeWidth="4" strokeDasharray="7 4"/><Disc x={224} y={58} turn={28}/><path d="M226 68v31m-9-7 9 9 9-9" fill="none" stroke={R} strokeWidth="4" strokeLinecap="round"/><text x="180" y="170" textAnchor="middle" fontSize={fitFontSize(label('未接住，盘落地','Pass incomplete; disc hits ground'),10)} fontWeight="900" fill={I}>{label('未接住，盘落地','Pass incomplete; disc hits ground')}</text></Base>;
    case 'drop': return <Base alt={alt}><Field/><PlayerFigure x={165} y={31} team="o" pose="reach" scale={.76}/><Disc x={198} y={92} turn={24}/><path d="M198 65v17m-6-7 6 8 6-8" stroke={R} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M164 123h68" stroke={R} strokeWidth="4"/><text x="180" y="170" textAnchor="middle" fontSize="11" fontWeight="900" fill={I}>{label('接盘未完成，飞盘落地','Catch not established; disc hits the ground')}</text></Base>;
    case 'interception': return <Base alt={alt}><Field/><PlayerFigure x={63} y={40} team="o" pose="hold" scale={.72}/><PlayerFigure x={248} y={31} team="d" pose="reach" flip scale={.76}/><PlayerFigure x={311} y={72} team="o" pose="run" scale={.55}/><path d="M89 66Q166 30 224 43" fill="none" stroke={C} strokeWidth="4" strokeDasharray="7 4"/><Disc x={230} y={43}/><text x="180" y="170" textAnchor="middle" fontSize={fitFontSize(label('防守者先接住并控制住飞盘','Defender catches and controls the disc'),10)} fontWeight="900" fill={I}>{label('防守者先接住并控制住飞盘','Defender catches and controls the disc')}</text></Base>;
    case 'block': return <Base alt={alt}><Field/><PlayerFigure x={72} y={40} team="o" pose="hold" scale={.72}/><PlayerFigure x={248} y={34} team="d" pose="block" flip scale={.76}/><path d="M98 66Q166 35 220 48" fill="none" stroke={C} strokeWidth="4"/><Disc x={226} y={48} turn={28}/><path d="M239 37l5 9 10-1-7 7 4 9-9-5-8 5 2-10-8-6 10-1Z" fill={Y} stroke={I} strokeWidth="2"/><path d="M236 69v30" stroke={R} strokeWidth="4"/><text x="180" y="170" textAnchor="middle" fontSize={fitFontSize(label('防守者把传球拍落','Defender knocks the pass down'),11)} fontWeight="900" fill={I}>{label('防守者把传球拍落','Defender knocks the pass down')}</text></Base>;
    case 'out': return <Base alt={alt}><Field out/><path d="M305 10v140" stroke={I} strokeWidth="4" strokeDasharray="5 4"/><Disc x={328} y={68} turn={18}/><path d="M299 65h-33" stroke={Y} strokeWidth="5"/><path d="M270 58l-10 7 10 7" fill={Y} stroke={I} strokeWidth="2"/><circle cx={296} cy={68} r="7" fill={R} stroke={I} strokeWidth="2"/><text x="323" y="100" textAnchor="middle" fontSize="11" fontWeight="900" fill={I}>{label('界外','Out')}</text><text x="180" y="170" textAnchor="middle" fontSize={fitFontSize(label('按飞盘最后在场内的位置判断','Use the disc’s last in-bounds point'),11)} fontWeight="900" fill={I}>{label('按飞盘最后在场内的位置判断','Use the disc’s last in-bounds point')}</text></Base>;
    case 'stall-out': return <Base alt={alt}><Count terminal zh={zh}/></Base>;
    default: return <Base alt={alt}><Caption>{label('示意图','Illustration')}</Caption></Base>;
  }
}
