'use client';

const backBlades = Array.from({ length: 34 }, (_, index) => ({
  x: -30 + ((index * 97) % 1260),
  height: 86 + ((index * 43) % 136),
  lean: -24 + ((index * 31) % 54),
  width: 1.5 + (index % 4) * 0.55,
  tone: ['#668957', '#789963', '#91aa70', '#5e8154'][index % 4],
}));

const frontBlades = Array.from({ length: 28 }, (_, index) => ({
  x: -40 + ((index * 137) % 1280),
  height: 136 + ((index * 59) % 174),
  lean: -34 + ((index * 23) % 70),
  width: 2 + (index % 4) * 0.7,
  tone: ['#557b50', '#668a54', '#7c995b', '#476f4b'][index % 4],
}));

function bladePath(x: number, height: number, lean: number, base: number) {
  return `M ${x} ${base} C ${x + lean * 0.12} ${base - height * 0.34}, ${x + lean * 0.56} ${base - height * 0.76}, ${x + lean} ${base - height}`;
}

export default function WatercolorField({ paused }: { paused: boolean }) {
  return (
    <div className={`aero-field${paused ? ' is-paused' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 1200 720" preserveAspectRatio="none">
        <defs>
          <linearGradient id="aero-field-wash" x1="0" y1="0" x2="0.92" y2="1">
            <stop offset="0" stopColor="#dce8b8" />
            <stop offset="0.48" stopColor="#c2d99c" />
            <stop offset="1" stopColor="#9dbb78" />
          </linearGradient>
          <linearGradient id="aero-field-horizon" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8eab72" stopOpacity="0.2" />
            <stop offset="0.5" stopColor="#eef1c9" stopOpacity="0.48" />
            <stop offset="1" stopColor="#769964" stopOpacity="0.18" />
          </linearGradient>
          <filter id="aero-watercolor-wash" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.035" numOctaves="2" seed="11" result="paperNoise" />
            <feDisplacementMap in="SourceGraphic" in2="paperNoise" scale="12" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="0.5" />
          </filter>
          <filter id="aero-watercolor-soft" x="-10%" y="-30%" width="120%" height="160%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id="aero-field-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3" seed="4" />
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 0.16" />
            </feComponentTransfer>
          </filter>
        </defs>

        <rect width="1200" height="720" fill="url(#aero-field-wash)" />
        <path d="M -80 420 C 180 340 380 505 680 382 S 1080 350 1320 438 L 1320 720 L -80 720 Z" fill="#a7c381" opacity="0.36" filter="url(#aero-watercolor-wash)" />
        <path d="M -100 530 C 210 430 416 592 745 490 S 1110 450 1300 535 L 1300 720 L -100 720 Z" fill="#739d65" opacity="0.23" filter="url(#aero-watercolor-wash)" />
        <path d="M -80 280 C 220 214 405 322 640 264 S 1070 206 1310 292 L 1310 388 C 1000 320 810 350 580 336 S 215 294 -80 382 Z" fill="url(#aero-field-horizon)" opacity="0.8" filter="url(#aero-watercolor-soft)" />
        <ellipse cx="170" cy="86" rx="390" ry="188" fill="#fff1b6" opacity="0.19" filter="url(#aero-watercolor-soft)" />

        <g className="aero-field-wind" fill="none" filter="url(#aero-watercolor-soft)">
          <path d="M -140 365 C 160 282 360 430 626 346 S 1034 286 1340 370" stroke="#f5f2d0" strokeWidth="20" opacity="0.24" />
          <path d="M -130 454 C 130 374 390 526 655 438 S 1072 386 1330 466" stroke="#eaf0c9" strokeWidth="14" opacity="0.2" />
          <path d="M -110 575 C 170 484 396 634 720 538 S 1080 496 1325 560" stroke="#f7f3d2" strokeWidth="10" opacity="0.18" />
        </g>

        <g className="aero-field-grass-back" fill="none" strokeLinecap="round">
          {backBlades.map((blade, index) => (
            <path key={`back-${index}`} d={bladePath(blade.x, blade.height, blade.lean, 720)} stroke={blade.tone} strokeWidth={blade.width} opacity="0.55" />
          ))}
        </g>
        <g className="aero-field-grass-front" fill="none" strokeLinecap="round">
          {frontBlades.map((blade, index) => (
            <path key={`front-${index}`} d={bladePath(blade.x, blade.height, blade.lean, 760)} stroke={blade.tone} strokeWidth={blade.width} opacity="0.72" />
          ))}
        </g>
        <rect width="1200" height="720" fill="#5d774f" opacity="0.07" filter="url(#aero-field-grain)" />
      </svg>
    </div>
  );
}
