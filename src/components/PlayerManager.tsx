import React from 'react'
import { useGame } from '../context/GameContext'
import Player from './Player'

interface PlayerManagerProps {
  worldToScreen: (x: number, y: number) => { x: number; y: number }
  gridSize: number
  onPlayerRightClick: (player: any, x: number, y: number) => void
}

const PlayerManager: React.FC<PlayerManagerProps> = ({ 
  worldToScreen, 
  gridSize, 
  onPlayerRightClick 
}) => {
  const { state } = useGame()

  return (
    <>
      {state.players.map(player => (
        <Player
          key={player.id}
          player={player}
          isCurrentPlayer={player.id === state.currentPlayerId}
          onRightClick={onPlayerRightClick}
          worldToScreen={worldToScreen}
          gridSize={gridSize}
        />
      ))}
    </>
  )
}

export default PlayerManager
