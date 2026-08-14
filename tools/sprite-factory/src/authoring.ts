/**
 * Authoring helpers for the furniture catalogue.
 *
 * The catalogue's honest problem at ten pieces was that most of each entry was
 * not the piece. Every one restated the same eight-line behaviour block, the
 * same interaction shape, and four near-identical legs - so the interesting
 * three lines were buried, and a mistake in the boilerplate was invisible
 * because it looked exactly like the boilerplate next to it.
 *
 * None of this adds expressive power. It removes repetition, so that what is
 * written down about a piece is the part that differs from every other piece.
 */

import { BehaviourSpec, Direction, FurnitureCategory, InteractionSpec, PrimitiveSpec, Vec3 } from './model'

interface BehaviourOptions {
  /** Overrides the preset's category, which is what the UI filters on. */
  category?: FurnitureCategory
  /** Height in tiles, as the game's collision model counts it. */
  height?: number
  walkable?: boolean
  stackable?: boolean
  rotatable?: boolean
  blocksMovement?: boolean
  blocksVision?: boolean
  shape?: 'rectangle' | 'circle'
}

function make(
  category: FurnitureCategory,
  defaults: BehaviourOptions,
  options: BehaviourOptions
): BehaviourSpec {
  const merged = { ...defaults, ...options }
  const blocksMovement = merged.blocksMovement ?? !(merged.walkable ?? false)

  return {
    category: merged.category ?? category,
    walkable: merged.walkable ?? false,
    stackable: merged.stackable ?? false,
    rotatable: merged.rotatable ?? true,
    collision: {
      blocksMovement,
      blocksVision: merged.blocksVision ?? false,
      height: merged.height ?? 1,
      shape: merged.shape ?? 'rectangle',
    },
  }
}

/**
 * The kinds of thing a piece can be.
 *
 * Named for what the piece *is* rather than for the fields it sets, because the
 * fields follow from that: a rug is walkable and collides with nothing because
 * it is a rug, not because someone remembered to write `walkable: true`.
 */
export const behaviour = {
  /** Chairs, sofas, beds. Blocks its tile, one tile tall. */
  seating: (options: BehaviourOptions = {}) => make('seating', {}, options),
  /** Tables and desks: things you can put something else on. */
  surface: (options: BehaviourOptions = {}) => make('functional', { stackable: true }, options),
  /** Shelving and cabinets: tall enough to hide what is behind them. */
  storage: (options: BehaviourOptions = {}) =>
    make('functional', { height: 2, blocksVision: true }, options),
  /** Plants, ornaments, anything with no purpose but being looked at. */
  decor: (options: BehaviourOptions = {}) => make('decoration', {}, options),
  /** Lamps and appliances. */
  device: (options: BehaviourOptions = {}) => make('functional', {}, options),
  /** Rugs: on the floor, walked over, collide with nothing. */
  decal: (options: BehaviourOptions = {}) =>
    make('flooring', { walkable: true, stackable: true, height: 0 }, options),
  /**
   * Wall- and ceiling-mounted. Nothing hanging on a wall blocks the floor
   * beneath it, and it cannot be rotated freely - the wall decides.
   */
  mounted: (options: BehaviourOptions = {}) =>
    make('wall', { walkable: true, rotatable: false, height: 0 }, options),
}

/** A spot, in the shorthand the catalogue uses. */
export interface SpotShorthand {
  /** Footprint tile, as [x, y]. */
  tile: [number, number]
  /** Where the player's sprite origin belongs, in model space. */
  point: Vec3
  facing: Direction
  layer?: 'front' | 'behind'
}

function spots(list: SpotShorthand[]) {
  return list.map(spot => ({
    tile: { x: spot.tile[0], y: spot.tile[1] },
    point: spot.point,
    facing: spot.facing,
    layer: spot.layer,
  }))
}

export function sit(list: SpotShorthand[]): InteractionSpec {
  return { type: 'sit', animation: 'sit', spots: spots(list) }
}

export function lay(list: SpotShorthand[]): InteractionSpec {
  return { type: 'lay', animation: 'lay', spots: spots(list) }
}

export function sleep(list: SpotShorthand[], durationMs = 30000): InteractionSpec {
  return { type: 'sleep', animation: 'sleep', durationMs, spots: spots(list) }
}

export function dance(list: SpotShorthand[], durationMs = 10000): InteractionSpec {
  return { type: 'dance', animation: 'dance', durationMs, spots: spots(list) }
}

export function usedFrom(list: SpotShorthand[], durationMs = 3000): InteractionSpec {
  return { type: 'use', animation: 'use', durationMs, spots: spots(list) }
}

/**
 * "Stand on my tile and use me" - the lamp/bookshelf case.
 *
 * The attachment point is the model origin at floor level, because the player
 * does not move: they are already standing where they need to be.
 */
export function usedInPlace(durationMs = 3000): InteractionSpec {
  return usedFrom([{ tile: [0, 0], point: [0, 0, 0], facing: 'south' }], durationMs)
}

/** The four standing spots around a `width` x `height` piece, facing inward. */
export function standAround(width: number, height: number, durationMs = 5000): InteractionSpec {
  const list: SpotShorthand[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Only the tiles on the near and far edges; a player cannot stand in the
      // middle of a table.
      if (y !== 0 && y !== height - 1) continue
      list.push({
        tile: [x, y],
        point: [x - (width - 1) / 2, 0, y - (height - 1) / 2],
        facing: y === 0 ? 'south' : 'north',
      })
    }
  }
  return usedFrom(list, durationMs)
}

interface LegOptions {
  /** Cross-section, then height. */
  thickness: number
  height: number
  /** Distance from the centre to each leg, in X and Z. */
  dx: number
  dz: number
  material: string
  /** Floor level, if the legs do not start at y = 0. */
  base?: number
}

/** Four legs at the corners. Written out by hand this is a quarter of a piece. */
export function legs(options: LegOptions): PrimitiveSpec[] {
  const base = options.base ?? 0
  const y = base + options.height / 2

  return [
    [options.dx, options.dz],
    [options.dx, -options.dz],
    [-options.dx, options.dz],
    [-options.dx, -options.dz],
  ].map(([x, z]): PrimitiveSpec => ({
    type: 'box',
    size: [options.thickness, options.height, options.thickness],
    position: [x, y, z],
    material: options.material,
  }))
}

/**
 * A part and its mirror across the model's centre line.
 *
 * Sofa arms, bed posts, cabinet doors: anything where writing the second copy by
 * hand is an invitation to typo one coordinate and never notice.
 */
export function mirrorZ(part: PrimitiveSpec): PrimitiveSpec[] {
  const [x, y, z] = part.position ?? [0, 0, 0]
  return [part, { ...part, position: [x, y, -z] }]
}

export function mirrorX(part: PrimitiveSpec): PrimitiveSpec[] {
  const [x, y, z] = part.position ?? [0, 0, 0]
  return [part, { ...part, position: [-x, y, z] }]
}

/**
 * A stack of evenly spaced copies - drawers, shelves, slats.
 *
 * `from` and `to` are the centres of the first and last copy, so the caller
 * thinks in terms of where things are rather than in terms of a step size they
 * have to divide out themselves.
 */
export function repeatY(part: PrimitiveSpec, count: number, from: number, to: number): PrimitiveSpec[] {
  const [x, , z] = part.position ?? [0, 0, 0]
  return Array.from({ length: count }, (_, index): PrimitiveSpec => ({
    ...part,
    position: [x, count === 1 ? from : from + ((to - from) * index) / (count - 1), z],
  }))
}
