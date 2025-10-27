import React, { useState, useEffect, useMemo } from 'react'
import { useGame } from '../context/GameContext'

const FLOOR_TEXTURES = [
  { id: 'grass', name: 'Grass', color: '#90EE90' },
  { id: 'stone', name: 'Stone', color: '#A9A9A9' },
  { id: 'wood', name: 'Wood', color: '#8B4513' },
  { id: 'marble', name: 'Marble', color: '#F5F5DC' },
  { id: 'carpet', name: 'Carpet', color: '#DC143C' },
  { id: 'brick', name: 'Brick', color: '#CD853F' },
  { id: 'sand', name: 'Sand', color: '#F4A460' },
  { id: 'water', name: 'Water', color: '#4682B4' }
]

export const RoomCustomization: React.FC = () => {
  const { state, roomManager } = useGame()
  const [selectedTexture, setSelectedTexture] = useState<string>('wood')
  const [isOpen, setIsOpen] = useState(true)
  const [tilesetImage, setTilesetImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    // Load the tileset image for texture previews
    const img = new Image()
    img.src = '/src/assets/tileset.jpg'
    img.onload = () => {
      setTilesetImage(img)
    }
  }, [])

  const getTextureCoordinates = (texture: string): { row: number; col: number } => {
    const textureMap: Record<string, { row: number; col: number }> = {
      'grass': { row: 1, col: 1 },
      'stone': { row: 1, col: 2 },
      'wood': { row: 1, col: 3 },
      'marble': { row: 1, col: 4 },
      'carpet': { row: 1, col: 5 },
      'brick': { row: 1, col: 6 },
      'sand': { row: 1, col: 7 },
      'water': { row: 1, col: 8 },
      'default': { row: 1, col: 3 }
    }
    return textureMap[texture] || textureMap['default']
  }

  // Memoize texture preview URLs to avoid recreating them on every render
  const texturePreviews = useMemo(() => {
    if (!tilesetImage) return {}
    
    const previews: Record<string, string> = {}
    const tileSize = 32
    
    FLOOR_TEXTURES.forEach(texture => {
      const coords = getTextureCoordinates(texture.id)
      const sourceX = (coords.col - 1) * tileSize
      const sourceY = (coords.row - 1) * tileSize
      
      const canvas = document.createElement('canvas')
      canvas.width = 32
      canvas.height = 32
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        ctx.drawImage(
          tilesetImage,
          sourceX, sourceY, tileSize, tileSize,
          0, 0, 32, 32
        )
        previews[texture.id] = canvas.toDataURL()
      }
    })
    
    return previews
  }, [tilesetImage])

  const renderTexturePreview = (texture: { id: string; name: string; color: string }) => {
    const previewUrl = texturePreviews[texture.id]
    
    if (previewUrl) {
      return (
        <div
          className="habbo-texture__preview"
          style={{
            backgroundImage: `url(${previewUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )
    }
    
    // Fallback to color if tileset not loaded
    return (
      <div
        className="habbo-texture__preview"
        style={{ backgroundColor: texture.color }}
      />
    )
  }

  if (!state?.currentRoom || !roomManager) return null

  const handleSetFloorTexture = () => {
    roomManager.setFloorTexture(state.currentRoom!.id, selectedTexture)
  }

  return (
    <div className="habbo-window">
      <div className="habbo-window__header">
        <h3 className="habbo-window__title">Room Styling</h3>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="habbo-window__toggle"
          aria-expanded={isOpen}
          aria-label="Toggle room styling"
        >
          {isOpen ? '–' : '+'}
        </button>
      </div>

      {isOpen && (
        <div className="habbo-window__body">
          <h4 className="habbo-window__section-title">Floor Textures</h4>
          <div className="habbo-grid habbo-grid--textures">
            {FLOOR_TEXTURES.map(texture => (
              <button
                key={texture.id}
                onClick={() => setSelectedTexture(texture.id)}
                className={`habbo-texture ${selectedTexture === texture.id ? 'is-active' : ''}`}
                title={texture.name}
              >
                {renderTexturePreview(texture)}
                <span>{texture.name}</span>
              </button>
            ))}
          </div>

          <button onClick={handleSetFloorTexture} className="habbo-button habbo-button--primary habbo-button--full">
            Apply to all tiles
          </button>

          <div className="habbo-window__divider" />

          <div className="habbo-room-meta">
            <div>
              <span>Room</span>
              <strong>{state.currentRoom.name}</strong>
            </div>
            <div>
              <span>Size</span>
              <strong>
                {state.currentRoom.width} × {state.currentRoom.height}
              </strong>
            </div>
            <div>
              <span>Texture</span>
              <strong>{state.currentRoom.floorTexture || 'Default'}</strong>
            </div>
          </div>

          <ul className="habbo-guidelines">
            <li>Select a texture then tap the button above to recolour the room.</li>
            <li>Use the Room tool with Shift+Click for precision painting.</li>
            <li>Previews pull from the actual resort tileset for accuracy.</li>
          </ul>
        </div>
      )}
    </div>
  )
}
