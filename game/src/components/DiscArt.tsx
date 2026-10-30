'use client';

import { useId } from 'react';

/**
 * Flat, hand-drawn glass-disc illustration for the content-page heroes.
 * Echoes the homepage GlassDisc fallback (pale translucent ellipse, cyan rings)
 * so the four pages read as the same family. Each variant adds one quiet motif.
 */
export type DiscVariant = 'rules' | 'fouls' | 'spirit' | 'why';

export default function DiscArt({ variant }: { variant: DiscVariant }) {
  const id = useId().replace(/:/g, '');
  const g = `disc-${id}`;
  return (
    <svg viewBox="0 0 400 300" role="img" aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#eefcff" />
          <stop offset="0.45" stopColor="#bbe7f1" />
          <stop offset="1" stopColor="#f6ffff" />
        </linearGradient>
      </defs>

      {variant === 'rules' && (
        <path
          d="M34 212 C 120 70, 250 44, 352 96"
          fill="none"
          stroke="#195de6"
          strokeWidth="2.5"
          strokeDasharray="2 10"
          strokeLinecap="round"
          opacity="0.55"
        />
      )}
      {variant === 'spirit' && (
        <g fill="none" stroke="#195de6" strokeWidth="2" opacity="0.5">
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return <circle key={i} cx={200 + Math.cos(a) * 150} cy={150 + Math.sin(a) * 118} r="5" />;
          })}
        </g>
      )}
      {variant === 'why' && (
        <g stroke="#76ac56" strokeWidth="2.4" strokeLinecap="round" opacity="0.7">
          {Array.from({ length: 11 }, (_, i) => {
            const x = 40 + i * 32;
            return <path key={i} d={`M${x} 268 q 6 -22 -2 -40`} fill="none" />;
          })}
        </g>
      )}

      {/* The disc */}
      <g transform="translate(200 148) rotate(-11)">
        <ellipse rx="150" ry="84" fill={`url(#${g})`} fillOpacity="0.82" stroke="#66b8ce" strokeWidth="2" />
        {Array.from({ length: 11 }, (_, i) => (
          <ellipse
            key={i}
            rx={144 - i * 4}
            ry={79 - i * 4}
            fill="none"
            stroke={i % 3 === 0 ? '#4eb5d2' : '#d8f3fc'}
            strokeWidth="1.1"
            opacity={i % 3 === 0 ? 0.8 : 0.9}
          />
        ))}
        <ellipse rx="60" ry="30" fill="#fff" fillOpacity="0.45" />
      </g>

      {variant === 'fouls' && (
        <g transform="translate(300 76)">
          <circle r="34" fill="#fff" stroke="#c23b22" strokeWidth="3" />
          {/* hand-signal nod to "Foul": one arm, chopped by the other */}
          <path d="M-16 -2 H16" stroke="#c23b22" strokeWidth="4" strokeLinecap="round" />
          <path d="M4 -17 L-6 15" stroke="#c23b22" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
