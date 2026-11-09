'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { pick, type Bi } from '@/content/shared';

const STAGES: { title: Bi; text: Bi }[] = [
  { title: ['两队列队', 'Line up'], text: ['双方在各自防守的得分线准备开盘。图示以常见 7v7 为例。', 'Both teams set at the goal line they defend. The diagram uses a standard 7-a-side example.'] },
  { title: ['防守方开盘（pull）', 'The defense pulls'], text: ['双方示意准备后，防守方从得分线掷出开盘；盘一离手，比赛开始。', 'Once both teams signal readiness, the defense pulls from the goal line. Play begins when the disc is released.'] },
  { title: ['接盘并控制', 'Receive and establish possession'], text: ['接盘方控制飞盘，停下并建立轴心点，开始向对方得分区进攻。', 'The receiving team catches the pull, establishes possession and a pivot, then attacks the far end zone.'] },
  { title: ['传切推进', 'Advance by passing'], text: ['持盘者不能跑；队友跑位接应，飞盘可以向任意方向传。', 'The thrower cannot run; teammates cut to receive, and the disc may be passed in any direction.'] },
  { title: ['在得分区完成接盘', 'Complete a catch in the end zone'], text: ['进攻方在自己攻击的得分区内合法接住飞盘并保持控制，得 1 分。', 'Catch a legal pass in the end zone your team attacks and maintain possession to score one goal.'] },
  { title: ['换端，下一分再开盘', 'Switch ends and pull again'], text: ['得分后双方交换防守端；得分方转为防守方，负责下一次开盘。', 'After a goal, teams switch ends. The team that scored becomes defense and pulls next.'] },
];

const X = [200, 300, 400, 500, 600, 700, 800];
const teamY = (team: 'o'|'d', i: number, step: number) => {
  if (step === 0 || step === 1) return team === 'o' ? 355 : 112;
  if (step === 2) return team === 'o' ? 302 + (i % 3) * 17 : 163 + (i % 3) * 18;
  if (step === 3) return team === 'o' ? 231 + (i % 4) * 23 : 137 + (i % 4) * 23;
  if (step === 4) return team === 'o' ? (i === 3 ? 72 : 153 + (i % 3) * 19) : 110 + (i % 4) * 22;
  return team === 'o' ? 112 : 355;
};
const discAt = (step: number) => [
  [500, 103], [515, 218], [700, 336], [600, 231], [500, 70], [500, 254],
][step];

export default function PointFlow() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setReduced(mq.matches); if (mq.matches) setPlaying(false); };
    update(); mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!playing || reduced) return;
    const timer = window.setTimeout(() => {
      if (step >= STAGES.length - 1) setPlaying(false);
      else setStep(step + 1);
    }, 1550);
    return () => window.clearTimeout(timer);
  }, [playing, reduced, step]);
  const jump = (next: number) => { setPlaying(false); setStep(Math.max(0, Math.min(STAGES.length - 1, next))); };
  const [dx, dy] = discAt(step);
  const offensePositions = (i: number) => ({ x: X[i], y: teamY('o', i, step) });
  const defensePositions = (i: number) => ({ x: X[i], y: teamY('d', i, step) });
  const pullPath = step === 1 ? 'M500 112 Q540 158 515 218' : step === 5 ? 'M500 328 Q462 242 500 145' : '';
  const passPath = step === 3 ? 'M700 254 Q649 202 600 231' : ''; 
  return <div className="ap-point-flow">
    <div className="ap-point-flow-legend" aria-label={zh ? '图例' : 'Legend'}>
      <span><i className="is-offense" aria-hidden="true"/> {zh ? '进攻方' : 'Offense'}</span>
      <span><i className="is-defense" aria-hidden="true"/> {zh ? '防守方' : 'Defense'}</span>
      <span><i className="is-disc" aria-hidden="true"/> {zh ? '飞盘' : 'Disc'}</span>
    </div>
    <figure className="ap-point-flow-figure">
      <svg viewBox="0 0 1000 440" role="img" aria-label={`${pick(lang, STAGES[step].title)}. ${pick(lang, STAGES[step].text)}`}>
        <rect x="35" y="35" width="930" height="370" fill="#8fd17e" stroke="#1b1a2e" strokeWidth="4"/>
        <path d="M35 90h930M35 145h930M35 200h930M35 255h930M35 310h930M35 365h930" stroke="#7fc371" strokeWidth="22" opacity=".66"/>
        <rect x="35" y="35" width="930" height="65" fill="#ffd23f" fillOpacity=".82" stroke="#1b1a2e" strokeWidth="3"/>
        <rect x="35" y="340" width="930" height="65" fill="#ffd23f" fillOpacity=".82" stroke="#1b1a2e" strokeWidth="3"/>
        <path d="M35 100h930M35 340h930" stroke="#1b1a2e" strokeWidth="4"/>
        <text x="500" y="75" textAnchor="middle" fontSize="20" fontWeight="900" fill="#1b1a2e">{zh ? '得分区 · 进攻目标' : 'END ZONE · ATTACK'}</text>
        <text x="500" y="382" textAnchor="middle" fontSize="20" fontWeight="900" fill="#1b1a2e">{zh ? '接盘方的防守得分区' : 'RECEIVING TEAM’S DEFENDING END ZONE'}</text>
        {step === 5 && <><text x="500" y="126" textAnchor="middle" fontSize="14" fontWeight="900" fill="#1b1a2e">{zh ? '得分方改为防守并开盘' : 'SCORING TEAM DEFENDS & PULLS'}</text><text x="500" y="325" textAnchor="middle" fontSize="14" fontWeight="900" fill="#1b1a2e">{zh ? '双方已交换防守端' : 'TEAMS HAVE SWITCHED ENDS'}</text></>}
        {pullPath && <><path d={pullPath} fill="none" stroke="#1b1a2e" strokeWidth="3" strokeDasharray="8 7"/><path d={step===1?'M510 209l6 13-12-5':'M493 153l7-11 7 11'} fill="#1b1a2e"/></>}
        {passPath && <><path d={passPath} fill="none" stroke="#14c2d8" strokeWidth="6" strokeLinecap="round"/><path d="M610 223l-12 2 7 10" fill="#14c2d8" stroke="#1b1a2e" strokeWidth="2"/></>}
        {Array.from({length:7},(_,i)=>{
          const o=offensePositions(i), d=defensePositions(i);
          const offCaught = step===2 && i===5;
          const offScorer = step===4 && i===3;
          return <g key={`players-${i}`} className="ap-flow-player" style={{transform:`translate(${o.x}px, ${o.y}px)`, transition: playing&&!reduced ? 'transform 520ms ease-in-out' : 'none'}}>
            <circle r="17" fill="#14c2d8" stroke="#1b1a2e" strokeWidth="3"/>
            <text y="5" textAnchor="middle" fontSize="13" fontWeight="900" fill="#1b1a2e">{i+1}</text>
            {offCaught && <path d="M-24-23l8 8m0-8-8 8" stroke="#1b1a2e" strokeWidth="3"/>}
            {offScorer && <circle r="25" fill="none" stroke="#ffd23f" strokeWidth="5"/>}
          </g>;
        })}
        {Array.from({length:7},(_,i)=>{
          const p=defensePositions(i);
          return <g key={`defenders-${i}`} className="ap-flow-player" style={{transform:`translate(${p.x}px, ${p.y}px)`, transition: playing&&!reduced ? 'transform 520ms ease-in-out' : 'none'}}>
            <rect x="-15" y="-15" width="30" height="30" rx="4" fill="#ff5a4a" stroke="#1b1a2e" strokeWidth="3"/>
            <text y="5" textAnchor="middle" fontSize="13" fontWeight="900" fill="#1b1a2e">{i+1}</text>
          </g>;
        })}
        {step===4 && <rect x="35" y="35" width="930" height="65" fill="#ffd23f" fillOpacity=".48" pointerEvents="none"/>}
        <g className="ap-flow-disc" style={{transform:`translate(${dx}px, ${dy}px)`, transition: playing&&!reduced ? 'transform 620ms cubic-bezier(.2,.8,.25,1)' : 'none'}}>
          <ellipse rx="24" ry="11" fill="#ffd23f" stroke="#1b1a2e" strokeWidth="4"/>
          <ellipse rx="15" ry="5" fill="none" stroke="#ff6a1a" strokeWidth="3"/>
          <path d="M-15-3q11-8 24-2" fill="none" stroke="#fff8e6" strokeWidth="3" strokeLinecap="round"/>
        </g>
        {step===4 && <g transform="translate(837 64)"><rect x="-37" y="-22" width="74" height="44" fill="#fff8e6" stroke="#1b1a2e" strokeWidth="3"/><text textAnchor="middle" y="8" fontSize="26" fontWeight="900" fill="#1b1a2e">+1</text></g>}
      </svg>
      <figcaption aria-live="polite"><strong>{pick(lang, STAGES[step].title)}</strong><span>{pick(lang, STAGES[step].text)}</span></figcaption>
    </figure>
    <div className="ap-point-flow-controls" role="group" aria-label={zh ? '比赛流程控制' : 'Point-flow controls'}>
      <button type="button" onClick={() => { if (step === STAGES.length - 1) setStep(0); setPlaying(!playing); }} disabled={reduced} aria-pressed={playing}>
        {playing ? (zh ? '暂停' : 'Pause') : (step===STAGES.length-1 ? (zh ? '重播流程' : 'Replay') : (zh ? '播放流程' : 'Play flow'))}
      </button>
      <button type="button" onClick={() => jump(step-1)} disabled={step===0} aria-label={zh ? '上一拍' : 'Previous beat'}>←</button>
      <div className="ap-point-flow-beats" role="group" aria-label={zh ? '选择流程步骤' : 'Choose a beat'}>
        {STAGES.map((stage,i)=><button key={i} type="button" onClick={()=>jump(i)} aria-current={step===i?'step':undefined} aria-label={`${zh?'第':'Beat '}${i+1}${zh?'拍：':''}${pick(lang,stage.title)}`}>{i+1}</button>)}
      </div>
      <button type="button" onClick={() => jump(step+1)} disabled={step===STAGES.length-1} aria-label={zh ? '下一拍' : 'Next beat'}>→</button>
      {reduced && <span className="ap-point-flow-reduced">{zh ? '已启用减少动态；可用步骤按钮逐帧查看。' : 'Reduced motion is on; use the beat buttons to step through.'}</span>}
    </div>
    <p className="ap-point-flow-note">{zh ? '规则依据：WFDF《极限飞盘规则 2025–2028》第 4.5、5.1、7.1、14.1 条。户外每队每分上场人数为 5–7 人；图示选用 7 人。' : 'Rules: WFDF Rules of Ultimate 2025–2028, 4.5, 5.1, 7.1 and 14.1. Outdoor teams field 5–7 players per point; this diagram shows seven.'}</p>
  </div>;
}
