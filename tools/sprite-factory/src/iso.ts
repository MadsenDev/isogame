/**
 * Isometric camera geometry for the IsoGame sprite pipeline.
 *
 * Everything here is derived from a single fact: IsoGame draws a 1x1 floor tile
 * as a diamond that is TILE_WIDTH px across and TILE_HEIGHT px tall.
 *
 *   src/utils/CoordinateUtils.ts
 *     screenX = (worldX - worldY) * (tileWidth / 2)
 *     screenY = (worldX + worldY) * (tileHeight / 2)
 *
 * A 2:1 diamond means the camera looks down at exactly 30 degrees
 * (asin(32/64) = 30) with a 45 degree yaw. Renders produced with this rig drop
 * onto the game's floor grid without any per-asset fudging.
 *
 * Axis mapping between the two worlds:
 *
 *   game world x  ->  three.js +X   (projects down-right on screen)
 *   game world y  ->  three.js +Z   (projects down-left on screen)
 *   height        ->  three.js +Y   (projects straight up on screen)
 *
 * One world unit is one tile edge. Because the tile's *diagonal* is what
 * measures TILE_WIDTH px on screen, one unit is TILE_WIDTH / sqrt(2) px long.
 */

import * as THREE from 'three'

export const TILE_WIDTH = 64
export const TILE_HEIGHT = 32

/** Camera pitch. asin(32/64) = 30 degrees, the angle that yields 2:1 tiles. */
export const CAMERA_ELEVATION = Math.asin(TILE_HEIGHT / TILE_WIDTH)

/** Camera yaw, fixed at 45 degrees so both floor axes are symmetric. */
export const CAMERA_YAW = Math.PI / 4

/** Screen pixels per world unit. Uniform in both axes (orthographic). */
export const PIXELS_PER_UNIT = TILE_WIDTH / Math.SQRT2

/**
 * Room height in world units.
 *
 * IsoGame draws wall segments `tileHeight * 2` pixels tall, which works out to
 * exactly sqrt(2) units at this projection. Wall- and ceiling-mounted assets are
 * authored against this, so they keep meeting the walls if the wall *rendering*
 * is ever rebuilt - the number is the contract, not the drawing code.
 */
export const WALL_HEIGHT = (2 * TILE_HEIGHT) / PIXELS_PER_UNIT

/**
 * The two wall planes visible in an isometric room, as offsets from the centre
 * of the tile they back onto. Wall assets are authored against one of these.
 */
export const WALL_PLANE_OFFSET = 0.5

const SIN_E = Math.sin(CAMERA_ELEVATION)
const COS_E = Math.cos(CAMERA_ELEVATION)

/** Unit vector pointing from the scene toward the camera. */
export const CAMERA_DIRECTION = new THREE.Vector3(
  (COS_E * Math.SQRT1_2),
  SIN_E,
  (COS_E * Math.SQRT1_2)
)

/** Camera-space right axis in world coordinates (screen +x). */
export const SCREEN_RIGHT = new THREE.Vector3(Math.SQRT1_2, 0, -Math.SQRT1_2)

/** Camera-space up axis in world coordinates (screen -y). */
export const SCREEN_UP = new THREE.Vector3(
  -SIN_E * Math.SQRT1_2,
  COS_E,
  -SIN_E * Math.SQRT1_2
)

export interface PixelPoint {
  x: number
  y: number
}

/**
 * Project a world point to pixel offsets relative to `origin`, using the same
 * orientation the renderer uses. +x is right, +y is down (canvas convention).
 */
export function projectToPixels(
  point: THREE.Vector3,
  origin: THREE.Vector3,
  pixelsPerUnit = PIXELS_PER_UNIT
): PixelPoint {
  const d = point.clone().sub(origin)
  return {
    x: d.dot(SCREEN_RIGHT) * pixelsPerUnit,
    y: -d.dot(SCREEN_UP) * pixelsPerUnit,
  }
}

/**
 * Build the orthographic camera used for every render.
 *
 * The frustum is symmetric around `target`, which means `target` always
 * projects to the exact centre of the output image. That is what makes the
 * sprite anchor an exact integer instead of something we have to round.
 */
export function createIsoCamera(
  target: THREE.Vector3,
  widthPx: number,
  heightPx: number,
  pixelsPerUnit = PIXELS_PER_UNIT
): THREE.OrthographicCamera {
  const halfW = widthPx / 2 / pixelsPerUnit
  const halfH = heightPx / 2 / pixelsPerUnit
  const distance = Math.max(widthPx, heightPx) / pixelsPerUnit + 32

  const camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.01, distance * 4)
  camera.position.copy(target).addScaledVector(CAMERA_DIRECTION, distance)
  camera.up.set(0, 1, 0)
  camera.lookAt(target)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
  return camera
}

/**
 * World-space centre of footprint tile (0, 0) for an object whose model is
 * authored centred on its own footprint.
 *
 * IsoGame positions furniture by its origin tile, so this is the point a sprite
 * must be anchored to.
 */
export function originTileCentre(footprintWidth: number, footprintHeight: number): THREE.Vector3 {
  return new THREE.Vector3(-(footprintWidth - 1) / 2, 0, -(footprintHeight - 1) / 2)
}
