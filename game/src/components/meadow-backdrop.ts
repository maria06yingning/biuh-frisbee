import type * as Three from 'three';

type ThreeModule = typeof Three;

/** A photographic meadow with depth-masked wind: the sky and horizon stay still. */
export function createMeadowBackdrop(T: ThreeModule, source: string, onLoad: () => void) {
  let disposed = false;
  const uniforms = {
    uPhoto: { value: null as Three.Texture | null },
    uTime: { value: 0 },
    uAspect: { value: 1 },
    uPhotoAspect: { value: 1408 / 768 },
    uMotion: { value: 1 },
  };
  const material = new T.ShaderMaterial({
    uniforms,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 1.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uPhoto;
      uniform float uTime;
      uniform float uAspect;
      uniform float uPhotoAspect;
      uniform float uMotion;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
      }

      void main() {
        vec2 cover = vec2(min(uAspect / uPhotoAspect, 1.0), min(uPhotoAspect / uAspect, 1.0));
        vec2 photoUv = (vUv - 0.5) * cover + 0.5;
        vec3 original = texture2D(uPhoto, photoUv).rgb;
        float foreground = 1.0 - smoothstep(0.02, 0.59, photoUv.y);
        float grass = smoothstep(0.93, 1.12, original.g / max(original.r, 0.015))
                    * (1.0 - smoothstep(0.56, 0.64, photoUv.y));

        // Broad gusts travel across the field; local clumps bend out of phase.
        float clump = noise(photoUv * vec2(52.0, 31.0));
        float gust = sin(photoUv.x * 12.0 + photoUv.y * 7.0 - uTime * 1.35 + clump * 1.5);
        float ripple = sin(photoUv.x * 99.0 + photoUv.y * 43.0 - uTime * 3.1 + clump * 5.0);
        float bend = (gust * 0.72 + ripple * 0.28) * foreground * foreground * grass * uMotion;
        vec2 offset = vec2(bend * 0.0046, bend * 0.00075);
        vec3 color = texture2D(uPhoto, clamp(photoUv + offset, 0.002, 0.998)).rgb;

        // Sunlit blade tips brighten as their faces turn into the light.
        float sun = pow(max(0.0, gust * 0.5 + 0.5), 2.0) * foreground * grass * uMotion;
        color *= 1.0 + bend * 0.075;
        color += vec3(1.0, 0.83, 0.45) * sun * 0.015;
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const geometry = new T.PlaneGeometry(2, 2);
  const mesh = new T.Mesh(geometry, material);
  mesh.name = 'sunlit-meadow';
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  mesh.visible = false;
  const texture = new T.TextureLoader().load(source, loaded => {
    if (disposed) return;
    loaded.colorSpace = T.SRGBColorSpace;
    loaded.minFilter = T.LinearFilter;
    loaded.magFilter = T.LinearFilter;
    const image = loaded.image as { width: number; height: number };
    uniforms.uPhotoAspect.value = image.width / image.height;
    uniforms.uPhoto.value = loaded;
    mesh.visible = true;
    onLoad();
  }, undefined, () => { /* The photograph underneath remains visible. */ });

  return {
    mesh,
    setSize(width: number, height: number) { uniforms.uAspect.value = width / Math.max(1, height); },
    update(time: number, motion: boolean) {
      uniforms.uTime.value = time;
      uniforms.uMotion.value = motion ? 1 : 0;
    },
    dispose() {
      disposed = true;
      geometry.dispose(); material.dispose(); texture.dispose();
    },
  };
}
