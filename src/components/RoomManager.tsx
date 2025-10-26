import React, { useState } from 'react'
import { Room } from '../context/GameContext'

interface RoomManagerProps {
  rooms: Room[]
  currentRoom: Room | null
  onRoomSelect: (room: Room) => void
  onRoomCreate: (name: string, width: number, height: number) => void
  onRoomDelete: (roomId: string) => void
  onRoomRename: (roomId: string, newName: string) => void
}

export const RoomManager: React.FC<RoomManagerProps> = ({
  rooms,
  currentRoom,
  onRoomSelect,
  onRoomCreate,
  onRoomDelete,
  onRoomRename
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomWidth, setNewRoomWidth] = useState(10)
  const [newRoomHeight, setNewRoomHeight] = useState(10)
  const [editingRoom, setEditingRoom] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleCreateRoom = () => {
    if (newRoomName.trim()) {
      onRoomCreate(newRoomName.trim(), newRoomWidth, newRoomHeight)
      setNewRoomName('')
      setNewRoomWidth(10)
      setNewRoomHeight(10)
      setShowCreateForm(false)
    }
  }

  const handleRename = (roomId: string, currentName: string) => {
    setEditingRoom(roomId)
    setEditName(currentName)
  }

  const handleSaveRename = () => {
    if (editName.trim() && editingRoom) {
      onRoomRename(editingRoom, editName.trim())
      setEditingRoom(null)
      setEditName('')
    }
  }

  const handleCancelRename = () => {
    setEditingRoom(null)
    setEditName('')
  }

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Room Manager</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
        >
          {showCreateForm ? 'Cancel' : 'New Room'}
        </button>
      </div>

      {/* Create Room Form */}
      {showCreateForm && (
        <div className="mb-4 p-3 bg-gray-700 rounded">
          <h4 className="text-md font-medium mb-2">Create New Room</h4>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Room name"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm"
            />
            <div className="flex space-x-2">
              <input
                type="number"
                placeholder="Width"
                value={newRoomWidth}
                onChange={(e) => setNewRoomWidth(parseInt(e.target.value) || 10)}
                min="5"
                max="20"
                className="w-20 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm"
              />
              <input
                type="number"
                placeholder="Height"
                value={newRoomHeight}
                onChange={(e) => setNewRoomHeight(parseInt(e.target.value) || 10)}
                min="5"
                max="20"
                className="w-20 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm"
              />
            </div>
            <button
              onClick={handleCreateRoom}
              className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
            >
              Create Room
            </button>
          </div>
        </div>
      )}

      {/* Room List */}
      <div className="space-y-2">
        {rooms.map((room) => (
          <div
            key={room.id}
            className={`p-2 rounded border ${
              currentRoom?.id === room.id
                ? 'bg-blue-600 border-blue-500'
                : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {editingRoom === room.id ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveRename}
                      className="text-green-400 hover:text-green-300 text-sm"
                    >
                      ✓
                    </button>
                    <button
                      onClick={handleCancelRename}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      ✗
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{room.name}</span>
                    <span className="text-xs text-gray-400">
                      {room.width}×{room.height}
                    </span>
                    <span className="text-xs text-gray-400">
                      {room.furniture.length} items
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-1">
                {editingRoom !== room.id && (
                  <>
                    <button
                      onClick={() => onRoomSelect(room)}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                      title="Enter room"
                    >
                      →
                    </button>
                    <button
                      onClick={() => handleRename(room.id, room.name)}
                      className="text-yellow-400 hover:text-yellow-300 text-sm"
                      title="Rename room"
                    >
                      ✏️
                    </button>
                    {rooms.length > 1 && (
                      <button
                        onClick={() => onRoomDelete(room.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                        title="Delete room"
                      >
                        🗑️
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {rooms.length === 0 && (
        <div className="text-center text-gray-400 py-4">
          No rooms yet. Create your first room!
        </div>
      )}
    </div>
  )
}
