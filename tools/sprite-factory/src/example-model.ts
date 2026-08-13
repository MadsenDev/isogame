/**
 * Generates the example .glb fixture.
 *
 * Rebuilds a catalogue asset with ordinary MeshStandardMaterials and exports it
 * as a binary glTF, which is what you would get out of Blender. Feeding that
 * file back through the pipeline proves the model-file path end to end without
 * committing a third-party asset to the repo.
 */

import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { findAsset } from './catalog'
import { AssetSpec, PrimitiveSpec } from './model'

const DEG = Math.PI / 180

function geometryFor(part: PrimitiveSpec): THREE.BufferGeometry {
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

/** Build the asset with standard materials, the way a DCC tool would author it. */
function toStandardScene(asset: AssetSpec): THREE.Scene {
  const scene = new THREE.Scene()
  const materials = new Map<string, THREE.MeshStandardMaterial>()

  for (const part of asset.parts ?? []) {
    const name = typeof part.material === 'string' ? part.material : 'inline'
    const spec = typeof part.material === 'string' ? asset.materials[name] : part.material

    let material = materials.get(name)
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color: spec.colour, roughness: 1, metalness: 0 })
      material.name = name
      materials.set(name, material)
    }

    const mesh = new THREE.Mesh(geometryFor(part), material)
    const [px, py, pz] = part.position ?? [0, 0, 0]
    mesh.position.set(px, py, pz)
    if (part.rotation) {
      mesh.rotation.set(part.rotation[0] * DEG, part.rotation[1] * DEG, part.rotation[2] * DEG)
    }
    scene.add(mesh)
  }

  return scene
}

/** Export a catalogue asset as a base64-encoded .glb. */
export async function exportExampleGlb(assetId: string): Promise<string> {
  const asset = findAsset(assetId)
  if (!asset) throw new Error(`No such asset: ${assetId}`)

  const buffer = await new GLTFExporter().parseAsync(toStandardScene(asset), { binary: true })
  if (!(buffer instanceof ArrayBuffer)) throw new Error('GLTFExporter did not return binary output')

  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}
