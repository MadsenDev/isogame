/**
 * Typed access to the room structures produced by the Sprite Factory: floor
 * tiles and wall panels.
 *
 * The JSON next to this file is generated - run `npm run sprites` to rebuild it.
 */

import manifest from './structureSprites.generated.json'

export interface StructureSprite {
  url: string
  file: string
  width: number
  height: number
  anchorX: number
  anchorY: number
}

export interface StructureDefinition {
  id: string
  name: string
  defaultDirection: string
  palette: string[]
  sprites: Record<string, StructureSprite>
}

interface StructureManifest {
  basePath: string
  structures: Record<string, StructureDefinition>
}

const manifestData = manifest as unknown as StructureManifest

/**
 * Which edge of a tile a wall panel stands on.
 *
 * `north` is the -x edge, so the panel faces south (+x); `west` is the -y edge,
 * facing east (+y). These are the only two edges an isometric room can show,
 * which is why the wall panel renders exactly two frames.
 */
export type WallEdge = 'north' | 'west'

/** The rendered orientation each edge uses. */
const EDGE_DIRECTION: Record<WallEdge, string> = {
  north: 'south',
  west: 'east'
}

export const WALL_PANEL_ID = 'wall_panel'
export const WALL_CORNER_ID = 'wall_corner'
export const DOOR_ID = 'door'

/** Floor texture names, as rooms store them, mapped to generated tiles. */
const FLOOR_TEXTURES: Record<string, string> = {
  wood: 'floor_wood',
  stone: 'floor_stone',
  brick: 'floor_stone',
  carpet: 'floor_carpet',
  marble: 'floor_marble',
  grass: 'floor_carpet',
  sand: 'floor_marble',
  water: 'floor_marble',
  default: 'floor_wood'
}

function resolve(id: string, direction: string): StructureSprite | null {
  const definition = manifestData.structures[id]
  if (!definition) return null

  const sprite = definition.sprites[direction] ?? definition.sprites[definition.defaultDirection]
  if (!sprite) return null

  return { ...sprite, url: `${manifestData.basePath}/${id}/${sprite.file}` }
}

export function getFloorSprite(texture?: string): StructureSprite | null {
  const id = FLOOR_TEXTURES[texture ?? 'default'] ?? FLOOR_TEXTURES.default
  return resolve(id, 'south')
}

export function getWallSprite(edge: WallEdge): StructureSprite | null {
  return resolve(WALL_PANEL_ID, EDGE_DIRECTION[edge])
}

/** The doorway panel: the same wall, with an opening in it. */
export function getDoorSprite(edge: WallEdge): StructureSprite | null {
  return resolve(DOOR_ID, EDGE_DIRECTION[edge])
}

/**
 * Where a doorway's panel belongs, as a tile and an edge.
 *
 * Doorways are stored on the empty tile *outside* the room - the same scheme
 * walls used before they moved - so this converts to the tile-and-edge model
 * the wall sprites are anchored by.
 */
export function doorwayWall(
  doorway: { x: number; y: number; type: 'north-east' | 'north-west' } | undefined
): { x: number; y: number; edge: WallEdge } | null {
  if (!doorway) return null
  return doorway.type === 'north-east'
    ? { x: doorway.x, y: doorway.y + 1, edge: 'west' }
    : { x: doorway.x + 1, y: doorway.y, edge: 'north' }
}

/** The post filling the square where two perpendicular runs meet. */
export function getWallCornerSprite(): StructureSprite | null {
  return resolve(WALL_CORNER_ID, 'south')
}

/** Every structure sprite URL, for preloading. */
export function getAllStructureUrls(): string[] {
  return Object.entries(manifestData.structures).flatMap(([id, definition]) =>
    Object.values(definition.sprites).map(sprite => `${manifestData.basePath}/${id}/${sprite.file}`)
  )
}

/**
 * Floor textures worth offering, one per distinct generated tile.
 *
 * Several legacy texture names map to the same sprite - brick and stone both
 * resolve to floor_stone - so listing every name put visibly identical swatches
 * side by side and implied choices that do not exist.
 */
export function getFloorTextureNames(): string[] {
  const seen = new Set<string>()
  const names: string[] = []

  for (const [name, id] of Object.entries(FLOOR_TEXTURES)) {
    if (name === 'default' || seen.has(id)) continue
    seen.add(id)
    names.push(name)
  }

  return names
}
