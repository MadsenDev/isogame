import React, { useEffect, useRef, useState } from 'react'
import { useGame } from '../context/GameContext'
import {
  Appearance,
  CHARACTER_SLOTS,
  CharacterSlot,
  DEFAULT_APPEARANCE,
  SLOT_LABELS,
  SWATCHES,
  appearanceForSeed
} from '../data/appearance'
import { getHairStyles, getOutfits } from '../data/characterSprites'
import { characterRenderer } from '../utils/characterRenderer'

/** The order the preview spins through, so left and right feel like turning. */
const PREVIEW_DIRECTIONS = [
  'south-east',
  'south',
  'south-west',
  'west',
  'north-west',
  'north',
  'north-east',
  'east'
]

const PREVIEW_SCALE = 2
const PREVIEW_WIDTH = 120
const PREVIEW_HEIGHT = 168
/** Where the feet land in the preview: bottom-centre, with room for a shadow. */
const PREVIEW_ANCHOR_Y = PREVIEW_HEIGHT - 22

/**
 * A live view of the character being edited.
 *
 * Drawn from the same composed frames the game draws, rather than from a
 * separate preview path - so what the panel shows is what walks around the
 * room, including the recolouring. Frames arrive asynchronously, hence the
 * retry loop: the first paint after a style change may find the sprites still
 * in flight.
 */
const AvatarPreview: React.FC<{ appearance: Appearance; direction: string }> = ({
  appearance,
  direction
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    characterRenderer.preload(appearance)

    let handle = 0
    // Bounded so a missing sprite cannot spin a frame loop forever.
    let attempts = 240

    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) return

      const context = canvas.getContext('2d')
      const frame = characterRenderer.getFrame(appearance, 'idle', direction, 0)
      if (!context || !frame) {
        if (attempts-- > 0) handle = requestAnimationFrame(draw)
        return
      }

      context.clearRect(0, 0, canvas.width, canvas.height)
      context.imageSmoothingEnabled = false

      const shadow = characterRenderer.getShadow(appearance, 'idle', direction, 0)
      if (shadow) {
        context.drawImage(
          shadow.image,
          Math.round(PREVIEW_WIDTH / 2 - shadow.anchorX * PREVIEW_SCALE),
          Math.round(PREVIEW_ANCHOR_Y - shadow.anchorY * PREVIEW_SCALE),
          Math.round(shadow.width * PREVIEW_SCALE),
          Math.round(shadow.height * PREVIEW_SCALE)
        )
      }

      context.drawImage(
        frame.canvas,
        Math.round(PREVIEW_WIDTH / 2 - frame.anchorX * PREVIEW_SCALE),
        Math.round(PREVIEW_ANCHOR_Y - frame.anchorY * PREVIEW_SCALE),
        Math.round(frame.width * PREVIEW_SCALE),
        Math.round(frame.height * PREVIEW_SCALE)
      )
    }

    draw()
    return () => cancelAnimationFrame(handle)
  }, [appearance, direction])

  return (
    <canvas
      ref={canvasRef}
      className="iso-avatar__canvas"
      width={PREVIEW_WIDTH}
      height={PREVIEW_HEIGHT}
    />
  )
}

const ColourRow: React.FC<{
  slot: CharacterSlot
  value: string
  onChange: (colour: string) => void
}> = ({ slot, value, onChange }) => (
  <div className="iso-colour">
    <span className="iso-colour__label">{SLOT_LABELS[slot]}</span>
    <div className="iso-colour__swatches">
      {SWATCHES[slot].map(colour => (
        <button
          key={colour}
          className={`iso-colour__chip ${colour === value ? 'is-active' : ''}`}
          style={{ background: colour }}
          onClick={() => onChange(colour)}
          aria-label={`${SLOT_LABELS[slot]}: ${colour}`}
          title={colour}
        />
      ))}
      {/* The swatches are suggestions; recolouring costs nothing, so any colour
          at all is as cheap as one of ours. */}
      <label className="iso-colour__custom" title="Any colour">
        <input type="color" value={value} onChange={event => onChange(event.target.value)} />
        <span aria-hidden="true">+</span>
      </label>
    </div>
  </div>
)

export const AvatarCustomizer: React.FC = () => {
  const { state, setAppearance } = useGame()
  const [facing, setFacing] = useState(0)

  const player = state.players[state.currentPlayerId]
  const appearance = player?.appearance ?? DEFAULT_APPEARANCE

  const outfits = getOutfits()
  const hairStyles = getHairStyles()

  const update = (patch: Partial<Appearance>) => setAppearance({ ...appearance, ...patch })
  const setColour = (slot: CharacterSlot, colour: string) =>
    update({ colours: { ...appearance.colours, [slot]: colour } })

  const spin = (step: number) =>
    setFacing(current => (current + step + PREVIEW_DIRECTIONS.length) % PREVIEW_DIRECTIONS.length)

  return (
    <div className="iso-avatar">
      <div className="iso-avatar__stage">
        <button className="iso-icon-button" onClick={() => spin(-1)} aria-label="Turn left">
          ‹
        </button>
        <AvatarPreview appearance={appearance} direction={PREVIEW_DIRECTIONS[facing]} />
        <button className="iso-icon-button" onClick={() => spin(1)} aria-label="Turn right">
          ›
        </button>
      </div>

      <div className="iso-avatar__actions">
        <button
          className="iso-button iso-button--ghost"
          onClick={() =>
            update(
              appearanceForSeed(
                Math.floor(Math.random() * 10_000),
                outfits.map(outfit => outfit.id),
                hairStyles.map(style => style.id)
              )
            )
          }
        >
          Surprise me
        </button>
        <button className="iso-button iso-button--ghost" onClick={() => setAppearance(DEFAULT_APPEARANCE)}>
          Reset
        </button>
      </div>

      <section className="iso-avatar__section">
        <h3>Hair</h3>
        <div className="iso-chips" role="radiogroup" aria-label="Hair style">
          {hairStyles.map(style => (
            <button
              key={style.id}
              role="radio"
              aria-checked={appearance.hair === style.id}
              className={`iso-chip ${appearance.hair === style.id ? 'is-active' : ''}`}
              onClick={() => update({ hair: style.id })}
            >
              {style.name}
            </button>
          ))}
        </div>
      </section>

      <section className="iso-avatar__section">
        <h3>Clothing</h3>
        <div className="iso-chips" role="radiogroup" aria-label="Outfit">
          {outfits.map(outfit => (
            <button
              key={outfit.id}
              role="radio"
              aria-checked={appearance.outfit === outfit.id}
              className={`iso-chip ${appearance.outfit === outfit.id ? 'is-active' : ''}`}
              onClick={() => update({ outfit: outfit.id })}
            >
              {outfit.name}
            </button>
          ))}
        </div>
      </section>

      <section className="iso-avatar__section">
        <h3>Colours</h3>
        {CHARACTER_SLOTS.map(slot => (
          <ColourRow
            key={slot}
            slot={slot}
            value={appearance.colours[slot]}
            onChange={colour => setColour(slot, colour)}
          />
        ))}
      </section>

      <p className="iso-note">
        Styles are generated by the Sprite Factory; colours are remapped as you pick them, so any
        colour costs nothing.
      </p>
    </div>
  )
}
