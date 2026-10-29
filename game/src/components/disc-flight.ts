export type FlightPoint = { x: number; y: number; z: number };

const GLIDE_DURATION = 1.72;
const CATCH_DURATION = 0.43;
export const DISC_FLIGHT_DURATION = GLIDE_DURATION + CATCH_DURATION;

function smoothstep(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/** A fixed-size disc follows a banked OI curve; perspective alone changes its size. */
export function createOutsideInFlight(aspect: number, cameraZ: number, fov = 36) {
  const halfWidthAt = (z: number) => Math.tan(fov * Math.PI / 360) * aspect * (cameraZ - z);
  const points: FlightPoint[] = [
    { x: halfWidthAt(-72) * 0.46, y: 2.3, z: -72 },
    { x: halfWidthAt(-72) * 0.98, y: 3.15, z: -43 },
    { x: halfWidthAt(-9) * 0.64, y: 0.72, z: -9 },
    { x: 0, y: 0, z: 0 },
  ];
  const pointAt = (t: number): FlightPoint => {
    const s = 1 - t;
    const a = s * s * s, b = 3 * s * s * t, c = 3 * s * t * t, d = t * t * t;
    return {
      x: a * points[0].x + b * points[1].x + c * points[2].x + d * points[3].x,
      y: a * points[0].y + b * points[1].y + c * points[2].y + d * points[3].y,
      z: a * points[0].z + b * points[1].z + c * points[2].z + d * points[3].z,
    };
  };

  // Sample arc length so the flight has steady world speed rather than Bezier easing.
  const steps = 256;
  const distances = [0];
  let previous = pointAt(0);
  for (let i = 1; i <= steps; i++) {
    const current = pointAt(i / steps);
    distances.push(distances[i - 1] + Math.hypot(current.x - previous.x, current.y - previous.y, current.z - previous.z));
    previous = current;
  }
  const length = distances[steps];
  const curveParameterAtDistance = (fraction: number) => {
    const target = Math.max(0, Math.min(1, fraction)) * length;
    let low = 0, high = steps;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (distances[middle] < target) low = middle;
      else high = middle;
    }
    const span = distances[high] - distances[low];
    return (low + (span > 0 ? (target - distances[low]) / span : 0)) / steps;
  };

  return (elapsed: number) => {
    const time = Math.max(0, elapsed);
    const catchProgress = Math.max(0, Math.min(1, (time - GLIDE_DURATION) / CATCH_DURATION));
    const catchEase = smoothstep(catchProgress);
    const ready = time >= DISC_FLIGHT_DURATION;
    let distance: number;
    if (time < GLIDE_DURATION) {
      distance = time / GLIDE_DURATION * 0.9;
    } else {
      // Hermite braking matches incoming speed and reaches zero speed without a bounce.
      const t = catchProgress;
      const initialTangent = 0.9 / GLIDE_DURATION * CATCH_DURATION;
      distance = (2 * t * t * t - 3 * t * t + 1) * 0.9
        + (t * t * t - 2 * t * t + t) * initialTangent
        + (-2 * t * t * t + 3 * t * t);
    }
    const u = curveParameterAtDistance(distance);
    const flutter = Math.sin(time * 34) * 0.009 * Math.exp(-time * 4);
    return {
      position: ready ? { x: 0, y: 0, z: 0 } : pointAt(u),
      pitch: (0.1 + Math.sin(u * Math.PI) * 0.035) * (1 - catchEase) + 0.82 * catchEase,
      yaw: Math.sin(u * Math.PI) * 0.1 * (1 - catchEase),
      bank: (0.46 + Math.sin(u * Math.PI) * 0.12 + flutter) * (1 - catchEase) - 0.18 * catchEase,
      spinRate: (31 - Math.min(1, time / GLIDE_DURATION) * 5) * (1 - catchEase),
      ready,
    };
  };
}
