import { CoordinateUtils } from '../utils/CoordinateUtils'

export interface Wall {
  x: number
  y: number
  type: 'north-east' | 'north-west'
}

export class WallComponent {
  private ctx: CanvasRenderingContext2D
  private tileWidth: number
  private tileHeight: number
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
    this.tileWidth = tileWidth
    this.tileHeight = tileHeight
    this.coordinateUtils = coordinateUtils
  }

  /** Draw both top walls as continuous strips (no per-tile gaps) */
public drawRoomWalls(roomWidth: number, roomHeight: number, doorway?: { x: number; y: number; type: 'north-east' | 'north-west' }) {
  const w = this.tileWidth
  const h = this.tileHeight
  const wallHeight = h * 2
  const eps = 0.5

  const topCorner = (x: number, y: number) => {
    const c = this.coordinateUtils.worldToScreen(x, y)
    return { x: c.x, y: c.y - h / 2 - eps }
  }
  const rightCorner = (x: number, y: number) => {
    const c = this.coordinateUtils.worldToScreen(x, y)
    return { x: c.x + w / 2 - eps, y: c.y }
  }
  const leftCorner = (x: number, y: number) => {
    const c = this.coordinateUtils.worldToScreen(x, y)
    return { x: c.x - w / 2 + eps, y: c.y }
  }
  const down = (p: { x: number; y: number }) => ({ x: p.x, y: p.y + wallHeight })

  const k = this.wallBorderOffset

  // ---------- NORTH-EAST WALL (top border y = -k) ----------
  {
    const faceColor = '#A0522D'
    const shade = this.darkenColor(faceColor, 0.18)
    const edgeColor = this.darkenColor(faceColor, 0.4)

    const topPath: { x: number; y: number }[] = []
    topPath.push(topCorner(-k, -k)) // shared peak

    // startX=-k, endX=roomWidth-1-k keeps (x - y) aligned with floor's east tip
    const startX = -k
    const endX = roomWidth - 1 - k
    
    // Check if doorway is on north-east wall
    const doorwayOnNE = doorway?.type === 'north-east' && doorway.y === -k
    
    for (let x = startX; x <= endX; x++) {
      // Skip the doorway position
      if (doorwayOnNE && x === doorway.x) {
        // Draw doorway opening
        this.drawDoorway(x, -k, 'north-east')
        continue
      }
      topPath.push(rightCorner(x, -k))
    }

    const bottomPath = [...topPath].reverse().map(down)

    this.ctx.beginPath()
    this.ctx.moveTo(topPath[0].x, topPath[0].y)
    for (let i = 1; i < topPath.length; i++) this.ctx.lineTo(topPath[i].x, topPath[i].y)
    for (let i = 0; i < bottomPath.length; i++) this.ctx.lineTo(bottomPath[i].x, bottomPath[i].y)
    this.ctx.closePath()
    this.ctx.fillStyle = shade
    this.ctx.fill()

    this.ctx.strokeStyle = edgeColor
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.moveTo(topPath[0].x, topPath[0].y)
    for (let i = 1; i < topPath.length; i++) this.ctx.lineTo(topPath[i].x, topPath[i].y)
    this.ctx.stroke()
  }

  // ---------- NORTH-WEST WALL (left border x = -k) ----------
  {
    const faceColor = '#CD853F'
    const shade = this.darkenColor(faceColor, 0.25)
    const edgeColor = this.darkenColor(faceColor, 0.4)

    const topPath: { x: number; y: number }[] = []
    topPath.push(topCorner(-k, -k)) // shared peak

    // startY=-k, endY=roomHeight-1-k keeps (x + y) aligned with floor's west tip
    const startY = -k
    const endY = roomHeight - 1 - k
    
    // Check if doorway is on north-west wall
    const doorwayOnNW = doorway?.type === 'north-west' && doorway.x === -k
    
    for (let y = startY; y <= endY; y++) {
      // Skip the doorway position
      if (doorwayOnNW && y === doorway.y) {
        // Draw doorway opening
        this.drawDoorway(-k, y, 'north-west')
        continue
      }
      topPath.push(leftCorner(-k, y))
    }

    const bottomPath = [...topPath].reverse().map(down)

    this.ctx.beginPath()
    this.ctx.moveTo(topPath[0].x, topPath[0].y)
    for (let i = 1; i < topPath.length; i++) this.ctx.lineTo(topPath[i].x, topPath[i].y)
    for (let i = 0; i < bottomPath.length; i++) this.ctx.lineTo(bottomPath[i].x, bottomPath[i].y)
    this.ctx.closePath()
    this.ctx.fillStyle = shade
    this.ctx.fill()

    this.ctx.strokeStyle = edgeColor
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.moveTo(topPath[0].x, topPath[0].y)
    for (let i = 1; i < topPath.length; i++) this.ctx.lineTo(topPath[i].x, topPath[i].y)
    this.ctx.stroke()
  }
}

private drawDoorway(x: number, y: number, type: 'north-east' | 'north-west') {
  const screenPos = this.coordinateUtils.worldToScreen(x, y)
  const w = this.tileWidth
  const h = this.tileHeight
  
  this.ctx.save()
  this.ctx.translate(screenPos.x, screenPos.y)
  
  // Draw doorway as a darker opening
  this.ctx.fillStyle = '#2F2F2F' // Dark gray for doorway
  this.ctx.beginPath()
  this.ctx.moveTo(0, -h / 2)           // Top center
  this.ctx.lineTo(w / 2, 0)            // Right center
  this.ctx.lineTo(0, h / 2)            // Bottom center
  this.ctx.lineTo(-w / 2, 0)           // Left center
  this.ctx.closePath()
  this.ctx.fill()
  
  // Add doorway frame
  this.ctx.strokeStyle = '#8B4513' // Brown frame
  this.ctx.lineWidth = 3
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

  public drawWall(_wall: Wall) {
    // not used in continuous mode
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