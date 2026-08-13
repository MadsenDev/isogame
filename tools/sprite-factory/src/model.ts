/**
 * Declarative primitive models.
 *
 * Furniture is described as a list of boxes, cylinders, spheres and cones with
 * positions in tile units. This is deliberately crude: the pipeline's premise
 * is that we author geometry *around* the limits of a 64px sprite, not that we
 * shrink detailed models down and hope.
 *
 * Coordinate conventions for an asset:
 *   - the model is centred on its own footprint in X/Z
 *   - y = 0 is the floor
 *   - one unit is one tile edge
 *   - the asset faces +X at rotation 0, which is "south" in IsoGame terms
 */

import * as THREE from 'three'
import { createPixelToonMaterial, MaterialSpec, ShadingConfig } from './materials'
import { loadModelFile, ModelSource } from './loaders'
import { Direction, DirectionCount } from './directions'

export type { Direction }

export type Vec3 = [number, number, number]

interface PrimitiveBase {
  /** Centre of the primitive, in tile units. */
  position?: Vec3
  /** Euler rotation in degrees, applied XYZ. */
  rotation?: Vec3
  /** Material name from the asset's material table, or an inline spec. */
  material: string | MaterialSpec
}

export interface BoxSpec extends PrimitiveBase {
  type: 'box'
  size: Vec3
}

export interface CylinderSpec extends PrimitiveBase {
  type: 'cylinder'
  radius: number
  /** Defaults to `radius`; set separately for tapered shapes. */
  radiusTop?: number
  height: number
  segments?: number
}

export interface SphereSpec extends PrimitiveBase {
  type: 'sphere'
  radius: number
  segments?: number
  /** Non-uniform squash, applied after the sphere is built. */
  scale?: Vec3
}

export interface ConeSpec extends PrimitiveBase {
  type: 'cone'
  radius: number
  height: number
  segments?: number
}

export type PrimitiveSpec = BoxSpec | CylinderSpec | SphereSpec | ConeSpec


export type InteractionType = 'sit' | 'lay' | 'stand' | 'use' | 'dance' | 'sleep'

export type FurnitureCategory = 'seating' | 'decoration' | 'functional' | 'flooring' | 'wall'

/** Where a piece can be placed. Mounted assets never touch the floor. */
export type Placement = 'floor' | 'wall' | 'ceiling'

/**
 * A spot where a player interacts with the furniture.
 *
 * `point` is the thing hand-authored sprite sheets never carry: the position in
 * *3D* where the player's sprite belongs. Because the pipeline knows it in model
 * space, it can project it for every rotation and hand the game exact pixel
 * offsets - so a sitter lands on the seat rather than on the floor beneath it.
 */
export interface InteractionSpotSpec {
  /** Footprint tile the player occupies, at the authored rotation. */
  tile: { x: number; y: number }
  /** Where the player's sprite origin belongs, in model space (tile units). */
  point: Vec3
  /** Which way the player faces, at the authored rotation. */
  facing: Direction
  /** Overrides the automatic front/behind decision for the player sprite. */
  layer?: 'front' | 'behind'
}

export interface InteractionSpec {
  type: InteractionType
  animation?: string
  /** 0 means "until the player moves". */
  durationMs?: number
  spots: InteractionSpotSpec[]
}

/** The game-facing stats: everything IsoGame needs that is not pixels. */
export interface BehaviourSpec {
  category: FurnitureCategory
  /** Can a player walk over it (rugs, floor tiles)? */
  walkable: boolean
  /** Can other furniture be placed on top (tables, shelves)? */
  stackable: boolean
  rotatable: boolean
  collision: {
    blocksMovement: boolean
    blocksVision: boolean
    /** Height in tiles, as the game's collision model counts it. */
    height: number
    shape: 'rectangle' | 'circle'
  }
}

export interface AssetSpec {
  /** Must match the id in src/data/furnitureDefinitions.ts. */
  id: string
  name: string
  /**
   * Which way the model faces as authored, at rotation 0.
   *
   * Most things are built facing +X ("south"), but a wide two-seat sofa is
   * naturally authored long-side-on, facing +Z ("east"). Declaring it here lets
   * the renderer label frames by where the furniture actually points instead of
   * by how many times we turned it.
   */
  facing?: Direction
  /**
   * How many orientations to render. Four for furniture, which rotates on the
   * tile grid; eight for characters, which face freely.
   */
  directionCount?: DirectionCount
  /** Tiles occupied at rotation 0. */
  footprint: { width: number; height: number }
  /**
   * Floor (default), wall or ceiling.
   *
   * Wall assets are authored against the plane behind their tile and only get
   * the two orientations an isometric room can actually show a wall in.
   */
  placement?: Placement
  /** Stats the game needs: collisions, category, walkability. */
  behaviour: BehaviourSpec
  /** Interaction spots, including where the player's sprite goes. */
  interactions?: InteractionSpec[]
  materials: Record<string, MaterialSpec>
  /** Primitive parts. Mutually exclusive with `source`. */
  parts?: PrimitiveSpec[]
  /** Load geometry from a .glb/.gltf/.obj file instead of building primitives. */
  source?: ModelSource
  /** Overrides the default silhouette outline for this asset. */
  outline?: { enabled?: boolean; colour?: string }
  /** Overrides whether this asset casts a contact shadow. */
  shadow?: { enabled?: boolean }
  notes?: string
}

const DEG = Math.PI / 180

function buildGeometry(part: PrimitiveSpec): THREE.BufferGeometry {
  switch (part.type) {
    case 'box':
      return new THREE.BoxGeometry(part.size[0], part.size[1], part.size[2])
    case 'cylinder':
      return new THREE.CylinderGeometry(
        part.radiusTop ?? part.radius,
        part.radius,
        part.height,
        part.segments ?? 16
      )
    case 'sphere': {
      const geometry = new THREE.SphereGeometry(part.radius, part.segments ?? 16, (part.segments ?? 16) / 2)
      if (part.scale) geometry.scale(part.scale[0], part.scale[1], part.scale[2])
      return geometry
    }
    case 'cone':
      return new THREE.ConeGeometry(part.radius, part.height, part.segments ?? 16)
  }
}

export interface BuiltModel {
  group: THREE.Group
  /** Every colour any pixel of this model can be, darkest ramp entry first. */
  palette: string[]
  dispose: () => void
}

/**
 * Build an asset's geometry, from primitives or from a model file.
 *
 * Everything after this point is source-agnostic, which is the whole reason
 * imported models and hand-declared boxes come out looking like siblings.
 */
export async function buildAssetModel(asset: AssetSpec, shading: ShadingConfig): Promise<BuiltModel> {
  if (asset.source && asset.parts?.length) {
    throw new Error(`${asset.id}: set either "parts" or "source", not both`)
  }
  if (asset.source) {
    return loadModelFile(asset.source, asset.footprint, shading)
  }
  return buildPrimitiveModel(asset, shading)
}

export function buildPrimitiveModel(asset: AssetSpec, shading: ShadingConfig): BuiltModel {
  const group = new THREE.Group()
  const palette: string[] = []
  const disposables: Array<{ dispose: () => void }> = []
  const cache = new Map<string, THREE.ShaderMaterial>()

  const resolveMaterial = (ref: string | MaterialSpec): THREE.ShaderMaterial => {
    const key = typeof ref === 'string' ? ref : JSON.stringify(ref)
    const cached = cache.get(key)
    if (cached) return cached

    const spec = typeof ref === 'string' ? asset.materials[ref] : ref
    if (!spec) throw new Error(`${asset.id}: unknown material "${ref}"`)

    const built = createPixelToonMaterial(spec, shading)
    palette.push(...built.ramp)
    cache.set(key, built.material)
    disposables.push(built.material)
    return built.material
  }

  for (const part of asset.parts ?? []) {
    const geometry = buildGeometry(part)
    disposables.push(geometry)

    const mesh = new THREE.Mesh(geometry, resolveMaterial(part.material))
    const [px, py, pz] = part.position ?? [0, 0, 0]
    mesh.position.set(px, py, pz)
    if (part.rotation) {
      mesh.rotation.set(part.rotation[0] * DEG, part.rotation[1] * DEG, part.rotation[2] * DEG)
    }
    group.add(mesh)
  }

  group.updateMatrixWorld(true)

  return {
    group,
    palette,
    dispose: () => disposables.forEach((d) => d.dispose()),
  }
}
