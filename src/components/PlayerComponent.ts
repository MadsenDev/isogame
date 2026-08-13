import { Player } from '../context/GameContext'
import { getCharacterFrame, getAllCharacterFrameUrls } from '../data/characterSprites'

export class PlayerComponent {
  private ctx: CanvasRenderingContext2D
  /** Loaded frames, keyed by URL. */
  private characterSprites: Map<string, HTMLImageElement> = new Map()
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

  /**
   * Preload every generated frame.
   *
   * These come from public/, so they resolve in a production build too. The
   * previous art was fetched from /src/assets/... which only ever worked
   * because the dev server happens to serve the source tree.
   */
  private loadCharacterSprites() {
    for (const url of getAllCharacterFrameUrls()) {
      const img = new Image()
      img.src = url
      img.onload = () => this.characterSprites.set(url, img)
      img.onerror = () => console.error(`Failed to load character sprite: ${url}`)
    }
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
   * `directionOverride` is used while a player occupies an interaction spot:
   * a chair decides which way its occupant faces, not their last movement.
   */
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
    const walking = player.isMoving && player.path.length > 0 && player.pathIndex < player.path.length

    // Pick the clip. Sitting is a pose, not a timed action, so it holds until
    // the player walks away.
    const animation = walking ? 'walk' : player.action === 'sitting' ? 'sit' : 'idle'

    // Step the walk cycle by progress through the current tile, so the stride
    // stays in sync with the movement rather than with wall-clock time.
    const progress = walking ? Math.min(player.moveTimer / player.moveDelay, 1) : 0
    const frameIndex = walking ? Math.floor(progress * 6) : 0

    const frame = getCharacterFrame(animation, direction, frameIndex)
    const sprite = frame ? this.characterSprites.get(frame.url) ?? null : null

    this.ctx.save()

    if (frame && sprite) {
      // Anchored like every other generated sprite: the anchor is the tile
      // centre at floor level, so the character stands on their tile at the
      // scale they were modelled at.
      const width = Math.round(frame.width * this.zoom)
      const height = Math.round(frame.height * this.zoom)
      const left = Math.round(screenPos.x - frame.anchorX * this.zoom)
      const top = Math.round(screenPos.y - frame.anchorY * this.zoom)

      const smoothing = this.ctx.imageSmoothingEnabled
      this.ctx.imageSmoothingEnabled = false
      this.ctx.drawImage(sprite, left, top, width, height)
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

  private drawNameplate(player: Player, screenPos: { x: number; y: number }, spriteTop: number) {
    const fontSize = Math.max(9, 11 * this.zoom)
    this.ctx.font = `${fontSize}px Arial`
    this.ctx.textAlign = 'center'
    this.ctx.fillStyle = player.color
    this.ctx.fillText(player.name, screenPos.x, spriteTop - 4)
  }
}
