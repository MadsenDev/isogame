import React, { useState } from 'react'
import { useGame } from '../context/GameContext'
import { getFloorSprite, getFloorTextureNames } from '../data/structureSprites'

/**
 * Floor textures, previewed with the sprite the game will actually draw.
 *
 * The swatches used to be sliced out of `tileset.jpg`, loaded from
 * `/src/assets/...` - a path that only resolves because the dev server happens
 * to serve the source tree, and which showed the *old* tilesheet rather than
 * the generated floor. Reading the generated sprite means the preview and the
 * room can no longer disagree.
 */
const LABELS: Record<string, string> = {
  wood: 'Wood',
  stone: 'Stone',
  brick: 'Brick',
  carpet: 'Carpet',
  marble: 'Marble',
  grass: 'Grass',
  sand: 'Sand',
  water: 'Water'
}

export const RoomCustomization: React.FC = () => {
  const { state, dispatch, roomManager } = useGame()
  const [selected, setSelected] = useState('wood')

  if (!state?.currentRoom || !roomManager) return null

  const room = state.currentRoom
  const textures = getFloorTextureNames()
  const mode = state.styleMode

  return (
    <div className="iso-styling">
      {/* Floor painting and glazing both want the same click, so the tool has
          to say which one it is doing. */}
      <div className="iso-chips" role="tablist" aria-label="Style mode">
        <button
          role="tab"
          aria-selected={mode === 'floor'}
          className={`iso-chip ${mode === 'floor' ? 'is-active' : ''}`}
          onClick={() => dispatch({ type: 'SET_STYLE_MODE', payload: 'floor' })}
        >
          <span aria-hidden="true">🧱</span> Floor
        </button>
        <button
          role="tab"
          aria-selected={mode === 'window'}
          className={`iso-chip ${mode === 'window' ? 'is-active' : ''}`}
          onClick={() => dispatch({ type: 'SET_STYLE_MODE', payload: 'window' })}
        >
          <span aria-hidden="true">🪟</span> Windows
        </button>
      </div>
      <div className="iso-swatches">
        {textures.map(texture => {
          const sprite = getFloorSprite(texture)
          return (
            <button
              key={texture}
              onClick={() => setSelected(texture)}
              className={`iso-swatch ${selected === texture ? 'is-active' : ''}`}
              title={LABELS[texture] ?? texture}
            >
              {sprite && <img className="iso-sprite" src={sprite.url} alt="" />}
              <span>{LABELS[texture] ?? texture}</span>
            </button>
          )
        })}
      </div>

      <button
        className="iso-button iso-button--primary iso-button--full"
        onClick={() => roomManager.setFloorTexture(room.id, selected)}
      >
        Apply to every tile
      </button>

      <dl className="iso-facts">
        <div>
          <dt>Room</dt>
          <dd>{room.name}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{room.width} × {room.height}</dd>
        </div>
        <div>
          <dt>Floor</dt>
          <dd>{LABELS[room.floorTexture ?? 'wood'] ?? room.floorTexture ?? 'Wood'}</dd>
        </div>
        <div>
          <dt>Furniture</dt>
          <dd>{room.furniture.length}</dd>
        </div>
      </dl>

      <p className="iso-note">
        {mode === 'floor'
          ? 'Clicking a tile adds or removes floor.'
          : 'Click a tile against a wall to glaze it. Click again to undo.'}
      </p>
    </div>
  )
}
