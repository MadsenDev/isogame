export class TileComponent {
  private ctx: CanvasRenderingContext2D
  private tilesheet: HTMLImageElement | null = null
  private gridSize: number
  private tileWidth: number
  private tileHeight: number

  constructor(ctx: CanvasRenderingContext2D, gridSize: number) {
    this.ctx = ctx
    this.gridSize = gridSize
    this.tileWidth = this.gridSize * 2
    this.tileHeight = this.gridSize
    this.loadTilesheet()
  }

  private loadTilesheet() {
    this.tilesheet = new Image()
    this.tilesheet.src = '/src/assets/tileset.jpg'
    this.tilesheet.onload = () => {
      console.log('Tileset loaded successfully')
    }
    this.tilesheet.onerror = () => {
      console.error('Failed to load tileset')
    }
  }

  private getTextureCoordinates(texture: string): { row: number; col: number } {
    // Map texture names to tileset coordinates
    // Tileset is 8x8 grid, each tile is 32x32
    const textureMap: Record<string, { row: number; col: number }> = {
      'grass': { row: 1, col: 1 },
      'stone': { row: 1, col: 2 },
      'wood': { row: 1, col: 3 },
      'marble': { row: 1, col: 4 },
      'carpet': { row: 1, col: 5 },
      'brick': { row: 1, col: 6 },
      'sand': { row: 1, col: 7 },
      'water': { row: 1, col: 8 },
      'default': { row: 1, col: 3 } // Default to wood
    }
    
    return textureMap[texture] || textureMap['default']
  }

  public drawIsometricTile(_x: number, _y: number, color: string, size: number = 1, textureRow: number = 1, textureCol: number = 3, screenPos: { x: number; y: number }, texture?: string) {
    const width = this.tileWidth * size
    const height = this.tileHeight * size
    
    this.ctx.save()
    this.ctx.translate(screenPos.x, screenPos.y)
    
    // Determine texture coordinates based on texture name
    let finalTextureRow = textureRow
    let finalTextureCol = textureCol
    
    if (texture) {
      const textureCoords = this.getTextureCoordinates(texture)
      finalTextureRow = textureCoords.row
      finalTextureCol = textureCoords.col
    }
    
    // Try to draw texture first, fallback to solid color
    if (this.tilesheet && this.tilesheet.complete) {
      this.drawTexturedIsometricTile(width, height, finalTextureRow, finalTextureCol)
    } else {
      // Fallback to solid color
      this.ctx.fillStyle = color
      this.ctx.beginPath()
      this.ctx.moveTo(0, -height / 2)
      this.ctx.lineTo(width / 2, 0)
      this.ctx.lineTo(0, height / 2)
      this.ctx.lineTo(-width / 2, 0)
      this.ctx.closePath()
      this.ctx.fill()
    }
    
    this.ctx.strokeStyle = '#333'
    this.ctx.lineWidth = 1
    this.ctx.stroke()

    this.ctx.restore()
  }

  private drawTexturedIsometricTile(width: number, height: number, textureRow: number, textureCol: number) {
    if (!this.tilesheet) return
    
    // Tileset is 256x256, 8x8 tiles, so each tile is 32x32
    const tileSize = 32
    const sourceX = (textureCol - 1) * tileSize // Convert to 0-based index
    const sourceY = (textureRow - 1) * tileSize // Convert to 0-based index
    
    // Simple approach: draw the square texture and let the diamond shape clip it naturally
    this.ctx.save()
    
    // Create clipping path for isometric diamond shape
    this.ctx.beginPath()
    this.ctx.moveTo(0, -height / 2)
    this.ctx.lineTo(width / 2, 0)
    this.ctx.lineTo(0, height / 2)
    this.ctx.lineTo(-width / 2, 0)
    this.ctx.closePath()
    this.ctx.clip()
    
    // Draw the square texture - stretch it vertically to fill the full diamond height
    // The issue is that the texture needs to be stretched more vertically to fill the diamond
    const stretchFactor = height / tileSize // How much to stretch vertically
    const stretchedHeight = tileSize * stretchFactor
    
    this.ctx.drawImage(
      this.tilesheet,
      sourceX, sourceY, tileSize, tileSize, // Source rectangle (32x32)
      -width / 2, -height / 2, width, stretchedHeight // Destination rectangle - stretch vertically to fill diamond
    )
    
    this.ctx.restore()
  }

  public drawHoverGrid(_x: number, _y: number, screenPos: { x: number; y: number }, isValid: boolean) {
    this.ctx.save()
    this.ctx.translate(screenPos.x, screenPos.y)
    
    const color = isValid ? '#00FF00' : '#FF0000'
    
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = 2
    this.ctx.setLineDash([3, 3])
    this.ctx.beginPath()
    this.ctx.moveTo(0, -this.tileHeight / 2)
    this.ctx.lineTo(this.tileWidth / 2, 0)
    this.ctx.lineTo(0, this.tileHeight / 2)
    this.ctx.lineTo(-this.tileWidth / 2, 0)
    this.ctx.closePath()
    this.ctx.stroke()
    
    this.ctx.restore()
  }

  public drawPathPreview(path: Array<{ x: number; y: number }>, worldToScreen: (x: number, y: number) => { x: number; y: number }) {
    if (path.length < 2) return
    
    this.ctx.save()
    this.ctx.strokeStyle = '#00AAFF'
    this.ctx.lineWidth = 3
    this.ctx.setLineDash([5, 5])
    
    for (let i = 0; i < path.length - 1; i++) {
      const start = worldToScreen(path[i].x, path[i].y)
      const end = worldToScreen(path[i + 1].x, path[i + 1].y)
      
      this.ctx.beginPath()
      this.ctx.moveTo(start.x, start.y)
      this.ctx.lineTo(end.x, end.y)
      this.ctx.stroke()
    }
    
    this.ctx.restore()
  }

  public drawTargetIndicator(_x: number, _y: number, screenPos: { x: number; y: number }) {
    this.ctx.save()
    this.ctx.translate(screenPos.x, screenPos.y)
    
    this.ctx.strokeStyle = '#FFD700'
    this.ctx.lineWidth = 3
    this.ctx.setLineDash([5, 5])
    this.ctx.beginPath()
    this.ctx.arc(0, 0, this.gridSize * 0.8, 0, Math.PI * 2)
    this.ctx.stroke()
    
    this.ctx.strokeStyle = '#FFD700'
    this.ctx.lineWidth = 2
    this.ctx.setLineDash([])
    this.ctx.beginPath()
    this.ctx.moveTo(-10, 0)
    this.ctx.lineTo(10, 0)
    this.ctx.moveTo(0, -10)
    this.ctx.lineTo(0, 10)
    this.ctx.stroke()
    
    this.ctx.restore()
  }
}
