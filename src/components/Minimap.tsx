import React, { useRef, useEffect } from 'react'
import { useGame } from '../context/GameContext'

const Minimap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { state } = useGame()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !state.currentRoom) return

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const scaleX = canvas.width / state.currentRoom.width
    const scaleY = canvas.height / state.currentRoom.height

    ctx.fillStyle = '#141a2b'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Walls belong to a tile edge now, not to a tile of their own, so they are
    // drawn as a tick along that edge rather than as a filled cell.
    ctx.fillStyle = '#1f2a44'
    state.currentRoom.walls.forEach(wall => {
      const x = wall.x * scaleX
      const y = wall.y * scaleY
      if (wall.edge === 'north') {
        ctx.fillRect(x, y, Math.max(1, scaleX * 0.2), scaleY)
      } else {
        ctx.fillRect(x, y, scaleX, Math.max(1, scaleY * 0.2))
      }
    })

    ctx.fillStyle = '#8B4513'
    state.currentRoom.furniture.forEach(furniture => {
      ctx.fillRect(furniture.x * scaleX, furniture.y * scaleY, scaleX, scaleY)
    })

    state.players.forEach(player => {
      ctx.fillStyle = player.color
      ctx.fillRect(player.x * scaleX, player.y * scaleY, scaleX, scaleY)

      if (player.id === state.currentPlayerId) {
        ctx.strokeStyle = '#FFD700'
        ctx.lineWidth = 2
        ctx.strokeRect(player.x * scaleX, player.y * scaleY, scaleX, scaleY)
      }
    })
  }, [state])

  return (
    <div className="neo-minimap">
      <canvas ref={canvasRef} width={200} height={150} className="neo-minimap__canvas" />
    </div>
  )
}

export default Minimap
