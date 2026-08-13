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

  /**
   * Keep the backing store the same size as the element on screen.
   *
   * The canvas used to be a fixed 1200x800 stretched to fill its container, so
   * the browser rescaled the finished frame by whatever fraction that happened
   * to be - which shears pixel art apart no matter how carefully it was
   * rendered. Matching the two means one canvas pixel is one CSS pixel, and a
   * hi-dpi screen then upscales by an exact integer.
   */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const width = Math.max(1, Math.round(rect.width))
      const height = Math.max(1, Math.round(rect.height))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  return <canvas ref={canvasRef} className="iso-room-canvas" />
}

export default GameCanvas
