import { CoordinateUtils } from '../utils/CoordinateUtils'
import {
  getDoorSprite,
  getWallCornerSprite,
  getWallSprite,
  getWindowSprite,
  WallEdge
} from '../data/structureSprites'

export interface Wall {
  x: number
  y: number
  /** Which edge of the tile the panel stands on. */
  edge: WallEdge
}

/**
 * Draws generated wall panels.
 *
 * This used to build wall quads by hand: two near-duplicate code paths for the
 * two orientations, their own colour constants and light direction, a
 * `wallBorderOffset = 2` that shifted every segment two tiles diagonally, and
 * `seamOverlap` fudges to hide the gaps that produced.
 *
 * Now a wall segment is a sprite from the Sprite Factory, anchored to the tile
 * it encloses exactly like a piece of furniture. Segments tile seamlessly
 * because each is identical geometry offset by one tile, and one tile is an
 * integer pixel offset. Corners close because the panel's thickness sits
 * outside the tile boundary, so the two faces meet at a single point.
 */
export class WallComponent {
  private ctx: CanvasRenderingContext2D
  private coordinateUtils: CoordinateUtils
  private sprites: Map<string, HTMLImageElement> = new Map()
  private pending: Set<string> = new Set()
  private zoom = 1

  constructor(
    ctx: CanvasRenderingContext2D,
    _tileWidth: number,
    _tileHeight: number,
    coordinateUtils: CoordinateUtils
  ) {
    this.ctx = ctx
    this.coordinateUtils = coordinateUtils
  }

  public setZoom(zoom: number) {
    this.zoom = zoom
  }

  private load(url: string) {
    if (this.sprites.has(url) || this.pending.has(url)) return
    this.pending.add(url)

    const img = new Image()
    img.src = url
    img.onload = () => {
      this.pending.delete(url)
      this.sprites.set(url, img)
    }
    img.onerror = () => {
      this.pending.delete(url)
      console.error(`Failed to load wall sprite: ${url}`)
    }
  }

  /** Draw the window panel in place of a plain wall segment. */
  public drawWindow(x: number, y: number, edge: WallEdge) {
    this.drawSprite(getWindowSprite(edge), x, y)
  }

  /** Draw the doorway panel where a wall run is broken by a door. */
  public drawDoor(x: number, y: number, edge: WallEdge) {
    this.drawSprite(getDoorSprite(edge), x, y)
  }

  /** Draw the post that closes an inside corner. */
  public drawCorner(x: number, y: number) {
    this.drawSprite(getWallCornerSprite(), x, y)
  }

  /**
   * Draw one wall segment.
   *
   * Called from the engine's depth-sorted pass rather than in a pass of its
   * own, so a player standing behind an interior wall is drawn behind it.
   */
  public drawWall(wall: Wall) {
    this.drawSprite(getWallSprite(wall.edge), wall.x, wall.y)
  }

  private drawSprite(sprite: ReturnType<typeof getWallSprite>, x: number, y: number) {
    if (!sprite) return

    const image = this.sprites.get(sprite.url)
    if (!image) {
      this.load(sprite.url)
      return
    }

    const screenPos = this.coordinateUtils.worldToScreen(x, y)
    const smoothing = this.ctx.imageSmoothingEnabled

    this.ctx.imageSmoothingEnabled = false
    this.ctx.drawImage(
      image,
      Math.round(screenPos.x - sprite.anchorX * this.zoom),
      Math.round(screenPos.y - sprite.anchorY * this.zoom),
      Math.round(sprite.width * this.zoom),
      Math.round(sprite.height * this.zoom)
    )
    this.ctx.imageSmoothingEnabled = smoothing
  }
}
