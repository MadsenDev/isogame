/**
 * Top-level pipeline API.
 *
 * Both entry points go through here: the headless exporter (driven by
 * Playwright) and the interactive Sprite Factory page. Same code, same output,
 * so what you see in the browser is what lands in the repo.
 */

import * as THREE from 'three'
import { CATALOG } from './catalog'
import { STRUCTURES } from './structures'
import {
  CHARACTER_SLOTS,
  CharacterSpec,
  DEFAULT_CHARACTER,
  DEFAULT_PROPORTIONS,
  HAIR_LAYER,
  HAIR_STYLES,
  OUTFITS,
  poseAsset,
} from './character'
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
  for (const frame of rendered.frames) {
    if (!frame.shadow) continue
    files.push({
      path: `${asset.id}/${frame.direction}-shadow.png`,
      dataUrl: toPngDataUrl(frame.shadow.image),
    })
  }
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
  shadow?: { file: string; width: number; height: number; anchorX: number; anchorY: number }
}

/**
 * One interchangeable piece of a character: a body in some outfit, or a head of
 * hair. Layers share an anchor, so the game stacks them by drawing each at the
 * same point.
 */
export interface CharacterLayerMetadata {
  id: string
  name: string
  /** Empty when the variant has no geometry at all, as with bald. */
  animations: Record<string, { frameCount: number; directions: Record<string, CharacterFrameMetadata[]> }>
}

export interface CharacterSetMetadata {
  tile: { width: number; height: number }
  pixelsPerUnit: number
  directions: string[]
  /** The silhouette colour, which is not part of any slot and never recoloured. */
  outline: string
  /**
   * The exact colours each slot was rendered with, darkest shade first.
   *
   * This is what makes one render serve every colour combination: the game
   * derives a ramp from the player's chosen colour by the same maths, then maps
   * these pixels onto those. Without it a recolour would have to guess which
   * material a given pixel came from.
   */
  slots: Record<string, { base: string; ramp: string[] }>
  bodies: CharacterLayerMetadata[]
  hair: CharacterLayerMetadata[]
}

export interface ExportedCharacterSet {
  metadata: CharacterSetMetadata
  files: ExportedFile[]
}

/** Where the game serves character sprites from. */
export const CHARACTER_BASE_PATH = '/character'

/**
 * Render one variant - a body in an outfit, or a hair style - in every pose and
 * direction.
 *
 * Each frame is an ordinary asset render, so characters inherit the camera,
 * shading, palette snapping and anchoring that furniture already uses. The
 * anchor is the tile centre at floor level, so a guest stands on their tile the
 * same way a bookshelf does - and because every layer of every variant shares
 * that anchor, they composite without any per-frame alignment data.
 */
async function renderVariant(
  renderer: THREE.WebGLRenderer,
  character: CharacterSpec,
  directory: string,
  options: { outfit?: string; hair?: string; isolateLayer?: string; shadow?: boolean },
  config: RenderConfig
): Promise<{
  animations: CharacterLayerMetadata['animations']
  files: ExportedFile[]
  ramps: Record<string, string[]>
  directions: string[]
}> {
  const files: ExportedFile[] = []
  const animations: CharacterLayerMetadata['animations'] = {}
  const ramps: Record<string, string[]> = {}
  let directions: string[] = []

  for (const [animation, poses] of Object.entries(character.animations)) {
    const byDirection: Record<string, CharacterFrameMetadata[]> = {}

    for (const [frameIndex, pose] of poses.entries()) {
      const rendered = await renderAsset(
        renderer,
        poseAsset(character, animation, frameIndex, pose, options),
        config
      )
      Object.assign(ramps, rendered.ramps)
      directions = rendered.frames.map((frame) => frame.direction)

      for (const frame of rendered.frames) {
        const stem = `${animation}/${frame.direction}/frame_${String(frameIndex).padStart(3, '0')}`
        files.push({ path: `${directory}/${stem}.png`, dataUrl: toPngDataUrl(frame.image) })
        if (frame.shadow) {
          files.push({
            path: `${directory}/${stem}-shadow.png`,
            dataUrl: toPngDataUrl(frame.shadow.image),
          })
        }
        const directionFrames = (byDirection[frame.direction] ??= [])
        directionFrames[frameIndex] = {
          file: `${stem}.png`,
          width: frame.width,
          height: frame.height,
          anchorX: frame.anchorX,
          anchorY: frame.anchorY,
          shadow: frame.shadow
            ? {
                file: `${stem}-shadow.png`,
                width: frame.shadow.width,
                height: frame.shadow.height,
                anchorX: frame.shadow.anchorX,
                anchorY: frame.shadow.anchorY,
              }
            : undefined,
        }
      }
    }

    animations[animation] = { frameCount: poses.length, directions: byDirection }
  }

  return { animations, files, ramps, directions }
}

/**
 * Reject a generation palette whose slots cannot be told apart.
 *
 * Recolouring is a lookup from pixel colour to slot, so two slots sharing a
 * shade would make every pixel of that shade ambiguous - and the failure would
 * be a subtle wrong-coloured patch on a sprite, months later, rather than
 * anything that looks like a bug in the palette.
 */
function assertSlotsAreDistinct(slots: Record<string, { ramp: string[] }>) {
  const owner = new Map<string, string>()
  for (const [slot, { ramp }] of Object.entries(slots)) {
    for (const colour of ramp) {
      const existing = owner.get(colour)
      if (existing && existing !== slot) {
        throw new Error(
          `Character generation palette is ambiguous: ${colour} belongs to both ` +
            `"${existing}" and "${slot}". Adjust GENERATION_PALETTE.`
        )
      }
      owner.set(colour, slot)
    }
  }
}

/**
 * Render the whole character set: every outfit, every hair style.
 *
 * The two lists are rendered separately and composed by the game, so adding a
 * hair style costs one render rather than one render per outfit. Hair is
 * isolated with the body still writing depth, which is what keeps a ponytail
 * hidden behind the head instead of floating over the face.
 */
export async function renderCharacterSet(
  character: CharacterSpec = DEFAULT_CHARACTER,
  config: Partial<RenderConfig> = {}
): Promise<ExportedCharacterSet> {
  const renderer = createRenderer()
  const merged: RenderConfig = { ...DEFAULT_RENDER_CONFIG, ...config }

  try {
    const files: ExportedFile[] = []
    const ramps: Record<string, string[]> = {}
    const bodies: CharacterLayerMetadata[] = []
    const hair: CharacterLayerMetadata[] = []
    let directions: string[] = []

    for (const outfit of OUTFITS) {
      const variant = await renderVariant(
        renderer,
        character,
        `body/${outfit.id}`,
        { outfit: outfit.id },
        merged
      )
      Object.assign(ramps, variant.ramps)
      files.push(...variant.files)
      directions = variant.directions
      bodies.push({ id: outfit.id, name: outfit.name, animations: variant.animations })
    }

    for (const style of HAIR_STYLES) {
      // Bald is the absence of a layer, not an empty sprite for every frame.
      if (style.build(DEFAULT_PROPORTIONS.headSize, 1).length === 0) {
        hair.push({ id: style.id, name: style.name, animations: {} })
        continue
      }

      const variant = await renderVariant(
        renderer,
        character,
        `hair/${style.id}`,
        { hair: style.id, isolateLayer: HAIR_LAYER, shadow: false },
        merged
      )
      Object.assign(ramps, variant.ramps)
      files.push(...variant.files)
      hair.push({ id: style.id, name: style.name, animations: variant.animations })
    }

    const slots = Object.fromEntries(
      CHARACTER_SLOTS.map((slot) => [
        slot,
        { base: character.palette[slot], ramp: ramps[slot] ?? [] },
      ])
    )
    assertSlotsAreDistinct(slots)

    return {
      metadata: {
        tile: { width: TILE_WIDTH, height: TILE_HEIGHT },
        pixelsPerUnit: Number(PIXELS_PER_UNIT.toFixed(4)),
        directions,
        outline: merged.outline.colour,
        slots,
        bodies,
        hair,
      },
      files,
    }
  } finally {
    renderer.dispose()
  }
}

/** Where the game serves room structure sprites from. */
export const STRUCTURE_BASE_PATH = '/structures'

/**
 * Render floor tiles and wall panels.
 *
 * Structures reuse the furniture path wholesale - same camera, same anchors -
 * so a wall panel and a lamp hung on it are positioned by identical maths.
 */
export async function renderStructures(
  config: Partial<RenderConfig> = {}
): Promise<ExportPayload> {
  return renderAll(config, STRUCTURES)
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
