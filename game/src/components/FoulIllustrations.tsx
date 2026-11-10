import type { ReactNode } from 'react';
import PlayerFigure, { type PlayerPose } from '@/components/PlayerFigure';

const I='#1b1a2e',C='#14c2d8',R='#ff5a4a',Y='#ffd23f',G='#8fd17e',P='#fff8e6',O='#ff6a1a';
export type FoulSceneId='receiving'|'marking'|'strip'|'blocking'|'dangerous'|'offsetting'|'travel'|'fast-count'|'double-team'|'marking-space'|'pick'|'pull'|'kind-foul'|'kind-infraction'|'kind-violation';

type HumanPose = PlayerPose;
function HumanFigure(props: {x:number;y:number;team?:'o'|'d';pose?:HumanPose;flip?:boolean;scale?:number}) {
  return <PlayerFigure {...props} />;
}
function Disc({x,y,r=0}:{x:number;y:number;r?:number}){return <g transform={`translate(${x} ${y}) rotate(${r})`} aria-hidden="true"><ellipse rx="16" ry="7" fill={Y} stroke={I} strokeWidth="2.5"/><ellipse rx="10" ry="3" fill="none" stroke={O} strokeWidth="2"/></g>}
function Base({children,alt}:{children:ReactNode;alt:string}){return <svg className="ap-foul-scene ap-specific-diagram" viewBox="0 0 360 160" role="img" aria-label={alt}><rect width="360" height="160" fill={P}/>{children}</svg>}
function Field(){return <g aria-hidden="true"><rect x="5" y="12" width="350" height="136" fill={G} stroke={I} strokeWidth="3"/><path d="M5 48h350M5 84h350M5 120h350" stroke="#7fc371" strokeWidth="14"/><path d="M180 12v136" stroke={P} strokeWidth="2" strokeDasharray="5 5"/></g>}
function Burst({x,y,color=Y}:{x:number;y:number;color?:string}){return <path d="M0-17l5 11 13-4-8 10 10 8-14-1-2 13-5-12-12 5 7-11-10-8 13 1Z" transform={`translate(${x} ${y})`} fill={color} stroke={I} strokeWidth="2" aria-hidden="true"/>}
function fitFontSize(text:ReactNode,size:number,maxWidth=336){
  if(typeof text!=='string'||!text.length)return size;
  const width=[...text].reduce((sum,char)=>sum+(/[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(char)?size:/\s/.test(char)?size*.32:/[MW@%]/.test(char)?size*.82:/[A-Z0-9]/.test(char)?size*.62:/[.,:;!'’]/.test(char)?size*.3:size*.52),0);
  return Math.min(size,Math.max(8,size*maxWidth/width));
}
function Title({children,x=180,y=148}:{children:ReactNode;x?:number;y?:number}){return <text x={x} y={y} textAnchor="middle" fill={I} fontSize={fitFontSize(children,11)} fontWeight="900">{children}</text>}

export function CallDiagram({ stage, outcome, status, lang }: { stage:number; outcome:string; status:string; lang:'zh'|'en' }) {
  const zh = lang === 'zh';
  const label = (cn:string,en:string) => zh ? cn : en;
  const captions = [label('接盘争抢发生接触','Contact while playing the disc'), label('当事人叫停，所有人复述','Call made and echoed'), label('双方说明所见并倾听','Explain and listen'), label('按接盘犯规对应条款恢复','Restart under the receiving-foul rule')];
  return <svg className="ap-foul-scene ap-specific-diagram" viewBox="0 0 520 180" role="img" aria-label={captions[stage]}>
    <rect width="520" height="180" fill={P}/><rect x="14" y="18" width="492" height="144" fill={G} stroke={I} strokeWidth="3"/>
    <path d="M14 55h492M14 91h492M14 127h492" stroke="#7fc371" strokeWidth="14"/>
    {stage < 2 ? <>
      <HumanFigure x={stage===0?212:188} y={42} team="o" pose={stage===0?'reach':'call'} scale={.82}/><HumanFigure x={stage===0?308:332} y={42} team="d" pose={stage===0?'reach':'listen'} flip scale={.82}/>
      <Disc x={260} y={stage===0?68:83}/>
      {stage===0 ? <><path d="M212 89l18-15m-9 29 17-15m70-15-18-15m9 29-17-15" stroke={I} strokeWidth="4" strokeLinecap="round"/><Burst x={260} y={100}/></> : <>
        <path d="M89 40h98v33H89zM337 40h105v33H337z" fill={P} stroke={I} strokeWidth="3"/><text x="138" y="61" textAnchor="middle" fontSize="13" fontWeight="900" fill={I}>FOUL!</text><text x="389" y="61" textAnchor="middle" fontSize="13" fontWeight="900" fill={I}>FOUL!</text>
        <path d="M215 54h87" stroke={Y} strokeWidth="5"/><path d="M294 47l11 7-11 7" fill={Y} stroke={I} strokeWidth="2"/>
      </>}
    </> : <>
      <HumanFigure x={144} y={42} team="o" pose="listen" scale={.82}/><HumanFigure x={376} y={42} team="d" pose="listen" flip scale={.82}/>
      <path d="M166 86q26-23 54 0M300 86q26-23 54 0" fill="none" stroke={I} strokeWidth="3"/>
      <Disc x={stage===3 && outcome==='contested'?183:264} y={84}/>
      <rect x="177" y="35" width="166" height="42" fill={stage===3?Y:P} stroke={I} strokeWidth="3"/><text x="260" y="53" textAnchor="middle" fontSize="12" fontWeight="900" fill={I}>{stage===2?label('回应方式','Response'):label('恢复结果','Outcome')}</text><text x="260" y="68" textAnchor="middle" fontSize={fitFontSize(stage===3?label('按本项规则恢复','Apply the specific restart'):status,9,150)} fontWeight="800" fill={I}>{stage===3?label('按本项规则恢复','Apply the specific restart'):status}</text>
      {stage===3&&<path d="M230 111h61" stroke={I} strokeWidth="3" strokeDasharray="5 4"/>}
    </>}
    <text x="260" y="153" textAnchor="middle" fontSize="12" fontWeight="900" fill={I}>{captions[stage]}</text>
  </svg>;
}

export default function FoulIllustration({id,alt,lang}:{id:FoulSceneId;alt:string;lang:'zh'|'en'}){
  const zh = lang === 'zh';
  const label = (cn:string,en:string) => zh ? cn : en;
  switch(id){
    case 'receiving': return <Base alt={alt}><Field/><HumanFigure x={162} y={39} team="o" pose="reach" scale={.86}/><HumanFigure x={198} y={39} team="d" pose="reach" flip scale={.86}/><Disc x={180} y={50}/><Burst x={180} y={82} color={R}/><Title y={148}>{label('争抢飞盘时发生非轻微接触','Non-minor contact while playing the disc')}</Title></Base>;
    case 'marking': return <Base alt={alt}><Field/><HumanFigure x={150} y={34} team="o" pose="hold"/><Disc x={193} y={70}/><HumanFigure x={210} y={34} team="d" pose="wrap" flip/><Burst x={170} y={76} color={R}/><Title y={148}>{label('标记者的手臂进入持盘者身体空间','Marker’s arm enters the thrower’s space')}</Title></Base>;
    case 'strip': return <Base alt={alt}><Field/><HumanFigure x={145} y={34} team="o" pose="hold" scale={.82}/><HumanFigure x={220} y={34} team="d" pose="block" flip scale={.82}/><Disc x={177} y={63}/><path d="M190 62Q218 44 248 46" fill="none" stroke={R} strokeWidth="5" strokeLinecap="round"/><path d="M239 39l12 7-12 7" fill={R} stroke={I} strokeWidth="2"/><Burst x={183} y={64} color={R}/><Title y={148}>{label('接盘已完成，却被犯规打掉','A completed catch is knocked away by a foul')}</Title></Base>;
    case 'blocking': return <Base alt={alt}><Field/><path d="M93 116Q146 91 202 82" fill="none" stroke={C} strokeWidth="5" strokeDasharray="8 5" strokeLinecap="round"/><HumanFigure x={82} y={38} team="o" pose="run" scale={.8}/><HumanFigure x={212} y={36} team="d" pose="stand" flip scale={.82}/><path d="M194 55v55" stroke={R} strokeWidth="5"/><Burst x={194} y={80} color={R}/><Title y={148}>{label('防守者占住无法避开的路线','Defender occupies an unavoidable path')}</Title></Base>;
    case 'dangerous': return <Base alt={alt}><Field/>
      <ellipse cx="242" cy="130" rx="55" ry="17" fill={R} fillOpacity=".18" stroke={R} strokeWidth="3" strokeDasharray="6 4"/>
      <text x="242" y="134" textAnchor="middle" fontSize="9" fontWeight="900" fill={I}>{label('接盘者落点','LANDING AREA')}</text>
      <path d="M237 101v15" stroke={Y} strokeWidth="5" strokeLinecap="round"/><path d="M231 110l6 9 6-9" fill={Y} stroke={I} strokeWidth="1.5"/>
      <path d="M171 116Q190 109 211 119" fill="none" stroke={R} strokeWidth="6" strokeLinecap="round"/><path d="M203 112l13 7-14 5Z" fill={R} stroke={I} strokeWidth="1.5"/>
      <path d="M101 58h27m-21 9h20m-14 9h13" stroke={R} strokeWidth="4" strokeLinecap="round"/>
      <HumanFigure x={144} y={38} team="d" pose="run" scale={.8}/>
      <HumanFigure x={235} y={22} team="o" pose="jump" scale={.82}/><Disc x={274} y={30}/>
      <circle cx="294" cy="108" r="15" fill={Y} stroke={I} strokeWidth="3"/><text x="294" y="113" textAnchor="middle" fontSize="15" fontWeight="900" fill={I}>!</text>
      <path d="M14 16h116v22H14z" fill={R} stroke={I} strokeWidth="2"/><text x="72" y="31" textAnchor="middle" fontSize={zh?10:8} fontWeight="900" fill={I}>{label('高速冲入落点','INTO LANDING ZONE')}</text>
      <text x="180" y="155" textAnchor="middle" fontSize={fitFontSize(label('高速冲入腾空接盘者的落点；未碰撞也可能构成危险动作','Entering an airborne receiver’s landing area risks injury—even without contact'),10)} fontWeight="900" fill={I}>{label('高速冲入腾空接盘者的落点；未碰撞也可能构成危险动作','Entering an airborne receiver’s landing area risks injury—even without contact')}</text>
    </Base>;
    case 'offsetting': return <Base alt={alt}><Field/><HumanFigure x={121} y={38} team="o" pose="run" scale={.8}/><HumanFigure x={239} y={38} team="d" pose="run" flip scale={.8}/><Disc x={180} y={62}/><path d="M148 116Q162 88 174 72M212 116Q198 88 186 72" fill="none" stroke={I} strokeWidth="4" strokeDasharray="6 4"/><Burst x={180} y={85} color={R}/><path d="M53 30h62v22H53zM245 30h62v22h-62z" fill={P} stroke={I} strokeWidth="2"/><text x="84" y="45" textAnchor="middle" fontSize="10" fontWeight="900" fill={I}>FOUL!</text><text x="276" y="45" textAnchor="middle" fontSize="10" fontWeight="900" fill={I}>FOUL!</text><Title y={148}>{label('双方同一回合都叫停，按双方犯规处理','Both sides call fouls on the same play')}</Title></Base>;
    case 'travel': return <Base alt={alt}><path d="M15 126H345" stroke={I} strokeWidth="3"/><path d="M15 131H345" stroke={G} strokeWidth="12"/><HumanFigure x={158} y={40} team="o" pose="hold" scale={.95}/><Disc x={201} y={74}/><circle cx="112" cy="126" r="10" fill={P} stroke={R} strokeWidth="3" strokeDasharray="4 3"/><path d="M125 126H140" stroke={R} strokeWidth="4" strokeLinecap="round"/><path d="M135 120l8 6-8 6" fill={R} stroke={I} strokeWidth="1.5"/><circle cx="149" cy="126" r="13" fill="none" stroke={R} strokeWidth="3" strokeDasharray="4 3"/><text x="104" y="148" textAnchor="middle" fontSize="10" fontWeight="900" fill={I}>{label('原轴心点','Original pivot')}</text><text x="247" y="148" textAnchor="middle" fontSize="10" fontWeight="900" fill={R}>{label('轴心脚已移位','Pivot foot moved')}</text></Base>;
    case 'fast-count': return <Base alt={alt}><HumanFigure x={42} y={45} team="d" scale={.55}/><HumanFigure x={82} y={45} team="o" pose="hold" scale={.55}/><Disc x={103} y={65}/><text x="35" y="35" fontSize="11" fontWeight="900" fill={I}>STALLING</text>{['1','2','3','4'].map((n,i)=><g key={n}><rect x={116+i*48} y="49" width="38" height="39" fill={i<2?Y:P} stroke={I} strokeWidth="2"/><text x={135+i*48} y="74" textAnchor="middle" fontSize="15" fontWeight="900" fill={I}>{n}</text></g>)}<path d="M154 104h19m29 0h19m29 0h19" stroke={R} strokeWidth="4"/><text x="198" y="126" textAnchor="middle" fontSize="10" fontWeight="900" fill={I}>{label('间隔短于 1 秒：计数过快','Less than 1 second: fast count')}</text><circle cx="319" cy="35" r="17" fill={Y} stroke={I} strokeWidth="3"/><path d="M319 23v12l9 5" fill="none" stroke={I} strokeWidth="3" strokeLinecap="round"/></Base>;
    case 'double-team': return <Base alt={alt}><Field/><circle cx="171" cy="86" r="59" fill={C} fillOpacity=".12" stroke={C} strokeWidth="3" strokeDasharray="7 5"/><HumanFigure x={151} y={43} pose="hold" scale={.72}/><Disc x={176} y={69}/><HumanFigure x={185} y={43} team="d" pose="stand" scale={.68}/><HumanFigure x={219} y={75} team="d" pose="stand" scale={.56}/><HumanFigure x={300} y={45} team="o" pose="stand" scale={.56}/><path d="M215 103l16 16m0-16-16 16" stroke={R} strokeWidth="3"/><text x="171" y="27" textAnchor="middle" fontSize="11" fontWeight="900" fill={I}>3 m</text><text x="180" y="135" textAnchor="middle" fontSize={fitFontSize(label('第二名防守者未盯住另一名进攻者','Second defender must guard another attacker'),9)} fontWeight="900" fill={I}>{label('第二名防守者未盯住另一名进攻者','Second defender must guard another attacker')}</text></Base>;
    case 'marking-space': return <Base alt={alt}><Field/><HumanFigure x={151} y={30} team="o" pose="hold"/><Disc x={194} y={66}/><HumanFigure x={210} y={30} team="d" pose="wrap" flip/><Title y={149}>{label('标记者手臂从侧后方绕住持盘者','Marker wraps an arm around the thrower')}</Title></Base>;
    case 'pick': return <Base alt={alt}><Field/><HumanFigure x={88} y={40} team="o" pose="run" scale={.74}/><HumanFigure x={257} y={40} team="d" pose="run" flip scale={.74}/><HumanFigure x={177} y={40} team="o" pose="stand" scale={.74}/><path d="M113 105Q164 79 234 73" fill="none" stroke={R} strokeWidth="4" strokeDasharray="7 4"/><path d="M239 57q-20-18-42-6" fill="none" stroke={C} strokeWidth="4"/><path d="M217 47l-10 4 8 7" fill={C} stroke={I} strokeWidth="1.5"/><path d="M239 60l-22 27" stroke={I} strokeWidth="2" strokeDasharray="4 4"/><Title y={148}>{label('另一名球员挡住防守者的跟随路线','Another player blocks the defender’s route')}</Title></Base>;
    case 'pull': return <Base alt={alt}><rect x="28" y="37" width="304" height="94" fill={G} stroke={I} strokeWidth="3"/><path d="M28 82h304" stroke={P} strokeWidth="3"/><path d="M28 43h304" stroke={I} strokeWidth="3" strokeDasharray="6 4"/><HumanFigure x={83} y={-1} team="d" scale={.45}/><HumanFigure x={278} y={40} team="o" pose="run" scale={.45}/><HumanFigure x={228} y={40} team="o" pose="run" scale={.45}/><Disc x={100} y={25}/><path d="M102 24Q181 2 254 73" fill="none" stroke={Y} strokeWidth="4"/><path d="M248 62l10 12-13-2" fill={Y} stroke={I} strokeWidth="2"/><path d="M277 73v18" stroke={R} strokeWidth="4" strokeDasharray="3 3"/><text x="180" y="20" textAnchor="middle" fontSize="11" fontWeight="900" fill={I}>{label('防守方提前过线 / 进攻方提前离线','Defense crosses early / offense leaves early')}</text><text x="180" y="149" textAnchor="middle" fontSize="10" fontWeight="900" fill={I}>{label('必须在进攻方触盘前叫停','Call before the offense touches the disc')}</text></Base>;
    case 'kind-foul': return <Base alt={alt}><Field/><HumanFigure x={158} y={38} team="o" pose="run" scale={.82}/><HumanFigure x={202} y={38} team="d" pose="run" flip scale={.82}/><Burst x={180} y={84} color={R}/><path d="M52 29h82v22H52z" fill={P} stroke={I} strokeWidth="2"/><text x="93" y="44" textAnchor="middle" fontSize={fitFontSize(label('非轻微接触','Non-minor contact'),10,74)} fontWeight="900" fill={I}>{label('非轻微接触','Non-minor contact')}</text><Title y={148}>{label('只有被犯规者可叫犯规','Only the fouled player may call a foul')}</Title></Base>;
    case 'kind-infraction': return <Base alt={alt}><HumanFigure x={76} y={38} team="d" scale={.62}/><HumanFigure x={118} y={38} team="o" pose="hold" scale={.62}/><Disc x={139} y={60}/><path d="M162 64h111" stroke={I} strokeWidth="3"/><path d="M265 57l11 7-11 7" fill={I}/><path d="M282 48v32" stroke={R} strokeWidth="4"/><text x="180" y="115" textAnchor="middle" fontSize={fitFontSize(label('修正轴心脚或标记位置；通常继续比赛','Correct the pivot or mark; play usually continues'),10)} fontWeight="900" fill={I}>{label('修正轴心脚或标记位置；通常继续比赛','Correct the pivot or mark; play usually continues')}</text><Title y={147}>{label('违规（infraction）','Infraction')}</Title></Base>;
    case 'kind-violation': return <Base alt={alt}><Field/><HumanFigure x={88} y={38} team="o" pose="run" scale={.72}/><HumanFigure x={258} y={38} team="d" pose="run" flip scale={.72}/><HumanFigure x={176} y={38} team="o" pose="stand" scale={.72}/><path d="M113 104Q163 78 234 74" fill="none" stroke={R} strokeWidth="4" strokeDasharray="7 4"/><path d="M141 16h78v22h-78z" fill={P} stroke={I} strokeWidth="2"/><text x="180" y="31" textAnchor="middle" fontSize="10" fontWeight="900" fill={I}>Pick!</text><Title y={148}>{label('违例（violation）：按具体规则叫停','Violation: call it as the specific rule requires')}</Title></Base>;
    default:return <Base alt={alt}><Title>{label('情景图','Play diagram')}</Title></Base>;
  }
}
