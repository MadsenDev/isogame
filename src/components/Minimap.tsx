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

    // Draw room
    ctx.fillStyle = '#2d3748'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw walls
    ctx.fillStyle = '#4a5568'
    state.currentRoom.walls.forEach(wall => {
      ctx.fillRect(wall.x * scaleX, wall.y * scaleY, scaleX, scaleY)
    })

    // Draw furniture
    ctx.fillStyle = '#8B4513'
    state.currentRoom.furniture.forEach(furniture => {
      ctx.fillRect(furniture.x * scaleX, furniture.y * scaleY, scaleX, scaleY)
    })

    // Draw players
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
    <div className="absolute top-5 right-5 bg-black bg-opacity-80 rounded-lg p-2.5">
      <canvas ref={canvasRef} width={200} height={150} className="border border-gray-600 rounded" />
    </div>
  )
}

export default Minimap
