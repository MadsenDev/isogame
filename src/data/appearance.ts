/**
 * What a character looks like.
 *
 * Two halves, and they cost very different things. Shape - hair style, outfit -
 * is geometry, so each variant is a set of sprites the Sprite Factory has to
 * render. Colour is free: every sprite is generated with one reference palette
 * and remapped at draw time, so any colour a player can name works without
 * anything being rendered for it.
 *
 * That asymmetry is why the pickers below look the way they do: a short list of
 * styles, and open colour wells with suggested swatches.
 */

import {
  CHARACTER_SLOTS,
  CharacterSlot,
  DEFAULT_HAIR,
  DEFAULT_OUTFIT
} from './characterSprites'

export type { CharacterSlot }
export { CHARACTER_SLOTS }

export interface Appearance {
  /** Body variant id, from the generated catalogue. */
  outfit: string
  /** Hair variant id, from the generated catalogue. */
  hair: string
  colours: Record<CharacterSlot, string>
}

export const DEFAULT_APPEARANCE: Appearance = {
  outfit: DEFAULT_OUTFIT,
  hair: DEFAULT_HAIR,
  colours: {
    skin: '#e0a878',
    hair: '#5a3b28',
    eyes: '#2b2430',
    shirt: '#4a72a8',
    trousers: '#3c4557',
    shoes: '#2f2a33'
  }
}

/**
 * Suggested colours per slot.
 *
 * Suggestions, not a fixed set - the picker also takes any colour - but a row
 * of plausible tones is faster than a colour wheel for the nine times out of
 * ten someone just wants "darker hair".
 */
export const SWATCHES: Record<CharacterSlot, string[]> = {
  skin: ['#f8dcc0', '#f0c4a0', '#e0a878', '#c98b5b', '#a4673f', '#7d4b2c', '#563322'],
  hair: [
    '#221b22',
    '#3f2b22',
    '#5a3b28',
    '#8d5a34',
    '#c9a15a',
    '#e0d5c2',
    '#a8443c',
    '#4a6ea8',
    '#6b4a8d',
    '#3f7a5e'
  ],
  eyes: ['#2b2430', '#4a3524', '#8d6534', '#3f6b7a', '#4a72a8', '#4f7f5a', '#5c5f6b'],
  shirt: [
    '#4a72a8',
    '#3f7a5e',
    '#a8443c',
    '#d19a3c',
    '#6b4a8d',
    '#c96f8f',
    '#2f3a47',
    '#e4ded2',
    '#7a8a52',
    '#3aa0a8'
  ],
  trousers: [
    '#3c4557',
    '#2f3a47',
    '#4a5468',
    '#5a4a3c',
    '#7a6a55',
    '#2b2430',
    '#8a5a3c',
    '#46603f',
    '#6b4a8d',
    '#c9c0b2'
  ],
  shoes: ['#2f2a33', '#4a3528', '#6b4a30', '#8a2f33', '#3c4557', '#e4ded2', '#7a6a55']
}

export const SLOT_LABELS: Record<CharacterSlot, string> = {
  skin: 'Skin',
  hair: 'Hair',
  eyes: 'Eyes',
  shirt: 'Top',
  trousers: 'Bottoms',
  shoes: 'Shoes'
}

/**
 * A stable key for one appearance.
 *
 * Used to cache composited frames, so it has to change whenever anything about
 * the drawing changes and never otherwise.
 */
export function appearanceKey(appearance: Appearance): string {
  const colours = CHARACTER_SLOTS.map(slot => appearance.colours[slot]).join(',')
  return `${appearance.outfit}|${appearance.hair}|${colours}`
}

/** Fill in anything a saved or partial appearance is missing. */
export function normaliseAppearance(value: Partial<Appearance> | null | undefined): Appearance {
  return {
    outfit: value?.outfit ?? DEFAULT_APPEARANCE.outfit,
    hair: value?.hair ?? DEFAULT_APPEARANCE.hair,
    colours: { ...DEFAULT_APPEARANCE.colours, ...(value?.colours ?? {}) }
  }
}

function pick<T>(options: T[], seed: number): T {
  return options[Math.abs(seed) % options.length]
}

/**
 * A deterministic look for a given seed.
 *
 * Used to give the other guests in a room distinct appearances without either
 * hand-authoring four of them or having them change on every reload.
 */
export function appearanceForSeed(seed: number, outfits: string[], hairStyles: string[]): Appearance {
  return {
    outfit: pick(outfits, seed * 7 + 1),
    hair: pick(hairStyles, seed * 5 + 2),
    colours: {
      skin: pick(SWATCHES.skin, seed * 3 + 1),
      hair: pick(SWATCHES.hair, seed * 11 + 4),
      eyes: pick(SWATCHES.eyes, seed * 13 + 2),
      shirt: pick(SWATCHES.shirt, seed * 17 + 5),
      trousers: pick(SWATCHES.trousers, seed * 19 + 3),
      shoes: pick(SWATCHES.shoes, seed * 23 + 6)
    }
  }
}
