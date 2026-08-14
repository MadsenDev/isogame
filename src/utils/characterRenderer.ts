/**
 * Composing a character sprite from generated layers.
 *
 * The Sprite Factory renders a body per outfit and a head of hair per style,
 * all in one reference palette. This turns that into the sprite a particular
 * player wants, in two steps:
 *
 *   1. **stack** - draw the body, then the hair, aligned on the anchor they
 *      share. Hair was rendered with the body writing depth, so it is already
 *      occluded correctly; drawing it on top reproduces the full render.
 *   2. **recolour** - every opaque pixel is, by construction, an exact entry of
 *      some slot's four-shade ramp. Map each entry onto the same position in a
 *      ramp derived from the player's chosen colour and the shading survives:
 *      a highlight stays a highlight, in the new hue.
 *
 * Step 2 is why the pipeline can offer unlimited colours from a fixed number of
 * renders. It only works because the generator guarantees the reference ramps
 * are distinct and that palette snapping leaves nothing in between - which is
 * exactly what `assertSlotsAreDistinct` and the snap step are there for.
 *
 * The silhouette outline is not part of any slot, so it is left alone. A
 * recoloured character keeps the same dark edge as the furniture around it.
 */

// Imported from the generator so the game and the pipeline cannot disagree
// about what a ramp is. A recolour computed with different maths would be
// subtly wrong in a way no test would notice.
import { hexToRgb, makeRamp } from '../../tools/sprite-factory/src/palette'
import { Appearance, appearanceKey, CHARACTER_SLOTS } from '../data/appearance'
import {
  getBodyFrame,
  getHairFrame,
  getLayerUrls,
  getSlotPalettes,
  ResolvedFrame
} from '../data/characterSprites'

export interface ComposedFrame {
  canvas: HTMLCanvasElement
  width: number
  height: number
  /** Pixel offset of the tile centre at floor level: where the feet land. */
  anchorX: number
  anchorY: number
}

export interface ComposedShadow {
  image: HTMLImageElement
  width: number
  height: number
  anchorX: number
  anchorY: number
}

/** Packed 0xRRGGBB, which is what an image data scan can be keyed on cheaply. */
function pack(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  return (r << 16) | (g << 8) | b
}

/**
 * Reference colour -> replacement, for one appearance.
 *
 * Built once per appearance and reused for all sixty-four frames; rebuilding it
 * per frame would dominate the cost of composing one.
 */
function buildColourMap(appearance: Appearance): Map<number, number> {
  const slots = getSlotPalettes()
  const map = new Map<number, number>()

  for (const slot of CHARACTER_SLOTS) {
    const reference = slots[slot]
    if (!reference) continue

    const target = makeRamp(appearance.colours[slot])
    reference.ramp.forEach((colour, shade) => {
      const replacement = target[shade]
      if (replacement) map.set(pack(colour), pack(replacement))
    })
  }

  return map
}

/**
 * Composited frames are cached because a walking character asks for the same
 * one sixty times a second. The bound is generous but finite: a room full of
 * guests with distinct looks should not grow the cache without limit.
 */
const MAX_CACHED_FRAMES = 1200

export class CharacterRenderer {
  private images = new Map<string, HTMLImageElement>()
  private loading = new Set<string>()
  private frames = new Map<string, ComposedFrame>()
  private colourMaps = new Map<string, Map<number, number>>()
  private preloaded = new Set<string>()
  /** Bumped whenever an image arrives, so callers can retry a null result. */
  private generation = 0

  /**
   * Start fetching every image an appearance needs.
   *
   * Cheap to call repeatedly - it is keyed on the outfit and hair style, not on
   * the colours, because colour costs nothing to change.
   */
  public preload(appearance: Appearance) {
    const key = `${appearance.outfit}|${appearance.hair}`
    if (this.preloaded.has(key)) return
    this.preloaded.add(key)
    for (const url of getLayerUrls(appearance.outfit, appearance.hair)) this.load(url)
  }

  public getGeneration(): number {
    return this.generation
  }

  private load(url: string): HTMLImageElement | null {
    const loaded = this.images.get(url)
    if (loaded) return loaded
    if (this.loading.has(url)) return null

    this.loading.add(url)
    const image = new Image()
    image.onload = () => {
      this.images.set(url, image)
      this.generation++
    }
    image.onerror = () => console.error(`Failed to load character sprite: ${url}`)
    image.src = url
    return null
  }

  private colourMap(appearance: Appearance): Map<number, number> {
    const key = appearanceKey(appearance)
    let map = this.colourMaps.get(key)
    if (!map) {
      map = buildColourMap(appearance)
      this.colourMaps.set(key, map)
    }
    return map
  }

  /**
   * The finished sprite, or null while its layers are still loading.
   *
   * Callers draw something else in the meantime rather than waiting: the first
   * frame of a session is the only one that ever sees null.
   */
  public getFrame(
    appearance: Appearance,
    animation: string,
    direction: string,
    frame: number
  ): ComposedFrame | null {
    const key = `${appearanceKey(appearance)}|${animation}|${direction}|${frame}`
    const cached = this.frames.get(key)
    if (cached) return cached

    const body = getBodyFrame(appearance.outfit, animation, direction, frame)
    if (!body) return null

    const hair = getHairFrame(appearance.hair, animation, direction, frame)

    const bodyImage = this.load(body.url)
    if (!bodyImage) return null
    const hairImage = hair ? this.load(hair.url) : null
    if (hair && !hairImage) return null

    const composed = this.compose(
      [
        { meta: body, image: bodyImage },
        ...(hair && hairImage ? [{ meta: hair, image: hairImage }] : [])
      ],
      this.colourMap(appearance)
    )

    if (this.frames.size >= MAX_CACHED_FRAMES) this.frames.clear()
    this.frames.set(key, composed)
    return composed
  }

  /**
   * The body's contact shadow.
   *
   * Not composited or recoloured: a shadow is a flat stencil of one colour, and
   * hair adds nothing to it worth a second render pass.
   */
  public getShadow(
    appearance: Appearance,
    animation: string,
    direction: string,
    frame: number
  ): ComposedShadow | null {
    const body = getBodyFrame(appearance.outfit, animation, direction, frame)
    if (!body?.shadow || !body.shadowUrl) return null

    const image = this.load(body.shadowUrl)
    if (!image) return null

    return {
      image,
      width: body.shadow.width,
      height: body.shadow.height,
      anchorX: body.shadow.anchorX,
      anchorY: body.shadow.anchorY
    }
  }

  /**
   * Stack layers on their shared anchor, then remap colours.
   *
   * The canvas is sized to whichever layer reaches furthest in each direction
   * *from the anchor*, not to a bounding box of the images: a ponytail extends
   * the silhouette backwards without moving where the feet land.
   */
  private compose(
    layers: Array<{ meta: ResolvedFrame; image: HTMLImageElement }>,
    colours: Map<number, number>
  ): ComposedFrame {
    const anchorX = Math.max(...layers.map(layer => layer.meta.anchorX))
    const anchorY = Math.max(...layers.map(layer => layer.meta.anchorY))
    const width = anchorX + Math.max(...layers.map(l => l.meta.width - l.meta.anchorX))
    const height = anchorY + Math.max(...layers.map(l => l.meta.height - l.meta.anchorY))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return { canvas, width, height, anchorX, anchorY }

    context.imageSmoothingEnabled = false
    for (const layer of layers) {
      context.drawImage(layer.image, anchorX - layer.meta.anchorX, anchorY - layer.meta.anchorY)
    }

    const pixels = context.getImageData(0, 0, width, height)
    const data = pixels.data
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue
      // Anything not in the map is the outline, which every character shares.
      const replacement = colours.get((data[i] << 16) | (data[i + 1] << 8) | data[i + 2])
      if (replacement === undefined) continue
      data[i] = (replacement >> 16) & 255
      data[i + 1] = (replacement >> 8) & 255
      data[i + 2] = replacement & 255
    }
    context.putImageData(pixels, 0, 0)

    return { canvas, width, height, anchorX, anchorY }
  }
}

/** One cache for the whole game: two players in the same outfit share frames. */
export const characterRenderer = new CharacterRenderer()
