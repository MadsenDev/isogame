/**
 * Typed access to the character sprites produced by the Sprite Factory.
 *
 * The JSON next to this file is generated - run `npm run sprites` to rebuild it
 * from tools/sprite-factory. Nothing here should be edited by hand.
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

export interface CharacterFrame {
  /** Path within the character's directory. */
  file: string
  width: number
  height: number
  /** Pixel offset of the tile centre at floor level: where the feet land. */
  anchorX: number
  anchorY: number
}

export interface CharacterAnimation {
  frameCount: number
  directions: Record<string, CharacterFrame[]>
}

export interface CharacterMetadata {
  id: string
  name: string
  tile: { width: number; height: number }
  pixelsPerUnit: number
  palette: string[]
  directions: string[]
  animations: Record<string, CharacterAnimation>
}

interface CharacterManifest {
  basePath: string
  characters: Record<string, CharacterMetadata>
}

const sprites = manifest as unknown as CharacterManifest

export const DEFAULT_CHARACTER_ID = 'guest'

export function getCharacter(id: string = DEFAULT_CHARACTER_ID): CharacterMetadata | null {
  return sprites.characters[id] ?? null
}

export interface ResolvedCharacterFrame extends CharacterFrame {
  url: string
}

/**
 * Resolve one animation frame.
 *
 * Falls back to idle, then to the first available direction, so a missing
 * animation degrades to a standing character rather than to nothing at all.
 */
export function getCharacterFrame(
  animation: string,
  direction: string,
  frame: number,
  characterId: string = DEFAULT_CHARACTER_ID
): ResolvedCharacterFrame | null {
  const character = getCharacter(characterId)
  if (!character) return null

  const clip = character.animations[animation] ?? character.animations.idle
  if (!clip) return null

  const frames = clip.directions[direction] ?? clip.directions[character.directions[0]]
  if (!frames || frames.length === 0) return null

  const resolved = frames[((frame % frames.length) + frames.length) % frames.length]
  return { ...resolved, url: `${sprites.basePath}/${characterId}/${resolved.file}` }
}

/** Every frame URL, for preloading. */
export function getAllCharacterFrameUrls(characterId: string = DEFAULT_CHARACTER_ID): string[] {
  const character = getCharacter(characterId)
  if (!character) return []

  return Object.values(character.animations).flatMap(clip =>
    Object.values(clip.directions).flatMap(frames =>
      frames.map(frame => `${sprites.basePath}/${characterId}/${frame.file}`)
    )
  )
}
