/**
 * Compass directions, shared by furniture and characters.
 *
 * Names are **world-axis** based, and they compose:
 *
 *   +X          south        projects down-right
 *   +Z          east         projects down-left
 *   +X +Z       south-east   projects straight down
 *   -X          north        projects up-left
 *
 * Furniture uses the four axis-aligned names, characters all eight. Because a
 * quarter turn about +Y is two steps around the eight-cycle, one rotation
 * helper serves both.
 *
 * Note this is *not* the convention the pre-generated character art used, where
 * "south" meant straight down the screen. Keeping two conventions in one
 * isometric game is how a chair ends up seating someone at 45 degrees to it.
 */

/** Order that 45-degree rotations about +Y visit, starting from +X. */
export const DIRECTIONS_8 = [
  'south',
  'south-west',
  'west',
  'north-west',
  'north',
  'north-east',
  'east',
  'south-east',
] as const

export type Direction = (typeof DIRECTIONS_8)[number]

/** The axis-aligned subset, in quarter-turn order. */
export const DIRECTIONS_4: Direction[] = ['south', 'west', 'north', 'east']

export type DirectionCount = 4 | 8

export function directionsFor(count: DirectionCount): readonly Direction[] {
  return count === 8 ? DIRECTIONS_8 : DIRECTIONS_4
}

/** How many eighth-turns one rotation step is worth. */
export function strideFor(count: DirectionCount): number {
  return DIRECTIONS_8.length / count
}

/** Radians per rotation step. */
export function angleFor(count: DirectionCount): number {
  return (2 * Math.PI) / count
}

/** Which way `direction` points after `steps` rotations at this granularity. */
export function rotateDirection(
  direction: Direction,
  steps: number,
  count: DirectionCount = 4
): Direction {
  const from = DIRECTIONS_8.indexOf(direction)
  const offset = steps * strideFor(count)
  const total = DIRECTIONS_8.length
  return DIRECTIONS_8[(((from + offset) % total) + total) % total]
}

/** Unit vector in world XZ that a direction points along. */
export function directionVector(direction: Direction): { x: number; z: number } {
  const angle = (DIRECTIONS_8.indexOf(direction) * Math.PI) / 4
  // Rotating +X about +Y sends it toward -Z, matching the cycle above.
  return { x: Math.cos(angle), z: -Math.sin(angle) }
}
