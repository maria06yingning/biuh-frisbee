'use client';

import { useEffect, useMemo, useState } from 'react';
import { FIELD_H, FIELD_W, GOAL_Y, SCENES, ZONE_RADIUS, buildFrames, type Frames, type Pt, type Scene } from '@/lab/scenes';
import { addUnlocked, loadUnlocked } from '@/game/codex';
import CodexPanel from './CodexPanel';
import SiteHeader from './SiteHeader';
import { useI18n } from '@/i18n/I18nProvider';
import '@/styles/aero-home.css';
import '@/styles/aero-playful.css';

const SC = 10; // 每米 10 个 SVG 单位
const BEAT_SECONDS = 1.8;
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const sx = (x: number) => x * SC;
const sy = (y: number) => (FIELD_H - y) * SC;

function posAt(frames: Frames, beat: number, p: number): Record<string, Pt> {
  const a = frames.starts[beat];
  const b = frames.ends[beat];
  const e = ease(p);
  const out: Record<string, Pt> = {};
  for (const id of Object.keys(a)) out[id] = [a[id][0] + (b[id][0] - a[id][0]) * e, a[id][1] + (b[id][1] - a[id][1]) * e];
  return out;
}

/** 飞盘位置（SVG 坐标）：持盘时挂在持盘者身上，传盘时沿弧线飞过去 */
function discAt(scene: Scene, frames: Frames, beat: number, p: number, pos: Record<string, Pt>): [number, number] {
  const th = scene.beats[beat].throw;
  const attach = (id: string): [number, number] => [sx(pos[id][0]) + 9, sy(pos[id][1]) - 9];
  if (!th) return attach(frames.holders[beat]);
  const q = clamp01((p - 0.35) / 0.65);
  if (q <= 0) return attach(th.from);
  if (q >= 1) return attach(th.to);
  const a = attach(th.from);
  const b = attach(th.to);
  const e = ease(q);
  return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e - Math.sin(q * Math.PI) * 26];
}

export default function TacticsLab({ onExit, onPlay }: { onExit: () => void; onPlay: () => void }) {
  const { t } = useI18n();
  const [sceneId, setSceneId] = useState<string>(SCENES[0].id);
  const scene = SCENES.find((s) => s.id === sceneId) ?? SCENES[0];
  const frames = useMemo(() => buildFrames(scene), [scene]);
  const last = scene.beats.length - 1;

  const [beat, setBeat] = useState(0);
  const [p, setP] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState<'watch' | 'quiz'>('watch');
  const [picked, setPicked] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [codexOpen, setCodexOpen] = useState(false);
  const [unlocked, setUnlocked] = useState<string[]>([]);

  // 切换战术：重置播放，并解锁对应图鉴
  useEffect(() => {
    setBeat(0);
    setP(0);
    setPlaying(true);
    setMode('watch');
    setPicked(null);
    if (addUnlocked(scene.codexId)) {
      setBanner(scene.id);
      const id = window.setTimeout(() => setBanner(null), 3500);
      return () => window.clearTimeout(id);
    }
  }, [scene]);

  // 播放：推进当前一步的进度
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let lastT = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      setP((prev) => Math.min(1, prev + (dt * speed) / BEAT_SECONDS));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  // 一步播完：停顿一下进入下一步；最后一步播完进入选择题
  useEffect(() => {
    if (!playing || p < 1) return;
    const id = window.setTimeout(() => {
      if (beat < last) {
        setBeat((b) => b + 1);
        setP(0);
      } else {
        setPlaying(false);
        setMode('quiz');
      }
    }, 700 / speed);
    return () => window.clearTimeout(id);
  }, [p, playing, beat, speed, last]);

  // 切换战术的那一帧，beat 还是上一个战术的值：限制在当前战术的范围内，避免越界
  const bi = Math.min(beat, last);
  const pos = posAt(frames, bi, p);
  const disc = discAt(scene, frames, bi, p, pos);
  const beatLines = scene.beats[bi].lines ?? [];

  const replay = () => {
    setBeat(0);
    setP(0);
    setPlaying(true);
    setMode('watch');
    setPicked(null);
  };
  const toggle = () => {
    if (mode === 'quiz' || (beat === last && p >= 1 && !playing)) replay();
    else setPlaying((v) => !v);
  };
  const prev = () => {
    setMode('watch');
    setPicked(null);
    setPlaying(false);
    if (beat > 0) {
      setBeat(beat - 1);
      setP(1);
    } else setP(0);
  };
  const next = () => {
    if (beat >= last) return;
    setMode('watch');
    setPicked(null);
    setBeat(beat + 1);
    setP(0);
    setPlaying(true);
  };
  const skip = () => {
    setBeat(last);
    setP(1);
    setPlaying(false);
    setMode('quiz');
    setPicked(null);
  };
  const cycleSpeed = () => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 0.5 : 1));
  const openCodex = () => { setUnlocked(loadUnlocked()); setCodexOpen(true); };
  const nextScene = () => {
    const i = SCENES.findIndex((s) => s.id === scene.id);
    setSceneId(SCENES[(i + 1) % SCENES.length].id);
  };

  const isOpt = (id: string) => mode === 'quiz' && scene.quiz.options.includes(id);
  const correct = picked !== null && scene.quiz.correct.includes(picked);

  const line = (a: string, b: string) => ({ x1: sx(pos[a][0]), y1: sy(pos[a][1]), x2: sx(pos[b][0]), y2: sy(pos[b][1]) });

  return (
    <div className="lab aero-page aero-playful">
      <SiteHeader current="lab" onHomeClick={onExit} onLab={() => {}} onCodex={openCodex} onPlay={onPlay} />
      <header className="lab-heading">
        <h1>{t('lab.title')}</h1>
        <p>{t('lab.sub')}</p>
      </header>

      <div className="lab-body">
        <div className="lab-board-wrap">
          <svg className="lab-svg" viewBox={`0 0 ${FIELD_W * SC} ${FIELD_H * SC}`} role="img" aria-label={t(`lab.${scene.id}.name`)}>
            <defs>
              <pattern id="lab-hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="12" stroke="rgba(27,26,46,0.07)" strokeWidth="3" />
              </pattern>
            </defs>
            {Array.from({ length: 8 }, (_, i) => (
              <rect key={i} x={0} y={i * 80} width={FIELD_W * SC} height={80} fill={i % 2 ? '#7fc371' : '#8fd17e'} />
            ))}
            <rect x={0} y={0} width={FIELD_W * SC} height={sy(GOAL_Y)} fill="#ffcf4a" opacity={0.92} />
            <rect x={0} y={0} width={FIELD_W * SC} height={FIELD_H * SC} fill="url(#lab-hatch)" />
            <line x1={0} x2={FIELD_W * SC} y1={sy(GOAL_Y)} y2={sy(GOAL_Y)} stroke="#f6ecd2" strokeWidth={4} />
            <rect x={2} y={2} width={FIELD_W * SC - 4} height={FIELD_H * SC - 4} fill="none" stroke="#f6ecd2" strokeWidth={4} />
            <text x={FIELD_W * SC / 2} y={sy(GOAL_Y) / 2 + 6} textAnchor="middle" className="lab-zone-label">
              {t('lab.endzone')}
            </text>
            <text x={20} y={FIELD_H * SC - 18} className="lab-attack-label">
              ↑ {t('lab.attack')}
            </text>

            {scene.zones &&
              Array.from({ length: 7 }, (_, i) => (
                <circle key={`z${i}`} cx={sx(pos[`d${i + 1}`][0])} cy={sy(pos[`d${i + 1}`][1])} r={ZONE_RADIUS * SC} className="lab-zone" />
              ))}
            {scene.marks &&
              Array.from({ length: 7 }, (_, i) => <line key={`m${i}`} {...line(`d${i + 1}`, `o${i + 1}`)} className="lab-mark" />)}
            {beatLines.map((l, i) => {
              const ln = line(l.from, l.to);
              return (
                <g key={`l${i}`}>
                  <line {...ln} className={`lab-line ${l.kind}`} />
                  <text x={(ln.x1 + ln.x2) / 2} y={(ln.y1 + ln.y2) / 2 + 8} textAnchor="middle" className="lab-cross">
                    ✕
                  </text>
                </g>
              );
            })}

            {Object.keys(pos).map((id) => {
              const off = id[0] === 'o';
              const num = id.slice(1);
              const opt = isOpt(id) && picked === null;
              const isCorrect = picked !== null && scene.quiz.correct.includes(id);
              const isWrongPick = picked === id && !isCorrect;
              return (
                <g
                  key={id}
                  transform={`translate(${sx(pos[id][0])} ${sy(pos[id][1])})`}
                  className={opt ? 'lab-player is-opt' : 'lab-player'}
                  onClick={opt ? () => setPicked(id) : undefined}
                >
                  {opt && <circle r={19} className="lab-pulse" />}
                  {isCorrect && <circle r={19} className="lab-ring ok" />}
                  {isWrongPick && <circle r={19} className="lab-ring bad" />}
                  {off ? <circle r={11} className="lab-o" /> : <rect x={-10} y={-10} width={20} height={20} rx={4} className="lab-d" />}
                  <text y={4.5} textAnchor="middle" className="lab-num">
                    {num}
                  </text>
                </g>
              );
            })}

            <g transform={`translate(${disc[0]} ${disc[1]})`}>
              <ellipse rx={8} ry={4.6} className="lab-disc" />
              <ellipse rx={5} ry={2.6} className="lab-disc-rim" />
            </g>
          </svg>
          <div className="lab-legend">
            <span><i className="lg-o" /> {t('lab.legend.o')}</span>
            <span><i className="lg-d" /> {t('lab.legend.d')}</span>
            <span><i className="lg-disc" /> {t('lab.legend.disc')}</span>
            {scene.marks && <span><i className="lg-mark" /> {t('lab.legend.mark')}</span>}
            {scene.zones && <span><i className="lg-zone" /> {t('lab.legend.zone')}</span>}
          </div>
        </div>

        <aside className="lab-side">
          {(['offense', 'defense'] as const).map((g) => (
            <div key={g} className="lab-group">
              <div className="lab-group-title">{t(`lab.group.${g}`)}</div>
              <div className="lab-tabs">
                {SCENES.filter((s) => s.group === g).map((s) => (
                  <button key={s.id} className={`lab-tab${s.id === scene.id ? ' is-on' : ''}`} onClick={() => setSceneId(s.id)}>
                    {t(`lab.${s.id}.name`)}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="lab-info">
            <h2>{t(`lab.${scene.id}.name`)}</h2>
            <p><b>{t('lab.use')}</b>　{t(`lab.${scene.id}.use`)}</p>
            <p><b>{t('lab.weak')}</b>　{t(`lab.${scene.id}.weak`)}</p>
          </div>

          <div className="lab-beat">
            <div className="lab-beat-head">{t('lab.beat', { n: bi + 1, m: last + 1 })}</div>
            <div className="lab-beat-title">{t(`lab.${scene.id}.b${bi + 1}.t`)}</div>
            <p>{t(`lab.${scene.id}.b${bi + 1}.x`)}</p>
          </div>

          <div className="lab-ctrls">
            <button className="btn" onClick={prev} disabled={beat === 0 && p === 0}>{t('lab.prev')}</button>
            <button className="btn btn-primary" onClick={toggle}>
              {mode === 'quiz' || (beat === last && p >= 1 && !playing) ? t('lab.replay') : playing ? t('lab.pause') : t('lab.play')}
            </button>
            <button className="btn" onClick={next} disabled={beat >= last}>{t('lab.next')}</button>
            <button className="btn" onClick={cycleSpeed} aria-label={t('lab.speed')}>{speed}×</button>
            {mode !== 'quiz' && <button className="btn btn-ghost" onClick={skip}>{t('lab.skip')}</button>}
          </div>

          {mode === 'quiz' && (
            <div className="lab-quiz">
              <div className="lab-quiz-head">{t('lab.quiz.title')}</div>
              <p className="lab-quiz-q">{t(`lab.${scene.id}.q`)}</p>
              {picked === null ? (
                <p className="lab-quiz-hint">{t('lab.quiz.hint')}</p>
              ) : (
                <div className={`lab-result ${correct ? 'is-ok' : 'is-bad'}`}>
                  <b>{t(correct ? 'lab.quiz.right' : 'lab.quiz.wrong')}</b>
                  <p>{t(`lab.${scene.id}.${correct ? 'ok' : 'bad'}`)}</p>
                  <div className="lab-ctrls">
                    {!correct && <button className="btn" onClick={() => setPicked(null)}>{t('lab.quiz.retry')}</button>}
                    <button className="btn btn-primary" onClick={nextScene}>{t('lab.quiz.next')}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {banner && <div className="exp-unlock">{t('exp.unlocked', { name: t(`lab.${banner}.name`) })}</div>}
      {codexOpen && <CodexPanel unlocked={unlocked} onClose={() => setCodexOpen(false)} />}
    </div>
  );
}
