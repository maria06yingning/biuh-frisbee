import * as THREE from 'three';

/* 画面风格：Sable 的 Moebius 式淡彩平涂 + Rollerdrome 的粗描边卡通 */
export const PALETTE = {
  ink: 0x1b1a2e,
  cream: 0xf6ecd2,
  haze: 0xf8e0b6,
  grassA: 0x8fd17e,
  grassB: 0x7fc371,
  ground: 0x66b06c,
  teamA: 0x14c2d8,
  teamB: 0xff5a4a,
  disc: 0xffd23f,
  discRim: 0xff6a1a,
  attack: 0xffcf4a,
  defend: 0x8f7be8,
  skin: 0xf2c6a0,
  shorts: 0x2b2a52,
  trunk: 0x8a5a3c,
  leafs: [0x3e9e6a, 0x56b878],
  hills: [0xe9b88a, 0xd9a0a0, 0xbfa0c4],
};

let gradient: THREE.DataTexture | null = null;
/** 三档色阶：亮 / 中 / 暗，没有渐变 */
export function gradientMap(): THREE.DataTexture {
  if (!gradient) {
    const tones = new Uint8Array([105, 175, 255]);
    gradient = new THREE.DataTexture(tones, tones.length, 1, THREE.RedFormat);
    gradient.minFilter = THREE.NearestFilter;
    gradient.magFilter = THREE.NearestFilter;
    gradient.generateMipmaps = false;
    gradient.needsUpdate = true;
  }
  return gradient;
}

export function toonMat(color: number): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: gradientMap() });
}

const inkBack = new THREE.MeshBasicMaterial({ color: PALETTE.ink, side: THREE.BackSide });

/** 描边（法线外扩的反向外壳）——只适用于法线连续的形状：胶囊、球、环 */
export function addOutline(mesh: THREE.Mesh, thickness = 0.03): THREE.Mesh {
  const m = new THREE.MeshBasicMaterial({ color: PALETTE.ink, side: THREE.BackSide });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `vec3 transformed = position + normal * ${thickness.toFixed(4)};`,
    );
  };
  m.customProgramCacheKey = () => `outline-${thickness.toFixed(4)}`;
  const o = new THREE.Mesh(mesh.geometry, m);
  mesh.add(o);
  return o;
}

/** 描边（整体放大的反向外壳）——适用于圆柱、圆锥这类有硬边的形状 */
export function addScaleOutline(mesh: THREE.Mesh, sx: number, sy = sx, sz = sx): THREE.Mesh {
  const o = new THREE.Mesh(mesh.geometry, inkBack);
  o.scale.set(sx, sy, sz);
  mesh.add(o);
  return o;
}

/** 斜线阴影纹理（乘在底色上，像手绘排线） */
export function hatchTexture(repX: number, repY: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#eeeeee';
    g.lineWidth = 2;
    for (const k of [-64, -32, 0, 32, 64, 96]) {
      g.beginPath();
      g.moveTo(k, 64);
      g.lineTo(k + 64, 0);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repX, repY);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** 地面软影（圆形暗斑），比实时阴影更干净，也更像平面插画 */
export function blobShadow(radius: number, opacity = 0.32): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    new THREE.MeshBasicMaterial({ color: PALETTE.ink, transparent: true, opacity, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.04;
  return m;
}
