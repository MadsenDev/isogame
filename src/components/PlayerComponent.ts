import { Player } from '../context/GameContext'

export class PlayerComponent {
  private ctx: CanvasRenderingContext2D
  private characterSprites: Map<string, HTMLImageElement> = new Map()
  private characterAnimations: Map<string, HTMLImageElement[]> = new Map()
  private baseGridSize: number
  private gridSize: number
  private zoom = 1

  constructor(ctx: CanvasRenderingContext2D, gridSize: number) {
    this.ctx = ctx
    this.baseGridSize = gridSize
    this.gridSize = gridSize
    this.loadCharacterSprites()
  }

  public setZoom(zoom: number) {
    this.zoom = zoom
    this.gridSize = this.baseGridSize * zoom
  }

  private loadCharacterSprites() {
    const directions = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']
    
    // Load static sprites
    directions.forEach(direction => {
      const img = new Image()
      img.src = `/src/assets/character/character/rotations/${direction}.png`
      img.onload = () => {
        this.characterSprites.set(direction, img)
      }
    })
    
    // Load walk animations
    directions.forEach(direction => {
      const frameCount = 6
      const animationFrames: HTMLImageElement[] = new Array(frameCount)
      let loadedFrames = 0
      
      for (let i = 0; i < frameCount; i++) {
        const img = new Image()
        img.src = `/src/assets/character/character/animations/walk/${direction}/frame_${i.toString().padStart(3, '0')}.png`
        img.onload = () => {
          animationFrames[i] = img
          loadedFrames++
          if (loadedFrames === frameCount) {
            this.characterAnimations.set(`walk-${direction}`, animationFrames)
          }
        }
      }
    })
  }

  public getCharacterDirection(player: Player): string {
    if (player.isMoving && player.path.length > 0 && player.pathIndex < player.path.length) {
      const curr = player.path[player.pathIndex];

      let sx0: number, sy0: number;
      if (player.pathIndex === 0) {
        sx0 = Math.round(player.x);
        sy0 = Math.round(player.y);
      } else {
        sx0 = player.path[player.pathIndex - 1].x;
        sy0 = player.path[player.pathIndex - 1].y;
      }

      const dx = curr.x - sx0;
      const dy = curr.y - sy0;

      // True isometric grid → on-screen facing
      const dirMap: Record<string, string> = {
        '-1,-1': 'north',        // up
        '-1,0' : 'north-west',   // up-left
        '-1,1' : 'west',         // left
        '0,-1' : 'north-east',   // up-right
        '0,1'  : 'south-west',   // down-left
        '1,-1' : 'east',         // right
        '1,0'  : 'south-east',   // down-right
        '1,1'  : 'south',        // down
      };

      const key = `${dx},${dy}`;
      const direction = dirMap[key] ?? player.lastDirection;
      // Update the player's lastDirection
      player.lastDirection = direction;
      return direction;
    }

    return player.lastDirection;
  }

  public drawPlayer(player: Player, screenPos: { x: number; y: number }, isCurrentPlayer: boolean) {
    const direction = this.getCharacterDirection(player)
    
    this.ctx.save()
    this.ctx.translate(screenPos.x, screenPos.y)
    
    // Choose sprite or animation based on player state
    let spriteToDraw: HTMLImageElement | null = null
    
    if (player.isMoving && player.path.length > 0 && player.pathIndex < player.path.length) {
      const animationFrames = this.characterAnimations.get(`walk-${direction}`)
      if (animationFrames && animationFrames.length > 0) {
        const progress = Math.min(player.moveTimer / player.moveDelay, 1)
        const frameIndex = Math.floor(progress * animationFrames.length)
        spriteToDraw = animationFrames[Math.min(frameIndex, animationFrames.length - 1)]
      }
    }
    
    if (!spriteToDraw) {
      spriteToDraw = this.characterSprites.get(direction) || null
    }
    
    if (spriteToDraw) {
      const spriteSize = this.gridSize * 3
      const offsetY = -this.gridSize * 0.5
      this.ctx.drawImage(
        spriteToDraw,
        -spriteSize / 2,
        -spriteSize / 2 + offsetY,
        spriteSize,
        spriteSize
      )
      
      if (isCurrentPlayer) {
        this.ctx.strokeStyle = '#FFD700'
        this.ctx.lineWidth = Math.max(2, 3 * this.zoom)
        this.ctx.setLineDash([5, 5])
        this.ctx.strokeRect(-spriteSize / 2, -spriteSize / 2 + offsetY, spriteSize, spriteSize)
        this.ctx.setLineDash([])
      }
    } else {
      this.ctx.fillStyle = player.color
      this.ctx.beginPath()
      this.ctx.arc(0, 0, this.gridSize * player.size, 0, Math.PI * 2)
      this.ctx.fill()
      this.ctx.strokeStyle = '#333'
      this.ctx.lineWidth = Math.max(1, 2 * this.zoom)
      this.ctx.stroke()
      if (isCurrentPlayer) {
        this.ctx.strokeStyle = '#FFD700'
        this.ctx.lineWidth = Math.max(2, 3 * this.zoom)
        this.ctx.stroke()
      }
    }
    
    const fontSize = Math.max(10, 12 * this.zoom)
    this.ctx.font = `${fontSize}px Arial`
    this.ctx.textAlign = 'center'
    this.ctx.fillStyle = player.color
    this.ctx.fillText(player.name, 0, -this.gridSize * 2 - 10)
    
    this.ctx.restore()
  }
}
