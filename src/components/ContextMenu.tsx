import React, { useEffect } from 'react'
import { useGame, PlayerAction } from '../context/GameContext'

/**
 * How long each emote runs before the player goes back to standing.
 *
 * Furniture carries its own durations, generated alongside the sprite; these
 * are the two actions that belong to a person rather than to an object, so
 * their length is decided here.
 */
const EMOTE_MS: Partial<Record<PlayerAction, number>> = {
  dancing: 8000,
  waving: 2400
}

const ContextMenu: React.FC = () => {
  const { state, dispatch } = useGame()

  const handleAction = (action: PlayerAction) => {
    if (state.contextMenuTarget) {
      dispatch({
        type: 'SET_PLAYER_ACTION',
        payload: { playerId: state.contextMenuTarget.id, action, durationMs: EMOTE_MS[action] }
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
      className="iso-context-menu"
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="iso-context-menu__body">
        <button className="iso-context-menu__button" onClick={() => handleAction('sitting')}>
          Sit
        </button>
        <button className="iso-context-menu__button" onClick={() => handleAction('dancing')}>
          Dance
        </button>
        <button className="iso-context-menu__button" onClick={() => handleAction('waving')}>
          Wave
        </button>
      </div>
    </div>
  )
}

export default ContextMenu
