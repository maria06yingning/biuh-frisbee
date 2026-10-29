'use client';

/* ─────────────────────────────────────────────────────────────
 * 叙事版式里的"图形素材"：全部是手绘感的 SVG，不使用照片。
 * 每个构图都用同一套笔触参数（ink 描边 + 平涂色块 + 少量排线），
 * 保证不同段落之间的画面读起来像同一个画师画的。
 * ───────────────────────────────────────────────────────────── */

/** 排线底纹（用于纸面、暗部） */
function Hatch({ id, tone, gap = 7, angle = 45, opacity = 1 }: { id: string; tone: string; gap?: number; angle?: number; opacity?: number }) {
  return (
    <pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse" patternTransform={`rotate(${angle})`} opacity={opacity}>
      <line x1={0} y1={0} x2={0} y2={gap} stroke={tone} strokeWidth={1.4} />
    </pattern>
  );
}

/** 一个正在跑动的球员剪影：平涂色块 + 墨线，用来替代照片里的人物 */
export function RunnerArt({ className = '', flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 200 260" role="img" aria-label="player running" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <defs>
        <Hatch id="run-hatch" tone="rgba(27,26,46,0.22)" gap={6} />
      </defs>
      <ellipse cx="102" cy="246" rx="58" ry="8" className="art-ground" />
      <g className="art-ink" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* 后腿 */}
        <path d="M96 168 L72 206 L86 244" />
        <path d="M86 244 L106 246" />
        {/* 前腿 */}
        <path d="M108 166 L140 196 L134 240" />
        <path d="M134 240 L152 242" />
        {/* 躯干 */}
        <path d="M104 96 L98 168" />
        {/* 后臂 */}
        <path d="M102 112 L70 138 L58 172" stroke="#8a93a8" />
        {/* 前臂：抛盘 */}
        <path d="M106 110 L150 96 L186 78" stroke="#14c2d8" />
        {/* 头 */}
        <circle cx="106" cy="74" r="20" fill="#f6ecd2" />
        <path d="M92 64 A 20 20 0 0 1 120 62" strokeWidth="9" stroke="#1b1a2e" />
      </g>
      <path d="M104 96 L98 168 L74 206" stroke="rgba(27,26,46,0.2)" strokeWidth="3" fill="none" />
      <path d="M100 100 L104 166 L140 196" stroke="rgba(27,26,46,0.2)" strokeWidth="3" fill="none" />
      <ellipse cx="186" cy="70" rx="17" ry="5.5" transform="rotate(-18 186 70)" fill="#ffe7a3" className="art-ink" strokeWidth="3" />
      <path d="M150 96 C 172 84, 196 50, 214 34" stroke="rgba(20,194,216,0.55)" strokeWidth="3" strokeDasharray="2 9" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** 双人对抗：一侧伸手防守，一侧起跳接盘 —— 用于"犯规"段落 */
export function DuelArt({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 320 240" role="img" aria-label="two players contesting a disc">
      <ellipse cx="160" cy="226" rx="132" ry="9" className="art-ground" />
      {/* 进攻方：起跳 */}
      <g className="art-ink" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <circle cx="212" cy="66" r="17" fill="#f6ecd2" />
        <path d="M208 84 L204 140" />
        <path d="M204 140 L184 196" />
        <path d="M204 140 L226 192" />
        <path d="M206 94 L176 76 L166 50" stroke="#b8e986" />
        <path d="M204 96 L232 112 L252 96" stroke="#b8e986" />
        <ellipse cx="262" cy="86" rx="16" ry="5.2" transform="rotate(-12 262 86)" fill="#ffe7a3" />
      </g>
      {/* 防守方：贴防、伸手 */}
      <g className="art-ink" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <circle cx="112" cy="72" r="17" fill="#f6ecd2" />
        <path d="M116 90 L120 146" />
        <path d="M120 146 L104 198" />
        <path d="M120 146 L142 196" />
        <path d="M118 100 L92 122 L74 106" stroke="#ff8f7a" />
        <path d="M120 102 L156 88 L186 78" stroke="#ff8f7a" />
      </g>
      {/* 接触点标记 */}
      <circle cx="176" cy="78" r="9" className="art-dash" strokeWidth="3" fill="none" />
    </svg>
  );
}

/** 体育精神：两个人面对面说明自己看到的情况，中间的飞盘还在手上 */
export function TalkArt({ className = '' }: { className?: string }) {
  const bubble = 'M0 0 h96 a12 12 0 0 1 12 12 v40 a12 12 0 0 1 -12 12 h-70 l-16 14 v-14 h-10 a12 12 0 0 1 -12 -12 v-40 a12 12 0 0 1 12 -12 z';
  return (
    <svg className={className} viewBox="0 0 360 250" role="img" aria-label="two players talking through a call">
      <ellipse cx="180" cy="232" rx="150" ry="8" className="art-ground" />
      <g className="art-ink" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <circle cx="104" cy="122" r="16" fill="#f6ecd2" />
        <path d="M108 138 L112 198" />
        <path d="M112 198 L98 232" />
        <path d="M112 198 L128 232" />
        <path d="M108 152 L86 172" />
        <circle cx="256" cy="122" r="16" fill="#f6ecd2" />
        <path d="M252 138 L248 198" />
        <path d="M248 198 L234 232" />
        <path d="M248 198 L264 232" />
        <path d="M252 152 L278 166 L292 152" />
      </g>
      <ellipse cx="180" cy="176" rx="19" ry="6" fill="#ffe7a3" className="art-ink" strokeWidth="3" />
      <path d="M180 100 L180 168" strokeWidth="3" strokeDasharray="3 7" className="art-ink" fill="none" />
      <g className="art-ink" strokeWidth="3.5" fill="#fffaf0">
        <path d={bubble} transform="translate(48 22) scale(0.86)" />
        <path d={bubble} transform="translate(196 46) scale(0.62)" />
      </g>
      <g className="art-ink-fill" strokeWidth="4" strokeLinecap="round">
        <path d="M70 52 h32 M70 64 h20" />
        <path d="M216 66 h34 M216 78 h22" />
      </g>
    </svg>
  );
}

/** 小号飞盘图标（导航 / 按钮） */
export function DiscMark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 18" aria-hidden="true">
      <ellipse cx="16" cy="12" rx="14" ry="5" fill="currentColor" opacity="0.28" />
      <ellipse cx="16" cy="8" rx="14" ry="6.2" fill="#ffe7a3" stroke="currentColor" strokeWidth="2" />
      <ellipse cx="16" cy="6.8" rx="7.4" ry="2.6" fill="none" stroke="currentColor" strokeWidth="1.8" opacity="0.75" />
    </svg>
  );
}

/** 纸胶带 */
export function Tape({ className = '', rotate = -6, width = 96 }: { className?: string; rotate?: number; width?: number }) {
  return (
    <span className={`uf-tape ${className}`} style={{ width, transform: `rotate(${rotate}deg)` }} aria-hidden="true" />
  );
}

/** 手写曲线箭头（标注用） */
export function ArrowScribble({ className = '', dir = 'right' }: { className?: string; dir?: 'right' | 'down' }) {
  return (
    <svg className={className} viewBox="0 0 90 60" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        {dir === 'right' ? (
          <>
            <path d="M6 12 C 30 10, 58 20, 78 42" />
            <path d="M66 42 L79 44 L79 31" />
          </>
        ) : (
          <>
            <path d="M12 6 C 10 26, 20 44, 44 52" />
            <path d="M32 44 L45 54 L50 40" />
          </>
        )}
      </g>
    </svg>
  );
}

/** 场地剖面图示：100 米 / 两端各 18 米得分区（规则段落的小图） */
export function FieldRulerArt({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 420 96" role="img" aria-label="field dimensions">
      <rect x="8" y="26" width="404" height="44" rx="3" className="art-ez" />
      <rect x="80" y="26" width="260" height="44" className="art-play" />
      <rect x="8" y="26" width="404" height="44" rx="3" className="art-ink-fill-none" strokeWidth="3" />
      <g className="art-ink" strokeWidth="2.5">
        <line x1="80" y1="20" x2="80" y2="76" />
        <line x1="340" y1="20" x2="340" y2="76" />
        <line x1="8" y1="88" x2="80" y2="88" />
        <line x1="340" y1="88" x2="412" y2="88" />
        <line x1="80" y1="88" x2="340" y2="88" strokeDasharray="4 5" />
      </g>
      <text x="44" y="94" className="art-label" textAnchor="middle">18</text>
      <text x="376" y="94" className="art-label" textAnchor="middle">18</text>
      <text x="210" y="94" className="art-label" textAnchor="middle">64 m</text>
    </svg>
  );
}
