'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { pick, withBase } from '@/content/shared';
import { FRISBEE_VOICES } from '@/content/frisbee-voices';
import PageShell, { Section } from '@/components/PageShell';

type Player = { x: number; y: number; skin: string; hair: string; shirt: string; hairStyle: number; shorts: string };
const PLAYERS: Player[] = [
  { x: 150, y: 100, skin: '#c77f5e', hair: '#352a36', shirt: '#ff816f', hairStyle: 0, shorts: '#f6ecd2' },
  { x: 410, y: 65, skin: '#f0c69b', hair: '#6b4938', shirt: '#ffd23f', hairStyle: 1, shorts: '#466d87' },
  { x: 672, y: 112, skin: '#8b563f', hair: '#23212b', shirt: '#66c8b2', hairStyle: 2, shorts: '#fff8e6' },
  { x: 700, y: 280, skin: '#edc092', hair: '#9a573d', shirt: '#8b83d8', hairStyle: 3, shorts: '#e76f51' },
  { x: 465, y: 322, skin: '#ad6b51', hair: '#25222b', shirt: '#57b5dd', hairStyle: 4, shorts: '#ffd23f' },
  { x: 205, y: 310, skin: '#f1c79d', hair: '#ba754d', shirt: '#f3a4b8', hairStyle: 5, shorts: '#54865e' },
  { x: 95, y: 240, skin: '#d99b71', hair: '#443248', shirt: '#e6a84e', hairStyle: 6, shorts: '#638f91' },
];

function PlayerFigure({ player, active, index, running }: { player: Player; active: boolean; index: number; running: boolean }) {
  const { x, y, skin, hair, shirt, shorts, hairStyle } = player;
  return (
    <g className={`ap-love-player${active ? ' is-holder' : ''}${running ? ' is-running' : ''}`} transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="39" rx="31" ry="7" fill="#486b42" opacity=".17" />
      {active && <circle className="ap-love-halo" cx="0" cy="0" r="42" fill="#fff5b6" opacity=".85" />}
      {/* Legs and shoes */}
      <path d="M-12 29 L-16 49 L-25 58 M12 29 L17 47 L27 53" fill="none" stroke={shorts} strokeWidth="8" strokeLinecap="round" />
      <path d="M-29 59 l11 0 M22 54 l11 2" fill="none" stroke="#342e3a" strokeWidth="5" strokeLinecap="round" />
      {/* Arms */}
      <path d="M-15 4 Q-30 15 -27 26 M15 4 Q28 14 26 25" fill="none" stroke={skin} strokeWidth="8" strokeLinecap="round" />
      <path d="M-15 1 Q0 -6 15 1 L18 29 Q0 37 -18 29Z" fill={shirt} stroke="#1b1a2e" strokeWidth="2.5" />
      {/* Neck, face and hair */}
      <path d="M-5 -14 L-5 -8 M5 -14 L5 -8" stroke={skin} strokeWidth="5" />
      <circle cx="0" cy="-22" r="15" fill={skin} stroke="#1b1a2e" strokeWidth="2" />
      {hairStyle % 3 === 0 && <path d="M-15 -22 Q-17 -41 0 -39 Q17 -38 15 -21 L9 -27 Q0 -18 -8 -26Z" fill={hair} stroke="#1b1a2e" strokeWidth="2" />}
      {hairStyle % 3 === 1 && <path d="M-15 -22 Q-17 -38 -4 -39 Q2 -44 8 -37 Q18 -32 14 -18 Q9 -25 5 -27 Q-2 -20 -12 -24Z" fill={hair} stroke="#1b1a2e" strokeWidth="2" />}
      {hairStyle % 3 === 2 && <path d="M-15 -24 Q-13 -42 1 -39 Q16 -37 16 -22 L10 -25 L7 -18 L1 -25 L-6 -18 L-10 -25Z" fill={hair} stroke="#1b1a2e" strokeWidth="2" />}
      <circle cx="-5" cy="-21" r="1.4" fill="#1b1a2e" />
      <circle cx="5" cy="-21" r="1.4" fill="#1b1a2e" />
      <path d="M-3 -15 Q0 -12 3 -15" fill="none" stroke="#1b1a2e" strokeWidth="1.5" strokeLinecap="round" />
      <text x="0" y="76" textAnchor="middle" className="ap-love-player-label">{String(index + 1).padStart(2, '0')}</text>
    </g>
  );
}

function PassTheLove() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  const [holder, setHolder] = useState(0);
  const [target, setTarget] = useState<number | null>(null);
  const [flying, setFlying] = useState(false);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [players, setPlayers] = useState<Player[]>(() => PLAYERS.map(player => ({ ...player })));
  const [running, setRunning] = useState(false);
  const timer = useRef<number | null>(null);
  const discHolder = flying && target !== null ? target : holder;
  const current = players[holder];
  const receiver = target === null ? current : players[target];
  const disc = players[discHolder];
  const voice = FRISBEE_VOICES[voiceIndex];

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let interval = 0;
    const movePlayers = () => setPlayers(currentPlayers => currentPlayers.map(player => ({
      ...player,
      x: Math.max(72, Math.min(728, player.x + (Math.random() - 0.5) * 180)),
      y: Math.max(78, Math.min(315, player.y + (Math.random() - 0.5) * 90)),
    })));
    const syncMotion = () => {
      window.clearInterval(interval);
      const shouldRun = !motion.matches && !flying;
      setRunning(shouldRun);
      if (shouldRun) interval = window.setInterval(movePlayers, 2300);
    };
    syncMotion();
    motion.addEventListener('change', syncMotion);
    return () => {
      window.clearInterval(interval);
      motion.removeEventListener('change', syncMotion);
    };
  }, [flying]);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const pass = () => {
    if (flying) return;
    const candidates = players.map((_, index) => index).filter(index => index !== holder);
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    const otherVoices = FRISBEE_VOICES.map((_, index) => index).filter(index => index !== voiceIndex);
    const nextVoice = otherVoices.length ? otherVoices[Math.floor(Math.random() * otherVoices.length)] : voiceIndex;
    setTarget(next);
    setFlying(true);
    timer.current = window.setTimeout(() => {
      setHolder(next);
      setVoiceIndex(nextVoice);
      setTarget(null);
      setFlying(false);
      timer.current = null;
    }, 520);
  };

  const handleKey = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      pass();
    }
  };

  return (
    <div className="ap-love-pass">
      <p className="ap-love-instruction">{zh ? '队员在场地里跑动；点飞盘随机传给队友，再读一条朋友的留言。' : 'Players move around the field. Tap the disc to pass it, then read a message from a friend.'}</p>
      <svg viewBox="0 0 800 410" role="group" aria-label={zh ? '队员在场地范围内跑动，点击飞盘传球，并随机展示一条朋友留言' : 'Players run within the field; click the disc to pass and reveal a random message from a friend'}>
        <rect x="0" y="0" width="800" height="410" rx="22" fill="#f8f0d9" />
        <path d="M30 165 Q168 130 295 170 T555 167 T790 160 L790 390 Q650 420 520 390 T250 400 T30 385Z" fill="#d8e9bd" />
        <path d="M65 226 C190 86 590 75 735 218 C635 376 201 378 65 226Z" fill="none" stroke="#557d54" strokeWidth="2" strokeDasharray="7 10" opacity=".55" />
        <path d="M0 355 Q100 315 190 355 M610 330 Q700 295 800 335" fill="none" stroke="#fff8e6" strokeWidth="7" strokeLinecap="round" opacity=".8" />
        {flying && target !== null && <path d={`M${current.x} ${current.y - 49} Q${(current.x + receiver.x) / 2} ${Math.min(current.y, receiver.y) - 105} ${receiver.x} ${receiver.y - 49}`} fill="none" stroke="#ff826e" strokeWidth="3" strokeDasharray="6 8" opacity=".9" />}
        {players.map((player, index) => <PlayerFigure key={index} player={player} index={index} active={index === holder} running={running} />)}
        <g
          className={`ap-love-disc${flying ? ' is-flying' : ''}`}
          transform={`translate(${disc.x} ${disc.y - 52}) rotate(-12)`}
          role="button"
          tabIndex={0}
          aria-label={zh ? '把飞盘传给队友，再听一条朋友留言' : 'Pass the disc and hear another message from a friend'}
          onClick={pass}
          onKeyDown={handleKey}
          aria-disabled={flying}
        >
          <ellipse className="ap-love-disc-hit" rx="36" ry="24" fill="transparent" />
          <ellipse rx="28" ry="10" fill="#ff826e" stroke="#1b1a2e" strokeWidth="2.5" />
          <ellipse rx="16" ry="5" fill="none" stroke="#fff9e9" strokeWidth="2" />
          <circle r="3" fill="#ffd564" />
          <path d="M-8 0 Q0 -4 8 0" fill="none" stroke="#1b1a2e" strokeWidth="1.3" opacity=".7" />
        </g>
        <text x="400" y="395" textAnchor="middle" className="ap-love-field-note">{zh ? '一张盘，轮到每个人。' : 'One disc. Everyone gets a turn.'}</text>
      </svg>
      <div className="ap-love-bubble" aria-live="polite" key={voice.id}>
        <span className="ap-love-quote-mark" aria-hidden="true">“</span>
        <div className="ap-love-voice-copy">
          <span className="ap-love-topic">{pick(lang, voice.topic)}</span>
          <p className="ap-love-reason">{pick(lang, voice.summary ?? voice.quote)}</p>
          {voice.summary && (
            <details className="ap-love-full">
              <summary>{zh ? '阅读全文' : 'Read the full message'}</summary>
              <p>{pick(lang, voice.quote)}</p>
            </details>
          )}
          <h3>{voice.name}</h3>
        </div>
        <span className="ap-love-turn">{zh ? '留言' : 'VOICE'} {String(voiceIndex + 1).padStart(2, '0')} / {String(FRISBEE_VOICES.length).padStart(2, '0')}</span>
      </div>
    </div>
  );
}

export default function Why() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  return (
    <PageShell slug="/why">
      <Section
        id="pass-the-love"
        label={zh ? '草地上的几种回答' : 'A few answers from the field'}
        heading={zh ? '每个人，都有自己的理由。' : 'Everyone has their own reason.'}
        intro={zh ? '点飞盘传给队友，再听听一位朋友分享的真实理由。' : 'Pass the disc and hear a real reason shared by a friend.'}
        full
      >
        <PassTheLove />
      </Section>

      <Section
        id="world"
        label={zh ? '飞盘的大家庭' : 'The wider community'}
        heading={zh ? '从校园，到世界各地。' : 'From campus fields to the world.'}
      >
        <div className="ap-prose">
          <p>
            {zh
              ? <>世界飞盘联合会（WFDF）成立于 1985 年，拥有来自许多国家和地区的会员协会，并获得国际奥委会承认。团队飞盘也登上了世界运动会的赛场。</>
              : <>The World Flying Disc Federation (WFDF), founded in 1985, has member associations across the world and is recognised by the IOC. Ultimate has also taken the field at the World Games.</>}
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
        label={zh ? '下一步' : 'Your next move'}
        heading={zh ? '想试试？从这里上场。' : 'Want to try it? Step onto the field.'}
      >
        <div className="ap-prose">
          <p>
            {zh
              ? '还没机会去草地上？先选一种方式：亲自体验传盘，或看看队员怎样配合。'
              : 'No field nearby? Choose a first step: try the passing yourself or see how the team moves together.'}
          </p>
          <div className="ap-start-actions">
            <a className="ap-start-action is-primary" href={withBase('/?open=play')}>
              <span className="ap-start-action-copy">
                <span className="ap-start-kicker">{zh ? '先上场' : 'START HERE'}</span>
                <strong>{zh ? '进入游戏' : 'Enter the game'}</strong>
                <small>{zh ? '亲自传盘、跑位，感受一场比赛。' : 'Pass, move and feel the game yourself.'}</small>
              </span>
              <span className="ap-start-arrow" aria-hidden="true">↗</span>
            </a>
            <a className="ap-start-action" href={withBase('/?open=lab')}>
              <span className="ap-start-action-copy">
                <span className="ap-start-kicker">{zh ? '看懂配合' : 'EXPLORE TACTICS'}</span>
                <strong>{zh ? '去战术实验室' : 'Open the Tactics Lab'}</strong>
                <small>{zh ? '看看七名队员怎样移动和配合。' : 'See how seven players move as a unit.'}</small>
              </span>
              <span className="ap-start-arrow" aria-hidden="true">→</span>
            </a>
          </div>
          <p className="ap-hint">{zh ? '游戏需要电脑和鼠标，战术实验室支持触屏。' : 'The game needs a computer and mouse. The Tactics Lab supports touch.'}</p>
        </div>
      </Section>
    </PageShell>
  );
}
