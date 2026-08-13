/**
 * Turning a render into a sprite.
 *
 * The renderer draws at an integer multiple of the target size, then this
 * module walks it down to pixel art:
 *
 *   1. flip        - WebGL reads back bottom-up
 *   2. downsample  - alpha-weighted box filter, so edge pixels average cleanly
 *   3. threshold   - alpha becomes fully on or fully off, no soft halo
 *   4. snap        - every pixel returns to an exact palette entry
 *   5. outline     - optional dark silhouette drawn *inside* the shape
 *   6. crop        - trim to content and report where the anchor ended up
 *
 * Steps 3 and 4 are what separate this from "a small 3D render". Supersampling
 * gives us good decisions about *where* the edge is; thresholding and snapping
 * throw away the blurry evidence of how we got there.
 */

import { hexToRgb, nearestColour, Rgb } from './palette'

export interface RgbaImage {
  data: Uint8ClampedArray
  width: number
  height: number
}

export function flipVertically(image: RgbaImage): RgbaImage {
  const { width, height, data } = image
  const out = new Uint8ClampedArray(data.length)
  const rowBytes = width * 4
  for (let y = 0; y < height; y++) {
    const src = (height - 1 - y) * rowBytes
    out.set(data.subarray(src, src + rowBytes), y * rowBytes)
  }
  return { data: out, width, height }
}

/**
 * Box-filter downsample. Colour is averaged weighted by alpha so fully
 * transparent background pixels cannot drag edge colours toward black.
 */
export function downsample(image: RgbaImage, factor: number): RgbaImage {
  if (factor === 1) return image

  const width = Math.floor(image.width / factor)
  const height = Math.floor(image.height / factor)
  const out = new Uint8ClampedArray(width * height * 4)
  const samples = factor * factor

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0

      for (let sy = 0; sy < factor; sy++) {
        for (let sx = 0; sx < factor; sx++) {
          const i = ((y * factor + sy) * image.width + (x * factor + sx)) * 4
          const alpha = image.data[i + 3]
          r += image.data[i] * alpha
          g += image.data[i + 1] * alpha
          b += image.data[i + 2] * alpha
          a += alpha
        }
      }

      const o = (y * width + x) * 4
      if (a > 0) {
        out[o] = r / a
        out[o + 1] = g / a
        out[o + 2] = b / a
      }
      out[o + 3] = a / samples
    }
  }

  return { data: out, width, height }
}

/** Alpha becomes binary. `cutoff` is the coverage a pixel needs to survive. */
export function thresholdAlpha(image: RgbaImage, cutoff = 128): RgbaImage {
  const data = new Uint8ClampedArray(image.data)
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] >= cutoff) {
      data[i] = 255
    } else {
      data[i - 3] = 0
      data[i - 2] = 0
      data[i - 1] = 0
      data[i] = 0
    }
  }
  return { ...image, data }
}

/** Force every opaque pixel onto the nearest entry of a fixed palette. */
export function snapToPalette(image: RgbaImage, palette: string[]): RgbaImage {
  const entries: Rgb[] = palette.map(hexToRgb)
  if (entries.length === 0) return image

  const data = new Uint8ClampedArray(image.data)
  const memo = new Map<number, Rgb>()

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]
    let snapped = memo.get(key)
    if (!snapped) {
      snapped = nearestColour({ r: data[i], g: data[i + 1], b: data[i + 2] }, entries)
      memo.set(key, snapped)
    }
    data[i] = snapped.r
    data[i + 1] = snapped.g
    data[i + 2] = snapped.b
  }

  return { ...image, data }
}

/**
 * Recolour the outermost ring of opaque pixels.
 *
 * Drawn inward rather than outward so the silhouette, and therefore the
 * footprint and anchor, stay exactly where the renderer put them.
 */
export function addInnerOutline(image: RgbaImage, colour: string): RgbaImage {
  const { width, height } = image
  const { r, g, b } = hexToRgb(colour)
  const data = new Uint8ClampedArray(image.data)

  const transparentAt = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return true
    return image.data[(y * width + x) * 4 + 3] === 0
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (image.data[i + 3] === 0) continue
      if (
        transparentAt(x - 1, y) ||
        transparentAt(x + 1, y) ||
        transparentAt(x, y - 1) ||
        transparentAt(x, y + 1)
      ) {
        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
      }
    }
  }

  return { ...image, data }
}

export interface CroppedImage extends RgbaImage {
  /** Where the crop window starts in the uncropped image. */
  offsetX: number
  offsetY: number
}

/** Trim fully transparent margins. Returns a 1x1 stub if nothing was drawn. */
export function cropToContent(image: RgbaImage): CroppedImage {
  const { width, height, data } = image
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }

  if (maxX < 0) {
    return { data: new Uint8ClampedArray(4), width: 1, height: 1, offsetX: 0, offsetY: 0 }
  }

  const cropWidth = maxX - minX + 1
  const cropHeight = maxY - minY + 1
  const out = new Uint8ClampedArray(cropWidth * cropHeight * 4)

  for (let y = 0; y < cropHeight; y++) {
    const src = ((y + minY) * width + minX) * 4
    out.set(data.subarray(src, src + cropWidth * 4), y * cropWidth * 4)
  }

  return { data: out, width: cropWidth, height: cropHeight, offsetX: minX, offsetY: minY }
}

/** Every distinct opaque colour in an image, most used first. */
export function usedColours(image: RgbaImage): string[] {
  const counts = new Map<number, number>()
  for (let i = 0; i < image.data.length; i += 4) {
    if (image.data[i + 3] === 0) continue
    const key = (image.data[i] << 16) | (image.data[i + 1] << 8) | image.data[i + 2]
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => `#${key.toString(16).padStart(6, '0')}`)
}

/**
 * Turn a rendered shadow into a flat, translucent stencil.
 *
 * The ordinary alpha threshold makes everything fully opaque, which would give
 * furniture a solid black slab underneath it. A shadow instead wants a crisp
 * edge but constant partial alpha: threshold the coverage, then force one
 * colour and one alpha everywhere it survives.
 */
export function flattenShadow(
  image: RgbaImage,
  options: { colour: string; alpha: number; cutoff: number }
): RgbaImage {
  const { r, g, b } = hexToRgb(options.colour)
  const alpha = Math.round(Math.max(0, Math.min(1, options.alpha)) * 255)
  const data = new Uint8ClampedArray(image.data)

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] >= options.cutoff) {
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = alpha
    } else {
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
      data[i + 3] = 0
    }
  }

  return { ...image, data }
}
