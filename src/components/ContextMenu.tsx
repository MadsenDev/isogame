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
      className="habbo-context-menu"
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="habbo-context-menu__body">
        <button className="habbo-context-menu__button" onClick={() => handleAction('sitting')}>
          Sit
        </button>
        <button className="habbo-context-menu__button" onClick={() => handleAction('dancing')}>
          Dance
        </button>
        <button className="habbo-context-menu__button" onClick={() => handleAction('waving')}>
          Wave
        </button>
      </div>
    </div>
  )
}

export default ContextMenu
