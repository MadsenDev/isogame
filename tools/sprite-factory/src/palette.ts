/**
 * Colour handling for the sprite pipeline.
 *
 * The pipeline never asks a renderer to invent colours. Every material declares
 * one base colour, from which we derive a fixed shade ramp; the shader can only
 * ever emit one of those ramp entries. Supersampling blends them at edges, so
 * after downsampling we snap every pixel back onto the ramp set. The result is
 * a sprite whose palette we can state exactly, up front.
 */

export interface Rgb {
  r: number
  g: number
  b: number
}

export interface RampOptions {
  /** Lightness deltas applied to the base colour, darkest shade first. */
  lightness: [number, number, number, number]
  /** Saturation deltas, darkest first. Shadows gain a little saturation. */
  saturation: [number, number, number, number]
  /** Hue rotation in turns, darkest first. Shadows cool off, highlights warm up. */
  hue: [number, number, number, number]
}

export const DEFAULT_RAMP: RampOptions = {
  lightness: [-0.24, -0.13, 0, 0.11],
  saturation: [0.1, 0.05, 0, -0.04],
  hue: [-0.04, -0.02, 0, 0.015],
}

export function hexToRgb(hex: string): Rgb {
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export function rgbToHsl({ r, g, b }: Rgb): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6
  return [h, s, l]
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  h = ((h % 1) + 1) % 1
  s = Math.max(0, Math.min(1, s))
  l = Math.max(0, Math.min(1, l))

  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v }
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return {
    r: Math.round(channel(h + 1 / 3) * 255),
    g: Math.round(channel(h) * 255),
    b: Math.round(channel(h - 1 / 3) * 255),
  }
}

/**
 * Derive a four-shade ramp from a base colour, darkest first.
 *
 * Shadows are pushed slightly toward blue and gain saturation; highlights lose
 * a little saturation. That's the standard pixel-art trick that stops shaded
 * geometry from reading as "the same colour, but greyer".
 */
export function makeRamp(baseHex: string, options: Partial<RampOptions> = {}): string[] {
  const opts: RampOptions = { ...DEFAULT_RAMP, ...options }
  const [h, s, l] = rgbToHsl(hexToRgb(baseHex))
  return [0, 1, 2, 3].map((i) =>
    rgbToHex(hslToRgb(h + opts.hue[i], s + opts.saturation[i], l + opts.lightness[i]))
  )
}

/** Squared distance in a cheap perceptual weighting (green counts most). */
function colourDistance(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  return 2 * dr * dr + 4 * dg * dg + 3 * db * db
}

export function nearestColour(colour: Rgb, palette: Rgb[]): Rgb {
  let best = palette[0]
  let bestDistance = Infinity
  for (const entry of palette) {
    const d = colourDistance(colour, entry)
    if (d < bestDistance) {
      bestDistance = d
      best = entry
    }
  }
  return best
}

/** Deduplicate a list of hex colours, preserving order. */
export function uniqueColours(hexes: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const hex of hexes) {
    const normalised = rgbToHex(hexToRgb(hex))
    if (!seen.has(normalised)) {
      seen.add(normalised)
      out.push(normalised)
    }
  }
  return out
}
