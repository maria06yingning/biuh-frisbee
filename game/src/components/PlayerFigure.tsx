type PlayerPose = 'stand'|'hold'|'wrap'|'reach'|'run'|'jump'|'call'|'listen'|'block';
type HandKind = 'open'|'grip'|'wrap'|'fist';

const INK = '#1b1a2e';

function Hand({ x, y, skin, kind }: { x:number; y:number; skin:string; kind:HandKind }) {
  if (kind === 'wrap') return <g transform={`translate(${x} ${y})`}>
    <path d="M-3 1Q-7-2-4-6L0-10 4-7 8-9 11-6 8-3Q13-2 10 2L5 7 0 6Z" fill={skin} stroke={INK} strokeWidth="2" strokeLinejoin="round"/>
    <path d="M0-5l4 2m1-4 4 3m-5 5 4 1" fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round"/>
  </g>;
  if (kind === 'open') return <g transform={`translate(${x} ${y})`}>
    <path d="M-3 4Q-7 2-5-2L-5-8Q-4-11-2-8L-1-3 1-10Q3-12 4-9L4-3 6-9Q8-10 9-7L7-1 10-4Q12-4 11-1L7 5Q3 9-1 7Z" fill={skin} stroke={INK} strokeWidth="2" strokeLinejoin="round"/>
    <path d="M-1-2v4m5-5v5m4-4v4" stroke={INK} strokeWidth="1.1" strokeLinecap="round"/>
  </g>;
  if (kind === 'grip') return <g transform={`translate(${x} ${y})`}>
    <path d="M-5 1Q-7-4-3-7L3-8Q8-7 7-2L4 4-1 5Z" fill={skin} stroke={INK} strokeWidth="2" strokeLinejoin="round"/>
    <path d="M-1-4l5 2m-6 1 5 2" stroke={INK} strokeWidth="1.1" strokeLinecap="round"/>
  </g>;
  return <g transform={`translate(${x} ${y})`}>
    <path d="M-5 1Q-7-4-3-7H3Q8-6 7-1L4 4-1 5Z" fill={skin} stroke={INK} strokeWidth="2" strokeLinejoin="round"/>
    <path d="M-3-3h8m-7 3h7" stroke={INK} strokeWidth="1.1" strokeLinecap="round"/>
  </g>;
}

export default function PlayerFigure({ x, y, team='o', pose='stand', flip=false, scale=1, shirtColor, skinColor, hairColor, shortsColor, hairStyle=0, headband=false }: {
  x:number; y:number; team?:'o'|'d'; pose?:PlayerPose; flip?:boolean; scale?:number;
  shirtColor?:string; skinColor?:string; hairColor?:string; shortsColor?:string; hairStyle?:number; headband?:boolean;
}) {
  const shirt = shirtColor ?? (team === 'o' ? '#14c2d8' : '#ff5a4a');
  const skin = skinColor ?? (team === 'o' ? '#e6b48d' : '#c9825e');
  const hair = hairColor ?? (team === 'o' ? '#3a2b29' : '#24202b');
  const shorts = shortsColor ?? INK;
  const hairShape = hairStyle % 3 === 1
    ? 'M-10 16Q-13 6-6 2Q1-1 8 3Q14 8 10 18L6 14Q0 12-5 17Q-8 18-10 16Z'
    : hairStyle % 3 === 2
      ? 'M-10 17Q-12 4-3 2Q7-2 12 8L11 27Q7 25 6 17Q1 15-3 17Q-7 21-10 24Z'
      : 'M-10 17Q-11 3 0 4Q12 5 11 18L4 12Q-3 17-9 14Z';
  const leftArm = pose === 'reach' || pose === 'jump' ? 'M-10 39L-20 25L-23 11'
    : pose === 'run' ? 'M-10 39L-22 31L-30 37'
    : pose === 'listen' ? 'M-10 39L-20 46L-29 40'
    : pose === 'call' ? 'M-10 39L-18 47L-17 58'
    : 'M-10 39L-18 47L-17 58';
  const rightArm = pose === 'reach' || pose === 'jump' ? 'M10 39L22 25L32 10'
    : pose === 'run' ? 'M10 39L22 46L30 39'
    : pose === 'hold' ? 'M10 39L22 33L33 36'
    : pose === 'wrap' ? 'M10 39L20 31Q33 31 39 42Q45 51 48 58'
    : pose === 'call' ? 'M10 39L18 29L18 13'
    : pose === 'listen' ? 'M10 39L20 47L29 43'
    : pose === 'block' ? 'M10 39L24 39L36 39'
    : 'M10 39L18 47L17 58';
  const leftLeg = pose === 'run' ? 'M-6 66L-17 77L-28 86'
    : pose === 'reach' ? 'M-6 66L-20 76L-30 72'
    : pose === 'jump' ? 'M-6 66L-18 76L-28 79'
    : 'M-6 66L-10 90';
  const rightLeg = pose === 'run' ? 'M6 66L17 78L27 87'
    : pose === 'reach' ? 'M6 66L18 76L29 70'
    : pose === 'jump' ? 'M6 66L17 74L10 83'
    : 'M6 66L10 90';
  const leftShoe = pose === 'run' ? 'M-33 84h13l4 5h-20z'
    : pose === 'reach' ? 'M-36 70h13l4 5h-19z'
    : pose === 'jump' ? 'M-35 77h13l4 5h-19z'
    : 'M-15 88h12l4 5h-19z';
  const rightShoe = pose === 'run' ? 'M23 85h12l5 5H23z'
    : pose === 'reach' ? 'M25 68h12l5 5H25z'
    : pose === 'jump' ? 'M8 81h12l5 5H8z'
    : 'M5 88h12l5 5H5z';
  const leftHand = pose === 'reach' || pose === 'jump' ? { x:-23, y:11, kind:'open' as const }
    : pose === 'run' ? { x:-30, y:37, kind:'fist' as const }
    : pose === 'listen' ? { x:-29, y:40, kind:'open' as const }
    : { x:-17, y:58, kind:'fist' as const };
  const rightHand = pose === 'reach' || pose === 'jump' ? { x:32, y:10, kind:'open' as const }
    : pose === 'run' ? { x:30, y:39, kind:'fist' as const }
    : pose === 'hold' ? { x:33, y:36, kind:'grip' as const }
    : pose === 'wrap' ? { x:48, y:58, kind:'wrap' as const }
    : pose === 'call' ? { x:18, y:13, kind:'open' as const }
    : pose === 'listen' ? { x:29, y:43, kind:'open' as const }
    : pose === 'block' ? { x:36, y:39, kind:'open' as const }
    : { x:17, y:58, kind:'fist' as const };
  const limb = (d:string, width=8) => <><path d={d} fill="none" stroke={INK} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"/><path d={d} fill="none" stroke={skin} strokeWidth={width-3.5} strokeLinecap="round" strokeLinejoin="round"/></>;
  return <g transform={`translate(${x} ${y}) scale(${flip?-scale:scale} ${scale})`} aria-hidden="true">
    <ellipse cx="0" cy="99" rx={pose === 'jump' ? 10 : 18} ry={pose === 'jump' ? 2 : 4} fill={INK} opacity={pose === 'jump' ? .16 : .28}/>
    {limb(leftLeg)}{limb(rightLeg)}
    <path d={leftShoe} fill="#fff8e6" stroke={INK} strokeWidth="2" strokeLinejoin="round"/><path d={rightShoe} fill="#fff8e6" stroke={INK} strokeWidth="2" strokeLinejoin="round"/>
    <path d="M-4 25v8q4 4 8 0v-8" fill={skin} stroke={INK} strokeWidth="2"/>
    <path d="M-12 34Q0 29 12 34L15 63Q0 69-15 63Z" fill={shirt} stroke={INK} strokeWidth="2.5" strokeLinejoin="round"/>
    <path d="M-7 34L0 40L7 34" fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round"/>
    <path d="M-14 61h28l-2 11Q0 76-12 72Z" fill={shorts} stroke={INK} strokeWidth="2"/>
    <circle cy="17" r="10.5" fill={skin} stroke={INK} strokeWidth="2.5"/>
    <path d={hairShape} fill={hair} stroke={INK} strokeWidth="2" strokeLinejoin="round"/>
    {headband && <path d="M-9 13Q0 11 9 13v3Q0 14-9 16Z" fill="#fff8e6" stroke={INK} strokeWidth="1.2" strokeLinejoin="round"/>}
    <circle cx="4" cy="18" r="1.2" fill={INK}/><path d="M5 23l3 1" stroke={INK} strokeWidth="1.2" strokeLinecap="round"/>
    {limb(leftArm)}{limb(rightArm)}
    <Hand x={leftHand.x} y={leftHand.y} skin={skin} kind={leftHand.kind}/><Hand x={rightHand.x} y={rightHand.y} skin={skin} kind={rightHand.kind}/>
  </g>;
}

export type { PlayerPose };
