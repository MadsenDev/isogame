import React from 'react'
import { useGame } from '../context/GameContext'

const Toolbar: React.FC = () => {
  const { state, dispatch } = useGame()

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
        <div className="bg-black bg-opacity-80 text-white p-5 rounded-lg min-w-64 max-h-96 overflow-y-auto">
          <h3 className="text-blue-400 mb-4">Rooms</h3>
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mb-4"
            onClick={() => {
              const newRoom = {
                id: `room-${Date.now()}`,
                name: `Room ${state.rooms.length + 1}`,
                width: 15,
                height: 10,
                furniture: [],
                walls: []
              }
              dispatch({ type: 'ADD_ROOM', payload: newRoom })
            }}
          >
            Create New Room
          </button>
          <div className="space-y-1">
            {state.rooms.map(room => (
              <div
                key={room.id}
                className={`p-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 ${
                  state.currentRoom?.id === room.id ? 'bg-blue-600' : ''
                }`}
                onClick={() => dispatch({ type: 'SET_CURRENT_ROOM', payload: room })}
              >
                {room.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Toolbar
