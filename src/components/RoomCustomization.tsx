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
  const { state, roomManager } = useGame()
  const [selected, setSelected] = useState('wood')

  if (!state?.currentRoom || !roomManager) return null

  const room = state.currentRoom
  const textures = getFloorTextureNames()

  return (
    <div className="iso-styling">
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
        With this tool active, clicking a tile toggles floor on and off.
      </p>
    </div>
  )
}
