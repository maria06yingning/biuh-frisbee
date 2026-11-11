import type { FlightPoint } from './disc-flight';

export type ThrowSample = { x: number; y: number; time: number };
export type ThrowStyle = 'flat' | 'oi' | 'io' | 'hammer';
export type ThrowImpulse = { x: number; y: number; force: number; angle: number };

/** Height of the disc's centre above the ground when it lies on the meadow. */
export const DISC_REST_HEIGHT = 0.55;

/** Select the release style from the disc's face orientation and tilt relative to travel. */
export function classifyThrowStyle(faceUp: number, edgeTilt: number): ThrowStyle {
  if (faceUp < -0.12) return 'hammer';
  if (edgeTilt > 0.2) return 'oi';
  if (edgeTilt < -0.2) return 'io';
  return 'flat';
}
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
  const x = vx / speed;
  const y = vy / speed;
  const angle = Math.atan2(-(end.y - first.y), Math.abs(end.x - first.x));
  // Ignore the minimum flick threshold, then map a firm swipe to a strong throw.
  const force = clamp((speed - 0.18) / 1.9, 0.08, 1);
  return { x, y, force, angle };
}

function bezier(points: FlightPoint[], t: number): FlightPoint {
  const s = 1 - t;
  const weights = [s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t];
  return points.reduce((p, v, i) => ({ x: p.x + v.x * weights[i], y: p.y + v.y * weights[i], z: p.z + v.z * weights[i] }), { x: 0, y: 0, z: 0 });
}

/**
 * A banked, spinning throw that ends on the ground at its landing point. The disc stays there
 * until the user walks to it and picks it up, or sends it back with the one-click return.
 */
export function createUserThrow(
  start: FlightPoint,
  impulse: ThrowImpulse,
  aspect: number,
  style: ThrowStyle = 'flat',
  groundAt: (x: number, z: number) => number = () => -7.4,
  forwardYaw = 0,
) {
  const force = clamp(impulse.force, 0, 1);
  const hammer = style === 'hammer';
  const curveSign = style === 'oi' ? 1 : style === 'io' ? -1 : 0;
  const duration = (hammer ? 1.65 : 1.25) + force * 1.05;
  const spread = clamp(aspect, 0.45, 2.5);
  const direction = impulse.x;
  const lift = Math.max(0, impulse.y);
  const forwardX = -Math.sin(forwardYaw), forwardZ = -Math.cos(forwardYaw);
  const rightX = Math.cos(forwardYaw), rightZ = -Math.sin(forwardYaw);
  const curveSide = Math.abs(direction) < 0.12 ? 1 : Math.sign(direction);
  const curve = curveSign * curveSide * (1.8 + force * 6.2) * spread;
  const travelDepth = 22 + force * 58;
  const lateral = direction * (3 + force * 18) * spread;
  const landX = start.x + forwardX * travelDepth + rightX * lateral;
  const landZ = start.z + forwardZ * travelDepth + rightZ * lateral;
  const landY = groundAt(landX, landZ) + DISC_REST_HEIGHT;
  const firstSide = direction * (2 + force * 8) * spread + curve;
  const firstForward = Math.max(8, travelDepth * 0.24);
  const middleSide = lateral * 1.15 - curve * 0.72;
  const path = [start,
    { x: start.x + forwardX * firstForward + rightX * firstSide, y: Math.max(-0.85, start.y + impulse.y * (hammer ? 4.2 : 3.2)), z: start.z + forwardZ * firstForward + rightZ * firstSide },
    { x: start.x + forwardX * travelDepth * 0.65 + rightX * middleSide, y: landY + 2.2 + force * 2.6 + lift * 3.4 + (hammer ? 3 : 0), z: start.z + forwardZ * travelDepth * 0.65 + rightZ * middleSide },
    { x: landX, y: landY, z: landZ }];

  return {
    duration,
    landing: { x: landX, y: landY, z: landZ },
    sample(time: number) {
      const u = clamp(time / duration, 0, 1);
      const progress = Math.sin(u * Math.PI / 2);
      return {
        position: bezier(path, progress),
        orientationBlend: 0,
        spinRate: (hammer ? 28 : 18) + force * (hammer ? 38 : 30) - u * 24,
        done: time >= duration,
      };
    },
  };
}

/** Return to the hand at the player's current world position, without moving the player. */
export function createReturnFlight(start: FlightPoint, target: FlightPoint = { x: 0, y: 0, z: 0 }) {
  const distance = Math.hypot(target.x - start.x, target.y - start.y, target.z - start.z);
  const duration = clamp(distance / 30, 0.45, 1.9);
  const lift = Math.min(5, distance * 0.12);
  const path = [{ ...start },
    { x: start.x + (target.x - start.x) * 0.3, y: Math.max(start.y, target.y) + lift, z: start.z + (target.z - start.z) * 0.3 },
    { x: start.x + (target.x - start.x) * 0.8, y: target.y + lift * 0.4, z: start.z + (target.z - start.z) * 0.8 },
    { ...target }];
  return {
    duration,
    sample(time: number) {
      const u = clamp(time / duration, 0, 1);
      const e = smooth(u);
      return {
        position: bezier(path, e),
        orientationBlend: e,
        spinRate: 20 * (1 - e),
        done: time >= duration,
      };
    },
  };
}
