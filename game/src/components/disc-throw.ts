import type { FlightPoint } from './disc-flight';

export type ThrowSample = { x: number; y: number; time: number };
export type ThrowImpulse = { x: number; y: number; power: number };
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Recent velocity, in viewport fractions/second. Holding still before releasing cancels a fling. */
export function getThrowImpulse(samples: ThrowSample[], width: number, height: number): ThrowImpulse | null {
  if (samples.length < 2 || width <= 0 || height <= 0) return null;
  const end = samples[samples.length - 1];
  const first = samples.find(s => s.time >= end.time - 120) ?? samples[0];
  const total = samples[0];
  const dt = (end.time - first.time) / 1000;
  if (dt < 0.012 || Math.hypot(end.x - total.x, end.y - total.y) < 18) return null;
  const vx = (end.x - first.x) / width / dt;
  const vy = -(end.y - first.y) / height / dt;
  const speed = Math.hypot(vx, vy);
  if (speed < 0.25) return null;
  return { x: vx / speed, y: vy / speed, power: clamp(speed / 2.4, 0.12, 1) };
}

function bezier(points: FlightPoint[], t: number): FlightPoint {
  const s = 1 - t;
  const weights = [s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t];
  return points.reduce((p, v, i) => ({ x: p.x + v.x * weights[i], y: p.y + v.y * weights[i], z: p.z + v.z * weights[i] }), { x: 0, y: 0, z: 0 });
}

/** A banked, spinning throw across the meadow and a smooth return. Fixed size, perspective only.
 * All control points stay above -0.85, so even the rim's 2.2-unit radius clears the grass.
 */
export function createUserThrow(start: FlightPoint, impulse: ThrowImpulse, aspect: number) {
  const power = clamp(impulse.power, 0, 1);
  const outwardDuration = 1.4 + power * 0.6;
  const returnDuration = 2.1;
  const duration = outwardDuration + returnDuration;
  const spread = clamp(aspect, 0.45, 2.5);
  const direction = impulse.x;
  const lift = Math.max(0, impulse.y);
  const far = { x: direction * (7 + power * 14) * spread, y: 2.5 + lift * 4, z: -45 - power * 40 };
  const outgoing = [start,
    { x: start.x + direction * (5 + power * 9) * spread, y: Math.max(-0.85, start.y + impulse.y * 2.5), z: start.z - 12 },
    { x: far.x * 1.15, y: far.y + 2, z: far.z * 0.65 }, far];
  const incoming = [far,
    { x: far.x + (direction >= 0 ? -1 : 1) * 10 * spread, y: far.y + 1.8, z: far.z + 12 },
    { x: -direction * 4 * spread, y: 1.6, z: -10 },
    { x: 0, y: 0, z: 0 }];

  return {
    duration,
    sample(time: number) {
      const returning = time >= outwardDuration;
      const u = clamp(returning ? (time - outwardDuration) / returnDuration : time / outwardDuration, 0, 1);
      const progress = returning ? smooth(u) : Math.sin(u * Math.PI / 2);
      const position = bezier(returning ? incoming : outgoing, progress);
      const catchEase = returning ? smooth(clamp((u - 0.62) / 0.38, 0, 1)) : 0;
      return {
        position,
        pitch: 0.13 * (1 - catchEase) + 0.82 * catchEase,
        bank: -direction * (0.25 + power * 0.25) * (1 - catchEase) - 0.18 * catchEase,
        spinRate: (18 + power * 30) * (1 - catchEase),
        returning,
        done: time >= duration,
      };
    },
  };
}
