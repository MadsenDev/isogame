import React, { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import { getAllFurnitureDefinitions, getFurnitureByCategory } from '../data/furnitureDefinitions'

export const FurnitureSelector: React.FC = () => {
  const { state, dispatch } = useGame()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [tilesetImage, setTilesetImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    // Load the tileset image for furniture previews
    const img = new Image()
    img.src = '/src/assets/tileset.jpg'
    img.onload = () => {
      setTilesetImage(img)
    }
  }, [])

  const categories = [
    { id: 'all', name: 'All', icon: '📦' },
    { id: 'seating', name: 'Seating', icon: '🪑' },
    { id: 'decoration', name: 'Decoration', icon: '🎨' },
    { id: 'functional', name: 'Functional', icon: '⚙️' },
    { id: 'flooring', name: 'Flooring', icon: '🏠' },
    { id: 'wall', name: 'Wall', icon: '🧱' }
  ]

  const getFilteredFurniture = () => {
    if (selectedCategory === 'all') {
      return getAllFurnitureDefinitions()
    }
    return getFurnitureByCategory(selectedCategory as any)
  }

  const handleFurnitureSelect = (furnitureType: string) => {
    dispatch({ type: 'SELECT_FURNITURE', payload: furnitureType })
    dispatch({ type: 'SET_PLACING', payload: true })
  }

  const renderFurniturePreview = (furniture: any) => {
    // For now, show a colored rectangle based on category
    const colors = {
      'seating': '#8B4513',
      'decoration': '#90EE90',
      'functional': '#4682B4',
      'flooring': '#CD853F',
      'wall': '#A0522D'
    }
    
    return (
      <div 
        className="w-12 h-12 rounded border-2 border-gray-600 flex items-center justify-center text-white font-bold text-xs"
        style={{ backgroundColor: colors[furniture.category] || '#808080' }}
      >
        {furniture.name.charAt(0)}
      </div>
    )
  }

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg w-80 absolute top-4 right-4 z-50">
      <h3 className="text-xl font-bold mb-4">Furniture Selector</h3>
      
      {/* Category Filter */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Categories</h4>
        <div className="grid grid-cols-3 gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`p-2 rounded text-sm flex flex-col items-center justify-center ${
                selectedCategory === category.id
                  ? 'bg-blue-600 border-blue-500'
                  : 'bg-gray-700 hover:bg-gray-600 border-gray-600'
              } border-2`}
            >
              <span className="text-lg">{category.icon}</span>
              <span className="text-xs">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Furniture Grid */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Furniture</h4>
        <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
          {getFilteredFurniture().map(furniture => (
            <button
              key={furniture.id}
              onClick={() => handleFurnitureSelect(furniture.id)}
              className={`p-2 rounded border-2 ${
                state.selectedFurniture === furniture.id
                  ? 'border-blue-500 bg-blue-600'
                  : 'border-gray-600 hover:border-gray-400'
              }`}
              title={`${furniture.name} (${furniture.width}×${furniture.height})`}
            >
              {renderFurniturePreview(furniture)}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Furniture Info */}
      {state.selectedFurniture && (
        <div className="mt-4 p-3 bg-gray-700 rounded">
          <h5 className="font-semibold">Selected: {state.selectedFurniture}</h5>
          <p className="text-sm text-gray-300">
            Click on the floor to place furniture
          </p>
          <button
            onClick={() => {
              dispatch({ type: 'SELECT_FURNITURE', payload: null })
              dispatch({ type: 'SET_PLACING', payload: false })
            }}
            className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm"
          >
            Cancel Placement
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-xs text-gray-500">
        <p>• Select a category to filter furniture</p>
        <p>• Click furniture to start placing</p>
        <p>• Click on floor tiles to place furniture</p>
        <p>• Furniture blocks movement and can be interacted with</p>
      </div>
    </div>
  )
}
