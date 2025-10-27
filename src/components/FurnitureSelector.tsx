import React, { useState } from 'react'
import { useGame } from '../context/GameContext'
import { getAllFurnitureDefinitions, getFurnitureByCategory } from '../data/furnitureDefinitions'
import type { FurnitureDefinition } from '../context/GameContext'

export const FurnitureSelector: React.FC = () => {
  const { state, dispatch } = useGame()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
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

  const renderFurniturePreview = (furniture: FurnitureDefinition) => {
    const colors: Record<FurnitureDefinition['category'], string> = {
      'seating': '#8B4513',
      'decoration': '#90EE90',
      'functional': '#4682B4',
      'flooring': '#CD853F',
      'wall': '#A0522D'
    }

    return (
      <div
        className="habbo-furniture__preview"
        style={{ backgroundColor: colors[furniture.category] || '#808080' }}
      >
        {furniture.name.charAt(0)}
      </div>
    )
  }

  return (
    <div className="panel-content">
      <div className="panel-section">
        <div className="habbo-segmented">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`habbo-segmented__option ${selectedCategory === category.id ? 'is-active' : ''}`}
            >
              <span className="habbo-segmented__icon">{category.icon}</span>
              <span className="habbo-segmented__label">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="habbo-furniture__grid">
          {getFilteredFurniture().map(furniture => (
            <button
              key={furniture.id}
              onClick={() => handleFurnitureSelect(furniture.id)}
              className={`habbo-furniture__item ${state.selectedFurniture === furniture.id ? 'is-active' : ''}`}
              title={`${furniture.name} (${furniture.width}×${furniture.height})`}
            >
              {renderFurniturePreview(furniture)}
              <span className="habbo-furniture__label">{furniture.name}</span>
            </button>
          ))}
        </div>
      </div>

      {state.selectedFurniture && (
        <div className="panel-section">
          <div className="habbo-furniture__selection">
            <div className="habbo-furniture__selection-title">
              Selected: <strong>{state.selectedFurniture}</strong>
            </div>
            <p>Click on the floor to place the item.</p>
            <button
              onClick={() => {
                dispatch({ type: 'SELECT_FURNITURE', payload: null })
                dispatch({ type: 'SET_PLACING', payload: false })
              }}
              className="habbo-button habbo-button--ghost habbo-button--full"
            >
              Cancel placement
            </button>
          </div>
        </div>
      )}

      <div className="panel-section">
        <ul className="habbo-guidelines">
          <li>Choose a category to focus the catalog.</li>
          <li>Click an item to start placing it in the room.</li>
          <li>Furniture blocks movement and can be interacted with.</li>
        </ul>
      </div>
    </div>
  )
}
