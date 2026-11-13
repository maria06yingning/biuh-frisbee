'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { pick, withBase } from '@/content/shared';
import { FRISBEE_VOICES } from '@/content/frisbee-voices';
import PageShell, { Section } from '@/components/PageShell';
import FieldPlayerFigure from '@/components/PlayerFigure';

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

const PASS_SPOTS: [number, number][] = [
  [126, 150], [254, 92], [350, 170], [522, 96], [680, 151], [620, 228],
  [676, 302], [486, 314], [304, 320], [160, 286], [102, 218], [410, 254],
];

function findOpenSpot(players: Player[], movingIndex: number): [number, number] {
  const start = Math.floor(Math.random() * PASS_SPOTS.length);
  for (let offset = 0; offset < PASS_SPOTS.length; offset++) {
    const [x, y] = PASS_SPOTS[(start + offset) % PASS_SPOTS.length];
    const movedFarEnough = Math.hypot(players[movingIndex].x - x, players[movingIndex].y - y) > 64;
    const clearOfTeammates = players.every((player, index) => index === movingIndex || Math.hypot(player.x - x, player.y - y) > 82);
    if (movedFarEnough && clearOfTeammates) return [x, y];
  }
  return [players[movingIndex].x, players[movingIndex].y];
}

function heldDiscPoint(player: Player): [number, number] {
  const facing = player.x > 400 ? -1 : 1;
  return [player.x + facing * 33, player.y - 23];
}

function PlayerFigure({ player, active, running }: { player: Player; active: boolean; running: boolean }) {
  const { x, y, skin, hair, shirt, shorts, hairStyle } = player;
  return (
    <g className={`ap-love-player${active ? ' is-holder' : ''}${running ? ' is-running' : ''}`} transform={`translate(${x} ${y})`}>
      {active && <circle className="ap-love-halo" cx="0" cy="-8" r="42" fill="#ffd23f" opacity=".22" />}
      <FieldPlayerFigure
        x={0}
        y={-59}
        team="o"
        pose={running ? 'run' : active ? 'hold' : 'stand'}
        flip={x > 400}
        shirtColor={shirt}
        skinColor={skin}
        hairColor={hair}
        shortsColor={shorts}
        hairStyle={hairStyle}
        headband
      />
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
  const [runningPlayer, setRunningPlayer] = useState<number | null>(null);
  const [discFlight, setDiscFlight] = useState<{ x: number; y: number; rotation: number } | null>(null);
  const passFrame = useRef<number | null>(null);
  const current = players[holder];
  const receiver = target === null ? current : players[target];
  const currentDiscPoint = heldDiscPoint(current);
  const receiverDiscPoint = heldDiscPoint(receiver);
  const discX = discFlight?.x ?? currentDiscPoint[0];
  const discY = discFlight?.y ?? currentDiscPoint[1];
  const discRotation = discFlight?.rotation ?? -12;
  const voice = FRISBEE_VOICES[voiceIndex];

  useEffect(() => () => {
    if (passFrame.current !== null) window.cancelAnimationFrame(passFrame.current);
  }, []);

  const pass = () => {
    if (flying) return;
    const candidates = players.map((_, index) => index).filter(index => index !== holder);
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    const otherVoices = FRISBEE_VOICES.map((_, index) => index).filter(index => index !== voiceIndex);
    const nextVoice = otherVoices.length ? otherVoices[Math.floor(Math.random() * otherVoices.length)] : voiceIndex;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setHolder(next);
      setVoiceIndex(nextVoice);
      return;
    }

    const [endX, endY] = findOpenSpot(players, next);
    const [startX, startY] = heldDiscPoint(current);
    const [targetX, targetY] = heldDiscPoint({ ...players[next], x: endX, y: endY });
    const controlX = (startX + targetX) / 2;
    const controlY = Math.min(startY, targetY) - 53;
    const startedAt = performance.now();
    const duration = 300;

    setPlayers(currentPlayers => currentPlayers.map((player, index) => index === next ? { ...player, x: endX, y: endY } : player));
    setRunningPlayer(next);
    setTarget(next);
    setFlying(true);
    setDiscFlight({ x: startX, y: startY, rotation: -12 });

    const animatePass = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const inverse = 1 - eased;
      const x = inverse * inverse * startX + 2 * inverse * eased * controlX + eased * eased * targetX;
      const y = inverse * inverse * startY + 2 * inverse * eased * controlY + eased * eased * targetY;
      setDiscFlight({ x, y, rotation: -12 + 300 * eased });
      if (progress < 1) {
        passFrame.current = window.requestAnimationFrame(animatePass);
        return;
      }
      passFrame.current = null;
      setHolder(next);
      setVoiceIndex(nextVoice);
      setTarget(null);
      setFlying(false);
      setRunningPlayer(null);
      setDiscFlight(null);
    };
    passFrame.current = window.requestAnimationFrame(animatePass);
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
        {flying && target !== null && <path d={`M${currentDiscPoint[0]} ${currentDiscPoint[1]} Q${(currentDiscPoint[0] + receiverDiscPoint[0]) / 2} ${Math.min(currentDiscPoint[1], receiverDiscPoint[1]) - 53} ${receiverDiscPoint[0]} ${receiverDiscPoint[1]}`} fill="none" stroke="#ffd23f" strokeWidth="5" strokeLinecap="round" opacity=".9" />}
        {players.map((player, index) => <PlayerFigure key={index} player={player} active={index === holder} running={index === runningPlayer} />)}
        <g
          className={`ap-love-disc${flying ? ' is-flying' : ''}`}
          transform={`translate(${discX} ${discY}) rotate(${discRotation})`}
          role="button"
          tabIndex={0}
          aria-label={zh ? '把飞盘传给队友，再听一条朋友留言' : 'Pass the disc and hear another message from a friend'}
          onClick={pass}
          onKeyDown={handleKey}
          aria-disabled={flying}
        >
          <ellipse className="ap-love-disc-hit" rx="36" ry="24" fill="transparent" />
          <ellipse rx="28" ry="10" fill="#ffd23f" stroke="#1b1a2e" strokeWidth="2.5" />
          <ellipse rx="22" ry="7" fill="none" stroke="#ff6a1a" strokeWidth="2.5" />
          <ellipse rx="12" ry="4" fill="none" stroke="#fff8e6" strokeWidth="1.7" />
          <circle r="3" fill="#1b1a2e" />
          <path d="M-8 0 Q0 -4 8 0" fill="none" stroke="#1b1a2e" strokeWidth="1.3" opacity=".7" />
        </g>
        <text x="400" y="395" textAnchor="middle" className="ap-love-field-note">{zh ? '一张盘，轮到每个人。' : 'One disc. Everyone gets a turn.'}</text>
      </svg>
      <div className="ap-love-bubble" aria-live="polite" key={voice.id}>
        <span className="ap-love-quote-mark" aria-hidden="true">“</span>
        <div className="ap-love-voice-copy">
          <div className="ap-love-tags">
            <span className="ap-love-topic">{pick(lang, voice.topic)}</span>
            {voice.source === 'ai' && <span className="ap-love-source">{zh ? 'AI 生成灵感 · 非真实玩家留言' : 'AI-generated inspiration · not a real testimonial'}</span>}
          </div>
          <p className="ap-love-reason">{pick(lang, voice.summary ?? voice.quote)}</p>
          {voice.summary && (
            <details className="ap-love-full">
              <summary>{zh ? '阅读全文' : 'Read the full message'}</summary>
              <p>{pick(lang, voice.quote)}</p>
            </details>
          )}
          {voice.name && <h3>{voice.name}</h3>}
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
        label={zh ? '来自草地的留言' : 'Messages from the field'}
        heading={zh ? '喜欢飞盘的理由，不止一种。' : 'There are many reasons to love ultimate.'}
        intro={zh ? '点飞盘传给队友，再读一条留言。AI 生成的灵感会明确标注，不代表真实玩家。' : 'Pass the disc and read a message. AI-generated prompts are labelled and are not real testimonials.'}
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
