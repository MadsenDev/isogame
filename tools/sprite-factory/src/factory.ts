/**
 * Top-level pipeline API.
 *
 * Both entry points go through here: the headless exporter (driven by
 * Playwright) and the interactive Sprite Factory page. Same code, same output,
 * so what you see in the browser is what lands in the repo.
 */

import * as THREE from 'three'
import { CATALOG } from './catalog'
import { CharacterSpec, DEFAULT_CHARACTER, poseAsset } from './character'
import { AssetSpec } from './model'
import { ModelSource } from './loaders'
import { PIXELS_PER_UNIT, TILE_HEIGHT, TILE_WIDTH } from './iso'
import { DEFAULT_RENDER_CONFIG, RenderConfig, RenderedAsset, renderAsset } from './render'
import {
  buildGameDefinition,
  buildMetadata,
  GameFurnitureDefinition,
  packSheet,
  SpriteMetadata,
  toPngDataUrl,
} from './sheet'

export const GENERATOR_VERSION = 1

export function createRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas: document.createElement('canvas'),
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: true,
  })
  // We do our own downsampling and want the exact bytes the shader emitted, so
  // every automatic colour transform three offers has to stay out of the way.
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  renderer.setPixelRatio(1)
  renderer.autoClear = false
  return renderer
}

export interface ExportedFile {
  /** Path relative to the sprite output directory. */
  path: string
  dataUrl: string
}

export interface ExportedAsset {
  metadata: SpriteMetadata
  /** Ready to drop into the game's furniture table. */
  definition: GameFurnitureDefinition
  files: ExportedFile[]
}

/** Where the game serves sprites from. Mirrored in the generated manifest. */
export const SPRITE_BASE_PATH = '/furniture'

const CONSTANTS = {
  tileWidth: TILE_WIDTH,
  tileHeight: TILE_HEIGHT,
  pixelsPerUnit: PIXELS_PER_UNIT,
}

export async function renderOne(
  renderer: THREE.WebGLRenderer,
  asset: AssetSpec,
  config: Partial<RenderConfig> = {}
): Promise<{ rendered: RenderedAsset; exported: ExportedAsset }> {
  const rendered = await renderAsset(renderer, asset, config)
  const sheet = packSheet(rendered.frames)
  const metadata = buildMetadata(rendered, sheet, CONSTANTS)

  const files: ExportedFile[] = rendered.frames.map((frame) => ({
    path: `${asset.id}/${frame.direction}.png`,
    dataUrl: toPngDataUrl(frame.image),
  }))
  files.push({ path: `${asset.id}/sheet.png`, dataUrl: toPngDataUrl(sheet.image) })

  return {
    rendered,
    exported: { metadata, definition: buildGameDefinition(metadata, SPRITE_BASE_PATH), files },
  }
}

export interface ExportPayload {
  generator: {
    version: number
    renderedAt: string
    config: RenderConfig
    tile: { width: number; height: number }
    pixelsPerUnit: number
  }
  assets: ExportedAsset[]
}

export interface ModelFileOptions {
  /** URL of a .glb, .gltf or .obj, served by the dev server. */
  file: string
  id: string
  name?: string
  footprint?: { width: number; height: number }
  facing?: AssetSpec['facing']
  source?: Partial<Omit<ModelSource, 'file'>>
  config?: Partial<RenderConfig>
}

/**
 * Run a single model file through the pipeline.
 *
 * Same camera, same shading, same anchors as the primitive catalogue; only the
 * geometry arrives from somewhere else.
 */
export async function renderModelFile(options: ModelFileOptions): Promise<ExportPayload> {
  const asset: AssetSpec = {
    id: options.id,
    name: options.name ?? options.id,
    facing: options.facing ?? 'south',
    footprint: options.footprint ?? { width: 1, height: 1 },
    materials: {},
    source: { file: options.file, ...options.source },
  }

  const renderer = createRenderer()
  const merged: RenderConfig = { ...DEFAULT_RENDER_CONFIG, ...options.config }

  try {
    const { exported } = await renderOne(renderer, asset, merged)
    return {
      generator: {
        version: GENERATOR_VERSION,
        renderedAt: new Date().toISOString(),
        config: merged,
        tile: { width: TILE_WIDTH, height: TILE_HEIGHT },
        pixelsPerUnit: Number(PIXELS_PER_UNIT.toFixed(4)),
      },
      assets: [exported],
    }
  } finally {
    renderer.dispose()
  }
}

export interface CharacterFrameMetadata {
  file: string
  width: number
  height: number
  /** Pixel offset of the tile centre at floor level: where the feet land. */
  anchorX: number
  anchorY: number
}

export interface CharacterMetadata {
  id: string
  name: string
  tile: { width: number; height: number }
  pixelsPerUnit: number
  palette: string[]
  directions: string[]
  /** animation -> direction -> frames, in play order. */
  animations: Record<string, { frameCount: number; directions: Record<string, CharacterFrameMetadata[]> }>
}

export interface ExportedCharacter {
  metadata: CharacterMetadata
  files: ExportedFile[]
}

/** Where the game serves character sprites from. */
export const CHARACTER_BASE_PATH = '/character'

/**
 * Render every pose of a character, in every direction.
 *
 * Each frame is an ordinary asset render, so characters inherit the camera,
 * shading, palette snapping and anchoring that furniture already uses. The
 * anchor is the tile centre at floor level, so a guest stands on their tile the
 * same way a bookshelf does.
 */
export async function renderCharacter(
  character: CharacterSpec = DEFAULT_CHARACTER,
  config: Partial<RenderConfig> = {}
): Promise<{ metadata: CharacterMetadata; files: ExportedFile[] }> {
  const renderer = createRenderer()
  const merged: RenderConfig = { ...DEFAULT_RENDER_CONFIG, ...config }

  try {
    const files: ExportedFile[] = []
    const animations: CharacterMetadata['animations'] = {}
    const palette = new Set<string>()
    let directions: string[] = []

    for (const [animation, poses] of Object.entries(character.animations)) {
      const byDirection: Record<string, CharacterFrameMetadata[]> = {}

      for (const [frameIndex, pose] of poses.entries()) {
        const rendered = await renderAsset(
          renderer,
          poseAsset(character, animation, frameIndex, pose),
          merged
        )
        rendered.palette.forEach((colour) => palette.add(colour))
        directions = rendered.frames.map((frame) => frame.direction)

        for (const frame of rendered.frames) {
          const file = `${animation}/${frame.direction}/frame_${String(frameIndex).padStart(3, '0')}.png`
          files.push({ path: `${character.id}/${file}`, dataUrl: toPngDataUrl(frame.image) })
          ;(byDirection[frame.direction] ??= [])[frameIndex] = {
            file,
            width: frame.width,
            height: frame.height,
            anchorX: frame.anchorX,
            anchorY: frame.anchorY,
          }
        }
      }

      animations[animation] = { frameCount: poses.length, directions: byDirection }
    }

    return {
      metadata: {
        id: character.id,
        name: character.name,
        tile: { width: TILE_WIDTH, height: TILE_HEIGHT },
        pixelsPerUnit: Number(PIXELS_PER_UNIT.toFixed(4)),
        palette: [...palette],
        directions,
        animations,
      },
      files,
    }
  } finally {
    renderer.dispose()
  }
}

/** Render the whole catalogue. This is what the CLI calls. */
export async function renderAll(
  config: Partial<RenderConfig> = {},
  catalogue: AssetSpec[] = CATALOG
): Promise<ExportPayload> {
  const renderer = createRenderer()
  const merged: RenderConfig = { ...DEFAULT_RENDER_CONFIG, ...config }

  try {
    const assets: ExportedAsset[] = []
    for (const asset of catalogue) {
      assets.push((await renderOne(renderer, asset, merged)).exported)
    }
    return {
      generator: {
        version: GENERATOR_VERSION,
        renderedAt: new Date().toISOString(),
        config: merged,
        tile: { width: TILE_WIDTH, height: TILE_HEIGHT },
        pixelsPerUnit: Number(PIXELS_PER_UNIT.toFixed(4)),
      },
      assets,
    }
  } finally {
    renderer.dispose()
  }
}
