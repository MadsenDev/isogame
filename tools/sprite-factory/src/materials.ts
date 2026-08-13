/**
 * Banded "pixel toon" material.
 *
 * A physically-shaded render downsampled to 64px looks like mud. Instead, each
 * material gets a four-entry shade ramp and the fragment shader snaps the
 * lambert term into one of those four bands. Nothing else can come out of it.
 *
 * With the fixed light rig below, a box lands on three predictable bands:
 *
 *   top face (+Y)   -> shade 3, highlight
 *   left face (+Z)  -> shade 2, base colour
 *   right face (+X) -> shade 1, shadow
 *
 * Curved geometry gets the same four bands, which is exactly the terracing you
 * would hand-paint on a cylinder.
 */

import * as THREE from 'three'
import { hexToRgb, makeRamp, RampOptions } from './palette'

export interface MaterialSpec {
  /** Base colour. The ramp is derived from this. */
  colour: string
  /** Per-material ramp tweaks. */
  ramp?: Partial<RampOptions>
  /** Ignore lighting and always emit the brightest shade (lamps, screens). */
  unlit?: boolean
}

export interface ShadingConfig {
  /** Direction from a surface toward the light, in world space. */
  light: [number, number, number]
  /** Band edges on the half-lambert term, ascending. */
  thresholds: [number, number, number]
}

/**
 * Default rig: the light sits above and to the screen-left, matching the way
 * IsoGame shades its walls. Chosen so the three visible box faces land cleanly
 * in three separate bands rather than straddling a threshold.
 */
export const DEFAULT_SHADING: ShadingConfig = {
  light: [-0.3, 0.89, 0.35],
  thresholds: [0.25, 0.5, 0.8],
}

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldNormal;

  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Ramp entries are separate uniforms rather than an array: GLSL ES 1.0 will not
// let us index a uniform array with a non-constant expression.
const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uShade0;
  uniform vec3 uShade1;
  uniform vec3 uShade2;
  uniform vec3 uShade3;
  uniform vec3 uLightDirection;
  uniform vec3 uThresholds;
  uniform float uUnlit;

  varying vec3 vWorldNormal;

  void main() {
    float lambert = dot(normalize(vWorldNormal), normalize(uLightDirection));
    float t = lambert * 0.5 + 0.5;

    vec3 colour = uShade0;
    colour = mix(colour, uShade1, step(uThresholds.x, t));
    colour = mix(colour, uShade2, step(uThresholds.y, t));
    colour = mix(colour, uShade3, step(uThresholds.z, t));
    colour = mix(colour, uShade3, uUnlit);

    gl_FragColor = vec4(colour, 1.0);
  }
`

function toVector(hex: string): THREE.Vector3 {
  const { r, g, b } = hexToRgb(hex)
  // Raw 0..1 values, deliberately bypassing three's colour management so the
  // bytes that come back out of the render target are the bytes we asked for.
  return new THREE.Vector3(r / 255, g / 255, b / 255)
}

export interface BuiltMaterial {
  material: THREE.ShaderMaterial
  /** The four ramp colours, darkest first. */
  ramp: string[]
}

export function createPixelToonMaterial(spec: MaterialSpec, shading: ShadingConfig): BuiltMaterial {
  const ramp = makeRamp(spec.colour, spec.ramp)

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms: {
      uShade0: { value: toVector(ramp[0]) },
      uShade1: { value: toVector(ramp[1]) },
      uShade2: { value: toVector(ramp[2]) },
      uShade3: { value: toVector(ramp[3]) },
      uLightDirection: { value: new THREE.Vector3(...shading.light).normalize() },
      uThresholds: { value: new THREE.Vector3(...shading.thresholds) },
      uUnlit: { value: spec.unlit ? 1 : 0 },
    },
  })

  return { material, ramp }
}
