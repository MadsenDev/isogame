/**
 * Encoding sprites: raw pixels to canvases, PNGs and sprite sheets.
 */

import { RgbaImage } from './postprocess'
import { FrameInteraction, RenderedAsset, SpriteFrame } from './render'
import { BehaviourSpec, Placement } from './model'

export function toCanvas(image: RgbaImage): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')
  ctx.putImageData(new ImageData(image.data, image.width, image.height), 0, 0)
  return canvas
}

export function toPngDataUrl(image: RgbaImage): string {
  return toCanvas(image).toDataURL('image/png')
}

export interface SheetFrame {
  direction: string
  index: number
  x: number
  y: number
  width: number
  height: number
  anchorX: number
  anchorY: number
  footprint: { width: number; height: number }
}

export interface PackedSheet {
  image: RgbaImage
  frames: SheetFrame[]
}

/**
 * Pack frames into a single horizontal strip.
 *
 * Four frames per asset does not need a clever bin packer, and a strip stays
 * readable when someone opens the PNG to check the pipeline's work.
 */
export function packSheet(frames: SpriteFrame[], gap = 1): PackedSheet {
  const width = frames.reduce((sum, frame) => sum + frame.width, 0) + gap * (frames.length - 1)
  const height = Math.max(...frames.map((frame) => frame.height))
  const data = new Uint8ClampedArray(width * height * 4)

  const packed: SheetFrame[] = []
  let cursorX = 0

  for (const frame of frames) {
    for (let y = 0; y < frame.height; y++) {
      const src = y * frame.width * 4
      const dst = (y * width + cursorX) * 4
      data.set(frame.image.data.subarray(src, src + frame.width * 4), dst)
    }

    packed.push({
      direction: frame.direction,
      index: frame.index,
      x: cursorX,
      y: 0,
      width: frame.width,
      height: frame.height,
      anchorX: frame.anchorX,
      anchorY: frame.anchorY,
      footprint: frame.footprint,
    })

    cursorX += frame.width + gap
  }

  return { image: { data, width, height }, frames: packed }
}

export interface ShadowMetadata {
  file: string
  width: number
  height: number
  anchorX: number
  anchorY: number
}

export interface SpriteDirectionMetadata {
  file: string
  index: number
  width: number
  height: number
  anchorX: number
  anchorY: number
  footprint: { width: number; height: number }
  interactions: FrameInteraction[]
  /** Contact shadow, anchored to the same tile as the frame. */
  shadow?: ShadowMetadata
}

export interface SpriteMetadata {
  id: string
  name: string
  defaultDirection: string
  placement: Placement
  behaviour: BehaviourSpec
  footprint: { width: number; height: number }
  tile: { width: number; height: number }
  pixelsPerUnit: number
  palette: string[]
  directions: Record<string, SpriteDirectionMetadata>
  sheet: { file: string; width: number; height: number; frames: SheetFrame[] }
}

export function buildMetadata(
  asset: RenderedAsset,
  sheet: PackedSheet,
  constants: { tileWidth: number; tileHeight: number; pixelsPerUnit: number }
): SpriteMetadata {
  const directions: Record<string, SpriteDirectionMetadata> = {}

  for (const frame of asset.frames) {
    directions[frame.direction] = {
      file: `${frame.direction}.png`,
      index: frame.index,
      width: frame.width,
      height: frame.height,
      anchorX: frame.anchorX,
      anchorY: frame.anchorY,
      footprint: frame.footprint,
      interactions: frame.interactions,
      shadow: frame.shadow
        ? {
            file: `${frame.direction}-shadow.png`,
            width: frame.shadow.width,
            height: frame.shadow.height,
            anchorX: frame.shadow.anchorX,
            anchorY: frame.shadow.anchorY,
          }
        : undefined,
    }
  }

  return {
    id: asset.id,
    name: asset.name,
    defaultDirection: asset.defaultDirection,
    placement: asset.placement,
    behaviour: asset.behaviour,
    footprint: asset.footprint,
    tile: { width: constants.tileWidth, height: constants.tileHeight },
    pixelsPerUnit: Number(constants.pixelsPerUnit.toFixed(4)),
    palette: asset.palette,
    directions,
    sheet: {
      file: 'sheet.png',
      width: sheet.image.width,
      height: sheet.image.height,
      frames: sheet.frames,
    },
  }
}

/**
 * The game-facing furniture definition.
 *
 * Shaped to drop straight into IsoGame's FurnitureDefinition: the flat fields
 * describe the default orientation so existing code works untouched, while
 * `sprites` carries every orientation with its anchors and rotated interaction
 * spots for code that wants to rotate furniture.
 */
/** An interaction in the game's own vocabulary: `positions`, not `spots`. */
export interface GameInteraction {
  type: string
  animation?: string
  duration: number
  positions: Array<{
    x: number
    y: number
    direction: string
    offsetX: number
    offsetY: number
    layer: 'front' | 'behind'
  }>
}

function toGameInteractions(interactions: FrameInteraction[]): GameInteraction[] {
  return interactions.map((interaction) => ({
    type: interaction.type,
    animation: interaction.animation,
    duration: interaction.duration,
    positions: interaction.spots.map((spot) => ({
      x: spot.x,
      y: spot.y,
      direction: spot.direction,
      offsetX: spot.offsetX,
      offsetY: spot.offsetY,
      layer: spot.layer,
    })),
  }))
}

export interface GameFurnitureDefinition {
  id: string
  name: string
  sprite: string
  width: number
  height: number
  placement: Placement
  category: BehaviourSpec['category']
  walkable: boolean
  stackable: boolean
  rotatable: boolean
  collision: BehaviourSpec['collision']
  interactions: GameInteraction[]
  defaultDirection: string
  sprites: Record<string, Omit<SpriteDirectionMetadata, 'interactions' | 'shadow'> & {
    url: string
    interactions: GameInteraction[]
    shadow?: ShadowMetadata & { url: string }
  }>
  palette: string[]
}

export function buildGameDefinition(
  metadata: SpriteMetadata,
  basePath: string
): GameFurnitureDefinition {
  const defaultFrame = metadata.directions[metadata.defaultDirection]

  return {
    id: metadata.id,
    name: metadata.name,
    sprite: `${basePath}/${metadata.id}/${defaultFrame.file}`,
    width: metadata.footprint.width,
    height: metadata.footprint.height,
    placement: metadata.placement,
    category: metadata.behaviour.category,
    walkable: metadata.behaviour.walkable,
    stackable: metadata.behaviour.stackable,
    rotatable: metadata.behaviour.rotatable,
    collision: metadata.behaviour.collision,
    interactions: toGameInteractions(defaultFrame.interactions),
    defaultDirection: metadata.defaultDirection,
    sprites: Object.fromEntries(
      Object.entries(metadata.directions).map(([direction, frame]) => [
        direction,
        {
          ...frame,
          url: `${basePath}/${metadata.id}/${frame.file}`,
          interactions: toGameInteractions(frame.interactions),
          shadow: frame.shadow
            ? { ...frame.shadow, url: `${basePath}/${metadata.id}/${frame.shadow.file}` }
            : undefined,
        },
      ])
    ),
    palette: metadata.palette,
  }
}
