import React from 'react'
import { useGame } from '../context/GameContext'

const PlayerInfo: React.FC = () => {
  const { state } = useGame()
  const currentPlayer = state.players[state.currentPlayerId]

  if (!currentPlayer) return null

  return (
    <div className="habbo-floating-card">
      <h4 className="habbo-floating-card__title">Current Guest</h4>
      <div className="habbo-floating-card__badge" style={{ color: currentPlayer.color }}>
        {currentPlayer.name}
      </div>
    </div>
  )
}

export default PlayerInfo
