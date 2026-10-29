'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { ArrowScribble, DiscMark, DuelArt, FieldRulerArt, RunnerArt, TalkArt, Tape } from './story-art';

/* ───────── 工具 ───────── */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** 把 p 在 [a, b] 区间内映射到 0–1 */
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const smooth = (x: number) => x * x * (3 - 2 * x);
const easeInOut = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

type Pt = [number, number];
const pt = (p: Pt) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

/* ───────── 场景几何 ─────────
 * 球场按真实尺寸（37 × 100 米，两端 18 米得分区）做透视投影，
 * 飞盘轨迹、落点和场地线都在同一个像素坐标系里，保证落点正好在得分区内。 */
interface Geo {
  w: number;
  h: number;
  flight: string;
  landing: Pt;
  outline: string;
  ezNear: string;
  ezFar: string;
  bricks: string;
  ezPoly: string;
  lenLabel: Pt;
  ezLabel: Pt;
}

function buildGeo(w: number, h: number): Geo {
  const portrait = h > w * 1.05;
  const z0 = 8; // 相机到近端线的距离（米）
  const hy = h * (portrait ? 0.5 : 0.54); // 地平线
  const halfNear = w * (portrait ? 0.62 : 0.5);
  const f = (halfNear * z0) / 18.5;
  const camH = ((h * 0.98 - hy) * z0) / f;
  const P = (x: number, z: number): Pt => [w / 2 + (f * x) / (z + z0), hy + (f * camH) / (z + z0)];
  const line = (a: Pt, b: Pt) => `M${pt(a)} L${pt(b)}`;

  const landing = P(-5, 9);
  const flight = [
    `M${pt([-0.08 * w, 0.34 * h])}`,
    `C${pt([0.25 * w, 0.06 * h])} ${pt([0.62 * w, 0.02 * h])} ${pt([0.8 * w, 0.2 * h])}`,
    `C${pt([0.94 * w, 0.33 * h])} ${pt([landing[0] + 0.3 * w, landing[1] - 0.42 * h])} ${pt(landing)}`,
  ].join(' ');

  const cross = (c: Pt, s: number) =>
    `M${pt([c[0] - s, c[1]])} L${pt([c[0] + s, c[1]])} M${pt([c[0], c[1] - s * 0.4])} L${pt([c[0], c[1] + s * 0.4])}`;

  return {
    w,
    h,
    flight,
    landing,
    outline: `M${pt(P(-18.5, 0))} L${pt(P(18.5, 0))} L${pt(P(18.5, 100))} L${pt(P(-18.5, 100))} Z`,
    ezNear: line(P(-18.5, 18), P(18.5, 18)),
    ezFar: line(P(-18.5, 82), P(18.5, 82)),
    bricks: `${cross(P(0, 36), w * 0.012)} ${cross(P(0, 64), w * 0.008)}`,
    ezPoly: [P(-18.5, 0), P(18.5, 0), P(18.5, 18), P(-18.5, 18)].map(pt).join(' '),
    lenLabel: P(18.5, 30),
    ezLabel: P(9, 5),
  };
}

/* ───────── 页面 ───────── */
const SECTIONS = ['home', 'basics', 'rules', 'fouls', 'spirit', 'tactics', 'game'] as const;
type SectionId = (typeof SECTIONS)[number];

export interface StoryProps {
  onPlay: () => void;
  onLab: () => void;
  onCodex: () => void;
  restoreY?: number;
}

export default function Story({ onPlay, onLab, onCodex, restoreY = 0 }: StoryProps) {
  const { t, lang, setLang } = useI18n();
  const [geo, setGeo] = useState<Geo | null>(null);
  const [active, setActive] = useState<SectionId>('home');
  const [isStatic, setIsStatic] = useState(false);

  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const flightRef = useRef<SVGPathElement>(null);
  const trailRef = useRef<SVGPathElement>(null);
  const discRef = useRef<SVGGElement>(null);
  const discBodyRef = useRef<SVGGElement>(null);
  const shadowRef = useRef<SVGEllipseElement>(null);
  const rippleRef = useRef<SVGEllipseElement>(null);
  const linesRef = useRef<SVGGElement>(null);
  const ezRef = useRef<SVGPolygonElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  // 几何随视口尺寸重算
  useLayoutEffect(() => {
    const measure = () => setGeo(buildGeo(window.innerWidth, window.innerHeight));
    measure();
    let id = 0;
    const onResize = () => {
      window.cancelAnimationFrame(id);
      id = window.requestAnimationFrame(measure);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.cancelAnimationFrame(id);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setIsStatic(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // 从实验室 / 游戏返回时，回到离开时的位置
  useEffect(() => {
    if (restoreY > 0) window.scrollTo({ top: restoreY, behavior: 'instant' as ScrollBehavior });
  }, [restoreY]);

  /** 根据开场段落的滚动进度 p（0–1）摆放整个场景。直接写 DOM，不触发 React 重渲染。 */
  const render = useCallback(
    (p: number) => {
      if (!geo) return;
      const stage = stageRef.current;
      stage?.style.setProperty('--p', p.toFixed(4));

      // 1. 镜头下摇：天空上移淡出，球场从下方进入
      const tilt = smooth(seg(p, 0.3, 0.62));
      if (skyRef.current) {
        skyRef.current.style.transform = `translate3d(0, ${(-tilt * 22).toFixed(2)}%, 0) scale(${(1.06 - p * 0.04).toFixed(3)})`;
        skyRef.current.style.opacity = (1 - smooth(seg(p, 0.42, 0.62))).toFixed(3);
      }
      if (fieldRef.current) {
        fieldRef.current.style.transform = `translate3d(0, ${((1 - tilt) * 18).toFixed(2)}%, 0) scale(${(1.12 - tilt * 0.1).toFixed(3)})`;
        fieldRef.current.style.opacity = smooth(seg(p, 0.34, 0.56)).toFixed(3);
      }

      // 2. 飞盘沿轨迹飞行，最后平落在近端得分区
      const path = flightRef.current;
      const tf = seg(p, 0.05, 0.56);
      const e = easeInOut(tf);
      if (path && discRef.current && discBodyRef.current) {
        const len = path.getTotalLength();
        const a = path.getPointAtLength(len * e);
        const b = path.getPointAtLength(Math.min(len, len * e + 2));
        const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        const land = smooth(seg(tf, 0.82, 1)); // 落地前逐渐放平
        const scale = 0.42 + e * 0.9;
        const tiltDeg = ang * 0.22 * (1 - land) - 10 * (1 - land);
        discRef.current.setAttribute('transform', `translate(${a.x.toFixed(1)} ${a.y.toFixed(1)})`);
        discBodyRef.current.setAttribute('transform', `rotate(${tiltDeg.toFixed(2)}) scale(${scale.toFixed(3)} ${(scale * (1 - land * 0.35)).toFixed(3)})`);
        discRef.current.style.opacity = tf > 0 ? '1' : '0';
      }
      if (trailRef.current) {
        trailRef.current.style.strokeDashoffset = (1 - e).toFixed(4);
        trailRef.current.style.opacity = (tf > 0 ? 1 - smooth(seg(p, 0.6, 0.78)) * 0.8 : 0).toFixed(3);
      }
      if (shadowRef.current) {
        const s = smooth(seg(tf, 0.6, 1));
        shadowRef.current.style.opacity = (s * 0.45).toFixed(3);
        shadowRef.current.setAttribute('rx', (10 + s * 26).toFixed(1));
        shadowRef.current.setAttribute('ry', (3 + s * 7).toFixed(1));
      }
      if (rippleRef.current) {
        const r = seg(p, 0.55, 0.72);
        rippleRef.current.setAttribute('rx', (20 + r * 140).toFixed(1));
        rippleRef.current.setAttribute('ry', (6 + r * 40).toFixed(1));
        rippleRef.current.style.opacity = r > 0 && r < 1 ? (0.8 * (1 - r)).toFixed(3) : '0';
      }

      // 3. 落点向外"长出"场地线
      const draw = smooth(seg(p, 0.56, 0.84));
      linesRef.current?.querySelectorAll<SVGPathElement>('path').forEach((el, i) => {
        const d = clamp01(draw * 1.25 - i * 0.08);
        el.style.strokeDashoffset = (1 - d).toFixed(4);
      });
      if (ezRef.current) ezRef.current.style.opacity = (smooth(seg(p, 0.7, 0.86)) * 0.32).toFixed(3);
      if (notesRef.current) {
        const n = smooth(seg(p, 0.76, 0.88));
        notesRef.current.style.opacity = n.toFixed(3);
        notesRef.current.style.setProperty('--draw', n.toFixed(3));
      }

      // 4. 文案：每块在自己的区间内出现 / 消失
      copyRef.current?.querySelectorAll<HTMLElement>('[data-range]').forEach((el) => {
        const [a, b] = (el.dataset.range ?? '0,1').split(',').map(Number);
        const fade = 0.05;
        const o = Math.min(a < 0 ? 1 : seg(p, a, a + fade), b > 1 ? 1 : 1 - seg(p, b - fade, b));
        el.style.opacity = smooth(o).toFixed(3);
        el.style.transform = `translate3d(0, ${((1 - smooth(o)) * (p < a + fade ? 18 : -18)).toFixed(1)}px, 0)`;
        el.style.visibility = o <= 0.001 ? 'hidden' : 'visible';
      });
    },
    [geo],
  );

  // 滚动驱动
  useEffect(() => {
    if (!geo) return;
    if (isStatic) {
      render(1);
      // 静态模式：所有文案块同时可见
      copyRef.current?.querySelectorAll<HTMLElement>('[data-range]').forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.visibility = 'visible';
      });
      return;
    }
    let raf = 0;
    const tick = () => {
      raf = 0;
      const el = trackRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      render(span > 0 ? clamp01(-r.top / span) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [geo, isStatic, render]);

  // 导航高亮当前段落
  useEffect(() => {
    const els = SECTIONS.map((id) => document.getElementById(id)).filter((x): x is HTMLElement => !!x);
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) if (en.isIntersecting) setActive(en.target.id as SectionId);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // 导航下方那条发丝线：整页滚动进度
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = 0;
      const doc = document.documentElement;
      const span = doc.scrollHeight - window.innerHeight;
      const pct = span > 0 ? Math.min(1, Math.max(0, window.scrollY / span)) : 0;
      rootRef.current?.style.setProperty('--uf-progress', `${(pct * 100).toFixed(2)}%`);
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  const lx = geo?.landing[0] ?? 0;
  const ly = geo?.landing[1] ?? 0;

  return (
    <div className={`uf${isStatic ? ' is-static' : ''}`} ref={rootRef}>
      <a className="uf-skip" href="#basics">
        {t('nav.basics')}
      </a>

      {/* ───── 悬浮玻璃导航 ───── */}
      <header className="uf-nav uf-glass">
        <a className="uf-brand" href="#home" aria-label="Ultimate Field">
          <DiscMark />
          <span>Ultimate Field</span>
        </a>
        <nav aria-label={t('nav.label')}>
          <ul>
            {SECTIONS.map((id) => (
              <li key={id}>
                <a href={`#${id}`} aria-current={active === id ? 'true' : undefined}>
                  {t(`nav.${id}`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="uf-nav-actions">
          <button type="button" className="uf-chip" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>
            {t('lang.toggle')}
          </button>
          <button type="button" className="uf-chip uf-chip-solid" onClick={onPlay}>
            {t('nav.play')}
          </button>
        </div>
      </header>

      <main>
        {/* ───── 开场：天空 → 飞盘 → 球场 ───── */}
        <section id="home" ref={trackRef} className="uf-hero" aria-labelledby="uf-title">
          <div ref={stageRef} className="uf-stage">
            <div ref={skyRef} className="uf-plate uf-plate-sky" aria-hidden="true" />
            <div ref={fieldRef} className="uf-plate uf-plate-field" aria-hidden="true" />
            <div className="uf-stage-grade" aria-hidden="true" />

            {geo && (
              <svg className="uf-scene" viewBox={`0 0 ${geo.w} ${geo.h}`} preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <radialGradient id="uf-disc-g" cx="40%" cy="35%" r="70%">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="0.7" stopColor="#f1ece2" />
                    <stop offset="1" stopColor="#cfc8bb" />
                  </radialGradient>
                  <linearGradient id="uf-trail-g" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stopColor="#fff" stopOpacity="0" />
                    <stop offset="1" stopColor="#fff" stopOpacity="0.95" />
                  </linearGradient>
                </defs>

                <polygon ref={ezRef} points={geo.ezPoly} className="uf-ez" />
                <g ref={linesRef} className="uf-lines">
                  <path d={geo.outline} pathLength={1} />
                  <path d={geo.ezNear} pathLength={1} />
                  <path d={geo.ezFar} pathLength={1} />
                  <path d={geo.bricks} pathLength={1} className="uf-bricks" />
                </g>

                <ellipse ref={rippleRef} cx={lx} cy={ly} rx={20} ry={6} className="uf-ripple" />
                <ellipse ref={shadowRef} cx={lx + 6} cy={ly + 10} rx={10} ry={3} className="uf-shadow" />

                <path ref={flightRef} d={geo.flight} className="uf-flight-ghost" />
                <path ref={trailRef} d={geo.flight} pathLength={1} className="uf-trail" />

                <g ref={discRef} className="uf-disc">
                  <g ref={discBodyRef}>
                    <ellipse rx={40} ry={13} className="uf-disc-body" />
                    <ellipse rx={27} ry={7.5} cy={-1.5} className="uf-disc-ring" />
                    <ellipse rx={33} ry={10} cy={-0.8} className="uf-disc-spin" />
                  </g>
                </g>
              </svg>
            )}

            {/* 手写标注：固定在场地透视点上 */}
            {geo && (
              <div ref={notesRef} className="uf-notes" aria-hidden="true">
                <span className="uf-note uf-note-len" style={{ left: geo.lenLabel[0], top: geo.lenLabel[1] }}>
                  ← {t('story.note.len')} →
                </span>
                <span className="uf-note uf-note-ez uf-glass" style={{ left: geo.ezLabel[0], top: geo.ezLabel[1] }}>
                  {t('story.note.ez')}
                </span>
                <span className="uf-note uf-note-catch" style={{ left: lx, top: ly }}>
                  <svg viewBox="0 0 80 50" aria-hidden="true">
                    <path d="M4 6 C 30 4, 58 14, 70 40" pathLength={1} />
                    <path d="M62 36 L71 42 L73 31" pathLength={1} />
                  </svg>
                  <em>{t('story.note.catch')}</em>
                </span>
              </div>
            )}

            <div ref={copyRef} className="uf-copy">
              <div className="uf-copy-intro" data-range="-1,0.22">
                <p className="uf-kicker">{t('story.kicker')}</p>
                <h1 id="uf-title" className="uf-display">
                  Ultimate
                  <br />
                  <span className="uf-serif">Field</span>
                </h1>
                <p className="uf-lede">{t('story.lede')}</p>
                <span className="uf-scroll-cue">
                  <i aria-hidden="true" />
                  {t('story.scroll')}
                </span>
              </div>

              <div className="uf-copy-pull" data-range="0.24,0.46">
                <span className="uf-bignum" aria-hidden="true">
                  {t('story.pull.num')}
                </span>
                <h2 className="uf-h2">{t('story.pull.h')}</h2>
                <p>{t('story.pull.p')}</p>
              </div>

              <div className="uf-copy-field" data-range="0.8,2">
                <span className="uf-bignum uf-bignum-light" aria-hidden="true">
                  02
                </span>
                <div className="uf-panel uf-glass uf-glass-dark">
                  <h2 className="uf-h2">{t('story.field.h')}</h2>
                  <p>{t('story.field.p')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───── 入门 ───── */}
        <section id="basics" className="uf-sec uf-basics" aria-labelledby="basics-h">
          <div className="uf-wrap">
            <p className="uf-kicker">{t('basics.kicker')}</p>
            <h2 id="basics-h" className="uf-h2 uf-h2-lg">{t('basics.h')}</h2>
            <dl className="uf-numbers">
              <div>
                <dt>7</dt>
                <dd>{t('basics.n1')}</dd>
              </div>
              <div>
                <dt>1</dt>
                <dd>{t('basics.n2')}</dd>
              </div>
              <div>
                <dt>0</dt>
                <dd>{t('basics.n3')}</dd>
              </div>
            </dl>
            <figure className="uf-collage">
              <span className="uf-art-main">
                <RunnerArt />
              </span>
              <span className="uf-art-side">
                <FieldRulerArt />
              </span>
              <Tape rotate={-5} width={104} />
              <figcaption className="uf-hand uf-hand-ink">{t('basics.note')}</figcaption>
            </figure>
          </div>
        </section>

        {/* ───── 规则 ───── */}
        <section id="rules" className="uf-sec uf-rules" aria-labelledby="rules-h">
          <div className="uf-wrap uf-split">
            <header>
              <p className="uf-kicker">{t('rules.kicker')}</p>
              <h2 id="rules-h" className="uf-h2 uf-h2-lg">{t('rules.h')}</h2>
              <p className="uf-hand uf-hand-ink">{t('rules.note')} ↘</p>
            </header>
            <ol className="uf-rule-list">
              {(['r1', 'r2', 'r3', 'r4'] as const).map((k, i) => (
                <li key={k}>
                  <span className="uf-rule-n" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3>{t(`home.${k}.t`)}</h3>
                    <p>{t(`home.${k}.d`)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <figure className="uf-ruler">
              <FieldRulerArt />
              <figcaption className="uf-hand uf-hand-ink">
                64 + 18 + 18 = 100 m <ArrowScribble className="uf-ruler-arrow" dir="down" />
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ───── 犯规 ───── */}
        <section id="fouls" className="uf-sec uf-fouls" aria-labelledby="fouls-h">
          <div className="uf-wrap">
            <p className="uf-kicker">{t('fouls.kicker')}</p>
            <h2 id="fouls-h" className="uf-h2 uf-h2-lg">{t('fouls.h')}</h2>
            <div className="uf-duo">
              <DuelArt className="uf-duel" />
              <p className="uf-hand uf-hand-ink uf-fouls-note">{t('fouls.note')}</p>
            </div>
            <div className="uf-foul-row">
              {(['travel', 'double-opp', 'contact'] as const).map((k, i) => (
                <article key={k} className="uf-foul">
                  <span className="uf-foul-n" aria-hidden="true">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <h3>{t(`tip.${k}.t`)}</h3>
                  <p>{t(`tip.${k}.x`)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ───── 体育精神 ───── */}
        <section id="spirit" className="uf-sec uf-spirit" aria-labelledby="spirit-h">
          <div className="uf-spirit-photo" aria-hidden="true" />
          <div className="uf-wrap uf-spirit-inner">
            <div className="uf-spirit-lead">
              <p className="uf-kicker">{t('spirit.kicker')}</p>
              <h2 id="spirit-h" className="uf-display uf-display-md">{t('spirit.h')}</h2>
              <div className="uf-panel uf-glass">
                <p>{t('home.r5.d')}</p>
                <p className="uf-muted">{t('spirit.caption')}</p>
              </div>
            </div>
            <div className="uf-spirit-art">
              <TalkArt className="art-talk" />
            </div>
          </div>
        </section>

        {/* ───── 战术 ───── */}
        <section id="tactics" className="uf-sec uf-tactics" aria-labelledby="tactics-h">
          <div className="uf-wrap uf-split">
            <header>
              <p className="uf-kicker">{t('tactics.kicker')}</p>
              <h2 id="tactics-h" className="uf-h2 uf-h2-lg">{t('tactics.h')}</h2>
              <p>{t('tactics.p')}</p>
              <button type="button" className="uf-btn" onClick={onLab}>
                {t('tactics.cta')} <span aria-hidden="true">→</span>
              </button>
              <p className="uf-hand uf-hand-ink">{t('tactics.note')}</p>
            </header>
            <TacticBoard />
          </div>
        </section>

        {/* ───── 游戏入口 ───── */}
        <section id="game" className="uf-sec uf-game" aria-labelledby="game-h">
          <div className="uf-game-photo" aria-hidden="true" />
          <div className="uf-wrap uf-game-inner">
            <p className="uf-kicker">{t('game.kicker')}</p>
            <h2 id="game-h" className="uf-display uf-display-md">{t('game.h')}</h2>
            <p className="uf-lede">{t('game.p')}</p>
            <div className="uf-actions">
              <button type="button" className="uf-btn uf-btn-lime" onClick={onPlay}>
                {t('home.enter')} <span aria-hidden="true">→</span>
              </button>
              <button type="button" className="uf-btn uf-btn-ghost" onClick={onCodex}>
                {t('home.codex')}
              </button>
            </div>
            <p className="uf-small">{t('home.note')}</p>
          </div>
        </section>
      </main>

      <footer className="uf-footer">
        <span>{t('footer.text')}</span>
        <span>{t('footer.art')}</span>
      </footer>
    </div>
  );
}

/** 战术段落的预览图：竖排（Vertical stack）的俯视简图，完整内容在战术实验室 */
function TacticBoard() {
  const offense: Pt[] = [
    [185, 470],
    [120, 440],
    [185, 380],
    [185, 330],
    [185, 280],
    [185, 230],
    [185, 180],
  ];
  const defense: Pt[] = offense.map(([x, y], i) => [x + (i === 0 ? 0 : 14), y - (i === 0 ? 18 : 10)]);
  return (
    <figure className="uf-board" aria-hidden="true">
      <svg viewBox="0 0 370 560">
        <rect x="10" y="10" width="350" height="540" rx="6" className="uf-board-field" />
        <rect x="10" y="10" width="350" height="100" className="uf-board-ez" />
        <line x1="10" x2="360" y1="110" y2="110" className="uf-board-line" />
        <line x1="10" x2="360" y1="450" y2="450" className="uf-board-line uf-board-line-dim" />
        <path d="M185 280 C 250 270, 290 220, 300 150" className="uf-board-cut" />
        <path d="M185 470 C 230 380, 290 260, 300 150" className="uf-board-pass" />
        {defense.map(([x, y], i) => (
          <rect key={`d${i}`} x={x - 7} y={y - 7} width={14} height={14} rx={3} className="uf-board-d" />
        ))}
        {offense.map(([x, y], i) => (
          <circle key={`o${i}`} cx={x} cy={y} r={9} className="uf-board-o" />
        ))}
        <ellipse cx="196" cy="462" rx="8" ry="4" className="uf-board-disc" />
      </svg>
      <figcaption className="uf-hand uf-hand-ink">vertical stack</figcaption>
    </figure>
  );
}
