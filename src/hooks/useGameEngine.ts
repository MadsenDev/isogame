import { useCallback, useRef, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import { GameEngine } from '../utils/GameEngine'

export function useGameEngine() {
  const { state, dispatch } = useGame()
  const gameEngineRef = useRef<GameEngine | null>(null)

  const initializeGame = useCallback((canvas: HTMLCanvasElement) => {
    if (!gameEngineRef.current) {
      gameEngineRef.current = new GameEngine(canvas, state, dispatch)

      // Dev-only: lets the console and browser tests address exact tiles
      // instead of guessing at canvas fractions.
      if (import.meta.env.DEV) {
        const debugWindow = window as unknown as {
          __isoWorldToScreen?: (x: number, y: number) => { x: number; y: number }
        }
        debugWindow.__isoWorldToScreen = (x, y) => gameEngineRef.current!.worldToScreen(x, y)
      }
    }
  }, [state, dispatch])

  // Update the game engine state whenever React state changes
  useEffect(() => {
    if (gameEngineRef.current) {
      gameEngineRef.current.updateState(state)
    }
  }, [state])

  // The engine owns a window-level keydown listener; release it on unmount.
  useEffect(() => {
    return () => {
      gameEngineRef.current?.destroy()
      gameEngineRef.current = null
    }
  }, [])

  const render = useCallback(() => {
    if (gameEngineRef.current) {
      gameEngineRef.current.render()
    }
  }, [])

  const worldToScreen = useCallback((x: number, y: number) => {
    if (gameEngineRef.current) {
      return gameEngineRef.current.worldToScreen(x, y)
    }
    return { x: 0, y: 0 }
  }, [])

  const gridSize = 32 // This should match the GameEngine gridSize

  const handleClick = useCallback((x: number, y: number) => {
    if (gameEngineRef.current) {
      gameEngineRef.current.handleClick(x, y)
    }
  }, [])

  const handleRightClick = useCallback((x: number, y: number) => {
    if (gameEngineRef.current) {
      gameEngineRef.current.handleRightClick(x, y)
    }
  }, [])

  const handleMouseMove = useCallback((x: number, y: number) => {
    if (gameEngineRef.current) {
      gameEngineRef.current.handleMouseMove(x, y)
    }
  }, [])

  return {
    initializeGame,
    render,
    worldToScreen,
    gridSize,
    handleClick,
    handleRightClick,
    handleMouseMove
  }
}
