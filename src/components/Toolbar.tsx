import React from 'react'
import { useGame } from '../context/GameContext'

const Toolbar: React.FC = () => {
  const { state, dispatch, roomManager } = useGame()

  const handleResize = (dimension: 'width' | 'height', value: number) => {
    if (!state.currentRoom) return

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
    <div className="absolute top-5 left-5 z-50">
      <div className="flex gap-2.5 mb-5">
        <button
          className={`px-5 py-2.5 bg-gray-600 text-white border-0 rounded cursor-pointer text-sm transition-colors duration-300 hover:bg-gray-700 ${state.currentTool === 'move' ? 'bg-blue-600' : ''}`}
          onClick={() => handleToolChange('move')}
        >
          Move
        </button>
        <button
          className={`px-5 py-2.5 bg-gray-600 text-white border-0 rounded cursor-pointer text-sm transition-colors duration-300 hover:bg-gray-700 ${state.currentTool === 'furniture' ? 'bg-blue-600' : ''}`}
          onClick={() => handleToolChange('furniture')}
        >
          Furniture
        </button>
        <button
          className={`px-5 py-2.5 bg-gray-600 text-white border-0 rounded cursor-pointer text-sm transition-colors duration-300 hover:bg-gray-700 ${state.currentTool === 'room' ? 'bg-blue-600' : ''}`}
          onClick={() => handleToolChange('room')}
        >
          Rooms
        </button>
      </div>
      
      {state.currentTool === 'furniture' && (
        <div className="bg-black bg-opacity-80 text-white p-5 rounded-lg min-w-64 max-h-96 overflow-y-auto">
          <h3 className="text-blue-400 mb-4">Furniture</h3>
          <div className="space-y-1">
            {[
              { type: 'chair', emoji: '🪑', name: 'Chair' },
              { type: 'table', emoji: '🪑', name: 'Table' },
              { type: 'bed', emoji: '🛏️', name: 'Bed' },
              { type: 'sofa', emoji: '🛋️', name: 'Sofa' },
              { type: 'tv', emoji: '📺', name: 'TV' }
            ].map(item => (
              <div
                key={item.type}
                className={`p-2.5 my-1.5 bg-gray-700 rounded cursor-pointer transition-colors duration-300 flex items-center gap-2.5 hover:bg-gray-600 ${state.selectedFurniture === item.type ? 'bg-blue-600' : ''}`}
                onClick={() => dispatch({ type: 'SELECT_FURNITURE', payload: item.type })}
              >
                <span>{item.emoji}</span>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {state.currentTool === 'room' && (
        <div className="bg-black bg-opacity-80 text-white p-5 rounded-lg min-w-72 max-w-xs shadow-xl">
          <h3 className="text-blue-400 mb-2">Floor Editor</h3>
          {state.currentRoom ? (
            <>
              <p className="text-sm text-gray-300 leading-relaxed mb-4">
                Left-click tiles in the room to place or remove floor pieces. Tiles with furniture, players, or the spawn point can&apos;t be removed.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => dispatch({ type: 'FILL_ROOM_FLOOR' })}
                >
                  Fill Entire Room
                </button>
                <button
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => dispatch({ type: 'CLEAR_ROOM_FLOOR' })}
                >
                  Clear Floor (Keep occupied tiles)
                </button>
              </div>
              <div className="mt-4 text-xs text-gray-400 space-y-1">
                <div><span className="font-semibold text-gray-300">Room:</span> {state.currentRoom.name}</div>
                <div>
                  <span className="font-semibold text-gray-300">Floor tiles:</span> {state.currentRoom.floorTiles.length}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <label className="flex flex-col gap-1">
                  <span className="text-gray-400">Width</span>
                  <input
                    type="number"
                    min={4}
                    max={40}
                    value={state.currentRoom.width}
                    onChange={(e) => handleResize('width', parseInt(e.target.value, 10) || state.currentRoom!.width)}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-gray-400">Height</span>
                  <input
                    type="number"
                    min={4}
                    max={40}
                    value={state.currentRoom.height}
                    onChange={(e) => handleResize('height', parseInt(e.target.value, 10) || state.currentRoom!.height)}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                  />
                </label>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-300">Select a room to start editing its floor layout.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default Toolbar
