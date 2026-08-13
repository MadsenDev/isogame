import type { Dispatch } from 'react'
import { Furniture, GameState, GameAction } from '../context/GameContext'
import { PlayerComponent } from '../components/PlayerComponent'
import { TileComponent } from '../components/TileComponent'
import { FurnitureComponent } from '../components/FurnitureComponent'
import { WallComponent } from '../components/WallComponent'
import { Pathfinder } from '../utils/Pathfinder'
import { CoordinateUtils } from '../utils/CoordinateUtils'
import { findInteractionSpot, getFurnitureDefinition, getNextDirection } from '../data/furnitureDefinitions'
import { notifyView, registerView } from './viewController'
import { doorwayWall } from '../data/structureSprites'

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
  private readonly baseTileWidth = this.gridSize * 2
  private readonly baseTileHeight = this.gridSize
  private zoom = 1
  private frameHandle: number | null = null
  private canvasWidth = 0
  private canvasHeight = 0
  /** Set once the player picks a zoom; null means auto-fit. */
  private zoomOverride: number | null = null
  private panX = 0
  private panY = 0
  /** Pointer state, used to tell a drag apart from a click. */
  private pointer: { x: number; y: number; panX: number; panY: number; dragging: boolean } | null = null
  /** Whole multiples only, so the pixel grid survives. */
  private readonly zoomSteps = [1, 2, 3, 4]
  private readonly minZoom = 0.35
  private readonly maxZoom = 2

  constructor(canvas: HTMLCanvasElement, state: GameState, dispatch: Dispatch<GameAction>) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.state = state
    this.dispatch = dispatch
    
    // Initialize coordinate utils
    this.coordinateUtils = new CoordinateUtils(
      this.baseTileWidth,
      this.baseTileHeight,
      canvas.width,
      canvas.height,
      state.currentRoom?.width || 0,
      state.currentRoom?.height || 0,
      this.zoom
    )

    // Initialize components
    this.playerComponent = new PlayerComponent(this.ctx, this.gridSize)
    this.tileComponent = new TileComponent(this.ctx, this.gridSize)
    this.furnitureComponent = new FurnitureComponent(this.ctx, this.baseTileWidth, this.baseTileHeight, this.coordinateUtils)
    this.wallComponent = new WallComponent(this.ctx, this.baseTileWidth, this.baseTileHeight, this.coordinateUtils)

    this.applyZoom(this.calculateZoom())
    
    // Initialize pathfinder with validation function
    this.pathfinder = new Pathfinder((x, y, excludePlayerId) => this.isValidPlayerPosition(x, y, excludePlayerId))
    
    this.setupEventListeners()
    registerView(this.viewApi)
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

    this.applyZoom(this.calculateZoom())
  }

  public worldToScreen(x: number, y: number) {
    return this.coordinateUtils.worldToScreen(x, y)
  }

  public screenToWorld(x: number, y: number) {
    return this.coordinateUtils.screenToWorld(x, y)
  }

  /**
   * Draw furniture and players back-to-front in one pass.
   *
   * Sort key is the isometric depth (x + y). Furniture uses its front-most
   * occupied tile so a 2x2 table does not sort as if it were only its origin
   * corner. A player sitting on something is pinned either side of that piece
   * using the `layer` the sprite pipeline worked out per orientation: furniture
   * facing north or west shows its back to the camera, so the occupant belongs
   * underneath it.
   */
  private drawSortedScene() {
    if (!this.state.currentRoom) return

    const drawables: Array<{ depth: number; order: number; draw: () => void }> = []

    // Walls sort half a tile behind the tile they enclose, which is where they
    // physically are. That is what lets a guest walk behind an interior wall
    // and be hidden by it, instead of always painting on top.
    const wallsByTile = new Set<string>()
    const windows = new Set(
      (this.state.currentRoom.windows ?? []).map(w => `${w.x},${w.y},${w.edge}`)
    )

    this.state.currentRoom.walls.forEach(wall => {
      const key = `${wall.x},${wall.y},${wall.edge}`
      wallsByTile.add(key)
      // A window replaces the segment rather than overlaying it, so a stale
      // window left behind by a layout change simply never draws.
      const glazed = windows.has(key)
      drawables.push({
        depth: wall.x + wall.y - 0.5,
        order: 0,
        draw: () =>
          glazed
            ? this.wallComponent.drawWindow(wall.x, wall.y, wall.edge)
            : this.wallComponent.drawWall(wall)
      })
    })

    // The doorway: a wall segment was skipped where the door goes, so the door
    // panel takes its place and sorts exactly where that segment would have.
    const door = doorwayWall(this.state.currentRoom.doorway)
    if (door) {
      drawables.push({
        depth: door.x + door.y - 0.5,
        order: 0,
        draw: () => this.wallComponent.drawDoor(door.x, door.y, door.edge)
      })
    }

    // A tile carrying both edges is an inside corner; the post fills the square
    // outside the boundary that neither run reaches. Drawn fractionally further
    // back so it never covers either face.
    this.state.currentRoom.walls.forEach(wall => {
      if (wall.edge !== 'north') return
      if (!wallsByTile.has(`${wall.x},${wall.y},west`)) return
      drawables.push({
        depth: wall.x + wall.y - 0.6,
        order: 0,
        draw: () => this.wallComponent.drawCorner(wall.x, wall.y)
      })
    })

    this.state.currentRoom.furniture.forEach(furniture => {
      const footprint = this.getFurnitureFootprint(furniture)

      drawables.push({
        depth: furniture.x + furniture.y + (footprint.width - 1) + (footprint.height - 1),
        order: 0,
        draw: () => this.furnitureComponent.drawFurniture(furniture)
      })
    })

    this.state.players.forEach(player => {
      const tileX = Math.round(player.x)
      const tileY = Math.round(player.y)
      const seated = player.action === 'sitting' || player.action === 'idle'
        ? findInteractionSpot(this.state.currentRoom!.furniture, tileX, tileY, ['sit', 'lay', 'sleep'])
        : null

      const useSpot = player.action === 'sitting' && seated ? seated : null
      const screenPos = this.coordinateUtils.worldToScreen(player.x, player.y)

      // The seat offset is in unzoomed sprite pixels, like the sprite anchors.
      const offsetX = (useSpot?.spot.offsetX ?? 0) * this.zoom
      const offsetY = (useSpot?.spot.offsetY ?? 0) * this.zoom

      let depth = player.x + player.y
      if (useSpot) {
        const piece = useSpot.furniture
        const spriteFootprint = this.getFurnitureFootprint(piece)
        const pieceDepth =
          piece.x + piece.y + (spriteFootprint.width - 1) + (spriteFootprint.height - 1)
        depth = useSpot.spot.layer === 'behind' ? pieceDepth - 0.5 : pieceDepth + 0.5
      }

      drawables.push({
        depth,
        // Ties go to the player, so a guest standing level with a piece of
        // furniture is not hidden by it.
        order: 1,
        draw: () => {
          this.playerComponent.drawPlayer(
            player,
            { x: screenPos.x + offsetX, y: screenPos.y + offsetY },
            player.id === this.state.currentPlayerId,
            useSpot?.spot.direction
          )

          if (player.isMoving) {
            const targetScreenPos = this.coordinateUtils.worldToScreen(player.targetX, player.targetY)
            this.tileComponent.drawTargetIndicator(player.targetX, player.targetY, targetScreenPos)
          }
        }
      })
    })

    drawables
      .sort((a, b) => a.depth - b.depth || a.order - b.order)
      .forEach(drawable => drawable.draw())
  }

  /**
   * Contact shadows for everything standing on the floor.
   *
   * Sitting players are skipped: their shadow is already implied by the
   * furniture they are on, and drawing it would put a second one on the floor
   * beneath the chair.
   */
  private drawShadows() {
    if (!this.state.currentRoom) return

    this.state.currentRoom.furniture.forEach(furniture => {
      this.furnitureComponent.drawShadow(furniture)
    })

    this.state.players.forEach(player => {
      if (player.action === 'sitting') return
      const screenPos = this.coordinateUtils.worldToScreen(player.x, player.y)
      this.playerComponent.drawShadow(player, screenPos)
    })
  }

  /** Tiles a piece occupies in its current orientation. */
  private getFurnitureFootprint(furniture: Furniture): { width: number; height: number } {
    const sprite = furniture.definition.sprites?.[
      furniture.direction ?? furniture.definition.defaultDirection ?? ''
    ]
    return sprite?.footprint ?? {
      width: furniture.definition.width,
      height: furniture.definition.height
    }
  }

  /**
   * Keep the room reachable.
   *
   * Panning is allowed as far as the room's edge plus a margin, so it can be
   * dragged fully into view at any zoom but never off into empty space.
   */
  private clampPan() {
    if (!this.state.currentRoom) return

    const { width, height } = this.state.currentRoom
    const roomWidth = (width + height) * (this.baseTileWidth / 2) * this.zoom
    const roomHeight = (width + height) * (this.baseTileHeight / 2) * this.zoom
    const margin = 120

    const limitX = Math.max(0, (roomWidth - this.canvas.width) / 2) + margin
    const limitY = Math.max(0, (roomHeight - this.canvas.height) / 2) + margin

    this.panX = Math.max(-limitX, Math.min(limitX, this.panX))
    this.panY = Math.max(-limitY, Math.min(limitY, this.panY))
    this.coordinateUtils.setPan(this.panX, this.panY)
  }

  private setZoomLevel(zoom: number | null) {
    this.zoomOverride = zoom
    const next = this.calculateZoom()
    if (next !== this.zoom) {
      this.zoom = next
      this.coordinateUtils.updateZoom(next)
      this.playerComponent.setZoom(next)
      this.tileComponent.setZoom(next)
      this.furnitureComponent.setZoom(next)
      this.wallComponent.setZoom(next)
    }
    this.clampPan()
    notifyView()
  }

  /** Camera controls, driven by the toolbar through the view controller. */
  private viewApi = {
    zoomIn: () => {
      const next = this.zoomSteps.find(step => step > this.zoom)
      if (next !== undefined) this.setZoomLevel(next)
    },
    zoomOut: () => {
      const below = this.zoomSteps.filter(step => step < this.zoom)
      if (below.length) this.setZoomLevel(below[below.length - 1])
    },
    reset: () => {
      this.panX = 0
      this.panY = 0
      this.coordinateUtils.setPan(0, 0)
      this.setZoomLevel(null)
    },
    getZoom: () => this.zoom,
    canZoomIn: () => this.zoomSteps.some(step => step > this.zoom),
    canZoomOut: () => this.zoomSteps.some(step => step < this.zoom)
  }

  /** Bound once so it can be removed again in destroy(). */
  private handleKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

    if (event.key === 'r' || event.key === 'R') {
      this.rotatePlacement()
    }
  }

  /**
   * Release everything the engine owns.
   *
   * Cancelling the animation frame is the important part: React StrictMode
   * mounts, unmounts and remounts in development, and an engine whose loop
   * outlives it keeps drawing its own stale copy of the room over the live one.
   */
  public destroy() {
    if (this.frameHandle !== null) {
      cancelAnimationFrame(this.frameHandle)
      this.frameHandle = null
    }
    registerView(null)
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('mouseup', this.onWindowPointerUp)
    this.canvas.removeEventListener('mousedown', this.onCanvasPointerDown)
    this.canvas.removeEventListener('contextmenu', this.onCanvasContextMenu)
    this.canvas.removeEventListener('mousemove', this.onCanvasMouseMove)
  }

  /** Cycle the orientation used for the next furniture placement. */
  public rotatePlacement() {
    if (!this.state.selectedFurniture) return

    const definition = getFurnitureDefinition(this.state.selectedFurniture)
    if (!definition || !definition.rotatable) return

    const next = getNextDirection(definition, this.state.placementDirection ?? undefined)
    if (next) this.dispatch({ type: 'SET_PLACEMENT_DIRECTION', payload: next })
  }

  // Bound once each so destroy() can actually remove them again. Anonymous
  // listeners cannot be removed, which left orphaned engines still handling
  // clicks on the same canvas.
  /**
   * A press starts a potential drag.
   *
   * Left-drag pans and a left click still selects, told apart by how far the
   * pointer moved: below the threshold it is a click, above it the room is
   * being dragged. Anything else would need a modifier key nobody discovers.
   */
  private onCanvasPointerDown = (e: MouseEvent) => {
    if (e.button !== 0) return
    this.pointer = { x: e.clientX, y: e.clientY, panX: this.panX, panY: this.panY, dragging: false }
  }

  private onWindowPointerUp = (e: MouseEvent) => {
    const pointer = this.pointer
    this.pointer = null
    if (!pointer || e.button !== 0) return

    if (!pointer.dragging) {
      const { x, y } = this.getCanvasCoordinates(e)
      this.handleClick(x, y, e)
    } else {
      this.canvas.style.cursor = ''
    }
  }

  private onCanvasContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    const { x, y } = this.getCanvasCoordinates(e)
    this.handleRightClick(x, y)
  }

  private onCanvasMouseMove = (e: MouseEvent) => {
    const pointer = this.pointer
    if (pointer) {
      const dx = e.clientX - pointer.x
      const dy = e.clientY - pointer.y
      // A few pixels of slop, so a click with a shaky hand is still a click.
      if (!pointer.dragging && Math.hypot(dx, dy) > 4) {
        pointer.dragging = true
        this.canvas.style.cursor = 'grabbing'
      }
      if (pointer.dragging) {
        this.panX = pointer.panX + dx
        this.panY = pointer.panY + dy
        this.clampPan()
        return
      }
    }

    const { x, y } = this.getCanvasCoordinates(e)
    this.handleMouseMove(x, y)
  }

  private setupEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown)
    // Released on window, not the canvas: a drag often ends off the canvas.
    window.addEventListener('mouseup', this.onWindowPointerUp)
    this.canvas.addEventListener('mousedown', this.onCanvasPointerDown)
    this.canvas.addEventListener('contextmenu', this.onCanvasContextMenu)
    this.canvas.addEventListener('mousemove', this.onCanvasMouseMove)
  }

  private getCanvasCoordinates(event: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width / rect.width
    const scaleY = this.canvas.height / rect.height

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    }
  }

  private startGameLoop() {
    const gameLoop = () => {
      this.update()
      this.render()
      this.frameHandle = requestAnimationFrame(gameLoop)
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

            // Arriving on a seat sits you down, the way it does in the games
            // this borrows from.
            const seat = findInteractionSpot(
              this.state.currentRoom?.furniture ?? [],
              Math.round(player.x),
              Math.round(player.y),
              ['sit', 'lay', 'sleep']
            )
            if (seat) {
              player.action = 'sitting'
              player.actionTimer = 0
            } else if (player.action === 'sitting') {
              player.action = 'idle'
            }
          }
        }
      }

      if (player.action !== 'idle' && player.action !== 'sitting') {
        player.actionTimer += 16
        if (player.actionTimer >= 3000) {
          player.action = 'idle'
          player.actionTimer = 0
        }
      }
    })
  }

  public render() {
    // The canvas resizes with its container; pick that up before drawing so the
    // room stays centred and clicks keep mapping to the right tile.
    if (
      this.canvasWidth !== this.canvas.width ||
      this.canvasHeight !== this.canvas.height
    ) {
      this.canvasWidth = this.canvas.width
      this.canvasHeight = this.canvas.height
      this.coordinateUtils.updateCanvasSize(this.canvas.width, this.canvas.height)
      this.applyZoom(this.calculateZoom())
      this.clampPan()
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    if (!this.state.currentRoom) return

    // Draw floor tiles back to front, so the 1px lip of the tile in front
    // covers the one behind it.
    const floorTiles = [...this.state.currentRoom.floorTiles].sort(
      (a, b) => a.x + a.y - (b.x + b.y)
    )
    floorTiles.forEach(tile => {
      const screenPos = this.coordinateUtils.worldToScreen(tile.x, tile.y)
      const texture = tile.texture || this.state.currentRoom?.floorTexture || 'default'
      this.tileComponent.drawIsometricTile(tile.x, tile.y, '#90EE90', 1, 2, 1, screenPos, texture)
    })

    // Every shadow goes down first, in its own pass between the floor and the
    // objects. Drawn per-object instead, a shadow would fall across whatever
    // had already been drawn next to it.
    this.drawShadows()

    // Furniture and players share one depth-sorted pass; drawing all furniture
    // and then all players puts a standing guest on top of a wall they are
    // behind, and a sitter on top of the chair back that should hide them.
    this.drawSortedScene()

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
        this.state.currentRoom.floorTiles,
        this.state.previewFurniture.type
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
          this.state.currentRoom.floorTiles,
          this.state.selectedFurniture || 'chair' // Default to chair if no furniture selected
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

    // Players are drawn inside drawSortedScene(), interleaved with furniture.
  }

  private calculateZoom(): number {
    if (this.zoomOverride !== null) return this.zoomOverride
    if (!this.state.currentRoom) return this.zoom

    const { width, height } = this.state.currentRoom

    if (width === 0 || height === 0) {
      return this.zoom
    }

    const marginRatio = 0.1
    const availableWidth = this.canvas.width * (1 - marginRatio)
    const availableHeight = this.canvas.height * (1 - marginRatio)

    const roomPixelWidth = (width + height) * (this.baseTileWidth / 2)
    const roomPixelHeight = (width + height) * (this.baseTileHeight / 2)

    if (roomPixelWidth === 0 || roomPixelHeight === 0) {
      return this.zoom
    }

    const widthScale = availableWidth / roomPixelWidth
    const heightScale = availableHeight / roomPixelHeight

    const desiredZoom = Math.min(widthScale, heightScale)

    if (!isFinite(desiredZoom) || desiredZoom <= 0) {
      return this.zoom
    }

    return this.snapZoom(Math.min(this.maxZoom, Math.max(this.minZoom, desiredZoom)))
  }

  /**
   * Snap to a scale that keeps the pixel grid intact.
   *
   * Nearest-neighbour at 1.2x renders some source pixels one screen pixel wide
   * and others two, which reads as banding and makes clean sprites look like
   * low-resolution mush. Only whole multiples - and clean halves below 1:1 -
   * preserve the grid.
   */
  private snapZoom(zoom: number): number {
    const steps = [0.25, 0.5, 1, 2, 3, 4]
    let best = steps[0]
    for (const step of steps) {
      if (step <= zoom + 1e-6) best = step
    }
    return best
  }

  private applyZoom(zoom: number) {
    if (zoom === this.zoom) {
      return
    }

    this.zoom = zoom
    this.coordinateUtils.updateZoom(this.zoom)
    this.playerComponent.setZoom(this.zoom)
    this.tileComponent.setZoom(this.zoom)
    this.furnitureComponent.setZoom(this.zoom)
    this.wallComponent.setZoom(this.zoom)
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

    // Furniture collision, over the whole footprint. Checking only the origin
    // tile let players walk through three quarters of a 2x2 table.
    const blocking = this.state.currentRoom.furniture.find(furniture => {
      const footprint = this.getFurnitureFootprint(furniture)
      return (
        x >= furniture.x &&
        x < furniture.x + footprint.width &&
        y >= furniture.y &&
        y < furniture.y + footprint.height
      )
    })

    if (blocking) {
      // A seat is a destination, not an obstacle: you walk onto a chair to sit
      // on it. Without this the seat offsets could never be reached.
      const seat = findInteractionSpot([blocking], x, y, ['sit', 'lay', 'sleep'])
      if (!seat && !blocking.definition.walkable) {
        return false
      }
    }
    
    // Check other players
    if (this.state.players.some(p => p.id !== excludePlayerId && p.x === x && p.y === y)) {
      return false
    }
    
    return true
  }

  private getFurnitureDefinition(type: string) {
    return getFurnitureDefinition(type)
  }

  public handleClick(x: number, y: number, e?: MouseEvent) {
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

        // An unreachable tile yields an empty path. Dispatching it anyway left
        // the player flagged as moving forever, with nothing to move along.
        if (path.length > 0) {
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
        this.state.currentRoom!.floorTiles,
        this.state.selectedFurniture
      )) {
        const furnitureDefinition = this.getFurnitureDefinition(this.state.selectedFurniture)
        if (furnitureDefinition) {
          const furniture = {
            id: `furniture-${Date.now()}`,
            x: gridX,
            y: gridY,
            type: this.state.selectedFurniture,
            direction: this.state.placementDirection ?? furnitureDefinition.defaultDirection,
            definition: furnitureDefinition
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
          // Without this the ghost preview stays behind on the placed tile.
          this.dispatch({
            type: 'SET_PREVIEW_FURNITURE',
            payload: null
          })
          this.dispatch({
            type: 'SELECT_FURNITURE',
            payload: null
          })
        }
      }
    } else if (this.state.currentTool === 'room') {
      if (!this.state.currentRoom) return

      if (gridX < 0 || gridX >= this.state.currentRoom.width || gridY < 0 || gridY >= this.state.currentRoom.height) {
        return
      }

      // In window mode a click glazes the wall on that tile instead of
      // toggling its floor.
      if (this.state.styleMode === 'window') {
        this.dispatch({ type: 'TOGGLE_WINDOW', payload: { x: gridX, y: gridY } })
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
        // Check if we're painting texture (right-click or shift+click)
        if (e?.shiftKey || e?.button === 2) {
          // Paint texture on this tile
          const currentTexture = this.state.currentRoom.floorTiles.find(tile => tile.x === gridX && tile.y === gridY)?.texture
          const newTexture = currentTexture === 'wood' ? 'stone' : 'wood' // Toggle between wood and stone for now
          this.dispatch({ type: 'SET_TILE_TEXTURE', payload: { roomId: this.state.currentRoom.id, x: gridX, y: gridY, texture: newTexture } })
        } else {
          this.dispatch({ type: 'TOGGLE_FLOOR_TILE', payload: { x: gridX, y: gridY } })
        }
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
          payload: {
            x: gridX,
            y: gridY,
            type: this.state.selectedFurniture,
            direction: this.state.placementDirection ?? undefined
          }
        })
      }
    } else if (this.state.currentTool === 'room') {
      const gridX = Math.round(worldPos.x)
      const gridY = Math.round(worldPos.y)
      this.dispatch({ type: 'SET_HOVER_GRID', payload: { x: gridX, y: gridY } })
    }
  }
}