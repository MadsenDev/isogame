export interface Position {
  x: number
  y: number
}

export class Pathfinder {
  private isValidPosition: (x: number, y: number, excludePlayerId: number) => boolean

  constructor(isValidPosition: (x: number, y: number, excludePlayerId: number) => boolean) {
    this.isValidPosition = isValidPosition
  }

  public findPath(startX: number, startY: number, endX: number, endY: number, excludePlayerId: number): Position[] {
    // Check if destination is valid
    if (!this.isValidPosition(endX, endY, excludePlayerId)) {
      return []
    }
    
    // If already at destination, return empty path
    if (startX === endX && startY === endY) {
      return []
    }
    
    // A* pathfinding implementation
    const openSet = new Set<string>()
    const closedSet = new Set<string>()
    const cameFrom = new Map<string, string>()
    const gScore = new Map<string, number>()
    const fScore = new Map<string, number>()
    
    const startKey = `${startX},${startY}`
    const endKey = `${endX},${endY}`
    
    openSet.add(startKey)
    gScore.set(startKey, 0)
    fScore.set(startKey, this.heuristic(startX, startY, endX, endY))
    
    while (openSet.size > 0) {
      // Find node with lowest fScore
      let current = ''
      let lowestF = Infinity
      for (const node of openSet) {
        const f = fScore.get(node) || Infinity
        if (f < lowestF) {
          lowestF = f
          current = node
        }
      }
      
      if (current === endKey) {
        // Reconstruct path
        return this.reconstructPath(cameFrom, current)
      }
      
      openSet.delete(current)
      closedSet.add(current)
      
      const [currentX, currentY] = current.split(',').map(Number)
      
      // Check all 8 directions (including diagonals)
      const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ]
      
      for (const [dx, dy] of directions) {
        const neighborX = currentX + dx
        const neighborY = currentY + dy
        const neighborKey = `${neighborX},${neighborY}`
        
        if (closedSet.has(neighborKey)) continue
        
        // Check if neighbor is valid
        if (!this.isValidPosition(neighborX, neighborY, excludePlayerId)) continue
        
        const tentativeG = (gScore.get(current) || 0) + (dx !== 0 && dy !== 0 ? 1.4 : 1) // Diagonal cost
        
        if (!openSet.has(neighborKey)) {
          openSet.add(neighborKey)
        } else if (tentativeG >= (gScore.get(neighborKey) || Infinity)) {
          continue
        }
        
        cameFrom.set(neighborKey, current)
        gScore.set(neighborKey, tentativeG)
        fScore.set(neighborKey, tentativeG + this.heuristic(neighborX, neighborY, endX, endY))
      }
    }
    
    // No path found, return empty array
    return []
  }
  
  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    // Manhattan distance for isometric grid
    return Math.abs(x1 - x2) + Math.abs(y1 - y2)
  }
  
  private reconstructPath(cameFrom: Map<string, string>, current: string): Position[] {
    const path: Position[] = []
    
    while (cameFrom.has(current)) {
      const [x, y] = current.split(',').map(Number)
      path.unshift({ x, y })
      current = cameFrom.get(current)!
    }
    
    // Add the starting position to the path
    const [startX, startY] = current.split(',').map(Number)
    path.unshift({ x: startX, y: startY })
    
    return path
  }
}
