# Isometric Game Character Direction Mapping Issue

## Problem Summary
We have an isometric browser game where characters move on a grid using A* pathfinding, but the character sprites are facing the wrong direction when moving. The issue is that we need to map **logical grid movement directions** to **sprite facing directions**, but the mapping is incorrect.

## Game Architecture
- **Engine**: Vite + React + TypeScript
- **Rendering**: HTML5 Canvas with isometric projection
- **Movement**: Click-based pathfinding with smooth interpolation
- **Sprites**: 8-directional character sprites (south, south-east, east, north-east, north, north-west, west, south-west)

## Coordinate System
We use a **true isometric coordinate system** with these transformations:

```typescript
// World to Screen conversion
screenX = (worldX - worldY) * (tileWidth / 2) + offsetX
screenY = (worldX + worldY) * (tileHeight / 2) + offsetY

// Screen to World conversion  
worldX = (relativeX / (tileWidth / 2) + relativeY / (tileHeight / 2)) / 2
worldY = (relativeY / (tileHeight / 2) - relativeX / (tileWidth / 2)) / 2
```

## Pathfinding System
The A* pathfinder uses standard 8-directional movement:

```typescript
const directions = [
  [-1, -1], [-1, 0], [-1, 1],  // north-west, north, north-east
  [0, -1],           [0, 1],    // west,           east  
  [1, -1],  [1, 0],  [1, 1]    // south-west, south, south-east
]
```

Where:
- `dx = -1, dy = -1` = **north-west** movement
- `dx = -1, dy = 0` = **north** movement  
- `dx = -1, dy = 1` = **north-east** movement
- `dx = 0, dy = -1` = **west** movement
- `dx = 0, dy = 1` = **east** movement
- `dx = 1, dy = -1` = **south-west** movement
- `dx = 1, dy = 0` = **south** movement
- `dx = 1, dy = 1` = **south-east** movement

## Current Direction Mapping (INCORRECT)
```typescript
public getCharacterDirection(player: Player): string {
  if (player.isMoving && player.path.length > 0 && player.pathIndex < player.path.length) {
    const currentPos = player.path[player.pathIndex]
    
    let startX: number, startY: number
    if (player.pathIndex === 0) {
      startX = Math.round(player.x)
      startY = Math.round(player.y)
    } else {
      startX = player.path[player.pathIndex - 1].x
      startY = player.path[player.pathIndex - 1].y
    }
    
    const dx = currentPos.x - startX // +1 right, -1 left
    const dy = currentPos.y - startY // +1 down, -1 up

    // Current mapping (WRONG)
    let direction: string
    if (dx === -1 && dy === -1) direction = 'north-west'
    else if (dx === 0 && dy === -1) direction = 'north'
    else if (dx === 1 && dy === -1) direction = 'north-east'
    else if (dx === -1 && dy === 0) direction = 'west'
    else if (dx === 1 && dy === 0) direction = 'east'
    else if (dx === -1 && dy === 1) direction = 'south-west'
    else if (dx === 0 && dy === 1) direction = 'south'
    else if (dx === 1 && dy === 1) direction = 'south-east'
    else direction = this.lastDirection

    this.lastDirection = direction
    return direction
  }
  
  return this.lastDirection
}
```

## Sprite Assets
We have 8 directional sprites named:
- `south.png` - Character facing south
- `south-east.png` - Character facing south-east  
- `east.png` - Character facing east
- `north-east.png` - Character facing north-east
- `north.png` - Character facing north
- `north-west.png` - Character facing north-west
- `west.png` - Character facing west
- `south-west.png` - Character facing south-west

## The Core Issue
**Question**: When a character moves in a specific direction on the isometric grid, which sprite should be used?

**Current Problem**: 
- When moving **north** (dx=0, dy=-1), the character faces **north** sprite
- When moving **south** (dx=0, dy=1), the character faces **south** sprite
- But this doesn't look correct visually

**Key Questions**:
1. Are the sprites named by the direction they **face** or the direction they **move**?
2. Should moving north make the character face north, or face the opposite direction?
3. How does the isometric projection affect the visual direction mapping?

## Visual Context
In our isometric view:
- **Grid coordinates**: (0,0) is top-left, X increases right, Y increases down
- **Screen coordinates**: Isometric diamond tiles, with the room centered
- **Character movement**: Smooth interpolation between grid cells
- **Character rendering**: Sprites are drawn with feet centered on grid cells

## What We've Tried
1. **Direct mapping**: Moving north → north sprite (current approach)
2. **Opposite mapping**: Moving north → south sprite  
3. **Rotated mappings**: Various clockwise/counter-clockwise rotations
4. **Pathfinder-based mapping**: Using the exact same directions as A* algorithm

## Expected Behavior
We want characters to face the direction they're **visually moving** in the isometric view, not necessarily the logical grid direction.

## Code Context
The direction is used in the rendering method:
```typescript
public drawPlayer(player: Player, screenPos: { x: number; y: number }, isCurrentPlayer: boolean) {
  const direction = this.getCharacterDirection(player)
  
  // Use walk animation when moving
  if (player.isMoving && player.path.length > 0 && player.pathIndex < player.path.length) {
    const animationFrames = this.characterAnimations.get(`walk-${direction}`)
    // ... animation logic
  }
  
  // Fallback to static sprite
  if (!spriteToDraw) {
    spriteToDraw = this.characterSprites.get(direction) || null
  }
  
  // Draw the sprite
  this.ctx.drawImage(spriteToDraw, ...)
}
```

## Question for ChatGPT
Given this isometric game setup with true isometric coordinate conversion and 8-directional sprites, what should be the correct mapping between logical grid movement directions (dx, dy) and sprite directions to make characters face the direction they're visually moving?
