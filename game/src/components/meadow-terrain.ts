/* A broad meadow shoulder rather than a small isolated mound. CPU and GPU share the same
 * expression so plants, walking and disc landings all follow the visible surface. */
export const HILL_CENTER = { x: 0, z: -58 } as const;

export function terrainHeight(x: number, z: number) {
  const dx = (x - HILL_CENTER.x) / 35;
  const dz = (z - HILL_CENTER.z) / 30;
  return Math.exp(-(dx * dx + dz * dz)) * 4.4
    + Math.sin(x * 0.065 + 0.4) * Math.sin(z * 0.052) * 0.42
    + Math.sin(x * 0.19 + z * 0.12) * 0.07;
}

export const TERRAIN_GLSL = `
  float terrainHeight(vec2 p) {
    vec2 d = (p - vec2(${HILL_CENTER.x.toFixed(1)}, ${HILL_CENTER.z.toFixed(1)})) / vec2(35.0, 30.0);
    return exp(-dot(d, d)) * 4.4
      + sin(p.x * 0.065 + 0.4) * sin(p.y * 0.052) * 0.42
      + sin(p.x * 0.19 + p.y * 0.12) * 0.07;
  }
`;
