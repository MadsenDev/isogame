import React, { useEffect } from 'react'
import { useGame, Player } from '../context/GameContext'

const ContextMenu: React.FC = () => {
  const { state, dispatch } = useGame()

  const handleAction = (action: Player['action']) => {
    if (state.contextMenuTarget) {
      dispatch({
        type: 'SET_PLAYER_ACTION',
        payload: { playerId: state.contextMenuTarget.id, action }
      })
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: {
          text: `${state.contextMenuTarget.name} is ${action}!`,
          timestamp: Date.now()
        }
      })
    }
    dispatch({ type: 'HIDE_CONTEXT_MENU' })
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element
      if (!target.closest('.context-menu') && !target.closest('canvas')) {
        dispatch({ type: 'HIDE_CONTEXT_MENU' })
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [dispatch])

  if (!state.contextMenuVisible || !state.contextMenuTarget) return null

  return (
    <div 
      className="absolute bg-black bg-opacity-90 text-white p-2.5 rounded-lg border border-gray-600 z-50 min-w-32"
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="flex flex-col gap-1.5">
        <button 
          className="px-3 py-2 bg-gray-600 text-white border-0 rounded cursor-pointer text-xs transition-colors duration-300 text-left hover:bg-gray-700"
          onClick={() => handleAction('sitting')}
        >
          Sit
        </button>
        <button 
          className="px-3 py-2 bg-gray-600 text-white border-0 rounded cursor-pointer text-xs transition-colors duration-300 text-left hover:bg-gray-700"
          onClick={() => handleAction('dancing')}
        >
          Dance
        </button>
        <button 
          className="px-3 py-2 bg-gray-600 text-white border-0 rounded cursor-pointer text-xs transition-colors duration-300 text-left hover:bg-gray-700"
          onClick={() => handleAction('waving')}
        >
          Wave
        </button>
      </div>
    </div>
  )
}

export default ContextMenu
