/**
 * The interactive Sprite Factory.
 *
 * Pick an asset, watch all four orientations render onto a real IsoGame floor
 * grid, tune the pipeline, then export. It calls the same renderOne() the CLI
 * calls, so anything that looks right here is what gets committed.
 */

import { CATALOG } from './catalog'
import { createRenderer, renderOne } from './factory'
import { TILE_HEIGHT, TILE_WIDTH } from './iso'
import { AssetSpec } from './model'
import { RenderConfig, DEFAULT_RENDER_CONFIG } from './render'
import { toCanvas } from './sheet'
import type { SpriteMetadata } from './sheet'
import type { RgbaImage } from './postprocess'

const renderer = createRenderer()

interface UiState {
  assetId: string
  zoom: number
  showGrid: boolean
  lightAzimuth: number
  lightElevation: number
  config: RenderConfig
}

const DEG = Math.PI / 180

function lightVector(azimuth: number, elevation: number): [number, number, number] {
  const ca = Math.cos(elevation * DEG)
  return [ca * Math.cos(azimuth * DEG), Math.sin(elevation * DEG), ca * Math.sin(azimuth * DEG)]
}

const state: UiState = {
  assetId: CATALOG[0].id,
  zoom: 3,
  showGrid: true,
  lightAzimuth: 131,
  lightElevation: 63,
  config: structuredClone(DEFAULT_RENDER_CONFIG),
}

const dom = {
  assets: document.getElementById('assets') as HTMLDivElement,
  frames: document.getElementById('frames') as HTMLDivElement,
  inspector: document.getElementById('inspector') as HTMLDivElement,
  notes: document.getElementById('notes') as HTMLDivElement,
}

function currentAsset(): AssetSpec {
  return CATALOG.find((asset) => asset.id === state.assetId) ?? CATALOG[0]
}

/** Draw the game's floor grid so sprites are judged in context, not in a void. */
function drawFloor(ctx: CanvasRenderingContext2D, cols: number, rows: number, ox: number, oy: number) {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const sx = (x - y) * (TILE_WIDTH / 2) + ox
      const sy = (x + y) * (TILE_HEIGHT / 2) + oy
      ctx.beginPath()
      ctx.moveTo(sx, sy - TILE_HEIGHT / 2)
      ctx.lineTo(sx + TILE_WIDTH / 2, sy)
      ctx.lineTo(sx, sy + TILE_HEIGHT / 2)
      ctx.lineTo(sx - TILE_WIDTH / 2, sy)
      ctx.closePath()
      ctx.fillStyle = (x + y) % 2 ? '#8c7f6a' : '#9d8f77'
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }
}

function framePreview(image: RgbaImage, anchorX: number, anchorY: number, footprint: { width: number; height: number }): HTMLCanvasElement {
  // One tile of floor on every side of the footprint, with the asset on (1,1).
  const cols = footprint.width + 2
  const rows = footprint.height + 2
  const tileX = 1
  const tileY = 1

  const gridWidth = (cols + rows) * (TILE_WIDTH / 2)
  const gridHeight = (cols + rows) * (TILE_HEIGHT / 2)

  // Tall assets stick out above the grid; give them exactly that much room.
  const anchorOnGridY = (tileX + tileY) * (TILE_HEIGHT / 2) + TILE_HEIGHT / 2
  const overhead = Math.max(0, anchorY - anchorOnGridY)

  const width = Math.max(gridWidth, image.width + 8)
  const height = gridHeight + overhead

  const canvas = document.createElement('canvas')
  canvas.width = width * state.zoom
  canvas.height = height * state.zoom
  canvas.style.width = `${width * state.zoom}px`

  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.scale(state.zoom, state.zoom)

  const originX = width / 2 + ((rows - cols) * TILE_WIDTH) / 4
  const originY = overhead + TILE_HEIGHT / 2
  const anchorScreenX = originX + (tileX - tileY) * (TILE_WIDTH / 2)
  const anchorScreenY = originY + (tileX + tileY) * (TILE_HEIGHT / 2)

  if (state.showGrid) drawFloor(ctx, cols, rows, originX, originY)

  ctx.drawImage(toCanvas(image), Math.round(anchorScreenX - anchorX), Math.round(anchorScreenY - anchorY))
  return canvas
}

function download(name: string, href: string) {
  const link = document.createElement('a')
  link.href = href
  link.download = name
  link.click()
}

function field(
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  format: (v: number) => string,
  onChange: (v: number) => void
): HTMLLabelElement {
  const wrapper = document.createElement('label')
  wrapper.className = 'field'
  const caption = document.createElement('span')
  caption.innerHTML = `${label}<b>${format(value)}</b>`
  const input = document.createElement('input')
  input.type = 'range'
  input.min = String(min)
  input.max = String(max)
  input.step = String(step)
  input.value = String(value)
  input.addEventListener('input', () => onChange(Number(input.value)))
  wrapper.append(caption, input)
  return wrapper
}

function checkbox(label: string, value: boolean, onChange: (v: boolean) => void): HTMLLabelElement {
  const wrapper = document.createElement('label')
  wrapper.className = 'check'
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.checked = value
  input.addEventListener('change', () => onChange(input.checked))
  wrapper.append(input, document.createTextNode(label))
  return wrapper
}

function renderAssetList() {
  dom.assets.replaceChildren(
    ...CATALOG.map((asset) => {
      const button = document.createElement('button')
      button.className = 'asset'
      button.setAttribute('aria-selected', String(asset.id === state.assetId))
      const source = asset.source ? 'model file' : `${asset.parts?.length ?? 0} parts`
      button.innerHTML =
        `${asset.name}<small>${asset.footprint.width}x${asset.footprint.height} &middot; ${source}</small>`
      button.addEventListener('click', () => {
        state.assetId = asset.id
        update()
      })
      return button
    })
  )
}

function renderInspector(metadata: SpriteMetadata, elapsedMs: number) {
  const inspector = dom.inspector
  inspector.replaceChildren()

  const heading = document.createElement('h2')
  heading.textContent = 'Pipeline'
  inspector.append(heading)

  inspector.append(
    field('Supersample', state.config.supersample, 1, 8, 1, (v) => `${v}x`, (v) => {
      state.config.supersample = v
      update()
    }),
    field('Alpha cutoff', state.config.alphaCutoff, 1, 255, 1, (v) => String(v), (v) => {
      state.config.alphaCutoff = v
      update()
    }),
    field('Padding', state.config.padding, 0, 8, 1, (v) => `${v}px`, (v) => {
      state.config.padding = v
      update()
    }),
    checkbox('Snap to palette', state.config.paletteSnap, (v) => {
      state.config.paletteSnap = v
      update()
    }),
    checkbox('Outline', state.config.outline.enabled, (v) => {
      state.config.outline = { ...state.config.outline, enabled: v }
      update()
    })
  )

  const outlineColour = document.createElement('input')
  outlineColour.type = 'color'
  outlineColour.value = state.config.outline.colour
  outlineColour.addEventListener('input', () => {
    state.config.outline = { ...state.config.outline, colour: outlineColour.value }
    update()
  })
  inspector.append(outlineColour)

  const lightHeading = document.createElement('h2')
  lightHeading.textContent = 'Light'
  inspector.append(
    lightHeading,
    field('Azimuth', state.lightAzimuth, 0, 360, 1, (v) => `${v}°`, (v) => {
      state.lightAzimuth = v
      update()
    }),
    field('Elevation', state.lightElevation, 5, 89, 1, (v) => `${v}°`, (v) => {
      state.lightElevation = v
      update()
    }),
    field('Band 1', state.config.shading.thresholds[0], 0, 1, 0.01, (v) => v.toFixed(2), (v) => {
      state.config.shading.thresholds[0] = v
      update()
    }),
    field('Band 2', state.config.shading.thresholds[1], 0, 1, 0.01, (v) => v.toFixed(2), (v) => {
      state.config.shading.thresholds[1] = v
      update()
    }),
    field('Band 3', state.config.shading.thresholds[2], 0, 1, 0.01, (v) => v.toFixed(2), (v) => {
      state.config.shading.thresholds[2] = v
      update()
    })
  )

  const viewHeading = document.createElement('h2')
  viewHeading.textContent = 'View'
  inspector.append(
    viewHeading,
    field('Zoom', state.zoom, 1, 8, 1, (v) => `${v}x`, (v) => {
      state.zoom = v
      update()
    }),
    checkbox('Floor grid', state.showGrid, (v) => {
      state.showGrid = v
      update()
    })
  )

  const paletteHeading = document.createElement('h2')
  paletteHeading.textContent = `Palette (${metadata.palette.length})`
  const swatches = document.createElement('div')
  swatches.className = 'swatches'
  for (const colour of metadata.palette) {
    const swatch = document.createElement('div')
    swatch.className = 'swatch'
    swatch.style.background = colour
    swatch.title = colour
    swatches.append(swatch)
  }
  inspector.append(paletteHeading, swatches)

  const exportHeading = document.createElement('h2')
  exportHeading.textContent = 'Export'
  inspector.append(exportHeading)

  const sheetButton = document.createElement('button')
  sheetButton.className = 'action'
  sheetButton.textContent = 'Download sheet.png'
  sheetButton.addEventListener('click', async () => {
    const { exported } = await renderOne(renderer, currentAsset(), state.config)
    const sheet = exported.files.find((file) => file.path.endsWith('sheet.png'))!
    download(`${metadata.id}-sheet.png`, sheet.dataUrl)
  })

  const jsonButton = document.createElement('button')
  jsonButton.className = 'action'
  jsonButton.textContent = 'Download sprite.json'
  jsonButton.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' })
    download(`${metadata.id}.json`, URL.createObjectURL(blob))
  })

  inspector.append(sheetButton, jsonButton)

  const stats = document.createElement('div')
  stats.className = 'note'
  stats.innerHTML =
    `<b>${metadata.id}</b><br>footprint ${metadata.footprint.width}x${metadata.footprint.height}<br>` +
    `default facing ${metadata.defaultDirection}<br>rendered in ${elapsedMs.toFixed(0)}ms<br><br>` +
    'Committed sprites come from <b>npm run sprites</b>, which runs this exact pipeline headlessly.'
  inspector.append(stats)
}

let pending: Promise<void> = Promise.resolve()

/** Serialise re-renders so dragging a slider cannot interleave two renders. */
function update() {
  pending = pending.then(render).catch((error) => {
    dom.notes.textContent = `Render failed: ${error.message}`
    console.error(error)
  })
}

async function render() {
  const asset = currentAsset()
  state.config.shading = {
    ...state.config.shading,
    light: lightVector(state.lightAzimuth, state.lightElevation),
  }

  const started = performance.now()
  const { rendered, exported } = await renderOne(renderer, asset, state.config)
  const elapsed = performance.now() - started

  renderAssetList()

  dom.frames.replaceChildren(
    ...rendered.frames.map((frame) => {
      const card = document.createElement('div')
      card.className = 'frame'
      const header = document.createElement('header')
      header.innerHTML =
        `<b>${frame.direction}</b><span>${frame.width}&times;${frame.height} &middot; ` +
        `fp ${frame.footprint.width}x${frame.footprint.height}</span>`
      card.append(header, framePreview(frame.image, frame.anchorX, frame.anchorY, frame.footprint))
      return card
    })
  )

  dom.notes.textContent = asset.notes ?? ''
  renderInspector(exported.metadata, elapsed)
}

update()
