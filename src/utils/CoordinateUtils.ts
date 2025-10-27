export interface ScreenPosition {
  x: number
  y: number
}

export interface WorldPosition {
  x: number
  y: number
}

export class CoordinateUtils {
  private tileWidth: number
  private tileHeight: number
  private canvasWidth: number
  private canvasHeight: number
  private roomWidth: number
  private roomHeight: number
  private zoom: number

  constructor(
    tileWidth: number,
    tileHeight: number,
    canvasWidth: number,
    canvasHeight: number,
    roomWidth: number,
    roomHeight: number,
    zoom: number = 1
  ) {
    this.tileWidth = tileWidth
    this.tileHeight = tileHeight
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
    this.roomWidth = roomWidth
    this.roomHeight = roomHeight
    this.zoom = zoom
  }

  public updateRoomSize(roomWidth: number, roomHeight: number) {
    this.roomWidth = roomWidth
    this.roomHeight = roomHeight
  }

  public updateCanvasSize(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight
  }

  public updateZoom(zoom: number) {
    this.zoom = zoom
  }

  public worldToScreen(worldX: number, worldY: number): ScreenPosition {
    const tileWidth = this.tileWidth * this.zoom
    const tileHeight = this.tileHeight * this.zoom

    // Center the room in the canvas using isometric coordinates
    const roomCenterX = this.roomWidth / 2
    const roomCenterY = this.roomHeight / 2

    // Convert room center to screen coordinates
    const centerScreenX = (roomCenterX - roomCenterY) * (tileWidth / 2)
    const centerScreenY = (roomCenterX + roomCenterY) * (tileHeight / 2)

    // Calculate offset to center the room
    const offsetX = (this.canvasWidth / 2) - centerScreenX
    const offsetY = (this.canvasHeight / 2) - centerScreenY

    // True isometric coordinate conversion
    // Convert from world coordinates to isometric screen coordinates
    const screenX = (worldX - worldY) * (tileWidth / 2) + offsetX
    const screenY = (worldX + worldY) * (tileHeight / 2) + offsetY
    return { x: screenX, y: screenY }
  }

  public screenToWorld(screenX: number, screenY: number): WorldPosition {
    const tileWidth = this.tileWidth * this.zoom
    const tileHeight = this.tileHeight * this.zoom

    // Use the same centering logic as worldToScreen
    const roomCenterX = this.roomWidth / 2
    const roomCenterY = this.roomHeight / 2

    // Convert room center to screen coordinates (same as worldToScreen)
    const centerScreenX = (roomCenterX - roomCenterY) * (tileWidth / 2)
    const centerScreenY = (roomCenterX + roomCenterY) * (tileHeight / 2)

    const offsetX = (this.canvasWidth / 2) - centerScreenX
    const offsetY = (this.canvasHeight / 2) - centerScreenY

    // Reverse the true isometric transformation
    // From worldToScreen:
    // screenX = (worldX - worldY) * (tileWidth / 2) + offsetX
    // screenY = (worldX + worldY) * (tileHeight / 2) + offsetY
    // 
    // Solving for worldX and worldY:
    const relativeX = screenX - offsetX
    const relativeY = screenY - offsetY
    
    const worldX = (relativeX / (tileWidth / 2) + relativeY / (tileHeight / 2)) / 2
    const worldY = (relativeY / (tileHeight / 2) - relativeX / (tileWidth / 2)) / 2

    return { x: worldX, y: worldY }
  }
}
