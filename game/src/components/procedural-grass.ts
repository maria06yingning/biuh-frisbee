import type * as Three from 'three';
import { createMeadowFlowers } from './meadow-flowers';
import { createMeadowLandscape } from './meadow-landscape';
import { terrainHeight, TERRAIN_GLSL } from './meadow-terrain';
import type { MeadowSeason } from './meadow-season';

type ThreeModule = typeof Three;
type DiscPosition = { x: number; y: number; z: number };

/*
 * Clearance contract with GlassDisc: in every flight frame the disc stays high, and once it
 * settles its centre never drops below y = -0.85 while no vertex lies more than 2.2 from that
 * centre, so however the pointer turns it the lowest point stays above y = -3.05. Grass tips are
 * capped at TIP_CAP everywhere (the short lawn stays well below even that), so the disc can never
 * intersect the meadow at any aspect ratio, and no blade can stand between the camera and the disc.
 */
const TIP_CAP = -3.5;
const BASE_Y = -7.4;
const MAX_BLADE = 1.1;
// The near field overlaps a wider distant layer; both stay fixed in world space.
const FOG_NEAR = 30;        // Aerial haze starts here and thickens exponentially, then
const FOG_SCALE = 240;
const FOG_FULL = 660;       // completes just inside the camera's far plane (700), so the meadow
                            // melts into the sky at the horizon without any visible edge.
/** Low evening sun behind the distant ridge, matching the reference's horizon glow. */
const SUN_DIRECTION: readonly [number, number, number] = [0.42, 0.2, -0.89];
/** Warm sunset horizon haze, blended toward cool moonlit blue after dusk. */
const HAZE: readonly [number, number, number] = [0.91, 0.82, 0.75];

function createRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
function hash(x: number, z: number) {
  const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function noise2(x: number, z: number) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  return (hash(xi, zi) * (1 - u) + hash(xi + 1, zi) * u) * (1 - v)
    + (hash(xi, zi + 1) * (1 - u) + hash(xi + 1, zi + 1) * u) * v;
}
function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Haze picks up a warm glow toward the sun, so distant grass and sky brighten on the sun side.
const HAZE_GLSL = `
  uniform float uDusk;
  uniform float uNight;
  vec3 hazeToward(vec3 dir) {
    float sunScatter = pow(max(dot(dir, uSun), 0.0), 7.0);
    vec3 warm = mix(uHaze, vec3(0.91, 0.72, 0.58), uDusk);
    vec3 nightHaze = mix(vec3(0.09, 0.13, 0.22), vec3(0.24, 0.13, 0.2), uDusk);
    return mix(warm, nightHaze, uNight) + mix(vec3(0.15, 0.09, 0.035), vec3(0.025, 0.025, 0.07), uNight) * sunScatter;
  }
`;
const FOG_GLSL = `
  uniform float uFogNear;
  uniform float uFogScale;
  uniform float uFogFull;
  float fogAmount(float depth) {
    float haze = 1.0 - exp(-max(depth - uFogNear, 0.0) / uFogScale);
    // Completes just inside the far plane, so the ground's clipped edge matches the sky exactly.
    return mix(haze, 1.0, smoothstep(uFogFull * 0.55, uFogFull, depth));
  }
`;
const NOISE_GLSL = `
  float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
               mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
`;
// One code value of noise hides 8-bit banding in the smooth sky and haze gradients.
const DITHER_GLSL = 'gl_FragColor.rgb += (hash21(gl_FragCoord.xy) - 0.5) / 255.0;';

const SKY_VERTEX = `
  varying vec3 vDir;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vDir = world.xyz - cameraPosition;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

// VISIBLE_DOME is the backdrop; without it the same sky (with a green ground and a bright sun)
// becomes the environment map that the glass disc reflects.
const SKY_FRAGMENT = `
  uniform vec3 uSun;
  uniform vec3 uHaze;
  uniform float uTime;
  uniform float uSeason;
  varying vec3 vDir;
  ${HAZE_GLSL}
  ${NOISE_GLSL}
  void main() {
    vec3 d = normalize(vDir);
    float dusk = uDusk;
    float night = uNight;
    vec3 haze = hazeToward(d);
    vec3 dayZenith = vec3(0.61, 0.66, 0.79);
    vec3 duskZenith = vec3(0.55, 0.47, 0.64);
    vec3 nightZenith = vec3(0.045, 0.07, 0.15);
    vec3 zenith = dayZenith;
    zenith = mix(zenith, duskZenith, dusk);
    zenith = mix(zenith, nightZenith, night);
    vec3 winterZenith = vec3(0.58, 0.68, 0.78);
    zenith = mix(zenith, winterZenith, step(2.5, uSeason) * (1.0 - night));
    vec3 horizon = mix(uHaze, vec3(0.96, 0.76, 0.59), dusk);
    horizon = mix(horizon, vec3(0.78, 0.83, 0.88), step(2.5, uSeason) * (1.0 - night));
    horizon = mix(horizon, vec3(0.04, 0.055, 0.11), night);
    vec3 sky = mix(horizon, zenith, smoothstep(0.0, 0.55, max(d.y, 0.0)));
    sky += vec3(0.05, 0.025, 0.015) * pow(max(dot(d, uSun), 0.0), 12.0) * (1.0 - night);
    float sunDot = dot(d, uSun);
    float sunHalo = pow(max(sunDot, 0.0), 9.0);
    float sunDisk = smoothstep(0.9994, 0.99982, sunDot) * (1.0 - night);
    sky += mix(vec3(0.16, 0.085, 0.025), vec3(0.28, 0.12, 0.025), dusk) * sunHalo;
    sky = mix(sky, vec3(1.0, 0.82, 0.55), sunDisk);
    vec3 moonDirection = normalize(vec3(-0.35, 0.38, -0.86));
    float moonDot = dot(d, moonDirection);
    float moonDisk = smoothstep(0.99962, 0.99986, moonDot) * night;
    sky = mix(sky, vec3(0.83, 0.86, 0.8), moonDisk);
    float star = step(0.9994, hash21(floor(d.xz * vec2(210.0, 160.0) + vec2(d.y * 97.0))));
    sky += vec3(0.65, 0.7, 0.82) * star * night * smoothstep(0.52, 0.78, d.y);

    // Sparse cloud wisps catch the sunset, then fade into the night sky.
    float skyDepth = max(d.y + 0.24, 0.18);
    vec2 cloudUv = d.xz / skyDepth + vec2(uTime * 0.003, 0.0);
    float cloudBroad = valueNoise(cloudUv * vec2(0.38, 1.35) + vec2(8.4, 3.2));
    float cloudFine = valueNoise(cloudUv * vec2(0.9, 3.1) + vec2(-4.7, 6.1));
    float cloudField = cloudBroad * 0.72 + cloudFine * 0.28;
    float cloudMask = smoothstep(0.53, 0.72, cloudField)
      * smoothstep(0.015, 0.09, d.y) * (1.0 - smoothstep(0.38, 0.65, d.y)) * (1.0 - night * 0.75);
    vec3 cloudTint = mix(vec3(0.98, 0.98, 0.95), vec3(1.0, 0.66, 0.4), clamp(sunHalo * 2.2, 0.0, 1.0));
    sky = mix(sky, cloudTint, cloudMask * 0.38);
  #ifdef VISIBLE_DOME
    vec3 below = haze;
  #else
    vec3 below = mix(vec3(0.36, 0.58, 0.26), vec3(0.16, 0.38, 0.12), smoothstep(0.0, 0.5, -d.y));
  #endif
    below = mix(below, vec3(0.055, 0.075, 0.13), night);
    vec3 color = mix(below, sky, smoothstep(-0.03, 0.0, d.y));
    vec3 skyLinear = pow(max(color, 0.0), vec3(2.2));
  #ifndef VISIBLE_DOME
    skyLinear += vec3(4.0, 2.5, 1.0) * pow(max(sunDot, 0.0), 150.0) * (1.0 - night);
  #endif
    gl_FragColor = vec4(skyLinear, 1.0);
    #include <colorspace_fragment>
  #ifdef VISIBLE_DOME
    ${DITHER_GLSL}
  #endif
  }
`;

const BLADE_VERTEX = `
  attribute vec3 aOrigin;
  attribute float aHeight;
  attribute float aWidth;
  attribute float aFace;
  attribute float aLean;
  attribute float aPhase;
  attribute float aTone;
  attribute float aClump;
  uniform float uTime;
  uniform float uSeason;
  uniform float uSnow;
  uniform vec2 uWind;
  uniform vec3 uSun;
  uniform vec3 uDiscPosition;
  uniform vec2 uDiscVelocity;
  uniform float uDiscInfluence;
  uniform vec3 uPlayerPosition;
  uniform float uPlayerInfluence;
  varying float vUp;
  varying float vTone;
  varying float vClump;
  varying float vBack;
  varying float vSide;
  varying float vDepth;
  varying vec3 vViewDir;

  void main() {
    float t = position.y;                       // 0 at the root, 1 at the tip.
    float taper = pow(max(1.0 - t, 0.0), 0.72);
    vec3 facing = vec3(cos(aFace), 0.0, sin(aFace));
    vec3 across = facing * (position.x * aWidth * taper);

    // Rolling wind waves travel left to right at a brisk, playful pace; a slow envelope and a
    // per-blade flutter keep neighbouring patches out of step without turning it into a storm.
    float along = dot(aOrigin.xz, uWind);
    float wave = sin(along * 0.16 - uTime * 1.3) * 0.5 + 0.5;
    float envelope = sin(along * 0.045 + aOrigin.z * 0.03 - uTime * 0.45) * 0.5 + 0.5;
    float flutter = sin(uTime * 2.6 + aPhase) * 0.1;
    float gust = wave * (0.45 + 0.55 * envelope) + flutter;
    float bend = aLean * (0.68 + 0.32 * gust) * t * t;

    // The disc pushes a soft local gust along its travel direction, then leaves a tapered wake.
    // A radial pressure ripple parts the nearest blades; the trailing flow carries the bend onward.
    vec2 away = aOrigin.xz - uDiscPosition.xz;
    float distSq = dot(away, away);
    float dist = sqrt(max(distSq, 0.0001));
    vec2 awayDir = away / dist;
    float speed = length(uDiscVelocity);
    vec2 travelDir = speed > 0.15 ? uDiscVelocity / speed : uWind;
    float heightFade = exp(-max(uDiscPosition.y - (-7.4), 0.0) * 0.12);
    float localGust = exp(-distSq * 0.028) * uDiscInfluence * heightFade;
    float discAlong = dot(away, travelDir);
    float crossTrack = abs(away.x * travelDir.y - away.y * travelDir.x);
    float wake = exp(-crossTrack * crossTrack * 0.045 - max(-discAlong, 0.0) * 0.075)
      * step(discAlong, -0.01) * smoothstep(0.15, 0.8, speed) * uDiscInfluence;
    vec2 discFlow = travelDir * (localGust * 0.75 + wake * 0.95) + awayDir * localGust * 0.35;
    float ripple = localGust * aHeight * 0.12 * t * t;

    vec2 playerAway = aOrigin.xz - uPlayerPosition.xz;
    float playerDist = length(playerAway);
    float playerPress = exp(-playerDist * playerDist * 0.9) * uPlayerInfluence;
    vec2 playerDir = playerAway / max(playerDist, 0.001);
    vec2 naturalCurve = vec2(-sin(aFace), cos(aFace)) * aHeight * 0.18 * t * t;
    vec2 offset = uWind * bend + naturalCurve + discFlow * aHeight * 0.2 * t * t
      + awayDir * ripple + playerDir * playerPress * aHeight * 0.65 * t * t;
    float droop = min(t * aHeight * 0.8, 0.35 * dot(offset, offset) / max(aHeight, 0.05)
      + playerPress * aHeight * t * t * 0.48);
    float winterHeight = mix(1.0, 0.035, uSnow);
    vec3 world = aOrigin + across * winterHeight + vec3(offset.x * winterHeight,
      (t * aHeight - droop) * winterHeight, offset.y * winterHeight);

    vec4 mv = viewMatrix * vec4(world, 1.0);
    vec3 viewDir = normalize(world - cameraPosition);
    vBack = pow(max(dot(viewDir, uSun), 0.0), 3.0);
    vSide = position.x * dot(facing.xz, normalize(uSun.xz));
    vUp = t;
    vTone = aTone;
    vClump = aClump;
    vDepth = -mv.z;
    vViewDir = viewDir;
    gl_Position = projectionMatrix * mv;
  }
`;

const BLADE_FRAGMENT = `
  uniform vec3 uSun;
  uniform vec3 uHaze;
  uniform float uSeason;
  uniform float uSnow;
  ${FOG_GLSL}
  varying float vUp;
  varying float vTone;
  varying float vClump;
  varying float vBack;
  varying float vSide;
  varying float vDepth;
  varying vec3 vViewDir;
  ${HAZE_GLSL}

  void main() {
    float t = vUp;
    // Olive-gold dusk grass shifts to cool blue-green under moonlight.
    vec3 root = vec3(0.15, 0.26, 0.10);
    vec3 shade = vec3(0.31, 0.44, 0.18);
    vec3 body = vec3(0.53, 0.65, 0.31);
    vec3 nightRoot = vec3(0.035, 0.07, 0.1);
    vec3 nightShade = vec3(0.075, 0.15, 0.18);
    vec3 nightBody = vec3(0.22, 0.31, 0.32);
    float autumn = 1.0 - smoothstep(0.0, 0.75, abs(uSeason - 2.0));
    float winter = step(2.5, uSeason) * (1.0 - step(3.5, uSeason));
    vec3 autumnColor = mix(vec3(0.5, 0.3, 0.07), vec3(0.93, 0.68, 0.22), t);
    vec3 winterColor = mix(vec3(0.24, 0.31, 0.34), vec3(0.67, 0.74, 0.79), t);
    vec3 color = mix(root, shade, smoothstep(0.0, 0.28, t));
    color = mix(color, body, smoothstep(0.22, 0.62, t));
    color = mix(color, mix(mix(nightRoot, nightShade, smoothstep(0.0, 0.28, t)), nightBody, smoothstep(0.22, 0.62, t)), uNight);
    color = mix(color, autumnColor, autumn);
    color = mix(color, winterColor, winter);
    // Winter: the blades are buried under snow, so the snow layer reads instead of the grass.
    color = mix(color, mix(vec3(0.8, 0.84, 0.88), vec3(0.97, 0.98, 1.0), t), uSnow);

    // Broad warm/cool patches across the field plus per-blade tone.
    color += vec3(0.045, 0.035, -0.018) * (vClump - 0.5);
    color *= (0.9 + 0.24 * vClump) * (0.95 + 0.1 * vTone);

    // Sunlit tips hold the warm evening light; moonlit tips cool into blue-green.
    vec3 tip = mix(vec3(0.70, 0.75, 0.43), vec3(0.32, 0.42, 0.4), uNight);
    tip = mix(tip, vec3(0.9, 0.61, 0.22), autumn);
    tip = mix(tip, vec3(0.91, 0.95, 0.98), winter);
    color = mix(color, tip, smoothstep(0.68, 1.0, t) * (0.34 + 0.34 * vTone));
    color += vec3(0.13, 0.105, 0.045) * smoothstep(0.52, 1.0, t) * (0.12 + vBack);
    // Restrained warm edge light on the sun-facing side of each blade.
    color += vec3(0.055, 0.055, 0.025) * smoothstep(0.25, 1.0, vSide) * t;
    // Contact shadow pooling at the roots.
    color *= mix(0.83, 1.0, smoothstep(0.0, 0.3, t));

    color = mix(color, hazeToward(normalize(vViewDir)), fogAmount(vDepth));
    gl_FragColor = vec4(pow(max(color, 0.0), vec3(2.2)), 1.0);
    #include <colorspace_fragment>
  }
`;

const GROUND_VERTEX = `
  varying vec3 vWorld;
  varying float vDepth;
  ${TERRAIN_GLSL}
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    world.y += terrainHeight(world.xz);
    vec4 mv = viewMatrix * world;
    vWorld = world.xyz;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const GROUND_FRAGMENT = `
  uniform vec3 uSun;
  uniform vec3 uHaze;
  uniform float uSeason;
  uniform float uSnow;
  ${FOG_GLSL}
  varying vec3 vWorld;
  varying float vDepth;
  ${HAZE_GLSL}
  ${NOISE_GLSL}
  void main() {
    float d = vDepth;
    float field = valueNoise(vWorld.xz * 0.07 + vec2(11.0, -7.0));
    float grain = valueNoise(vWorld.xz * vec2(0.8, 2.2));
    float broad = valueNoise(vWorld.xz * 0.012 + vec2(-3.0, 5.0));
    // Fine detail fades out before it can shimmer at a grazing angle.
    float n = mix(broad, field, 1.0 - smoothstep(150.0, 280.0, d));
    n = mix(n, n * 0.75 + grain * 0.25, 1.0 - smoothstep(30.0, 60.0, d));
    vec3 nearColor = mix(vec3(0.25, 0.36, 0.14), vec3(0.48, 0.59, 0.27), n);
    vec3 farColor = mix(vec3(0.40, 0.48, 0.26), vec3(0.58, 0.61, 0.37), n);
    vec3 color = mix(nearColor, farColor, smoothstep(70.0, 170.0, d));
    float autumn = 1.0 - smoothstep(0.0, 0.75, abs(uSeason - 2.0));
    float winter = step(2.5, uSeason) * (1.0 - step(3.5, uSeason));
    color = mix(color, color * vec3(1.25, 0.78, 0.43), autumn);
    color = mix(color, mix(vec3(0.63, 0.72, 0.78), vec3(0.82, 0.87, 0.9), n), winter);
    color = mix(color, mix(vec3(0.84, 0.88, 0.92), vec3(0.98, 0.99, 1.0), n), uSnow);
    color = mix(color, color * vec3(0.26, 0.34, 0.56), uNight);
    // Broad tree contact shade anchors the tree to the slope; fine grains read as turf/snow.
    vec2 treeDelta = (vWorld.xz - vec2(0.0, -58.0)) / vec2(8.0, 5.0);
    float contactShade = exp(-dot(treeDelta, treeDelta)) * 0.22;
    color *= 1.0 - contactShade * (1.0 - uNight);
    color *= 0.97 + 0.03 * grain;
    vec3 dir = normalize(vWorld - cameraPosition);
    color = mix(color, hazeToward(dir), fogAmount(d));
    gl_FragColor = vec4(pow(max(color, 0.0), vec3(2.2)), 1.0);
    #include <colorspace_fragment>
    ${DITHER_GLSL}
  }
`;

function createBladeGeometry(T: ThreeModule, count: number) {
  const segments = 5;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let s = 0; s <= segments; s++) {
    const y = s / segments;
    positions.push(-1, y, 0, 1, y, 0);
  }
  for (let s = 0; s < segments; s++) {
    const r = s * 2;
    indices.push(r, r + 1, r + 2, r + 1, r + 3, r + 2);
  }
  const geometry = new T.InstancedBufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.instanceCount = count;
  return geometry;
}

/** Sky dome, haze-faded ground and a dense instanced lawn, sharing one sun and one haze. */
export function createProceduralGrassField(T: ThreeModule) {
  const smallViewport = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 720;
  const count = smallViewport ? 110000 : 320000;
  const random = createRandom(0x9e3779b1);

  // Fixed seeds and world positions: resizing and walking never scatter the lawn again.
  const depthSeeds = new Float32Array(count);
  const lateralSeeds = new Float32Array(count);
  const heightSeeds = new Float32Array(count);
  const widthSeeds = new Float32Array(count);
  const leanSeeds = new Float32Array(count);
  for (let i = 0; i < count; i++) depthSeeds[i] = random();
  depthSeeds.sort(); // Near blades draw first, so hidden ones behind them are depth-rejected.

  const origins = new Float32Array(count * 3);
  const heights = new Float32Array(count);
  const widths = new Float32Array(count);
  const faces = new Float32Array(count);
  const leans = new Float32Array(count);
  const phases = new Float32Array(count);
  const tones = new Float32Array(count);
  const clumps = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    lateralSeeds[i] = random();
    heightSeeds[i] = random();
    widthSeeds[i] = random();
    leanSeeds[i] = random();
    // Most blades turn their broad side to the camera so the rightward sweep reads clearly.
    const faceSeed = random();
    faces[i] = faceSeed * Math.PI * 2;
    phases[i] = random() * Math.PI * 2;
    tones[i] = random();
  }

  const bladeGeometry = createBladeGeometry(T, count);
  const originAttribute = new T.InstancedBufferAttribute(origins, 3);
  const heightAttribute = new T.InstancedBufferAttribute(heights, 1);
  const widthAttribute = new T.InstancedBufferAttribute(widths, 1);
  const leanAttribute = new T.InstancedBufferAttribute(leans, 1);
  const clumpAttribute = new T.InstancedBufferAttribute(clumps, 1);
  bladeGeometry.setAttribute('aOrigin', originAttribute);
  bladeGeometry.setAttribute('aHeight', heightAttribute);
  bladeGeometry.setAttribute('aWidth', widthAttribute);
  bladeGeometry.setAttribute('aLean', leanAttribute);
  bladeGeometry.setAttribute('aClump', clumpAttribute);
  bladeGeometry.setAttribute('aFace', new T.InstancedBufferAttribute(faces, 1));
  bladeGeometry.setAttribute('aPhase', new T.InstancedBufferAttribute(phases, 1));
  bladeGeometry.setAttribute('aTone', new T.InstancedBufferAttribute(tones, 1));

  const sunDirection = new T.Vector3(...SUN_DIRECTION).normalize();
  const uSun = { value: sunDirection };
  const uHaze = { value: new T.Vector3(...HAZE) };
  const uFogNear = { value: FOG_NEAR };
  const uFogScale = { value: FOG_SCALE };
  const uFogFull = { value: FOG_FULL };
  const uTime = { value: 0 };
  const uDusk = { value: 0 };
  const uNight = { value: 0 };
  const uSeason = { value: 1 };
  const uSnow = { value: 0 };
  const uPlayerPosition = { value: new T.Vector3() };
  const uPlayerInfluence = { value: 0 };
  const bladeUniforms = {
    uTime,
    uWind: { value: new T.Vector2(1, 0.16).normalize() },
    uDiscPosition: { value: new T.Vector3() },
    uDiscVelocity: { value: new T.Vector2() },
    uDiscInfluence: { value: 0 },
    uPlayerPosition, uPlayerInfluence, uNight, uSeason, uSnow,
    uSun, uHaze, uDusk, uFogNear, uFogScale, uFogFull,
  };

  const bladeMaterial = new T.ShaderMaterial({
    uniforms: bladeUniforms,
    vertexShader: BLADE_VERTEX,
    fragmentShader: BLADE_FRAGMENT,
    side: T.DoubleSide,
    toneMapped: false,
  });
  const blades = new T.Mesh(bladeGeometry, bladeMaterial);
  blades.frustumCulled = false;
  blades.renderOrder = 0;

  const groundMaterial = new T.ShaderMaterial({
    uniforms: { uSun, uHaze, uDusk, uNight, uSeason, uSnow, uFogNear, uFogScale, uFogFull },
    vertexShader: GROUND_VERTEX,
    fragmentShader: GROUND_FRAGMENT,
    toneMapped: false,
  });
  // Wide enough to reach the camera's far plane in every direction, where the haze is complete.
  const groundGeometry = new T.PlaneGeometry(1600, 1600, 256, 256);
  const ground = new T.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, BASE_Y - 0.02, 0); // A hair below the roots: no z-fighting.
  ground.renderOrder = 1; // After the blades, so covered ground is depth-rejected.
  ground.frustumCulled = false;

  const makeSkyMaterial = (visible: boolean) => new T.ShaderMaterial({
    uniforms: { uSun, uHaze, uTime, uDusk, uNight, uSeason },
    defines: visible ? { VISIBLE_DOME: '' } : {},
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    side: T.BackSide,
    depthWrite: false,
    toneMapped: false,
  });
  const domeGeometry = new T.SphereGeometry(200, 48, 24);
  const domeMaterial = makeSkyMaterial(true);
  const dome = new T.Mesh(domeGeometry, domeMaterial);
  dome.renderOrder = -10; // Backdrop: drawn first and writes no depth, so everything covers it.
  dome.frustumCulled = false;

  const flowers = createMeadowFlowers(T, BASE_Y, smallViewport ? 320 : 900);
  const landscape = createMeadowLandscape(T, BASE_Y);
  const group = new T.Group();
  group.name = 'procedural-grass-field';
  group.add(dome, ground, blades, landscape.group, flowers.group);
  let laidOut = false;

  return {
    group,
    sunDirection: sunDirection.clone(),
    groundAt: (x: number, z: number) => BASE_Y + terrainHeight(x, z),

    /** The same sky with a green ground and a bright sun, for the glass disc's reflections. */
    createEnvironment() {
      const scene = new T.Scene();
      const geometry = new T.SphereGeometry(30, 32, 16);
      const material = makeSkyMaterial(false);
      scene.add(new T.Mesh(geometry, material));
      return { scene, dispose() { geometry.dispose(); material.dispose(); } };
    },

    /** Lay the lawn out once in fixed world positions; it never moves with the camera. */
    layout() {
      if (laidOut) return;
      laidOut = true;
      for (let i = 0; i < count; i++) {
        // Overlapping world-space layers cover the full walking corridor and distant hills.
        // The outer layer is wider and coarser; it never moves with the camera.
        const outer = lateralSeeds[i] > 0.74;
        const sx = outer ? (lateralSeeds[i] - 0.74) / 0.26 : lateralSeeds[i] / 0.74;
        const z = 18 - depthSeeds[i] * (outer ? 280 : 145);
        const d = Math.max(0, 10 - z);
        const x = (sx * 2 - 1) * (outer ? 200 : 52);
        const broadPatch = noise2(x * 0.035 + 11, z * 0.035 - 7);
        const localPatch = noise2(x * 0.095 - 3, z * 0.095 + 5);
        const clump = broadPatch * 0.7 + localPatch * 0.3;
        const fine = noise2(x * 0.31 - 3, z * 0.31 + 5);
        const layer = heightSeeds[i] < 0.42 ? 0.52 : 1;
        const height = Math.min(MAX_BLADE, (0.52 + clump * 0.2 + fine * 0.12 + heightSeeds[i] * 0.25) * layer);
        const stride = i * 3;
        const groundY = BASE_Y + terrainHeight(x, z);
        origins[stride] = x;
        origins[stride + 1] = groundY;
        origins[stride + 2] = z;
        // Only the disc's idle area is capped; elsewhere the lawn keeps its natural height.
        const nearDisc = Math.abs(x) < 9 && Math.abs(z) < 9;
        const edgeFade = 1 - smoothstep(100, 260, d);
        heights[i] = Math.min(height, Math.max(0.12, nearDisc ? TIP_CAP - groundY : MAX_BLADE)) * edgeFade;
        // Wider distant blades fill subpixel gaps; individual close blades remain slender.
        widths[i] = (0.034 + widthSeeds[i] * 0.018) * (outer ? 1.8 : 1) * (1 + Math.min(d, 150) / 55);
        leans[i] = height * (0.16 + leanSeeds[i] * 0.16 + clump * 0.08);
        clumps[i] = clump;
      }
      originAttribute.needsUpdate = true;
      heightAttribute.needsUpdate = true;
      widthAttribute.needsUpdate = true;
      leanAttribute.needsUpdate = true;
      clumpAttribute.needsUpdate = true;
    },

    update(time: number, motion: boolean, discPosition: DiscPosition, influence: number, discVelocity: { x: number; z: number }, playerPosition: { x: number; z: number }, playerInfluence: number, season: MeadowSeason) {
      const seasonIndex: Record<MeadowSeason, number> = { summer: 1, autumn: 2, winter: 3, night: 4 };
      const index = seasonIndex[season];
      const dusk = season === 'autumn' ? 0.78 : 0;
      const night = season === 'night' ? 1 : 0;
      uTime.value = time;
      // The screen-space wipe supplies the transition: do not interpolate numeric season IDs,
      // which would pass through unrelated scenes when switching directly from summer to night.
      uDusk.value = dusk;
      uNight.value = night;
      uSeason.value = index;
      uSnow.value = season === 'winter' ? 1 : 0;
      flowers.setSeason(index);
      bladeUniforms.uPlayerPosition.value.set(playerPosition.x, BASE_Y, playerPosition.z);
      bladeUniforms.uPlayerInfluence.value = motion ? playerInfluence : 0;
      bladeUniforms.uDiscPosition.value.set(discPosition.x, discPosition.y, discPosition.z);
      bladeUniforms.uDiscVelocity.value.set(discVelocity.x, discVelocity.z);
      bladeUniforms.uDiscInfluence.value = motion ? influence : 0;
      landscape.update(time, index);
    },

    dispose() {
      flowers.dispose();
      landscape.dispose();
      bladeGeometry.dispose();
      bladeMaterial.dispose();
      groundGeometry.dispose();
      groundMaterial.dispose();
      domeGeometry.dispose();
      domeMaterial.dispose();
    },
  };
}
