import { CoordinateUtils } from '../utils/CoordinateUtils'

export interface Wall {
  x: number
  y: number
  type: 'north-east' | 'north-west'
}

export class WallComponent {
  private ctx: CanvasRenderingContext2D
  private baseTileWidth: number
  private baseTileHeight: number
  private tileWidth: number
  private tileHeight: number
  private zoom = 1
  private coordinateUtils: CoordinateUtils

  // Outward shift in grid cells (kept as 2 per your setup)
  private wallBorderOffset = 2

  constructor(
    ctx: CanvasRenderingContext2D,
    tileWidth: number,
    tileHeight: number,
    coordinateUtils: CoordinateUtils
  ) {
    this.ctx = ctx
    this.baseTileWidth = tileWidth
    this.baseTileHeight = tileHeight
    this.tileWidth = tileWidth
    this.tileHeight = tileHeight
    this.coordinateUtils = coordinateUtils
  }

  public setZoom(zoom: number) {
    this.zoom = zoom
    this.tileWidth = this.baseTileWidth * zoom
    this.tileHeight = this.baseTileHeight * zoom
  }

  /** Draw dynamic wall segments that follow the current floor layout */
  public drawRoomWalls(
    walls: Wall[],
    doorway?: { x: number; y: number; type: 'north-east' | 'north-west' }
  ) {
    const neWalls = walls
      .filter(wall => wall.type === 'north-east')
      .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y))
    const nwWalls = walls
      .filter(wall => wall.type === 'north-west')
      .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x))

    neWalls.forEach(wall => {
      if (doorway?.type === 'north-east' && doorway.x === wall.x && doorway.y === wall.y) {
        return
      }
      this.drawNorthEastSegment(wall.x, wall.y)
    })

    nwWalls.forEach(wall => {
      if (doorway?.type === 'north-west' && doorway.x === wall.x && doorway.y === wall.y) {
        return
      }
      this.drawNorthWestSegment(wall.x, wall.y)
    })

    if (doorway) {
      this.drawDoorway(doorway.x, doorway.y, doorway.type)
    }
  }

  private drawNorthEastSegment(x: number, y: number) {
    const wallHeight = this.tileHeight * 2
    const faceColor = '#A0522D'
    const shade = this.darkenColor(faceColor, 0.18)
    const edgeColor = this.darkenColor(faceColor, 0.4)
    const offset = this.wallBorderOffset

    const topLeft = this.coordinateUtils.worldToScreen(x - 0.5 - offset, y + 0.5 - offset)
    const topRight = this.coordinateUtils.worldToScreen(x + 0.5 - offset, y + 0.5 - offset)
    const bottomLeft = { x: topLeft.x, y: topLeft.y + wallHeight }
    const bottomRight = { x: topRight.x, y: topRight.y + wallHeight }

    this.ctx.beginPath()
    this.ctx.moveTo(topLeft.x, topLeft.y)
    this.ctx.lineTo(topRight.x, topRight.y)
    this.ctx.lineTo(bottomRight.x, bottomRight.y)
    this.ctx.lineTo(bottomLeft.x, bottomLeft.y)
    this.ctx.closePath()
    this.ctx.fillStyle = shade
    this.ctx.fill()

    this.ctx.strokeStyle = edgeColor
    this.ctx.lineWidth = Math.max(2, 2 * this.zoom)
    this.ctx.beginPath()
    this.ctx.moveTo(topLeft.x, topLeft.y)
    this.ctx.lineTo(topRight.x, topRight.y)
    this.ctx.stroke()
  }

  private drawNorthWestSegment(x: number, y: number) {
    const wallHeight = this.tileHeight * 2
    const faceColor = '#CD853F'
    const shade = this.darkenColor(faceColor, 0.25)
    const edgeColor = this.darkenColor(faceColor, 0.4)
    const offset = this.wallBorderOffset

    const top = this.coordinateUtils.worldToScreen(x + 0.5 - offset, y - 0.5 - offset)
    const bottom = this.coordinateUtils.worldToScreen(x + 0.5 - offset, y + 0.5 - offset)
    const lowerTop = { x: top.x, y: top.y + wallHeight }
    const lowerBottom = { x: bottom.x, y: bottom.y + wallHeight }

    this.ctx.beginPath()
    this.ctx.moveTo(top.x, top.y)
    this.ctx.lineTo(bottom.x, bottom.y)
    this.ctx.lineTo(lowerBottom.x, lowerBottom.y)
    this.ctx.lineTo(lowerTop.x, lowerTop.y)
    this.ctx.closePath()
    this.ctx.fillStyle = shade
    this.ctx.fill()

    this.ctx.strokeStyle = edgeColor
    this.ctx.lineWidth = Math.max(2, 2 * this.zoom)
    this.ctx.beginPath()
    this.ctx.moveTo(top.x, top.y)
    this.ctx.lineTo(bottom.x, bottom.y)
    this.ctx.stroke()
  }

private drawDoorway(x: number, y: number, type: 'north-east' | 'north-west') {
  const offset = this.wallBorderOffset
  let screenPos

  if (type === 'north-east') {
    screenPos = this.coordinateUtils.worldToScreen(x - offset, y + 0.5 - offset)
  } else {
    screenPos = this.coordinateUtils.worldToScreen(x + 0.5 - offset, y - offset)
  }
  const w = this.tileWidth
  const h = this.tileHeight

  this.ctx.save()
  this.ctx.translate(screenPos.x, screenPos.y)

  // Clear the wall section first so the doorway looks like an opening
  this.ctx.save()
  this.ctx.globalCompositeOperation = 'destination-out'
  this.ctx.fillStyle = 'rgba(0, 0, 0, 1)'
  this.ctx.beginPath()
  this.ctx.moveTo(0, -h / 2)
  this.ctx.lineTo(w / 2, 0)
  this.ctx.lineTo(0, h / 2)
  this.ctx.lineTo(-w / 2, 0)
  this.ctx.closePath()
  this.ctx.fill()
  this.ctx.restore()

  // Draw doorway as a darker opening
  this.ctx.fillStyle = '#2F2F2F'
  this.ctx.beginPath()
  this.ctx.moveTo(0, -h / 2)
  this.ctx.lineTo(w / 2, 0)
  this.ctx.lineTo(0, h / 2)
  this.ctx.lineTo(-w / 2, 0)
  this.ctx.closePath()
  this.ctx.fill()

  // Add doorway frame (slightly lighter on the west wall)
  this.ctx.strokeStyle = type === 'north-west' ? '#A0522D' : '#8B4513'
  this.ctx.lineWidth = Math.max(2, 3 * this.zoom)
  this.ctx.stroke()

  this.ctx.restore()
}

  // ----------------------------------------------------------------------

  public generateRoomWalls(roomWidth: number, roomHeight: number): Wall[] {
    const walls: Wall[] = []
    for (let x = 0; x < roomWidth; x++) walls.push({ x, y: 0, type: 'north-east' })
    for (let y = 0; y < roomHeight; y++) walls.push({ x: 0, y, type: 'north-west' })
    return walls
  }

  private darkenColor(color: string, amount: number): string {
    const hex = color.replace('#', '')
    const r = Math.max(0, parseInt(hex.slice(0, 2), 16) - amount * 255)
    const g = Math.max(0, parseInt(hex.slice(2, 4), 16) - amount * 255)
    const b = Math.max(0, parseInt(hex.slice(4, 6), 16) - amount * 255)
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`
  }

  public isValidWallPosition(x: number, y: number, roomWidth: number, roomHeight: number): boolean {
    const isNE = (y === 0 && x >= 0 && x < roomWidth)
    const isNW = (x === 0 && y >= 0 && y < roomHeight)
    return isNE || isNW
  }
}