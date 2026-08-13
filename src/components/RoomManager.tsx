import React, { useMemo, useState } from 'react'
import { Room, serializeRoomLayout } from '../context/GameContext'

interface RoomManagerProps {
  rooms: Room[]
  currentRoom: Room | null
  onRoomSelect: (room: Room) => void
  onRoomCreate: (name: string, width: number, height: number) => void
  onRoomDelete: (roomId: string) => void
  onRoomRename: (roomId: string, newName: string) => void
  onResetWorld?: () => void
}

export const RoomManager: React.FC<RoomManagerProps> = ({
  rooms,
  currentRoom,
  onRoomSelect,
  onRoomCreate,
  onRoomDelete,
  onRoomRename,
  onResetWorld
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomWidth, setNewRoomWidth] = useState(12)
  const [newRoomHeight, setNewRoomHeight] = useState(12)
  const [editingRoom, setEditingRoom] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  const layoutJson = useMemo(
    () => (currentRoom ? JSON.stringify(serializeRoomLayout(currentRoom), null, 2) : ''),
    [currentRoom]
  )

  const handleCreateRoom = () => {
    if (!newRoomName.trim()) return
    onRoomCreate(newRoomName.trim(), newRoomWidth, newRoomHeight)
    setNewRoomName('')
    setShowCreateForm(false)
  }

  const handleSaveRename = () => {
    if (editName.trim() && editingRoom) {
      onRoomRename(editingRoom, editName.trim())
    }
    setEditingRoom(null)
    setEditName('')
  }

  const handleCopyLayout = async () => {
    if (!layoutJson) return
    try {
      if (!navigator?.clipboard) throw new Error('Clipboard API unavailable')
      await navigator.clipboard.writeText(layoutJson)
      setCopyStatus('copied')
    } catch (error) {
      console.error('Failed to copy layout to clipboard', error)
      setCopyStatus('error')
    }
    window.setTimeout(() => setCopyStatus('idle'), 2000)
  }

  return (
    <div className="iso-rooms">
      <button
        className="iso-button iso-button--primary iso-button--full"
        onClick={() => setShowCreateForm(value => !value)}
      >
        {showCreateForm ? 'Cancel' : '+ New room'}
      </button>

      {showCreateForm && (
        <div className="iso-form">
          <input
            type="text"
            placeholder="Room name"
            value={newRoomName}
            onChange={event => setNewRoomName(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && handleCreateRoom()}
            className="iso-input"
            autoFocus
          />
          <div className="iso-form__row">
            <label>
              Width
              <input
                type="number"
                value={newRoomWidth}
                onChange={event => setNewRoomWidth(parseInt(event.target.value) || 12)}
                min={5}
                max={30}
                className="iso-input"
              />
            </label>
            <label>
              Height
              <input
                type="number"
                value={newRoomHeight}
                onChange={event => setNewRoomHeight(parseInt(event.target.value) || 12)}
                min={5}
                max={30}
                className="iso-input"
              />
            </label>
          </div>
          <button className="iso-button iso-button--primary iso-button--full" onClick={handleCreateRoom}>
            Create
          </button>
        </div>
      )}

      {/* One row per room: name and stats on the left, actions on the right.
          The previous card stacked three full-width buttons under every room. */}
      <div className="iso-rows">
        {rooms.map(room => (
          <div key={room.id} className={`iso-row ${currentRoom?.id === room.id ? 'is-active' : ''}`}>
            {editingRoom === room.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={event => setEditName(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') handleSaveRename()
                    if (event.key === 'Escape') setEditingRoom(null)
                  }}
                  className="iso-input"
                  autoFocus
                />
                <button className="iso-icon-button" onClick={handleSaveRename} aria-label="Save name">
                  ✓
                </button>
                <button
                  className="iso-icon-button"
                  onClick={() => setEditingRoom(null)}
                  aria-label="Cancel rename"
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                <button className="iso-row__main" onClick={() => onRoomSelect(room)}>
                  <span className="iso-row__name">{room.name}</span>
                  <span className="iso-row__meta">
                    {room.width}×{room.height} · {room.furniture.length} items
                  </span>
                </button>
                <button
                  className="iso-icon-button"
                  onClick={() => {
                    setEditingRoom(room.id)
                    setEditName(room.name)
                  }}
                  aria-label={`Rename ${room.name}`}
                  title="Rename"
                >
                  ✎
                </button>
                {rooms.length > 1 && (
                  <button
                    className="iso-icon-button is-danger"
                    onClick={() => onRoomDelete(room.id)}
                    aria-label={`Delete ${room.name}`}
                    title="Delete"
                  >
                    ✕
                  </button>
                )}
              </>
            )}
          </div>
        ))}

        {rooms.length === 0 && <p className="iso-note">No rooms yet.</p>}
      </div>

      {/* A developer tool, so it stays folded away rather than occupying a
          third of the panel with a read-only textarea. */}
      <button className="iso-button iso-button--ghost iso-button--full" onClick={() => setShowExport(v => !v)}>
        {showExport ? 'Hide layout JSON' : 'Export layout JSON'}
      </button>

      {onResetWorld && (
        <button
          className="iso-button iso-button--ghost iso-button--full"
          onClick={() => {
            if (window.confirm('Discard every saved room and start again?')) onResetWorld()
          }}
        >
          Reset saved rooms
        </button>
      )}

      {showExport && currentRoom && (
        <div className="iso-form">
          <textarea value={layoutJson} readOnly rows={8} className="iso-input iso-input--code" />
          <p className="iso-note">
            <strong>o</strong> floor · <strong>x</strong> empty · <strong>d</strong> door · <strong>s</strong> spawn
          </p>
          <button className="iso-button iso-button--full" onClick={handleCopyLayout}>
            {copyStatus === 'copied' ? 'Copied' : copyStatus === 'error' ? 'Copy failed' : 'Copy JSON'}
          </button>
        </div>
      )}
    </div>
  )
}
