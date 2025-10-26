import React, { useRef, useEffect } from 'react'
import { useGameEngine } from '../hooks/useGameEngine'

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { initializeGame } = useGameEngine()

  useEffect(() => {
    if (canvasRef.current) {
      initializeGame(canvasRef.current)
    }
  }, [initializeGame])

  return (
    <canvas
      ref={canvasRef}
      width={1200}
      height={800}
      className="border-2 border-gray-800 bg-sky-300 cursor-crosshair"
    />
  )
}

export default GameCanvas
