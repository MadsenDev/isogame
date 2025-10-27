import React, { useMemo, useState } from 'react'
import { Room, serializeRoomLayout } from '../context/GameContext'

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
  const [showExport, setShowExport] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  const layoutJson = useMemo(() => {
    if (!currentRoom) return ''
    return JSON.stringify(serializeRoomLayout(currentRoom), null, 2)
  }, [currentRoom])

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

  const handleCopyLayout = async () => {
    if (!layoutJson) return

    try {
      if (!navigator?.clipboard) {
        throw new Error('Clipboard API unavailable')
      }

      await navigator.clipboard.writeText(layoutJson)
      setCopyStatus('copied')
    } catch (error) {
      console.error('Failed to copy layout to clipboard', error)
      setCopyStatus('error')
    }

    window.setTimeout(() => setCopyStatus('idle'), 2000)
  }

  return (
    <div className="habbo-window habbo-room-manager">
      <div className="habbo-window__header">
        <h3 className="habbo-window__title">Room Navigator</h3>
        <div className="habbo-button-group">
          <button onClick={() => setShowExport(!showExport)} className="habbo-button habbo-button--ghost">
            {showExport ? 'Hide export' : 'Export layout'}
          </button>
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="habbo-button habbo-button--primary">
            {showCreateForm ? 'Cancel' : 'New room'}
          </button>
        </div>
      </div>

      <div className="habbo-window__body">
        {showExport && (
          <div className="habbo-room-card habbo-room-card--panel">
            <h4 className="habbo-room-card__title">Current room layout</h4>
            {currentRoom ? (
              <>
                <textarea value={layoutJson} readOnly rows={10} className="habbo-room-card__textarea" />
                <div className="habbo-room-card__hint">
                  <span>
                    Use <strong>o</strong> for floor, <strong>x</strong> for empty, <strong>d</strong> for doors and <strong>s</strong> for
                    spawn points.
                  </span>
                  <button onClick={handleCopyLayout} className="habbo-button habbo-button--accent">
                    Copy JSON
                  </button>
                </div>
                {copyStatus === 'copied' && <div className="habbo-room-card__status is-success">Layout copied to clipboard.</div>}
                {copyStatus === 'error' && <div className="habbo-room-card__status is-danger">Copy failed. Try again.</div>}
              </>
            ) : (
              <div className="habbo-room-card__empty">Select a room to export its layout.</div>
            )}
          </div>
        )}

        {showCreateForm && (
          <div className="habbo-room-card habbo-room-card--panel">
            <h4 className="habbo-room-card__title">Create new room</h4>
            <div className="habbo-stack">
              <input
                type="text"
                placeholder="Room name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="habbo-input"
              />
              <div className="habbo-grid habbo-grid--compact">
                <input
                  type="number"
                  placeholder="Width"
                  value={newRoomWidth}
                  onChange={(e) => setNewRoomWidth(parseInt(e.target.value) || 10)}
                  min="5"
                  max="20"
                  className="habbo-input"
                />
                <input
                  type="number"
                  placeholder="Height"
                  value={newRoomHeight}
                  onChange={(e) => setNewRoomHeight(parseInt(e.target.value) || 10)}
                  min="5"
                  max="20"
                  className="habbo-input"
                />
              </div>
              <button onClick={handleCreateRoom} className="habbo-button habbo-button--primary habbo-button--full">
                Create room
              </button>
            </div>
          </div>
        )}

        <div className="habbo-room-list">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`habbo-room-card ${currentRoom?.id === room.id ? 'is-active' : ''}`}
            >
              <div className="habbo-room-card__content">
                {editingRoom === room.id ? (
                  <div className="habbo-room-card__edit">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="habbo-input"
                      autoFocus
                    />
                    <div className="habbo-inline-actions">
                      <button onClick={handleSaveRename} className="habbo-inline-actions__btn is-success" aria-label="Save name">
                        ✓
                      </button>
                      <button onClick={handleCancelRename} className="habbo-inline-actions__btn is-danger" aria-label="Cancel rename">
                        ✗
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="habbo-room-card__meta">
                    <span className="habbo-room-card__name">{room.name}</span>
                    <span>{room.width}×{room.height}</span>
                    <span>{room.furniture.length} items</span>
                  </div>
                )}
              </div>

              {editingRoom !== room.id && (
                <div className="habbo-room-card__actions">
                  <button onClick={() => onRoomSelect(room)} className="habbo-inline-button" title="Enter room">
                    Enter
                  </button>
                  <button onClick={() => handleRename(room.id, room.name)} className="habbo-inline-button" title="Rename room">
                    Rename
                  </button>
                  {rooms.length > 1 && (
                    <button onClick={() => onRoomDelete(room.id)} className="habbo-inline-button is-danger" title="Delete room">
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {rooms.length === 0 && <div className="habbo-room-card__empty">No rooms yet. Create your first hangout!</div>}
      </div>
    </div>
  )
}
