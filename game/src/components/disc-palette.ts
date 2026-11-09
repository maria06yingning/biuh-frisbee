import type { MeadowSeason } from './meadow-season';

/** Curated per-scene swatches, kept in the order supplied for each palette. */
export const DISC_PALETTES: Record<MeadowSeason, readonly number[]> = {
  summer: [0xa7d6c6, 0xb0d0e0, 0xecc8b4, 0xece4b4, 0xc4bcd4, 0xe8b0a8, 0x94c8b8, 0xa0c4c8, 0xecd4a8, 0xd8bcd0],
  autumn: [0xbc8454, 0xd48c48, 0xc4a458, 0xa85448, 0x707c58, 0xac7440, 0xc4ac8c, 0xc46440, 0x7c8464, 0xac9478],
  winter: [0xb0ccdc, 0xc4dce8, 0xbcc4cc, 0xd8c4c4, 0x486494, 0xacc0d4, 0xa89cb8, 0xa0a4ac, 0xd4dce4, 0x60708c],
  night: [0xecdc9c, 0xd4bc94, 0xd4bcc4, 0xa0c4dc, 0xbca8d4, 0xe4d4a4, 0x948cb4, 0xb49464, 0xb4acc4, 0x8ca0b0],
};

/** Each scene default stays distinct; the night fog pink reads clearly on a dark scene. */
const DISC_DEFAULTS: Record<MeadowSeason, number> = {
  summer: 0xa7d6c6,
  autumn: 0xbc8454,
  winter: 0xb0ccdc,
  night: 0xd4bcc4,
};

export function defaultDiscColor(season: MeadowSeason): number {
  return DISC_DEFAULTS[season];
}

/** Pick another designed swatch, rather than generating arbitrary RGB values. */
export function randomDiscColor(season: MeadowSeason, currentColor: number, random = Math.random): number {
  const palette = DISC_PALETTES[season];
  const alternatives = palette.filter(color => color !== currentColor);
  const choices = alternatives.length ? alternatives : palette;
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}
