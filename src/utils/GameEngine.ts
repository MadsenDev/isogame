import type { Dispatch } from 'react'
import { GameState, GameAction } from '../context/GameContext'
import { PlayerComponent } from '../components/PlayerComponent'
import { TileComponent } from '../components/TileComponent'
import { FurnitureComponent } from '../components/FurnitureComponent'
import { WallComponent } from '../components/WallComponent'
import { Pathfinder } from '../utils/Pathfinder'
import { CoordinateUtils } from '../utils/CoordinateUtils'

export class GameEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private state: GameState
  private dispatch: Dispatch<GameAction>
  // Components
  private playerComponent: PlayerComponent
  private tileComponent: TileComponent
  private furnitureComponent: FurnitureComponent
  private wallComponent: WallComponent
  private pathfinder: Pathfinder
  private coordinateUtils: CoordinateUtils

  // Game constants
  private readonly gridSize = 32
  private readonly tileWidth = this.gridSize * 2
  private readonly tileHeight = this.gridSize

  constructor(canvas: HTMLCanvasElement, state: GameState, dispatch: Dispatch<GameAction>) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.state = state
    this.dispatch = dispatch
    
    // Initialize coordinate utils
    this.coordinateUtils = new CoordinateUtils(
      this.tileWidth,
      this.tileHeight,
      canvas.width,
      canvas.height,
      state.currentRoom?.width || 0,
      state.currentRoom?.height || 0
    )
    
    // Initialize components
    this.playerComponent = new PlayerComponent(this.ctx, this.gridSize)
    this.tileComponent = new TileComponent(this.ctx, this.gridSize)
    this.furnitureComponent = new FurnitureComponent(this.ctx, this.tileWidth, this.tileHeight, this.coordinateUtils)
    this.wallComponent = new WallComponent(this.ctx, this.tileWidth, this.tileHeight, this.coordinateUtils)
    
    // Initialize pathfinder with validation function
    this.pathfinder = new Pathfinder((x, y, excludePlayerId) => this.isValidPlayerPosition(x, y, excludePlayerId))
    
    this.setupEventListeners()
    this.startGameLoop()
  }

  public updateState(newState: GameState) {
    this.state = newState

    // Update coordinate utils with new room dimensions
    if (newState.currentRoom) {
      this.coordinateUtils.updateRoomSize(newState.currentRoom.width, newState.currentRoom.height)
    }

    // Update coordinate utils with new canvas dimensions
    this.coordinateUtils.updateCanvasSize(this.canvas.width, this.canvas.height)
  }

  public worldToScreen(x: number, y: number) {
    return this.coordinateUtils.worldToScreen(x, y)
  }

  public screenToWorld(x: number, y: number) {
    return this.coordinateUtils.screenToWorld(x, y)
  }

  private setupEventListeners() {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      this.handleClick(x, y)
    })

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      const rect = this.canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      this.handleRightClick(x, y)
    })

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      this.handleMouseMove(x, y)
    })
  }

  private startGameLoop() {
    const gameLoop = () => {
      this.update()
      this.render()
      requestAnimationFrame(gameLoop)
    }
    gameLoop()
  }

  private update() {
    // Update player movements and actions
    this.state.players.forEach(player => {
      if (player.isMoving && player.path.length > 0 && player.pathIndex < player.path.length) {
        // Get the current target position from the path
        const targetPos = player.path[player.pathIndex]
        
        // Smooth interpolation between current position and target position
        player.moveTimer += 16 // 16ms per frame at 60fps
        const progress = Math.min(player.moveTimer / player.moveDelay, 1)
        
        // For the first step, interpolate from player's current position
        // For subsequent steps, interpolate from the previous path position
        let startX, startY
        if (player.pathIndex === 0) {
          // First step: start from player's current position
          startX = player.x
          startY = player.y
        } else {
          // Subsequent steps: start from previous path position
          startX = player.path[player.pathIndex - 1].x
          startY = player.path[player.pathIndex - 1].y
        }
        
        // Interpolate in world space - screen space interpolation creates straight lines
        player.x = startX + (targetPos.x - startX) * progress
        player.y = startY + (targetPos.y - startY) * progress
        
        // If we've reached the target position, move to next step
        if (progress >= 1) {
          player.x = targetPos.x
          player.y = targetPos.y
          player.pathIndex++
          player.moveTimer = 0
            
          // Check if we've reached the end of the path
          if (player.pathIndex >= player.path.length) {
            player.isMoving = false
            player.path = []
            player.pathIndex = 0
            // Ensure we're at the target position
            player.x = player.targetX
            player.y = player.targetY
          }
        }
      }

      if (player.action !== 'idle') {
        player.actionTimer += 16
        if (player.actionTimer >= 3000) {
          player.action = 'idle'
          player.actionTimer = 0
        }
      }
    })
  }

  public render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    if (!this.state.currentRoom) return

    // Draw floor tiles
    this.state.currentRoom.floorTiles.forEach(tile => {
      const screenPos = this.coordinateUtils.worldToScreen(tile.x, tile.y)
      this.tileComponent.drawIsometricTile(tile.x, tile.y, '#90EE90', 1, 2, 1, screenPos)
    })

    // Draw walls that follow the current floor layout
    this.wallComponent.drawRoomWalls(
      this.state.currentRoom.walls,
      this.state.currentRoom.doorway
    )

    // Draw furniture
    this.state.currentRoom.furniture.forEach(furniture => {
      this.furnitureComponent.drawFurniture(furniture)
    })

    // Draw preview furniture
    if (this.state.previewFurniture) {
      this.ctx.save()
      
      // Check if position is valid for furniture placement
      const isValid = this.furnitureComponent.isValidFurniturePosition(
        this.state.previewFurniture.x,
        this.state.previewFurniture.y,
        this.state.currentRoom.width,
        this.state.currentRoom.height,
        this.state.currentRoom.furniture,
        this.state.players,
        this.state.currentRoom.floorTiles
      )
      
      if (isValid) {
        this.ctx.globalAlpha = 0.5 // Normal preview opacity
      } else {
        this.ctx.globalAlpha = 0.3 // Lower opacity for invalid positions
        this.ctx.filter = 'hue-rotate(180deg) saturate(2)' // Red tint for invalid
      }
      
      this.furnitureComponent.drawPreviewFurniture(this.state.previewFurniture)
      this.ctx.restore()
    }

    // Draw hover grid position
    if ((this.state.currentTool === 'move' || this.state.currentTool === 'furniture' || this.state.currentTool === 'room') && this.state.hoverGridPos) {
      const screenPos = this.coordinateUtils.worldToScreen(this.state.hoverGridPos.x, this.state.hoverGridPos.y)

      // Use different validation based on current tool
      let isValid: boolean
      if (this.state.currentTool === 'furniture') {
        isValid = this.furnitureComponent.isValidFurniturePosition(
          this.state.hoverGridPos.x,
          this.state.hoverGridPos.y,
          this.state.currentRoom.width,
          this.state.currentRoom.height,
          this.state.currentRoom.furniture,
          this.state.players,
          this.state.currentRoom.floorTiles
        )
      } else if (this.state.currentTool === 'room') {
        const withinBounds = (
          this.state.hoverGridPos.x >= 0 &&
          this.state.hoverGridPos.x < this.state.currentRoom.width &&
          this.state.hoverGridPos.y >= 0 &&
          this.state.hoverGridPos.y < this.state.currentRoom.height
        )

        if (!withinBounds) {
          isValid = false
        } else {
          const hasTile = this.state.currentRoom.floorTiles.some(tile =>
            tile.x === this.state.hoverGridPos!.x && tile.y === this.state.hoverGridPos!.y
          )

          if (!hasTile) {
            isValid = true
          } else {
            const hasFurniture = this.state.currentRoom.furniture.some(f => f.x === this.state.hoverGridPos!.x && f.y === this.state.hoverGridPos!.y)
            const hasPlayer = this.state.players.some(player =>
              Math.round(player.x) === this.state.hoverGridPos!.x && Math.round(player.y) === this.state.hoverGridPos!.y
            )
            const isSpawnTile = this.state.currentRoom.spawnPoint
              ? this.state.currentRoom.spawnPoint.x === this.state.hoverGridPos!.x && this.state.currentRoom.spawnPoint.y === this.state.hoverGridPos!.y
              : false

            isValid = !(hasFurniture || hasPlayer || isSpawnTile)
          }
        }
      } else {
        isValid = this.isValidPlayerPosition(this.state.hoverGridPos.x, this.state.hoverGridPos.y, this.state.currentPlayerId)
      }
      
      this.tileComponent.drawHoverGrid(this.state.hoverGridPos.x, this.state.hoverGridPos.y, screenPos, isValid)
    }

    // Draw path preview
    if (this.state.currentTool === 'move' && this.state.hoverGridPos) {
      const path = this.pathfinder.findPath(
        Math.round(this.state.players[this.state.currentPlayerId]?.x || 0),
        Math.round(this.state.players[this.state.currentPlayerId]?.y || 0),
        this.state.hoverGridPos.x,
        this.state.hoverGridPos.y,
        this.state.currentPlayerId
      )
      this.tileComponent.drawPathPreview(path, (x, y) => this.coordinateUtils.worldToScreen(x, y))
    }

    // Draw all players
    this.state.players.forEach(player => {
      const screenPos = this.coordinateUtils.worldToScreen(player.x, player.y)
      const isCurrentPlayer = player.id === this.state.currentPlayerId
      this.playerComponent.drawPlayer(player, screenPos, isCurrentPlayer)
      
      if (player.isMoving) {
        const targetScreenPos = this.coordinateUtils.worldToScreen(player.targetX, player.targetY)
        this.tileComponent.drawTargetIndicator(player.targetX, player.targetY, targetScreenPos)
      }
    })
  }

  private isValidPlayerPosition(x: number, y: number, excludePlayerId: number = -1) {
    if (!this.state.currentRoom) return false

    // Allow movement through doorway even if it's outside the normal room bounds
    if (this.state.currentRoom.doorway &&
        this.state.currentRoom.doorway.x === x &&
        this.state.currentRoom.doorway.y === y) {
      return true
    }

    // Check room bounds
    if (x < 0 || x >= this.state.currentRoom.width || y < 0 || y >= this.state.currentRoom.height) {
      return false
    }

    const hasFloorTile = this.state.currentRoom.floorTiles.some(tile => tile.x === x && tile.y === y)
    if (!hasFloorTile) {
      return false
    }

    // Check wall collision (but allow doorway)
    if (this.state.currentRoom.walls.some(wall => wall.x === x && wall.y === y)) {
      return false
    }

    // Check furniture collision
    if (this.state.currentRoom.furniture.some(f => f.x === x && f.y === y)) {
      return false
    }
    
    // Check other players
    if (this.state.players.some(p => p.id !== excludePlayerId && p.x === x && p.y === y)) {
      return false
    }
    
    return true
  }

  public handleClick(x: number, y: number) {
    const worldPos = this.coordinateUtils.screenToWorld(x, y)
    const gridX = Math.round(worldPos.x)
    const gridY = Math.round(worldPos.y)
    
    if (this.state.currentTool === 'move') {
      const currentPlayer = this.state.players[this.state.currentPlayerId]
      if (currentPlayer) {
        const path = this.pathfinder.findPath(
          Math.round(currentPlayer.x),
          Math.round(currentPlayer.y),
          gridX,
          gridY,
          this.state.currentPlayerId
        )
        
        this.dispatch({ 
          type: 'MOVE_PLAYER', 
          payload: { 
            playerId: this.state.currentPlayerId, 
            x: gridX, 
            y: gridY,
            path: path
          } 
        })
      }
    } else if (this.state.currentTool === 'furniture' && this.state.isPlacing && this.state.selectedFurniture) {
      // Handle furniture placement
      if (this.furnitureComponent.isValidFurniturePosition(
        gridX,
        gridY,
        this.state.currentRoom!.width,
        this.state.currentRoom!.height,
        this.state.currentRoom!.furniture,
        this.state.players,
        this.state.currentRoom!.floorTiles
      )) {
        const furniture = {
          id: `furniture-${Date.now()}`,
          x: gridX,
          y: gridY,
          type: this.state.selectedFurniture
        }

        this.dispatch({
          type: 'ADD_FURNITURE',
          payload: furniture
        })

        // Stop placing after successful placement
        this.dispatch({
          type: 'SET_PLACING',
          payload: false
        })
        this.dispatch({
          type: 'SELECT_FURNITURE',
          payload: null
        })
      }
    } else if (this.state.currentTool === 'room') {
      if (!this.state.currentRoom) return

      if (gridX < 0 || gridX >= this.state.currentRoom.width || gridY < 0 || gridY >= this.state.currentRoom.height) {
        return
      }

      const hasTile = this.state.currentRoom.floorTiles.some(tile => tile.x === gridX && tile.y === gridY)
      if (!hasTile) {
        this.dispatch({ type: 'TOGGLE_FLOOR_TILE', payload: { x: gridX, y: gridY } })
        return
      }

      const hasFurniture = this.state.currentRoom.furniture.some(f => f.x === gridX && f.y === gridY)
      const hasPlayer = this.state.players.some(player => Math.round(player.x) === gridX && Math.round(player.y) === gridY)
      const isSpawnTile = this.state.currentRoom.spawnPoint
        ? this.state.currentRoom.spawnPoint.x === gridX && this.state.currentRoom.spawnPoint.y === gridY
        : false

      if (!(hasFurniture || hasPlayer || isSpawnTile)) {
        this.dispatch({ type: 'TOGGLE_FLOOR_TILE', payload: { x: gridX, y: gridY } })
      }
    }
  }

  public handleRightClick(x: number, y: number) {
    const worldPos = this.coordinateUtils.screenToWorld(x, y)
    
    const clickedPlayer = this.state.players.find(player => 
      Math.abs(player.x - worldPos.x) < 0.5 && 
      Math.abs(player.y - worldPos.y) < 0.5
    )
    
    if (clickedPlayer) {
      this.dispatch({ 
        type: 'SHOW_CONTEXT_MENU', 
        payload: { x, y, player: clickedPlayer } 
      })
    } else {
      this.dispatch({ type: 'HIDE_CONTEXT_MENU' })
    }
  }

  public handleMouseMove(x: number, y: number) {
    const worldPos = this.coordinateUtils.screenToWorld(x, y)
    
    if (this.state.currentTool === 'move') {
      const gridX = Math.round(worldPos.x)
      const gridY = Math.round(worldPos.y)
      this.dispatch({ type: 'SET_HOVER_GRID', payload: { x: gridX, y: gridY } })
    } else if (this.state.currentTool === 'furniture') {
      const gridX = Math.round(worldPos.x)
      const gridY = Math.round(worldPos.y)
      this.dispatch({ type: 'SET_HOVER_GRID', payload: { x: gridX, y: gridY } })

      if (this.state.isPlacing && this.state.selectedFurniture) {
        // Always show preview, but with different styling for invalid positions
        this.dispatch({
          type: 'SET_PREVIEW_FURNITURE',
          payload: { x: gridX, y: gridY, type: this.state.selectedFurniture }
        })
      }
    } else if (this.state.currentTool === 'room') {
      const gridX = Math.round(worldPos.x)
      const gridY = Math.round(worldPos.y)
      this.dispatch({ type: 'SET_HOVER_GRID', payload: { x: gridX, y: gridY } })
    }
  }
}