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
  const [isOpen, setIsOpen] = useState(false)
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
          className="w-8 h-8 rounded overflow-hidden"
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
        className="w-8 h-8 rounded"
        style={{ backgroundColor: texture.color }}
      />
    )
  }

  const handleSetTileTexture = (x: number, y: number) => {
    roomManager.setTileTexture(state.currentRoom!.id, x, y, selectedTexture)
  }

  if (!state?.currentRoom || !roomManager) return null

  const handleSetFloorTexture = () => {
    roomManager.setFloorTexture(state.currentRoom!.id, selectedTexture)
  }

  return (
    <div className="absolute top-4 left-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg mb-2"
      >
        🎨 Customize Room
      </button>

      {isOpen && (
        <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg w-80">
          <h3 className="text-xl font-bold mb-4">Room Customization</h3>
          
          {/* Floor Texture Selection */}
          <div className="mb-6">
            <h4 className="font-semibold mb-3">Floor Textures</h4>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {FLOOR_TEXTURES.map(texture => (
                <button
                  key={texture.id}
                  onClick={() => setSelectedTexture(texture.id)}
                  className={`p-2 rounded border-2 ${
                    selectedTexture === texture.id
                      ? 'border-blue-500 bg-blue-600'
                      : 'border-gray-600 hover:border-gray-400'
                  }`}
                  title={texture.name}
                >
                  {renderTexturePreview(texture)}
                </button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleSetFloorTexture}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
              >
                Apply to All Floor
              </button>
            </div>
          </div>

          {/* Room Info */}
          <div className="text-sm text-gray-400">
            <p>Room: {state.currentRoom.name}</p>
            <p>Size: {state.currentRoom.width} × {state.currentRoom.height}</p>
            <p>Current Texture: {state.currentRoom.floorTexture || 'default'}</p>
          </div>

          {/* Instructions */}
          <div className="mt-4 text-xs text-gray-500">
            <p>• Select a texture and click "Apply to All Floor" to change the entire room</p>
            <p>• Switch to Room tool and Shift+Click tiles to paint individual textures</p>
            <p>• Preview shows actual tileset textures, not just colors</p>
          </div>
        </div>
      )}
    </div>
  )
}
