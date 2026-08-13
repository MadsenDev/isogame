/**
 * Rotating an asset's *data* alongside its geometry.
 *
 * Turning the model 90 degrees is easy. Keeping everything attached to it in
 * step - which tile a seat occupies, which way the sitter faces, where their
 * sprite lands in pixels - is the part that goes wrong by hand, so it lives
 * here and is derived rather than authored four times.
 *
 * A quarter turn about +Y maps a point (x, z) to (z, -x). Applied to the
 * footprint's tile grid, and renormalised so tile (0,0) stays the origin, that
 * becomes (tx, ty) -> (ty, width - 1 - tx).
 */

import * as THREE from 'three'
import { Vec3 } from './model'
import { Direction, directionVector } from './directions'

export { rotateDirection } from './directions'

export interface Footprint {
  width: number
  height: number
}

export interface Tile {
  x: number
  y: number
}

/** Footprint after `index` quarter turns: odd turns swap the axes. */
export function rotateFootprint(footprint: Footprint, index: number): Footprint {
  return index % 2 === 0
    ? { width: footprint.width, height: footprint.height }
    : { width: footprint.height, height: footprint.width }
}

/** Which tile of the rotated footprint a tile ends up in. */
export function rotateTile(tile: Tile, footprint: Footprint, index: number): Tile {
  let current = { ...tile }
  let shape = { ...footprint }

  for (let step = 0; step < ((index % 4) + 4) % 4; step++) {
    current = { x: current.y, y: shape.width - 1 - current.x }
    shape = rotateFootprint(shape, 1)
  }

  return current
}

/** A model-space point after `index` rotation steps about +Y. */
export function rotatePoint(point: Vec3, index: number, angle = Math.PI / 2): THREE.Vector3 {
  const vector = new THREE.Vector3(point[0], point[1], point[2])
  vector.applyAxisAngle(new THREE.Vector3(0, 1, 0), index * angle)
  return vector
}

/**
 * Whether a seated player draws over the furniture sprite or under it.
 *
 * What matters is where the furniture's body sits relative to the player, and
 * for anything you sit in - chair, sofa, bed - that is behind them, along the
 * reverse of their facing. IsoGame paints back-to-front by (x + y), so that
 * body is nearer the camera exactly when the player faces north or west, and
 * the player has to be drawn underneath it.
 *
 * Deliberately not a comparison against the model's centroid: on a two-seat
 * sofa that puts the two seats on different layers purely because one is
 * further left, which is wrong and visible.
 */
export function facingLayer(direction: Direction): 'front' | 'behind' {
  const facing = directionVector(direction)
  return facing.x + facing.z > 0 ? 'front' : 'behind'
}
