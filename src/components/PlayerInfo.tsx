import React from 'react'
import { useGame } from '../context/GameContext'

const PlayerInfo: React.FC = () => {
  const { state } = useGame()
  const currentPlayer = state.players[state.currentPlayerId]

  if (!currentPlayer) return null

  return (
    <div className="neo-guide__card">
      <span className="neo-guide__label">Current guest</span>
      <div className="neo-guide__badge" style={{ color: currentPlayer.color }}>
        {currentPlayer.name}
      </div>
    </div>
  )
}

export default PlayerInfo
