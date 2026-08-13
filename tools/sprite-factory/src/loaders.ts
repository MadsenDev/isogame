/**
 * Loading real model files.
 *
 * The primitive catalogue is the fast path, but nothing downstream of the model
 * cares where the geometry came from: the camera, shading, post-processing and
 * anchor maths all operate on a plain THREE.Object3D. So a .glb exported from
 * Blender goes through the identical pipeline and lands on the same grid.
 *
 * Two things get normalised on the way in:
 *
 *   placing    - whatever the file's own origin was, the model is centred on
 *                its footprint in X/Z and dropped onto y = 0, so anchors work.
 *                Files in odd units can opt into autoFit to be rescaled.
 *   materials  - by default the file's materials are replaced with pixel-toon
 *                ramps derived from their base colour, so an imported model
 *                shades consistently with everything in the catalogue.
 */

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { createPixelToonMaterial, MaterialSpec, ShadingConfig } from './materials'

export interface ModelSource {
  /** URL or repo-relative path to a .glb, .gltf or .obj file. */
  file: string
  /**
   * Rescale the model so its bounding box fills the declared tile footprint.
   *
   * Off by default: a model exported in metres already lands at a sensible size
   * when one tile is one metre, and auto-fitting would inflate a chair until it
   * touched all four tile edges. Turn it on for files in arbitrary units.
   */
  autoFit?: boolean
  /** With autoFit, how much of the footprint to fill. 0.8 leaves a margin. */
  fill?: number
  /** Extra uniform scale, applied after fitting. */
  scale?: number
  /** Degrees about +Y, for files that were not authored facing +X. */
  rotationY?: number
  /** Nudge in tile units, applied last. */
  offset?: [number, number, number]
  /** Keep the file's own materials instead of converting to shade ramps. */
  keepMaterials?: boolean
  /** Replace a named material's colour: { 'Seat': '#b07a42' }. */
  materialOverrides?: Record<string, string | MaterialSpec>
}

function extensionOf(file: string): string {
  const clean = file.split('?')[0].split('#')[0]
  const dot = clean.lastIndexOf('.')
  return dot < 0 ? '' : clean.slice(dot + 1).toLowerCase()
}

async function loadRaw(file: string): Promise<THREE.Object3D> {
  const extension = extensionOf(file)

  switch (extension) {
    case 'glb':
    case 'gltf': {
      const gltf = await new GLTFLoader().loadAsync(file)
      return gltf.scene
    }
    case 'obj':
      return await new OBJLoader().loadAsync(file)
    default:
      throw new Error(`Unsupported model format: .${extension} (expected .glb, .gltf or .obj)`)
  }
}

/**
 * Read a base colour out of whatever material the file happened to ship.
 *
 * glTF stores base colours in linear space and three keeps them that way, so
 * this has to convert back to sRGB. Reading the raw components instead makes
 * every imported model come out roughly half as bright as it should be.
 */
function baseColourOf(material: THREE.Material): string {
  const candidate = material as THREE.MeshStandardMaterial
  return candidate.color ? `#${candidate.color.getHexString(THREE.SRGBColorSpace)}` : '#b0b0b0'
}

export interface LoadedModel {
  group: THREE.Group
  palette: string[]
  dispose: () => void
}

export async function loadModelFile(
  source: ModelSource,
  footprint: { width: number; height: number },
  shading: ShadingConfig
): Promise<LoadedModel> {
  const loaded = await loadRaw(source.file)

  const group = new THREE.Group()
  group.add(loaded)

  if (source.rotationY) loaded.rotation.y = (source.rotationY * Math.PI) / 180
  group.updateMatrixWorld(true)

  // Fit before materials so the bounding box reflects the real geometry.
  if (source.autoFit) {
    const fill = source.fill ?? 1
    const box = new THREE.Box3().setFromObject(group)
    const size = box.getSize(new THREE.Vector3())
    const fit = Math.min(
      size.x > 0 ? (footprint.width * fill) / size.x : Infinity,
      size.z > 0 ? (footprint.height * fill) / size.z : Infinity
    )
    if (Number.isFinite(fit) && fit > 0) loaded.scale.multiplyScalar(fit)
  }

  if (source.scale) loaded.scale.multiplyScalar(source.scale)
  group.updateMatrixWorld(true)

  // Centre on the footprint in X/Z and sit the model on the floor.
  const fitted = new THREE.Box3().setFromObject(group)
  const centre = fitted.getCenter(new THREE.Vector3())
  loaded.position.x -= centre.x
  loaded.position.z -= centre.z
  loaded.position.y -= fitted.min.y

  if (source.offset) {
    loaded.position.x += source.offset[0]
    loaded.position.y += source.offset[1]
    loaded.position.z += source.offset[2]
  }
  group.updateMatrixWorld(true)

  const palette: string[] = []
  const disposables: Array<{ dispose: () => void }> = []

  if (!source.keepMaterials) {
    const converted = new Map<string, THREE.ShaderMaterial>()

    group.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (!mesh.isMesh) return

      const originals = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      const replacements = originals.map((original) => {
        const override = source.materialOverrides?.[original.name]
        const spec: MaterialSpec =
          typeof override === 'string'
            ? { colour: override }
            : override ?? { colour: baseColourOf(original) }

        const key = `${original.name}:${JSON.stringify(spec)}`
        const cached = converted.get(key)
        if (cached) return cached

        const built = createPixelToonMaterial(spec, shading)
        palette.push(...built.ramp)
        converted.set(key, built.material)
        disposables.push(built.material)
        return built.material
      })

      // The file's own materials are ours to free once nothing references them.
      originals.forEach((original) => disposables.push(original))
      mesh.material = Array.isArray(mesh.material) ? replacements : replacements[0]
    })
  } else {
    group.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (!mesh.isMesh) return
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      materials.forEach((material) => {
        disposables.push(material)
        palette.push(baseColourOf(material))
      })
    })
  }

  group.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (mesh.isMesh) disposables.push(mesh.geometry)
  })

  return {
    group,
    palette,
    dispose: () => disposables.forEach((item) => item.dispose()),
  }
}
