import { Player } from '../context/GameContext'
import { DEFAULT_APPEARANCE } from '../data/appearance'
import { characterRenderer } from '../utils/characterRenderer'
import { WALK_FRAME_COUNT } from '../data/characterSprites'

export class PlayerComponent {
  private ctx: CanvasRenderingContext2D
  private baseGridSize: number
  private gridSize: number
  private zoom = 1

  constructor(ctx: CanvasRenderingContext2D, gridSize: number) {
    this.ctx = ctx
    this.baseGridSize = gridSize
    this.gridSize = gridSize
  }

  public setZoom(zoom: number) {
    this.zoom = zoom
    this.gridSize = this.baseGridSize * zoom
  }

  /**
   * Which clip and frame a player is showing right now.
   *
   * The walk cycle is stepped by progress through the current tile rather than
   * by wall-clock time, so the stride stays in sync with the movement however
   * fast the simulation happens to be running.
   */
  private clipFor(player: Player) {
    const walking = player.isMoving && player.path.length > 0 && player.pathIndex < player.path.length
    // Sitting is a pose, not a timed action, so it holds until the player walks
    // away.
    const animation = walking ? 'walk' : player.action === 'sitting' ? 'sit' : 'idle'
    const progress = walking ? Math.min(player.moveTimer / player.moveDelay, 1) : 0
    return { animation, frame: walking ? Math.floor(progress * WALK_FRAME_COUNT) : 0 }
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

      // Grid step to facing, world-axis named to match the sprite pipeline:
      // +x is south, +y is east, and the names compose from there.
      const dirMap: Record<string, string> = {
        '1,0'  : 'south',        // down-right
        '1,1'  : 'south-east',   // straight down
        '0,1'  : 'east',         // down-left
        '-1,1' : 'north-east',   // straight left
        '-1,0' : 'north',        // up-left
        '-1,-1': 'north-west',   // straight up
        '0,-1' : 'west',         // up-right
        '1,-1' : 'south-west',   // straight right
      };

      const key = `${dx},${dy}`;
      const direction = dirMap[key] ?? player.lastDirection;
      // Update the player's lastDirection
      player.lastDirection = direction;
      return direction;
    }

    return player.lastDirection;
  }

  /**
   * Draw a player's contact shadow.
   *
   * Called from the engine's shadow pass, not from drawPlayer, so no shadow is
   * ever painted over something drawn earlier.
   */
  public drawShadow(player: Player, screenPos: { x: number; y: number }, directionOverride?: string) {
    const direction = directionOverride ?? this.getCharacterDirection(player)
    const appearance = player.appearance ?? DEFAULT_APPEARANCE
    const { animation, frame } = this.clipFor(player)

    const shadow = characterRenderer.getShadow(appearance, animation, direction, frame)
    if (!shadow) return

    const smoothing = this.ctx.imageSmoothingEnabled
    this.ctx.imageSmoothingEnabled = false
    this.ctx.drawImage(
      shadow.image,
      Math.round(screenPos.x - shadow.anchorX * this.zoom),
      Math.round(screenPos.y - shadow.anchorY * this.zoom),
      Math.round(shadow.width * this.zoom),
      Math.round(shadow.height * this.zoom)
    )
    this.ctx.imageSmoothingEnabled = smoothing
  }

  /**
   * `directionOverride` is used while a player occupies an interaction spot:
   * a chair decides which way its occupant faces, not their last movement.
   */
  public drawPlayer(
    player: Player,
    screenPos: { x: number; y: number },
    isCurrentPlayer: boolean,
    directionOverride?: string
  ) {
    const direction = directionOverride ?? this.getCharacterDirection(player)
    const appearance = player.appearance ?? DEFAULT_APPEARANCE
    const { animation, frame: frameIndex } = this.clipFor(player)

    // Idempotent, and the only place that knows a player is on screen: this is
    // what gets a newly-dressed guest's sprites fetched.
    characterRenderer.preload(appearance)
    const frame = characterRenderer.getFrame(appearance, animation, direction, frameIndex)

    this.ctx.save()

    if (frame) {
      // Anchored like every other generated sprite: the anchor is the tile
      // centre at floor level, so the character stands on their tile at the
      // scale they were modelled at.
      const width = Math.round(frame.width * this.zoom)
      const height = Math.round(frame.height * this.zoom)
      const left = Math.round(screenPos.x - frame.anchorX * this.zoom)
      const top = Math.round(screenPos.y - frame.anchorY * this.zoom)

      const smoothing = this.ctx.imageSmoothingEnabled
      this.ctx.imageSmoothingEnabled = false
      this.ctx.drawImage(frame.canvas, left, top, width, height)
      this.ctx.imageSmoothingEnabled = smoothing

      if (isCurrentPlayer) {
        this.ctx.strokeStyle = '#FFD700'
        this.ctx.lineWidth = Math.max(1, 2 * this.zoom)
        this.ctx.setLineDash([4, 4])
        this.ctx.strokeRect(left, top, width, height)
        this.ctx.setLineDash([])
      }

      this.drawNameplate(player, screenPos, top)
    } else {
      // Fallback until the frames finish loading.
      this.ctx.translate(screenPos.x, screenPos.y)
      this.ctx.fillStyle = player.color
      this.ctx.beginPath()
      this.ctx.arc(0, 0, this.gridSize * player.size, 0, Math.PI * 2)
      this.ctx.fill()
      this.ctx.strokeStyle = isCurrentPlayer ? '#FFD700' : '#333'
      this.ctx.lineWidth = Math.max(1, 2 * this.zoom)
      this.ctx.stroke()
    }

    this.ctx.restore()
  }

  /**
   * Draw the name above a player.
   *
   * Anti-aliased colour text straight onto a busy pixel-art room is unreadable,
   * so the label is stroked with the sprite outline colour first. Font size is
   * a whole number of pixels to avoid sub-pixel fuzz.
   */
  private drawNameplate(player: Player, screenPos: { x: number; y: number }, spriteTop: number) {
    const fontSize = Math.max(10, Math.round(11 * this.zoom))
    const y = Math.round(spriteTop - 5)

    this.ctx.font = `${fontSize}px system-ui, sans-serif`
    this.ctx.textAlign = 'center'
    this.ctx.lineJoin = 'round'
    this.ctx.lineWidth = Math.max(3, Math.round(3 * this.zoom))
    this.ctx.strokeStyle = '#241d2b'
    this.ctx.strokeText(player.name, Math.round(screenPos.x), y)
    this.ctx.fillStyle = player.color
    this.ctx.fillText(player.name, Math.round(screenPos.x), y)
  }
}
