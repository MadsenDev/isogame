import React, { useState } from 'react'
import { useGame } from '../context/GameContext'
import { getAllFurnitureDefinitions, getFurnitureByCategory } from '../data/furnitureDefinitions'
import type { FurnitureDefinition } from '../context/GameContext'

const CATEGORIES = [
  { id: 'all', name: 'All', icon: '📦' },
  { id: 'seating', name: 'Seating', icon: '🪑' },
  { id: 'functional', name: 'Functional', icon: '⚙️' },
  { id: 'decoration', name: 'Decor', icon: '🎨' },
  { id: 'flooring', name: 'Floor', icon: '🏠' },
  { id: 'wall', name: 'Wall', icon: '🧱' }
] as const

export const FurnitureSelector: React.FC = () => {
  const { state, dispatch } = useGame()
  const [category, setCategory] = useState<string>('all')

  const furniture = category === 'all'
    ? getAllFurnitureDefinitions()
    : getFurnitureByCategory(category as FurnitureDefinition['category'])

  const selected = state.selectedFurniture
    ? getAllFurnitureDefinitions().find(item => item.id === state.selectedFurniture)
    : null

  return (
    <div className="iso-catalog">
      {/* One scrolling row rather than a six-cell grid: the filter is a
          secondary control and should not cost three rows of the panel. */}
      <div className="iso-chips" role="tablist" aria-label="Category">
        {CATEGORIES.map(entry => (
          <button
            key={entry.id}
            role="tab"
            aria-selected={category === entry.id}
            className={`iso-chip ${category === entry.id ? 'is-active' : ''}`}
            onClick={() => setCategory(entry.id)}
          >
            <span aria-hidden="true">{entry.icon}</span>
            {entry.name}
          </button>
        ))}
      </div>

      <div className="iso-catalog__grid">
        {furniture.map(item => (
          <button
            key={item.id}
            onClick={() => {
              dispatch({ type: 'SELECT_FURNITURE', payload: item.id })
              dispatch({ type: 'SET_PLACING', payload: true })
            }}
            className={`iso-card ${state.selectedFurniture === item.id ? 'is-active' : ''}`}
            title={`${item.name} — ${item.width}×${item.height}`}
          >
            <img className="iso-card__art iso-sprite" src={item.sprite} alt="" />
            <span className="iso-card__name">{item.name}</span>
            <span className="iso-card__meta">{item.width}×{item.height}</span>
          </button>
        ))}

        {furniture.length === 0 && (
          <p className="iso-note">Nothing in this category yet.</p>
        )}
      </div>

      {selected && (
        <footer className="iso-catalog__selection">
          <img className="iso-sprite" src={selected.sprite} alt="" />
          <span>
            <strong>{selected.name}</strong>
            <em>Click a tile to place · R rotates</em>
          </span>
          <button
            className="iso-button iso-button--ghost"
            onClick={() => {
              dispatch({ type: 'SELECT_FURNITURE', payload: null })
              dispatch({ type: 'SET_PLACING', payload: false })
            }}
          >
            Cancel
          </button>
        </footer>
      )}
    </div>
  )
}
