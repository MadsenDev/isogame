import React, { useEffect } from 'react'
import { Player as PlayerType } from '../context/GameContext'

interface PlayerProps {
  player: PlayerType
  isCurrentPlayer: boolean
  onRightClick: (player: PlayerType, x: number, y: number) => void
  worldToScreen: (x: number, y: number) => { x: number; y: number }
  gridSize: number
  characterSprites: Map<string, HTMLImageElement>
}

const Player: React.FC<PlayerProps> = ({ 
  player, 
  isCurrentPlayer, 
  onRightClick, 
  worldToScreen, 
  gridSize,
  characterSprites
}) => {
  // This component now just provides rendering data to the parent
  // The actual rendering is handled by the GameEngine
  
  const getCharacterDirection = (): string => {
    // If player is moving, determine direction based on movement
    if (player.isMoving && player.path.length > 0 && player.pathIndex < player.path.length) {
      const currentPos = player.path[player.pathIndex]
      const dx = currentPos.x - player.x
      const dy = currentPos.y - player.y
      
      // Determine direction based on movement vector
      if (dx === 0 && dy > 0) return 'south'
      if (dx > 0 && dy > 0) return 'south-east'
      if (dx > 0 && dy === 0) return 'east'
      if (dx > 0 && dy < 0) return 'north-east'
      if (dx === 0 && dy < 0) return 'north'
      if (dx < 0 && dy < 0) return 'north-west'
      if (dx < 0 && dy === 0) return 'west'
      if (dx < 0 && dy > 0) return 'south-west'
    }
    
    // Default direction when not moving
    return 'south'
  }

  // Expose rendering data to parent
  const renderData = {
    player,
    isCurrentPlayer,
    direction: getCharacterDirection(),
    screenPos: worldToScreen(player.x, player.y),
    sprite: characterSprites.get(getCharacterDirection()),
    gridSize
  }

  // Return null since rendering is handled by GameEngine
  return null
}

export default Player
