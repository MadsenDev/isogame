/**
 * The renderer: asset spec in, game-ready sprite frames out.
 */

import * as THREE from 'three'
import {
  createIsoCamera,
  originTileCentre,
  PIXELS_PER_UNIT,
  projectToPixels,
  TILE_HEIGHT,
  TILE_WIDTH,
} from './iso'
import { DEFAULT_SHADING, ShadingConfig } from './materials'
import { AssetSpec, buildAssetModel, InteractionType, Placement } from './model'
import { angleFor, Direction, DirectionCount, rotateDirection } from './directions'
import { facingLayer, rotateFootprint, rotatePoint, rotateTile } from './transform'
import {
  addInnerOutline,
  flattenShadow,
  cropToContent,
  downsample,
  flipVertically,
  RgbaImage,
  snapToPalette,
  thresholdAlpha,
  usedColours,
} from './postprocess'
import { uniqueColours } from './palette'

export type { Direction }

/** How many orientations this asset renders in. */
export function directionCountFor(asset: AssetSpec): DirectionCount {
  return asset.directionCount ?? 4
}

/**
 * Which way the asset points after `index` rotation steps, given how it was
 * authored. Rotating the model about +Y walks the compass cycle.
 */
export function directionFor(asset: AssetSpec, index: number): Direction {
  return rotateDirection(asset.facing ?? 'south', index, directionCountFor(asset))
}

export interface RenderConfig {
  /** Render scale before downsampling. 1 is raw and jaggy, 4 is the sweet spot. */
  supersample: number
  /** Transparent margin, in final pixels, kept around the model before cropping. */
  padding: number
  outline: { enabled: boolean; colour: string }
  /** Snap colours back onto the material ramps after downsampling. */
  paletteSnap: boolean
  /** Extra colours the snap step may use, on top of the material ramps. */
  extraPalette: string[]
  /** Coverage a pixel needs to survive alpha thresholding, 0-255. */
  alphaCutoff: number
  /**
   * Contact shadow cast onto the floor.
   *
   * Generated from the real geometry, so a chair's shadow has chair legs in it
   * rather than being a generic ellipse under everything.
   */
  shadow: {
    enabled: boolean
    colour: string
    /** 0-1. Shadows are flat and translucent; gradients fight the shade bands. */
    alpha: number
    /** Coverage a pixel needs to count as shadowed, 0-255. */
    cutoff: number
  }
  shading: ShadingConfig
}

export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  supersample: 4,
  padding: 2,
  outline: { enabled: true, colour: '#241d2b' },
  paletteSnap: true,
  extraPalette: [],
  alphaCutoff: 128,
  shadow: { enabled: true, colour: '#2a2233', alpha: 0.34, cutoff: 110 },
  shading: DEFAULT_SHADING,
}

export interface SpriteFrame {
  direction: Direction
  /** Rotation index, 0-3. */
  index: number
  image: RgbaImage
  width: number
  height: number
  /**
   * Pixel offset, within this frame, of the centre of footprint tile (0,0) at
   * floor level. Draw at (screenX - anchorX, screenY - anchorY).
   */
  anchorX: number
  anchorY: number
  /** Footprint after rotation, in tiles. */
  footprint: { width: number; height: number }
  /** Interaction spots, rotated to match this orientation. */
  interactions: FrameInteraction[]
  /** Contact shadow, anchored the same way as the frame itself. */
  shadow?: ShadowFrame
}

export interface ShadowFrame {
  image: RgbaImage
  width: number
  height: number
  anchorX: number
  anchorY: number
}

export interface RenderedAsset {
  id: string
  name: string
  /** Frame whose footprint matches the game's furniture definition. */
  defaultDirection: Direction
  placement: Placement
  behaviour: AssetSpec['behaviour']
  footprint: { width: number; height: number }
  frames: SpriteFrame[]
  palette: string[]
  /** Named material -> the four-shade ramp it was rendered with. */
  ramps: Record<string, string[]>
  /** Uncropped canvas size the frames were rendered into. */
  canvas: { width: number; height: number }
}

/**
 * Which rotations to render.
 *
 * A wall only ever shows two faces in an isometric room, so a wall-mounted
 * asset that rendered four ways would ship two frames facing into masonry.
 */
export function rotationsFor(asset: AssetSpec): number[] {
  // A wall only shows two faces, and both are quarter turns apart.
  if (asset.placement === 'wall') return [0, 3]
  return Array.from({ length: directionCountFor(asset) }, (_, index) => index)
}

/**
 * Pick a canvas big enough for every rotation of this model.
 *
 * Sized symmetrically around the anchor point so the anchor lands exactly on
 * the canvas centre, which keeps it an integer instead of something we would
 * have to round and then apologise for.
 */
function measureCanvas(
  group: THREE.Group,
  asset: AssetSpec,
  padding: number
): { width: number; height: number } {
  let maxX = 0
  let maxY = 0

  const step = angleFor(directionCountFor(asset))

  for (const index of rotationsFor(asset)) {
    group.rotation.y = index * step
    group.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(group)
    const rotated = rotateFootprint(asset.footprint, index)
    const origin = originTileCentre(rotated.width, rotated.height)

    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          const p = projectToPixels(new THREE.Vector3(x, y, z), origin)
          maxX = Math.max(maxX, Math.abs(p.x))
          maxY = Math.max(maxY, Math.abs(p.y))
        }
      }
    }
  }

  group.rotation.y = 0
  group.updateMatrixWorld(true)

  return {
    width: 2 * Math.ceil(maxX + padding),
    height: 2 * Math.ceil(maxY + padding),
  }
}

export interface InteractionSpot {
  /** Footprint tile the player stands on, in this orientation. */
  x: number
  y: number
  /** Which way the player faces. */
  direction: Direction
  /**
   * Pixel offset from that tile's screen position to where the player's sprite
   * belongs - the seat of a chair, the mattress of a bed.
   */
  offsetX: number
  offsetY: number
  /** Whether the player draws over the furniture sprite or under it. */
  layer: 'front' | 'behind'
}

export interface FrameInteraction {
  type: InteractionType
  animation?: string
  duration: number
  spots: InteractionSpot[]
}

/**
 * Rotate every interaction to match a rendered orientation.
 *
 * Tiles, facings and 3D attachment points all turn together, and the pixel
 * offset is measured from the spot's own tile so the game can apply it with a
 * single addition after worldToScreen().
 */
function rotateInteractions(asset: AssetSpec, index: number): FrameInteraction[] {
  if (!asset.interactions?.length) return []

  const footprint = rotateFootprint(asset.footprint, index)
  const origin = originTileCentre(footprint.width, footprint.height)
  const step = angleFor(directionCountFor(asset))

  return asset.interactions.map((interaction) => ({
    type: interaction.type,
    animation: interaction.animation,
    duration: interaction.durationMs ?? 0,
    spots: interaction.spots.map((spot) => {
      const tile = rotateTile(spot.tile, asset.footprint, index)
      const point = rotatePoint(spot.point, index, step)
      const tileCentre = origin.clone().add(new THREE.Vector3(tile.x, 0, tile.y))
      const offset = projectToPixels(point, tileCentre)
      const direction = rotateDirection(spot.facing, index, directionCountFor(asset))

      return {
        x: tile.x,
        y: tile.y,
        direction,
        offsetX: Math.round(offset.x),
        offsetY: Math.round(offset.y),
        layer: spot.layer ?? facingLayer(direction),
      }
    }),
  }))
}

/**
 * Canvas big enough for the shadow.
 *
 * A shadow reaches further than the object that casts it, so it needs its own
 * measurement: project each bounding-box corner down the light direction onto
 * y = 0 and see how far it lands from the anchor.
 */
function measureShadowCanvas(
  group: THREE.Group,
  asset: AssetSpec,
  cfg: RenderConfig
): { width: number; height: number } {
  const light = new THREE.Vector3(...cfg.shading.light).normalize()
  let maxX = 0
  let maxY = 0

  const step = angleFor(directionCountFor(asset))

  for (const index of rotationsFor(asset)) {
    group.rotation.y = index * step
    group.updateMatrixWorld(true)

    const box = new THREE.Box3().setFromObject(group)
    const rotated = rotateFootprint(asset.footprint, index)
    const origin = originTileCentre(rotated.width, rotated.height)

    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) {
          const point = new THREE.Vector3(x, y, z)
          // Slide the corner along the light until it meets the floor.
          if (light.y > 1e-6) point.addScaledVector(light, -point.y / light.y)
          const projected = projectToPixels(point, origin)
          maxX = Math.max(maxX, Math.abs(projected.x))
          maxY = Math.max(maxY, Math.abs(projected.y))
        }
      }
    }
  }

  group.rotation.y = 0
  group.updateMatrixWorld(true)

  return { width: 2 * Math.ceil(maxX + cfg.padding), height: 2 * Math.ceil(maxY + cfg.padding) }
}

/**
 * A light and a floor that catches its shadow.
 *
 * The floor uses ShadowMaterial, which is transparent everywhere except where
 * something shadows it - so rendering this alone gives a shadow-shaped image
 * with the caster absent.
 */
function createShadowRig(group: THREE.Group, cfg: RenderConfig) {
  const box = new THREE.Box3().setFromObject(group)
  const radius = Math.max(box.getSize(new THREE.Vector3()).length(), 1)

  const light = new THREE.DirectionalLight(0xffffff, 1)
  light.position.set(...cfg.shading.light).normalize().multiplyScalar(radius * 4)
  light.castShadow = true
  light.shadow.mapSize.set(2048, 2048)

  const camera = light.shadow.camera
  camera.left = -radius * 2
  camera.right = radius * 2
  camera.top = radius * 2
  camera.bottom = -radius * 2
  camera.near = 0.01
  camera.far = radius * 12
  camera.updateProjectionMatrix()

  const floorGeometry = new THREE.PlaneGeometry(radius * 12, radius * 12)
  floorGeometry.rotateX(-Math.PI / 2)
  const floorMaterial = new THREE.ShadowMaterial({ opacity: 1 })
  floorMaterial.color = new THREE.Color(0, 0, 0)
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.receiveShadow = true

  return {
    light,
    floor,
    dispose: () => {
      floorGeometry.dispose()
      floorMaterial.dispose()
      light.dispose()
    },
  }
}

export async function renderAsset(
  renderer: THREE.WebGLRenderer,
  asset: AssetSpec,
  config: Partial<RenderConfig> = {}
): Promise<RenderedAsset> {
  const cfg: RenderConfig = { ...DEFAULT_RENDER_CONFIG, ...config }
  const model = await buildAssetModel(asset, cfg.shading)

  const outlineEnabled = asset.outline?.enabled ?? cfg.outline.enabled
  const outlineColour = asset.outline?.colour ?? cfg.outline.colour

  const palette = uniqueColours([
    ...model.palette,
    ...cfg.extraPalette,
    ...(outlineEnabled ? [outlineColour] : []),
  ])

  const canvas = measureCanvas(model.group, asset, cfg.padding)
  const scene = new THREE.Scene()
  scene.add(model.group)

  const target = new THREE.WebGLRenderTarget(
    canvas.width * cfg.supersample,
    canvas.height * cfg.supersample,
    {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      colorSpace: THREE.NoColorSpace,
      depthBuffer: true,
      samples: 0,
    }
  )

  // Shadows need their own, larger canvas: they reach past the caster.
  const castsShadow = (asset.shadow?.enabled ?? cfg.shadow.enabled) && asset.placement !== 'wall'
  const shadowCanvas = castsShadow ? measureShadowCanvas(model.group, asset, cfg) : null
  const shadowRig = castsShadow ? createShadowRig(model.group, cfg) : null
  const shadowTarget = shadowCanvas
    ? new THREE.WebGLRenderTarget(
        shadowCanvas.width * cfg.supersample,
        shadowCanvas.height * cfg.supersample,
        {
          minFilter: THREE.NearestFilter,
          magFilter: THREE.NearestFilter,
          colorSpace: THREE.NoColorSpace,
          depthBuffer: true,
          samples: 0,
        }
      )
    : null

  if (shadowRig) {
    scene.add(shadowRig.light)
    scene.add(shadowRig.floor)
    shadowRig.floor.visible = false
    model.group.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (mesh.isMesh) mesh.castShadow = true
    })
    renderer.shadowMap.enabled = true
    // Hard edges: the post-processing thresholds coverage anyway, and soft
    // gradients fight the four-band shading everywhere else.
    renderer.shadowMap.type = THREE.BasicShadowMap
  }

  const previousTarget = renderer.getRenderTarget()
  const buffer = new Uint8Array(target.width * target.height * 4)
  const shadowBuffer = shadowTarget
    ? new Uint8Array(shadowTarget.width * shadowTarget.height * 4)
    : null
  const frames: SpriteFrame[] = []

  const rotationStep = angleFor(directionCountFor(asset))

  for (const index of rotationsFor(asset)) {
    model.group.rotation.y = index * rotationStep
    model.group.updateMatrixWorld(true)

    const footprint = rotateFootprint(asset.footprint, index)
    const camera = createIsoCamera(
      originTileCentre(footprint.width, footprint.height),
      canvas.width,
      canvas.height
    )

    renderer.setRenderTarget(target)
    renderer.setClearColor(0x000000, 0)
    renderer.clear(true, true, true)
    renderer.render(scene, camera)
    renderer.readRenderTargetPixels(target, 0, 0, target.width, target.height, buffer)

    let image: RgbaImage = flipVertically({
      data: new Uint8ClampedArray(buffer.buffer.slice(0)),
      width: target.width,
      height: target.height,
    })

    image = downsample(image, cfg.supersample)
    image = thresholdAlpha(image, cfg.alphaCutoff)
    if (cfg.paletteSnap) image = snapToPalette(image, palette)
    if (outlineEnabled) image = addInnerOutline(image, outlineColour)

    const cropped = cropToContent(image)

    let shadow: ShadowFrame | undefined
    if (shadowRig && shadowTarget && shadowBuffer && shadowCanvas) {
      const shadowCamera = createIsoCamera(
        originTileCentre(footprint.width, footprint.height),
        shadowCanvas.width,
        shadowCanvas.height
      )

      // Hide the caster without stopping it casting: shadow-map rendering uses
      // its own depth material, so suppressing colour and depth writes leaves
      // the object invisible while its shadow still lands on the floor.
      //
      // Keyed by material, not by mesh. Materials are shared between parts, so
      // walking meshes would read back the value the *previous* mesh had just
      // written and "restore" the material to invisible - which silently blanked
      // every frame after the first.
      const restore = new Map<THREE.Material, { colorWrite: boolean; depthWrite: boolean }>()
      model.group.traverse((node) => {
        const mesh = node as THREE.Mesh
        if (!mesh.isMesh) return
        const material = mesh.material as THREE.Material
        if (restore.has(material)) return
        restore.set(material, {
          colorWrite: material.colorWrite,
          depthWrite: material.depthWrite,
        })
        material.colorWrite = false
        material.depthWrite = false
      })
      shadowRig.floor.visible = true

      renderer.setRenderTarget(shadowTarget)
      renderer.setClearColor(0x000000, 0)
      renderer.clear(true, true, true)
      renderer.render(scene, shadowCamera)
      renderer.readRenderTargetPixels(
        shadowTarget, 0, 0, shadowTarget.width, shadowTarget.height, shadowBuffer
      )

      shadowRig.floor.visible = false
      for (const [material, saved] of restore) {
        material.colorWrite = saved.colorWrite
        material.depthWrite = saved.depthWrite
      }

      let shadowImage: RgbaImage = flipVertically({
        data: new Uint8ClampedArray(shadowBuffer.buffer.slice(0)),
        width: shadowTarget.width,
        height: shadowTarget.height,
      })
      shadowImage = downsample(shadowImage, cfg.supersample)
      shadowImage = flattenShadow(shadowImage, cfg.shadow)

      const croppedShadow = cropToContent(shadowImage)
      if (croppedShadow.width > 1 || croppedShadow.height > 1) {
        shadow = {
          image: {
            data: croppedShadow.data,
            width: croppedShadow.width,
            height: croppedShadow.height,
          },
          width: croppedShadow.width,
          height: croppedShadow.height,
          anchorX: shadowCanvas.width / 2 - croppedShadow.offsetX,
          anchorY: shadowCanvas.height / 2 - croppedShadow.offsetY,
        }
      }
    }

    frames.push({
      direction: directionFor(asset, index),
      index,
      image: { data: cropped.data, width: cropped.width, height: cropped.height },
      width: cropped.width,
      height: cropped.height,
      // The anchor sits at the canvas centre by construction; cropping is the
      // only thing that moves it.
      anchorX: canvas.width / 2 - cropped.offsetX,
      anchorY: canvas.height / 2 - cropped.offsetY,
      footprint,
      interactions: rotateInteractions(asset, index),
      shadow,
    })
  }

  renderer.setRenderTarget(previousTarget)
  target.dispose()
  if (shadowTarget) shadowTarget.dispose()
  if (shadowRig) {
    scene.remove(shadowRig.light)
    scene.remove(shadowRig.floor)
    shadowRig.dispose()
  }
  scene.remove(model.group)
  model.dispose()

  return {
    id: asset.id,
    name: asset.name,
    defaultDirection: directionFor(asset, 0),
    placement: asset.placement ?? 'floor',
    behaviour: asset.behaviour,
    footprint: asset.footprint,
    frames,
    palette: uniqueColours(frames.flatMap((frame) => usedColours(frame.image))),
    ramps: model.ramps,
    canvas,
  }
}

export const RENDER_CONSTANTS = { TILE_WIDTH, TILE_HEIGHT, PIXELS_PER_UNIT }
