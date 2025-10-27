import { Furniture, FurnitureDefinition } from '../context/GameContext'
import { CoordinateUtils } from '../utils/CoordinateUtils'
import { getFurnitureDefinition } from '../data/furnitureDefinitions'

export interface PreviewFurniture {
  x: number
  y: number
  type: string
}

export class FurnitureComponent {
  private ctx: CanvasRenderingContext2D
  private tileWidth: number
  private tileHeight: number
  private coordinateUtils: CoordinateUtils
  private furnitureSprites: Map<string, HTMLImageElement> = new Map()

  constructor(ctx: CanvasRenderingContext2D, tileWidth: number, tileHeight: number, coordinateUtils: CoordinateUtils) {
    this.ctx = ctx
    this.tileWidth = tileWidth
    this.tileHeight = tileHeight
    this.coordinateUtils = coordinateUtils
  }

  public setZoom(zoom: number) {
    // Zoom is handled by coordinateUtils, no need to store it here
  }

  private loadFurnitureSprite(definition: FurnitureDefinition): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.furnitureSprites.has(definition.id)) {
        resolve()
        return
      }

      const img = new Image()
      img.src = definition.sprite
      img.onload = () => {
        this.furnitureSprites.set(definition.id, img)
        resolve()
      }
      img.onerror = () => {
        console.error(`Failed to load furniture sprite: ${definition.sprite}`)
        reject(new Error(`Failed to load furniture sprite: ${definition.sprite}`))
      }
    })
  }

  public async preloadFurnitureSprites(types: string[]): Promise<void> {
    const loadPromises = types.map(type => {
      const definition = getFurnitureDefinition(type)
      if (definition) {
        return this.loadFurnitureSprite(definition)
      }
      return Promise.resolve()
    })

    await Promise.all(loadPromises)
  }

  private getFurnitureDefinition(type: string): FurnitureDefinition | null {
    return getFurnitureDefinition(type)
  }

  public drawFurniture(furniture: Furniture) {
    const definition = furniture.definition
    if (!definition) return

    const sprite = this.furnitureSprites.get(definition.id)
    if (!sprite) {
      // Fallback to colored rectangle if sprite not loaded
      this.drawFurnitureFallback(furniture, definition)
      return
    }

    const screenPos = this.coordinateUtils.worldToScreen(furniture.x, furniture.y)
    
    this.ctx.save()
    this.ctx.translate(screenPos.x, screenPos.y)
    
    // Calculate sprite dimensions
    const spriteWidth = definition.width * this.tileWidth
    const spriteHeight = definition.height * this.tileHeight
    
    // Draw the furniture sprite
    this.ctx.drawImage(
      sprite,
      -spriteWidth / 2, // Center horizontally
      -spriteHeight / 2, // Center vertically
      spriteWidth,
      spriteHeight
    )
    
    this.ctx.restore()
  }

  private drawFurnitureFallback(furniture: Furniture, definition: FurnitureDefinition) {
    const screenPos = this.coordinateUtils.worldToScreen(furniture.x, furniture.y)
    
    this.ctx.save()
    this.ctx.translate(screenPos.x, screenPos.y)
    
    // Draw colored rectangle as fallback
    const width = definition.width * this.tileWidth
    const height = definition.height * this.tileHeight
    
    this.ctx.fillStyle = this.getFurnitureColor(definition.category)
    this.ctx.fillRect(-width / 2, -height / 2, width, height)
    
    // Add border
    this.ctx.strokeStyle = '#333'
    this.ctx.lineWidth = 2
    this.ctx.strokeRect(-width / 2, -height / 2, width, height)
    
    // Add furniture name
    this.ctx.fillStyle = '#000'
    this.ctx.font = '12px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(definition.name, 0, 0)
    
    this.ctx.restore()
  }

  private getFurnitureColor(category: FurnitureDefinition['category']): string {
    const colors = {
      'seating': '#8B4513',
      'decoration': '#90EE90',
      'functional': '#4682B4',
      'flooring': '#CD853F',
      'wall': '#A0522D'
    }
    return colors[category] || '#808080'
  }

  public drawPreviewFurniture(preview: PreviewFurniture) {
    const definition = this.getFurnitureDefinition(preview.type)
    if (!definition) return

    const screenPos = this.coordinateUtils.worldToScreen(preview.x, preview.y)
    
    this.ctx.save()
    this.ctx.translate(screenPos.x, screenPos.y)
    
    const sprite = this.furnitureSprites.get(definition.id)
    if (sprite) {
      const spriteWidth = definition.width * this.tileWidth
      const spriteHeight = definition.height * this.tileHeight
      
      this.ctx.drawImage(
        sprite,
        -spriteWidth / 2,
        -spriteHeight / 2,
        spriteWidth,
        spriteHeight
      )
    } else {
      // Fallback to colored rectangle
      const width = definition.width * this.tileWidth
      const height = definition.height * this.tileHeight
      
      this.ctx.fillStyle = this.getFurnitureColor(definition.category)
      this.ctx.fillRect(-width / 2, -height / 2, width, height)
      
      this.ctx.strokeStyle = '#333'
      this.ctx.lineWidth = 2
      this.ctx.strokeRect(-width / 2, -height / 2, width, height)
    }
    
    this.ctx.restore()
  }

  public isValidFurniturePosition(
    x: number, 
    y: number, 
    roomWidth: number, 
    roomHeight: number, 
    existingFurniture: Furniture[], 
    players: any[],
    floorTiles: Array<{ x: number; y: number }>,
    furnitureType: string
  ): boolean {
    const definition = this.getFurnitureDefinition(furnitureType)
    if (!definition) return false

    // Check if all required tiles are within room bounds
    for (let fx = 0; fx < definition.width; fx++) {
      for (let fy = 0; fy < definition.height; fy++) {
        const checkX = x + fx
        const checkY = y + fy
        
        if (checkX < 0 || checkX >= roomWidth || checkY < 0 || checkY >= roomHeight) {
          return false
        }
        
        // Check if there's a floor tile
        const hasFloorTile = floorTiles.some(tile => tile.x === checkX && tile.y === checkY)
        if (!hasFloorTile) {
          return false
        }
      }
    }

    // Check collision with existing furniture
    for (const furniture of existingFurniture) {
      if (this.furnitureCollides(furniture, x, y, definition)) {
        return false
      }
    }

    // Check collision with players
    for (const player of players) {
      const playerX = Math.round(player.x)
      const playerY = Math.round(player.y)
      
      if (playerX >= x && playerX < x + definition.width && 
          playerY >= y && playerY < y + definition.height) {
        return false
      }
    }

    return true
  }

  private furnitureCollides(furniture: Furniture, x: number, y: number, definition: FurnitureDefinition): boolean {
    const furnitureDef = furniture.definition
    
    // Check if furniture rectangles overlap
    return !(x + definition.width <= furniture.x || 
             furniture.x + furnitureDef.width <= x ||
             y + definition.height <= furniture.y ||
             furniture.y + furnitureDef.height <= y)
  }

  public getFurnitureInteractionPositions(furniture: Furniture, interactionType: string): Array<{ x: number; y: number; direction: string }> {
    const definition = furniture.definition
    const interaction = definition.interactions.find(i => i.type === interactionType)
    
    if (!interaction) return []
    
    return interaction.positions.map(pos => ({
      x: furniture.x + pos.x,
      y: furniture.y + pos.y,
      direction: pos.direction
    }))
  }

  public canPlayerInteractWithFurniture(furniture: Furniture, playerX: number, playerY: number, interactionType: string): boolean {
    const positions = this.getFurnitureInteractionPositions(furniture, interactionType)
    
    return positions.some(pos => 
      Math.abs(playerX - pos.x) < 0.5 && 
      Math.abs(playerY - pos.y) < 0.5
    )
  }
}