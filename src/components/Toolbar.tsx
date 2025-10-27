import React from 'react'
import { useGame } from '../context/GameContext'

const Toolbar: React.FC = () => {
  const { state, dispatch, roomManager } = useGame()

  const handleResize = (dimension: 'width' | 'height', value: number) => {
    if (!state.currentRoom || !roomManager) return

    const current = state.currentRoom
    const clamped = Math.max(4, Math.min(40, value))

    const nextWidth = dimension === 'width' ? clamped : current.width
    const nextHeight = dimension === 'height' ? clamped : current.height

    if (nextWidth === current.width && nextHeight === current.height) {
      return
    }

    roomManager.updateLayout(current.id, {
      width: nextWidth,
      height: nextHeight,
      doorway: current.doorway,
      spawnPoint: current.spawnPoint
    })
  }

  const handleToolChange = (tool: 'move' | 'furniture' | 'room') => {
    dispatch({ type: 'SET_TOOL', payload: tool })
  }

  return (
    <div className="panel-content">
      <div className="panel-section">
        <div className="habbo-pill-group" role="tablist">
          <button
            className={`habbo-pill ${state.currentTool === 'move' ? 'is-active' : ''}`}
            onClick={() => handleToolChange('move')}
          >
            Move
          </button>
          <button
            className={`habbo-pill ${state.currentTool === 'furniture' ? 'is-active' : ''}`}
            onClick={() => handleToolChange('furniture')}
          >
            Furniture
          </button>
          <button
            className={`habbo-pill ${state.currentTool === 'room' ? 'is-active' : ''}`}
            onClick={() => handleToolChange('room')}
          >
            Rooms
          </button>
        </div>
      </div>

      {state.currentTool === 'move' && (
        <div className="panel-section">
          <p className="habbo-window__muted">
            Click anywhere on the floor to stroll around the resort. Hold shift to queue a path.
          </p>
        </div>
      )}

      {state.currentTool === 'furniture' && (
        <div className="panel-section">
          <h4 className="panel-subtitle">Quick pieces</h4>
          <div className="habbo-list habbo-list--compact">
            {[
              { type: 'chair', emoji: '🪑', name: 'Club Chair' },
              { type: 'table', emoji: '🛎️', name: 'Lobby Table' },
              { type: 'bed', emoji: '🛏️', name: 'Suite Bed' },
              { type: 'sofa', emoji: '🛋️', name: 'Lounger' },
              { type: 'tv', emoji: '📺', name: 'Retro TV' }
            ].map(item => (
              <button
                key={item.type}
                className={`habbo-list__item ${state.selectedFurniture === item.type ? 'is-selected' : ''}`}
                onClick={() => dispatch({ type: 'SELECT_FURNITURE', payload: item.type })}
              >
                <span className="habbo-list__icon">{item.emoji}</span>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {state.currentTool === 'room' && (
        <div className="panel-section">
          <h4 className="panel-subtitle">Floor concierge</h4>
          {state.currentRoom ? (
            <>
              <p className="habbo-window__muted">
                Paint floor tiles to your liking. Tiles with guests, furniture or the spawn point stay protected.
              </p>
              <div className="habbo-stack habbo-stack--gap-sm">
                <button
                  className="habbo-button habbo-button--primary"
                  onClick={() => dispatch({ type: 'FILL_ROOM_FLOOR' })}
                >
                  Fill entire room
                </button>
                <button
                  className="habbo-button habbo-button--ghost"
                  onClick={() => dispatch({ type: 'CLEAR_ROOM_FLOOR' })}
                >
                  Clear empty tiles
                </button>
              </div>
              <dl className="habbo-stats">
                <div>
                  <dt>Room</dt>
                  <dd>{state.currentRoom.name}</dd>
                </div>
                <div>
                  <dt>Floor tiles</dt>
                  <dd>{state.currentRoom.floorTiles.length}</dd>
                </div>
              </dl>
              <div className="habbo-grid">
                <label className="habbo-field">
                  <span>Width</span>
                  <input
                    type="number"
                    min={4}
                    max={40}
                    value={state.currentRoom.width}
                    onChange={(e) => handleResize('width', parseInt(e.target.value, 10) || state.currentRoom!.width)}
                  />
                </label>
                <label className="habbo-field">
                  <span>Height</span>
                  <input
                    type="number"
                    min={4}
                    max={40}
                    value={state.currentRoom.height}
                    onChange={(e) => handleResize('height', parseInt(e.target.value, 10) || state.currentRoom!.height)}
                  />
                </label>
              </div>
            </>
          ) : (
            <p className="habbo-window__muted">Select a room to begin sculpting its layout.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default Toolbar
