/**
 * Typed access to the character sprites produced by the Sprite Factory.
 *
 * The JSON next to this file is generated - run `npm run sprites` to rebuild it
 * from tools/sprite-factory. Nothing here should be edited by hand.
 *
 * A character is not one sprite set but two stacked layers: a body wearing an
 * outfit, and a head of hair. They are rendered separately - hair with the body
 * still writing depth, so it is occluded correctly - and share an anchor, so
 * the game composes them by drawing both at the same point. That is what keeps
 * the catalogue additive: a new hair style costs one render, not one render per
 * outfit.
 *
 * Colour is not baked in. Every sprite is generated with the reference palette
 * in `slots`, and the game maps those colours onto ramps derived from whatever
 * a player picked - see utils/characterRenderer.
 */

import manifest from './characterSprites.generated.json'

/**
 * Facing names, world-axis based, matching the furniture pipeline.
 *
 * `south` is +x on the grid and projects down-right; `south-east` is +x+y and
 * projects straight down. This is deliberately *not* the convention the old
 * hand-made character art used, where "south" meant straight down the screen -
 * two conventions in one game is how a chair seats someone at 45 degrees to it.
 */
export const CHARACTER_DIRECTIONS = [
  'south',
  'south-west',
  'west',
  'north-west',
  'north',
  'north-east',
  'east',
  'south-east'
] as const

export type CharacterDirection = (typeof CHARACTER_DIRECTIONS)[number]

export interface CharacterShadow {
  file: string
  width: number
  height: number
  anchorX: number
  anchorY: number
}

export interface CharacterFrame {
  /** Path within the layer's directory. */
  file: string
  width: number
  height: number
  /** Pixel offset of the tile centre at floor level: where the feet land. */
  anchorX: number
  anchorY: number
  shadow?: CharacterShadow
}

export interface CharacterAnimation {
  frameCount: number
  directions: Record<string, CharacterFrame[]>
}

/** One interchangeable piece: a body in some outfit, or a hair style. */
export interface CharacterLayer {
  id: string
  name: string
  /** Empty for a variant with no geometry, such as bald. */
  animations: Record<string, CharacterAnimation>
}

export interface SlotPalette {
  base: string
  /** The four shades the sprites were generated with, darkest first. */
  ramp: string[]
}

interface CharacterManifest {
  basePath: string
  tile: { width: number; height: number }
  pixelsPerUnit: number
  directions: string[]
  outline: string
  slots: Record<string, SlotPalette>
  bodies: CharacterLayer[]
  hair: CharacterLayer[]
}

const sprites = manifest as unknown as CharacterManifest

/** The recolourable parts of a character, in the order the UI shows them. */
export const CHARACTER_SLOTS = ['skin', 'hair', 'eyes', 'shirt', 'trousers', 'shoes'] as const

export type CharacterSlot = (typeof CHARACTER_SLOTS)[number]

export function getSlotPalettes(): Record<string, SlotPalette> {
  return sprites.slots
}

export function getOutfits(): CharacterLayer[] {
  return sprites.bodies
}

export function getHairStyles(): CharacterLayer[] {
  return sprites.hair
}

export const DEFAULT_OUTFIT = sprites.bodies[0]?.id ?? 'tee'
export const DEFAULT_HAIR = sprites.hair.find(style => style.id === 'short')?.id ?? 'bald'

/**
 * How many frames the walk cycle has.
 *
 * Read from the manifest rather than written down here: the game steps the
 * cycle by progress through a tile, so a hardcoded count that disagreed with
 * the generator would silently drop or repeat a stride.
 */
export const WALK_FRAME_COUNT = sprites.bodies[0]?.animations.walk?.frameCount ?? 1

function findLayer(layers: CharacterLayer[], id: string): CharacterLayer | null {
  return layers.find(layer => layer.id === id) ?? layers[0] ?? null
}

export interface ResolvedFrame extends CharacterFrame {
  url: string
  /** Absolute URL of the contact shadow, when the frame has one. */
  shadowUrl?: string
}

/**
 * Resolve one animation frame of one layer.
 *
 * Falls back to idle, then to the first available direction, so a missing
 * animation degrades to a standing character rather than to nothing at all.
 * Returns null for a layer with no geometry, which is how bald works.
 */
function resolveFrame(
  layer: CharacterLayer | null,
  directory: string,
  animation: string,
  direction: string,
  frame: number
): ResolvedFrame | null {
  if (!layer) return null

  const clip = layer.animations[animation] ?? layer.animations.idle
  if (!clip) return null

  const frames = clip.directions[direction] ?? clip.directions[sprites.directions[0]]
  if (!frames || frames.length === 0) return null

  const resolved = frames[((frame % frames.length) + frames.length) % frames.length]
  const base = `${sprites.basePath}/${directory}/${layer.id}`
  return {
    ...resolved,
    url: `${base}/${resolved.file}`,
    shadowUrl: resolved.shadow ? `${base}/${resolved.shadow.file}` : undefined
  }
}

export function getBodyFrame(
  outfit: string,
  animation: string,
  direction: string,
  frame: number
): ResolvedFrame | null {
  return resolveFrame(findLayer(sprites.bodies, outfit), 'body', animation, direction, frame)
}

export function getHairFrame(
  style: string,
  animation: string,
  direction: string,
  frame: number
): ResolvedFrame | null {
  const layer = sprites.hair.find(entry => entry.id === style)
  // Unknown or geometry-free styles simply contribute no overlay.
  if (!layer || Object.keys(layer.animations).length === 0) return null
  return resolveFrame(layer, 'hair', animation, direction, frame)
}

/** Every image URL a given outfit and hair style needs, for preloading. */
export function getLayerUrls(outfit: string, hair: string): string[] {
  const urls: string[] = []

  const collect = (layer: CharacterLayer | null, directory: string) => {
    if (!layer) return
    const base = `${sprites.basePath}/${directory}/${layer.id}`
    for (const clip of Object.values(layer.animations)) {
      for (const frames of Object.values(clip.directions)) {
        for (const frame of frames) {
          urls.push(`${base}/${frame.file}`)
          if (frame.shadow) urls.push(`${base}/${frame.shadow.file}`)
        }
      }
    }
  }

  collect(findLayer(sprites.bodies, outfit), 'body')
  collect(sprites.hair.find(entry => entry.id === hair) ?? null, 'hair')
  return urls
}
