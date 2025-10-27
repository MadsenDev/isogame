import { CoordinateUtils } from '../utils/CoordinateUtils'
import type { Player } from '../context/GameContext'

interface FurnitureType {
  name: string
  color: string
  size: number
  emoji: string
}

export interface Furniture {
  id: string
  x: number
  y: number
  type: string
}

export interface PreviewFurniture {
  x: number
  y: number
  type: string
}

export class FurnitureComponent {
  private ctx: CanvasRenderingContext2D
  private baseTileWidth: number
  private baseTileHeight: number
  private tileWidth: number
  private tileHeight: number
  private zoom = 1
  private coordinateUtils: CoordinateUtils

  constructor(ctx: CanvasRenderingContext2D, tileWidth: number, tileHeight: number, coordinateUtils: CoordinateUtils) {
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

  private getFurnitureType(type: string): FurnitureType | undefined {
    const types: Record<string, FurnitureType> = {
      chair: { name: 'Chair', color: '#8B4513', size: 0.6, emoji: '🪑' },
      table: { name: 'Table', color: '#654321', size: 1.0, emoji: '🪑' },
      bed: { name: 'Bed', color: '#FF69B4', size: 1.2, emoji: '🛏️' },
      sofa: { name: 'Sofa', color: '#8A2BE2', size: 1.0, emoji: '🛋️' },
      tv: { name: 'TV', color: '#000000', size: 0.8, emoji: '📺' }
    }
    return types[type]
  }

  public drawFurniture(furniture: Furniture) {
    const type = this.getFurnitureType(furniture.type)
    if (!type) return
    
    const screenPos = this.coordinateUtils.worldToScreen(furniture.x, furniture.y)
    const size = type.size
    
    this.ctx.save()
    this.ctx.translate(screenPos.x, screenPos.y)
    
    this.ctx.fillStyle = type.color
    this.ctx.beginPath()
    this.ctx.moveTo(0, -this.tileHeight * size / 2)
    this.ctx.lineTo(this.tileWidth * size / 2, 0)
    this.ctx.lineTo(0, this.tileHeight * size / 2)
    this.ctx.lineTo(-this.tileWidth * size / 2, 0)
    this.ctx.closePath()
    this.ctx.fill()
    
    const fontSize = Math.max(12, 20 * this.zoom)
    this.ctx.font = `${fontSize}px Arial`
    this.ctx.textAlign = 'center'
    this.ctx.fillStyle = '#000'
    this.ctx.fillText(type.emoji, 0, 5)
    
    this.ctx.restore()
  }

  public drawPreviewFurniture(previewFurniture: PreviewFurniture) {
    const type = this.getFurnitureType(previewFurniture.type)
    if (!type) return
    
    const screenPos = this.coordinateUtils.worldToScreen(previewFurniture.x, previewFurniture.y)
    const size = type.size
    
    this.ctx.save()
    this.ctx.translate(screenPos.x, screenPos.y)
    
    this.ctx.fillStyle = type.color
    this.ctx.beginPath()
    this.ctx.moveTo(0, -this.tileHeight * size / 2)
    this.ctx.lineTo(this.tileWidth * size / 2, 0)
    this.ctx.lineTo(0, this.tileHeight * size / 2)
    this.ctx.lineTo(-this.tileWidth * size / 2, 0)
    this.ctx.closePath()
    this.ctx.fill()
    
    const fontSize = Math.max(12, 20 * this.zoom)
    this.ctx.font = `${fontSize}px Arial`
    this.ctx.textAlign = 'center'
    this.ctx.fillStyle = '#000'
    this.ctx.fillText(type.emoji, 0, 5)
    
    this.ctx.restore()
  }

  public isValidFurniturePosition(
    x: number,
    y: number,
    roomWidth: number,
    roomHeight: number,
    furniture: Furniture[],
    players: Player[],
    floorTiles: Array<{ x: number; y: number }>
  ): boolean {
    // Check room bounds
    if (x < 0 || x >= roomWidth || y < 0 || y >= roomHeight) {
      return false
    }

    const hasFloorTile = floorTiles.some(tile => tile.x === x && tile.y === y)
    if (!hasFloorTile) {
      return false
    }

    // Check if position is already occupied by furniture
    if (furniture.some(f => f.x === x && f.y === y)) {
      return false
    }
    
    // Check if position is occupied by a player (only check grid-snapped positions)
    if (players.some(p => Math.round(p.x) === x && Math.round(p.y) === y)) {
      return false
    }
    
    return true
  }
}
