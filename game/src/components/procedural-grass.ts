import type * as Three from 'three';

type ThreeModule = typeof Three;
type DiscPosition = { x: number; y: number; z: number };

/*
 * Clearance contract with GlassDisc: in every flight frame the disc stays high, and once it
 * settles its centre never drops below y = -0.85 while no vertex lies more than 2.2 from that
 * centre, so however the pointer turns it the lowest point stays above y = -3.05. Grass tips are
 * capped at TIP_CAP everywhere, so the disc can never intersect the meadow at any aspect ratio,
 * and no blade can stand between the camera and the disc.
 */
const TIP_CAP = -3.5;
const BASE_Y = -7.4;
const MAX_HEIGHT = TIP_CAP - BASE_Y;
const FAR_DISTANCE = 170;   // Blades flatten into the ground carpet by this distance.
const FOG_NEAR = 18;        // Aerial haze starts here and thickens exponentially.
const FOG_SCALE = 330;
const NEAR_HILLS = 380;     // Two soft hill silhouettes close the horizon, so no field edge shows.
const FAR_HILLS = 560;
/** Direction toward the sun: upper right and slightly behind the field, so the grass is back-lit. */
const SUN_DIRECTION: readonly [number, number, number] = [0.46, 0.5, -0.74];
/** Pale horizon haze (display values) shared by the sky, the fogged meadow and the hills. */
const HAZE: readonly [number, number, number] = [0.86, 0.92, 0.9];

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

// Rounded humps with flatter valleys; integer frequencies keep each ring seamless.
const hump = (value: number, power: number) => Math.pow(0.5 + 0.5 * value, power);
const nearHillHeight = (a: number) =>
  3 + 9 * hump(Math.sin(7 * a + 1.3), 1.6) + 3 * hump(Math.sin(12 * a + 0.4), 2) + Math.sin(23 * a + 2.1);
// Always taller than the camera's eye height, so the true horizon line never shows.
const farHillHeight = (a: number) =>
  13 + 15 * hump(Math.sin(5 * a + 2.2), 1.4) + 6 * hump(Math.sin(9 * a + 0.7), 1.8) + 1.5 * Math.sin(17 * a + 1.9);

// Haze picks up a warm glow toward the sun, so distant grass and sky brighten on the sun side.
const HAZE_GLSL = `
  vec3 hazeToward(vec3 dir) {
    return uHaze + vec3(0.16, 0.12, 0.05) * pow(max(dot(dir, uSun), 0.0), 8.0);
  }
`;
const FOG_GLSL = `
  uniform float uFogNear;
  uniform float uFogScale;
  float fogAmount(float depth) {
    return 1.0 - exp(-max(depth - uFogNear, 0.0) / uFogScale);
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
  varying vec3 vDir;
  ${HAZE_GLSL}
  ${NOISE_GLSL}
  void main() {
    vec3 d = normalize(vDir);
    vec3 haze = hazeToward(d);
    vec3 zenith = vec3(0.47, 0.68, 0.93);
    vec3 sky = mix(uHaze, zenith, smoothstep(0.0, 0.3, max(d.y, 0.0))) + (haze - uHaze);
  #ifdef VISIBLE_DOME
    vec3 below = haze;
  #else
    vec3 below = mix(vec3(0.4, 0.58, 0.32), vec3(0.2, 0.38, 0.16), smoothstep(0.0, 0.5, -d.y));
  #endif
    vec3 color = mix(below, sky, smoothstep(-0.03, 0.0, d.y));
    vec3 skyLinear = pow(max(color, 0.0), vec3(2.2));
  #ifndef VISIBLE_DOME
    skyLinear += vec3(4.0, 3.35, 1.85) * pow(max(dot(d, uSun), 0.0), 150.0);
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
  uniform vec2 uWind;
  uniform vec3 uSun;
  uniform vec3 uDiscPosition;
  uniform float uDiscInfluence;
  varying float vUp;
  varying float vTone;
  varying float vClump;
  varying float vBack;
  varying float vSide;
  varying float vDepth;
  varying vec3 vViewDir;

  void main() {
    float t = position.y;                       // 0 at the root, 1 at the tip.
    float taper = pow(1.0 - t, 0.62);
    vec3 facing = vec3(cos(aFace), 0.0, sin(aFace));
    vec3 across = facing * (position.x * aWidth * taper);

    // Rolling wind waves travel left to right; a slow envelope and a per-blade flutter keep
    // neighbouring patches out of step without turning it into a storm.
    float along = dot(aOrigin.xz, uWind);
    float wave = sin(along * 0.16 - uTime * 1.05) * 0.5 + 0.5;
    float envelope = sin(along * 0.045 + aOrigin.z * 0.03 - uTime * 0.37) * 0.5 + 0.5;
    float flutter = sin(uTime * 2.1 + aPhase) * 0.1;
    float gust = wave * (0.45 + 0.55 * envelope) + flutter;
    float bend = aLean * (0.68 + 0.32 * gust) * t * t;

    // The disc's downwash parts the grass along its path.
    vec2 away = aOrigin.xz - uDiscPosition.xz;
    float dist = length(away);
    vec2 awayDir = dist > 0.001 ? away / dist : vec2(0.0, 1.0);
    float ripple = exp(-dist * 0.3) * uDiscInfluence * aHeight * 0.18 * t * t;

    vec2 offset = uWind * bend + awayDir * ripple;
    // Bending only ever lowers the tip, so the TIP_CAP clearance holds while swaying.
    float droop = 0.35 * dot(offset, offset) / max(aHeight, 0.05);
    vec3 world = aOrigin + across + vec3(offset.x, t * aHeight - droop, offset.y);

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
    // Fresh, vivid palette: deep grass root -> lush green body.
    vec3 root = vec3(0.16, 0.34, 0.16);
    vec3 shade = vec3(0.26, 0.52, 0.22);
    vec3 body = vec3(0.46, 0.73, 0.32);
    vec3 color = mix(root, shade, smoothstep(0.0, 0.28, t));
    color = mix(color, body, smoothstep(0.22, 0.62, t));

    // Broad warm/cool patches across the field plus per-blade tone.
    color += vec3(0.07, 0.05, -0.04) * (vClump - 0.5);
    color *= (0.9 + 0.22 * vClump) * (0.95 + 0.12 * vTone);

    // Warm cream-gold tips, glowing most where the view looks toward the sun (back light).
    vec3 tip = vec3(0.92, 0.9, 0.56);
    color = mix(color, tip, smoothstep(0.66, 1.0, t) * (0.5 + 0.5 * vTone));
    color += vec3(0.26, 0.21, 0.08) * smoothstep(0.5, 1.0, t) * (0.18 + vBack);
    // The sun-facing edge of each blade is a touch lighter.
    color += vec3(0.1, 0.1, 0.04) * smoothstep(0.25, 1.0, vSide) * t;
    // Contact shadow pooling at the roots.
    color *= mix(0.6, 1.0, smoothstep(0.0, 0.3, t));

    color = mix(color, hazeToward(normalize(vViewDir)), fogAmount(vDepth));
    gl_FragColor = vec4(pow(max(color, 0.0), vec3(2.2)), 1.0);
    #include <colorspace_fragment>
  }
`;

const GROUND_VERTEX = `
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec4 mv = viewMatrix * world;
    vWorld = world.xyz;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const GROUND_FRAGMENT = `
  uniform vec3 uSun;
  uniform vec3 uHaze;
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
    vec3 nearColor = mix(vec3(0.28, 0.5, 0.24), vec3(0.52, 0.72, 0.34), n);
    // Beyond the blades the carpet matches their sunlit upper halves, so the hand-off is invisible.
    vec3 farColor = mix(vec3(0.46, 0.66, 0.34), vec3(0.64, 0.76, 0.44), n);
    vec3 color = mix(nearColor, farColor, smoothstep(70.0, 170.0, d));
    vec3 dir = normalize(vWorld - cameraPosition);
    color = mix(color, hazeToward(dir), fogAmount(d));
    gl_FragColor = vec4(pow(max(color, 0.0), vec3(2.2)), 1.0);
    #include <colorspace_fragment>
    ${DITHER_GLSL}
  }
`;

const HILL_VERTEX = `
  attribute float aRise;
  attribute float aLayer;
  varying float vRise;
  varying float vLayer;
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec4 mv = viewMatrix * world;
    vRise = aRise;
    vLayer = aLayer;
    vWorld = world.xyz;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const HILL_FRAGMENT = `
  uniform vec3 uSun;
  uniform vec3 uHaze;
  ${FOG_GLSL}
  varying float vRise;
  varying float vLayer;
  varying vec3 vWorld;
  varying float vDepth;
  ${HAZE_GLSL}
  ${NOISE_GLSL}
  void main() {
    // Back-lit hills: richer green shaded faces, a lighter crest; the far ring is a touch cooler.
    vec3 base = mix(vec3(0.34, 0.54, 0.34), vec3(0.44, 0.6, 0.52), vLayer);
    vec3 crest = mix(vec3(0.5, 0.68, 0.42), vec3(0.56, 0.7, 0.56), vLayer);
    vec3 color = mix(base, crest, smoothstep(0.55, 1.0, vRise));
    color = mix(color, hazeToward(normalize(vWorld - cameraPosition)), fogAmount(vDepth));
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

/** Two rings of rolling hills around the field, drawn as walls with a wavy crest. */
function createHillGeometry(T: ThreeModule) {
  const segments = 512;
  const positions: number[] = [];
  const rises: number[] = [];
  const layers: number[] = [];
  const indices: number[] = [];
  const rings: Array<[number, number, (a: number) => number]> = [
    [NEAR_HILLS, 0, nearHillHeight],
    [FAR_HILLS, 1, farHillHeight],
  ];
  for (const [radius, layer, heightAt] of rings) {
    const start = positions.length / 3;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2; // a = 0 looks straight down the field (-z).
      const x = Math.sin(a) * radius;
      const z = -Math.cos(a) * radius;
      positions.push(x, BASE_Y - 1.5, z, x, BASE_Y + heightAt(a), z);
      rises.push(0, 1);
      layers.push(layer, layer);
    }
    for (let i = 0; i < segments; i++) {
      const r = start + i * 2;
      indices.push(r, r + 1, r + 2, r + 1, r + 3, r + 2);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aRise', new T.Float32BufferAttribute(rises, 1));
  geometry.setAttribute('aLayer', new T.Float32BufferAttribute(layers, 1));
  geometry.setIndex(indices);
  return geometry;
}

/** Sky dome, haze-faded ground, distant hills and a dense instanced meadow, sharing one sun. */
export function createProceduralGrassField(T: ThreeModule) {
  const smallViewport = typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 720;
  const count = smallViewport ? 16000 : 40000;
  const random = createRandom(0x9e3779b1);

  // Seeds stay fixed; positions are re-derived from the camera in layout().
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
    faces[i] = random() < 0.7 ? (faceSeed - 0.5) * 1.8 : faceSeed * Math.PI;
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
  const bladeUniforms = {
    uTime: { value: 0 },
    uWind: { value: new T.Vector2(1, 0.16).normalize() },
    uDiscPosition: { value: new T.Vector3() },
    uDiscInfluence: { value: 0 },
    uSun, uHaze, uFogNear, uFogScale,
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
    uniforms: { uSun, uHaze, uFogNear, uFogScale },
    vertexShader: GROUND_VERTEX,
    fragmentShader: GROUND_FRAGMENT,
    toneMapped: false,
  });
  // Reaches past the far hills, so the meadow runs uninterrupted into them.
  const groundGeometry = new T.PlaneGeometry(1600, 1600);
  const ground = new T.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, BASE_Y - 0.02, 0); // A hair below the roots: no z-fighting.
  ground.renderOrder = 1; // After the blades, so covered ground is depth-rejected.
  ground.frustumCulled = false;

  const hillGeometry = createHillGeometry(T);
  const hillMaterial = new T.ShaderMaterial({
    uniforms: { uSun, uHaze, uFogNear, uFogScale },
    vertexShader: HILL_VERTEX,
    fragmentShader: HILL_FRAGMENT,
    side: T.DoubleSide,
    toneMapped: false,
  });
  const hills = new T.Mesh(hillGeometry, hillMaterial);
  hills.renderOrder = 2;
  hills.frustumCulled = false;

  const makeSkyMaterial = (visible: boolean) => new T.ShaderMaterial({
    uniforms: { uSun, uHaze },
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

  const group = new T.Group();
  group.name = 'procedural-grass-field';
  group.add(dome, blades, ground, hills);

  const forward = new T.Vector3();

  return {
    group,
    sunDirection: sunDirection.clone(),

    /** The same sky with a green ground and a bright sun, for the glass disc's reflections. */
    createEnvironment() {
      const scene = new T.Scene();
      const geometry = new T.SphereGeometry(30, 32, 16);
      const material = makeSkyMaterial(false);
      scene.add(new T.Mesh(geometry, material));
      return { scene, dispose() { geometry.dispose(); material.dispose(); } };
    },

    /** Fill the camera's visible wedge of meadow; call after every camera change. */
    layout(camera: Three.PerspectiveCamera) {
      camera.updateMatrixWorld();
      camera.getWorldDirection(forward);
      const pitch = Math.asin(Math.max(-1, Math.min(1, -forward.y)));
      const tanV = Math.tan(camera.fov * Math.PI / 360);
      const tanH = tanV * camera.aspect;
      const bottom = Math.max(0.05, pitch + Math.atan(tanV));
      // Nearest distance at which a full-height tip can enter the bottom of the frame.
      const nearD = Math.max(0.5, ((camera.position.y - TIP_CAP) / Math.tan(bottom)) * 0.82);
      const span = FAR_DISTANCE - nearD;
      for (let i = 0; i < count; i++) {
        const d = nearD + Math.pow(depthSeeds[i], 1.6) * span;
        const z = camera.position.z - d;
        const halfWidth = tanH * d * 1.1 + 3.5;
        const x = camera.position.x + (lateralSeeds[i] * 2 - 1) * halfWidth;
        const clump = noise2(x * 0.07 + 11, z * 0.07 - 7);
        const fine = noise2(x * 0.31 - 3, z * 0.31 + 5);
        // Far blades settle gradually into the smooth carpet the ground continues.
        const fade = 1 - smoothstep(FAR_DISTANCE * 0.45, FAR_DISTANCE, d);
        const height = Math.min(MAX_HEIGHT, (1.7 + clump * 1.2 + fine * 0.5 + heightSeeds[i] * 0.7) * fade);
        const stride = i * 3;
        origins[stride] = x;
        origins[stride + 1] = BASE_Y;
        origins[stride + 2] = z;
        heights[i] = height;
        // Far blades widen a little so the distant carpet stays solid instead of shimmering.
        widths[i] = (0.045 + widthSeeds[i] * 0.035) * (1 + d / 45);
        leans[i] = height * (0.16 + leanSeeds[i] * 0.16 + clump * 0.08);
        clumps[i] = clump;
      }
      originAttribute.needsUpdate = true;
      heightAttribute.needsUpdate = true;
      widthAttribute.needsUpdate = true;
      leanAttribute.needsUpdate = true;
      clumpAttribute.needsUpdate = true;
    },

    update(time: number, motion: boolean, discPosition: DiscPosition, influence: number) {
      if (motion) bladeUniforms.uTime.value = time;
      bladeUniforms.uDiscPosition.value.set(discPosition.x, discPosition.y, discPosition.z);
      bladeUniforms.uDiscInfluence.value = motion ? influence : 0;
    },

    dispose() {
      bladeGeometry.dispose();
      bladeMaterial.dispose();
      groundGeometry.dispose();
      groundMaterial.dispose();
      hillGeometry.dispose();
      hillMaterial.dispose();
      domeGeometry.dispose();
      domeMaterial.dispose();
    },
  };
}
