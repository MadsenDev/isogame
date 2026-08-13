/**
 * Typed access to the sprites produced by the Sprite Factory.
 *
 * The JSON next to this file is generated - run `npm run sprites` to rebuild it
 * from tools/sprite-factory. Nothing here should be edited by hand; this module
 * exists to put a contract in front of the generated data.
 */

import manifest from './furnitureSprites.generated.json'

export type SpriteDirection = 'south' | 'west' | 'north' | 'east'

export interface SpriteFrameMetadata {
  /** Filename within the asset's directory. */
  file: string
  /** Rotation index, 0-3, counting quarter turns from the authored pose. */
  index: number
  width: number
  height: number
  /**
   * Pixel offset of the centre of footprint tile (0,0) at floor level. Draw the
   * frame at (screenX - anchorX * zoom, screenY - anchorY * zoom).
   */
  anchorX: number
  anchorY: number
  /** Tiles occupied in this orientation. */
  footprint: { width: number; height: number }
}

export interface FurnitureSpriteMetadata {
  id: string
  name: string
  /** The orientation whose footprint matches the furniture definition. */
  defaultDirection: SpriteDirection
  footprint: { width: number; height: number }
  tile: { width: number; height: number }
  pixelsPerUnit: number
  palette: string[]
  directions: Record<string, SpriteFrameMetadata>
}

interface SpriteManifest {
  basePath: string
  assets: Record<string, FurnitureSpriteMetadata>
}

const sprites = manifest as unknown as SpriteManifest

/** Tile size the sprites were rendered for. Must match the game's grid. */
export const SPRITE_TILE_WIDTH = 64
export const SPRITE_TILE_HEIGHT = 32

export function getSpriteMetadata(furnitureId: string): FurnitureSpriteMetadata | null {
  return sprites.assets[furnitureId] ?? null
}

/**
 * Resolve one frame, falling back to the asset's default orientation when the
 * requested direction was not rendered.
 */
export function getSpriteFrame(
  furnitureId: string,
  direction?: string
): { metadata: FurnitureSpriteMetadata; frame: SpriteFrameMetadata; url: string } | null {
  const metadata = getSpriteMetadata(furnitureId)
  if (!metadata) return null

  const frame = (direction && metadata.directions[direction]) || metadata.directions[metadata.defaultDirection]
  if (!frame) return null

  return { metadata, frame, url: `${sprites.basePath}/${furnitureId}/${frame.file}` }
}

export function getAllSpriteIds(): string[] {
  return Object.keys(sprites.assets)
}
