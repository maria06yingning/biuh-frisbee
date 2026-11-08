function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Broad rolling ridges that stay nearly level around the interactive disc's landing zone. */
export function terrainHeight(x: number, z: number) {
  const depth = Math.max(-z - 8, 0);
  const envelope = smoothstep(0, 1, depth / 48);
  const ridgeA = Math.sin(x * 0.028 + Math.sin(z * 0.017) * 1.35 + 0.55);
  const ridgeB = Math.sin(z * 0.036 - x * 0.015 + 1.2);
  const ridgeC = Math.sin(x * 0.014 + z * 0.008 - 1.8);
  return envelope * (2.2 * ridgeA + 0.8 * ridgeB + 0.45 * ridgeC);
}

/** Keep GPU ground displacement exactly aligned with terrainHeight() used by plants and trees. */
export const TERRAIN_GLSL = `
  float terrainHeight(vec2 p) {
    float depth = max(-p.y - 8.0, 0.0);
    float envelope = smoothstep(0.0, 48.0, depth);
    float ridgeA = sin(p.x * 0.028 + sin(p.y * 0.017) * 1.35 + 0.55);
    float ridgeB = sin(p.y * 0.036 - p.x * 0.015 + 1.2);
    float ridgeC = sin(p.x * 0.014 + p.y * 0.008 - 1.8);
    return envelope * (2.2 * ridgeA + 0.8 * ridgeB + 0.45 * ridgeC);
  }
`;
