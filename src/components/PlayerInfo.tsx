import React from 'react'
import { useGame } from '../context/GameContext'

const PlayerInfo: React.FC = () => {
  const { state } = useGame()
  const currentPlayer = state.players[state.currentPlayerId]

  if (!currentPlayer) return null

  return (
    <div className="absolute top-5 right-5 bg-black bg-opacity-80 text-white p-4 rounded-lg min-w-40">
      <h4 className="mb-2.5 text-blue-400">Current Player</h4>
      <div 
        className="font-bold mb-2.5"
        style={{ color: currentPlayer.color }}
      >
        {currentPlayer.name}
      </div>
    </div>
  )
}

export default PlayerInfo
