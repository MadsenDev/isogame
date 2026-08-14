/**
 * Characters.
 *
 * Furniture is static, so it could be a fixed list of primitives. A character
 * has to move, so its parts are *computed* from a pose: a handful of joint
 * angles. Each animation frame is a different pose, run through the same
 * renderer as everything else — so a guest is lit, palettised and anchored
 * exactly like the chair they sit on.
 *
 * Proportions are in tile units, where one unit is one tile edge. A guest is
 * ~1.7 units, so at 45.25 px/unit they stand about 77px tall against a 64px
 * tile. The pre-generated art was drawn at 96px, which is why guests loomed
 * over the furniture.
 *
 * Limbs rotate about a pivot rather than around their own centre, so the code
 * places each part by rotating its offset-from-pivot and adding the pivot back.
 * Characters are authored facing +X ("south"), so a forward swing is a rotation
 * about +Z.
 */

import { AssetSpec, PrimitiveSpec, Vec3 } from './model'
import { MaterialSpec } from './materials'

/** Joint angles, in degrees. Zero is a neutral standing pose. */
export interface Pose {
  leftLeg: number
  rightLeg: number
  leftArm: number
  rightArm: number
  /** Vertical bob of the whole body, in tile units. */
  bob: number
  /** Forward lean of the torso. */
  lean: number
  /** Knee bend, used by the sitting pose. */
  knee: number
  /** Drops the whole body, so a sitter's hips meet the seat. */
  crouch: number
  /**
   * Tips the whole assembly about +Z, in degrees. 90 lays the body on its back.
   *
   * Applied after the pose is built rather than as another joint, because
   * lying down is not something a joint does - it is the difference between
   * the body's frame and the world's.
   */
  recline: number
}

export const NEUTRAL_POSE: Pose = {
  leftLeg: 0,
  rightLeg: 0,
  leftArm: 0,
  rightArm: 0,
  bob: 0,
  lean: 0,
  knee: 0,
  crouch: 0,
  recline: 0,
}

export interface CharacterProportions {
  headSize: number
  neck: number
  torsoHeight: number
  torsoWidth: number
  torsoDepth: number
  armLength: number
  armThickness: number
  legLength: number
  /** Fraction of the leg above the knee. */
  thighRatio: number
  legThickness: number
  shoulderWidth: number
  hipWidth: number
}

export const DEFAULT_PROPORTIONS: CharacterProportions = {
  headSize: 0.34,
  neck: 0.04,
  torsoHeight: 0.5,
  torsoWidth: 0.42,
  torsoDepth: 0.26,
  armLength: 0.46,
  armThickness: 0.12,
  /** Split at the knee: thigh is the upper 45%, shin the rest. */
  legLength: 0.62,
  thighRatio: 0.45,
  legThickness: 0.15,
  shoulderWidth: 0.5,
  hipWidth: 0.24,
}

/**
 * The recolourable slots.
 *
 * These are the *only* things a pixel of a character can be, and the game
 * recolours a sprite by mapping each slot's generated ramp onto a ramp derived
 * from the colour a player picked. So this list is the customisation surface:
 * anything that should be separately colourable has to be its own slot.
 */
export interface CharacterPalette {
  skin: string
  hair: string
  shirt: string
  trousers: string
  shoes: string
  eyes: string
}

export type CharacterSlot = keyof CharacterPalette

export const CHARACTER_SLOTS: CharacterSlot[] = [
  'skin',
  'hair',
  'shirt',
  'trousers',
  'shoes',
  'eyes',
]

/** Hair lives on its own render layer so it can ship as a separate overlay. */
export const HAIR_LAYER = 'hair'

const DEG = Math.PI / 180

/**
 * Place a limb hanging from `pivot`, swung `angle` degrees forward.
 *
 * The limb's centre starts `length / 2` below the pivot; rotating that offset
 * about +Z and adding the pivot back is what makes the joint behave like a
 * shoulder instead of a free-floating box.
 */
function swing(pivot: Vec3, length: number, angle: number): { position: Vec3; rotation: Vec3 } {
  const radians = angle * DEG
  const offsetY = -length / 2
  return {
    position: [
      pivot[0] - offsetY * Math.sin(radians),
      pivot[1] + offsetY * Math.cos(radians),
      pivot[2],
    ],
    rotation: [0, 0, -angle],
  }
}

/**
 * The joints of a posed skeleton, resolved once and handed to the outfit.
 *
 * Outfits need to know where the shoulders and knees ended up, and computing
 * that twice - once for the body, once for the clothes - is how a sleeve ends
 * up half a pixel off the arm it covers.
 */
export interface Skeleton {
  p: CharacterProportions
  pose: Pose
  hipY: number
  torsoY: number
  shoulderY: number
  headY: number
  thighLength: number
  shinLength: number
  legs: Array<{
    z: number
    angle: number
    thigh: { position: Vec3; rotation: Vec3 }
    shin: { position: Vec3; rotation: Vec3 }
    shinAngle: number
  }>
  arms: Array<{ z: number; angle: number; shoulder: Vec3; hand: Vec3 }>
}

export function buildSkeleton(pose: Pose, p: CharacterProportions): Skeleton {
  const drop = pose.bob - pose.crouch

  const hipY = p.legLength + drop
  const torsoY = hipY + p.torsoHeight / 2
  const shoulderY = hipY + p.torsoHeight
  const headY = shoulderY + p.neck + p.headSize / 2

  const thighLength = p.legLength * p.thighRatio
  const shinLength = p.legLength - thighLength

  // A leg is two segments so it can bend. Without a knee, a sitting character's
  // legs stick straight out in front of them like a mannequin.
  const buildLeg = (angle: number, z: number) => {
    const thigh = swing([0, hipY, z], thighLength, angle)
    const radians = angle * DEG
    const kneePoint: Vec3 = [
      thigh.position[0] - (thighLength / 2) * Math.sin(radians),
      thigh.position[1] - (thighLength / 2) * Math.cos(radians),
      z,
    ]
    const shin = swing(kneePoint, shinLength, angle - pose.knee)
    return { z, angle, thigh, shin, shinAngle: angle - pose.knee }
  }

  const buildArm = (angle: number, z: number) => {
    const shoulder: Vec3 = [0, shoulderY - 0.04, z]
    const limb = swing(shoulder, p.armLength, angle)
    return {
      z,
      angle,
      shoulder,
      // The far end of the arm, where a hand goes.
      hand: [
        limb.position[0] - (p.armLength / 2) * Math.sin(angle * DEG),
        limb.position[1] - (p.armLength / 2) * Math.cos(angle * DEG),
        z,
      ] as Vec3,
    }
  }

  return {
    p,
    pose,
    hipY,
    torsoY,
    shoulderY,
    headY,
    thighLength,
    shinLength,
    legs: [buildLeg(pose.leftLeg, -p.hipWidth / 2), buildLeg(pose.rightLeg, p.hipWidth / 2)],
    arms: [buildArm(pose.leftArm, -p.shoulderWidth / 2), buildArm(pose.rightArm, p.shoulderWidth / 2)],
  }
}

/**
 * A sleeve is the top `cover` fraction of the arm; the rest is bare.
 *
 * Both segments swing about the shoulder at the same angle, so this is really
 * just one box cut in two - but cutting it is what makes a t-shirt read as a
 * t-shirt instead of as a long-sleeved top in a different colour.
 */
function armParts(skeleton: Skeleton, cover: number): PrimitiveSpec[] {
  const { p } = skeleton
  const parts: PrimitiveSpec[] = []

  for (const arm of skeleton.arms) {
    const sleeveLength = p.armLength * cover
    const bareLength = p.armLength - sleeveLength

    if (sleeveLength > 0.001) {
      const sleeve = swing(arm.shoulder, sleeveLength, arm.angle)
      parts.push({
        type: 'box',
        // Sleeves sit *on* the arm, so they have to be fractionally thicker.
        size: [p.armThickness * 1.12, sleeveLength, p.armThickness * 1.12],
        position: sleeve.position,
        rotation: sleeve.rotation,
        material: 'shirt',
      })
    }

    if (bareLength > 0.001) {
      const radians = arm.angle * DEG
      const elbow: Vec3 = [
        arm.shoulder[0] - sleeveLength * Math.sin(radians),
        arm.shoulder[1] - sleeveLength * Math.cos(radians),
        arm.z,
      ]
      const bare = swing(elbow, bareLength, arm.angle)
      parts.push({
        type: 'box',
        size: [p.armThickness, bareLength, p.armThickness],
        position: bare.position,
        rotation: bare.rotation,
        material: 'skin',
      })
    }

    // Hands, so a swinging arm still reads at this size.
    parts.push({
      type: 'box',
      size: [p.armThickness, p.armThickness, p.armThickness],
      position: arm.hand,
      material: 'skin',
    })
  }

  return parts
}

/** Legs and feet. `material` is what the legs are wearing, if anything. */
function legParts(skeleton: Skeleton, material: 'trousers' | 'skin'): PrimitiveSpec[] {
  const { p } = skeleton
  const parts: PrimitiveSpec[] = []

  for (const leg of skeleton.legs) {
    parts.push(
      {
        type: 'box',
        size: [p.legThickness, skeleton.thighLength, p.legThickness],
        position: leg.thigh.position,
        rotation: leg.thigh.rotation,
        material,
      },
      {
        type: 'box',
        size: [p.legThickness * 0.92, skeleton.shinLength, p.legThickness * 0.92],
        position: leg.shin.position,
        rotation: leg.shin.rotation,
        material,
      }
    )
  }

  // Feet, at the end of each shin. Drawn after both legs so a shoe is never
  // half-buried in the other leg's shin.
  for (const leg of skeleton.legs) {
    const radians = leg.shinAngle * DEG
    parts.push({
      type: 'box',
      size: [p.legThickness * 1.5, p.legThickness * 0.55, p.legThickness],
      position: [
        leg.shin.position[0] - (skeleton.shinLength / 2) * Math.sin(radians) + 0.03,
        leg.shin.position[1] - (skeleton.shinLength / 2) * Math.cos(radians),
        leg.z,
      ],
      material: 'shoes',
    })
  }

  return parts
}

function torsoPart(skeleton: Skeleton, scale = 1): PrimitiveSpec {
  const { p } = skeleton
  return {
    type: 'box',
    size: [p.torsoDepth * scale, p.torsoHeight, p.torsoWidth * scale],
    position: [0, skeleton.torsoY, 0],
    rotation: [0, 0, -skeleton.pose.lean],
    material: 'shirt',
  }
}

export interface Outfit {
  id: string
  name: string
  build(skeleton: Skeleton): PrimitiveSpec[]
}

/**
 * What a character is wearing.
 *
 * An outfit only has the six palette slots to work with, so the variety has to
 * come from silhouette - a sleeve length, a flared skirt, a hood - rather than
 * from texture. That suits the format: at a 30px torso, shape is the only thing
 * that survives anyway.
 */
export const OUTFITS: Outfit[] = [
  {
    id: 'tee',
    name: 'T-shirt',
    build: (s) => [...legParts(s, 'trousers'), torsoPart(s), ...armParts(s, 0.42)],
  },
  {
    id: 'hoodie',
    name: 'Hoodie',
    build: (s) => [
      ...legParts(s, 'trousers'),
      torsoPart(s, 1.14),
      ...armParts(s, 1),
      // The hood, bunched behind the neck. Reads as a collar from the front and
      // as a hood from behind, which is the only two views that matter.
      {
        type: 'box',
        size: [s.p.torsoDepth * 0.62, s.p.headSize * 0.46, s.p.torsoWidth * 0.86],
        position: [-s.p.torsoDepth * 0.36, s.shoulderY + s.p.headSize * 0.1, 0],
        material: 'shirt',
      },
    ],
  },
  {
    id: 'tank',
    name: 'Tank top',
    build: (s) => [
      ...legParts(s, 'trousers'),
      torsoPart(s, 0.94),
      // Straps, so the bare shoulders do not read as a topless character.
      ...[-1, 1].map(
        (side): PrimitiveSpec => ({
          type: 'box',
          size: [s.p.torsoDepth * 0.98, s.p.torsoHeight * 0.3, s.p.torsoWidth * 0.22],
          position: [0, s.shoulderY - s.p.torsoHeight * 0.12, (side * s.p.torsoWidth) / 3.4],
          rotation: [0, 0, -s.pose.lean],
          material: 'shirt',
        })
      ),
      ...armParts(s, 0),
    ],
  },
  {
    id: 'dress',
    name: 'Dress',
    build: (s) => [
      ...legParts(s, 'skin'),
      torsoPart(s, 0.98),
      // Flared: wider at the hem than at the waist, which is what separates a
      // skirt from a cylinder of fabric.
      {
        type: 'cylinder',
        radius: s.p.hipWidth * 1.5,
        radiusTop: s.p.hipWidth * 0.92,
        height: s.p.legLength * 0.42,
        position: [0, s.hipY - s.p.legLength * 0.12, 0],
        material: 'shirt',
      },
      ...armParts(s, 0.24),
    ],
  },
  {
    id: 'overalls',
    name: 'Overalls',
    build: (s) => [
      ...legParts(s, 'trousers'),
      // The bib is trouser-coloured, so overalls read as one garment over a
      // shirt rather than as a shirt tucked into trousers.
      {
        type: 'box',
        size: [s.p.torsoDepth * 1.04, s.p.torsoHeight * 0.82, s.p.torsoWidth * 1.02],
        position: [0, s.torsoY - s.p.torsoHeight * 0.09, 0],
        rotation: [0, 0, -s.pose.lean],
        material: 'trousers',
      },
      torsoPart(s, 0.96),
      ...armParts(s, 0.42),
    ],
  },
]

export interface HairStyle {
  id: string
  name: string
  /** `headY` is the centre of the head; `h` is its size in tile units. */
  build(h: number, headY: number): PrimitiveSpec[]
}

/**
 * Hair.
 *
 * Every style is deliberately a little wider than the skull it sits on. The
 * body and the hair are rendered as separate passes and composited, so each
 * carries its own silhouette outline; overlapping the skull edge by a fraction
 * of a pixel is what keeps that from showing up as a bright seam at the
 * hairline.
 */
export const HAIR_STYLES: HairStyle[] = [
  { id: 'bald', name: 'Bald', build: () => [] },
  {
    id: 'buzz',
    name: 'Buzz cut',
    build: (h, y) => [
      { type: 'box', size: [h * 0.92, h * 0.22, h * 0.97], position: [0, y + h * 0.41, 0], material: 'hair' },
      { type: 'box', size: [h * 0.14, h * 0.34, h * 0.97], position: [-h * 0.41, y + h * 0.2, 0], material: 'hair' },
    ],
  },
  {
    id: 'short',
    name: 'Short',
    build: (h, y) => [
      { type: 'box', size: [h * 0.9, h * 0.3, h * 0.95], position: [0, y + h * 0.4, 0], material: 'hair' },
      { type: 'box', size: [h * 0.24, h * 0.55, h * 0.95], position: [-h * 0.35, y + h * 0.1, 0], material: 'hair' },
    ],
  },
  {
    id: 'bob',
    name: 'Bob',
    build: (h, y) => [
      { type: 'box', size: [h * 0.9, h * 0.3, h * 0.98], position: [0, y + h * 0.4, 0], material: 'hair' },
      { type: 'box', size: [h * 0.28, h * 0.8, h * 0.98], position: [-h * 0.34, y + h * 0.02, 0], material: 'hair' },
      ...[-1, 1].map(
        (side): PrimitiveSpec => ({
          type: 'box',
          size: [h * 0.84, h * 0.7, h * 0.16],
          position: [-h * 0.02, y + h * 0.04, side * h * 0.44],
          material: 'hair',
        })
      ),
    ],
  },
  {
    id: 'long',
    name: 'Long',
    build: (h, y) => [
      { type: 'box', size: [h * 0.9, h * 0.3, h * 0.98], position: [0, y + h * 0.4, 0], material: 'hair' },
      // Down to the shoulder blades. Anything longer starts intersecting the
      // arms as they swing.
      { type: 'box', size: [h * 0.24, h * 1.5, h * 0.98], position: [-h * 0.36, y - h * 0.3, 0], material: 'hair' },
      ...[-1, 1].map(
        (side): PrimitiveSpec => ({
          type: 'box',
          size: [h * 0.6, h * 1.0, h * 0.16],
          position: [-h * 0.12, y - h * 0.1, side * h * 0.45],
          material: 'hair',
        })
      ),
    ],
  },
  {
    id: 'ponytail',
    name: 'Ponytail',
    build: (h, y) => [
      { type: 'box', size: [h * 0.9, h * 0.3, h * 0.95], position: [0, y + h * 0.4, 0], material: 'hair' },
      { type: 'box', size: [h * 0.24, h * 0.55, h * 0.95], position: [-h * 0.35, y + h * 0.1, 0], material: 'hair' },
      // Tie, then tail. The head writes depth in the hair pass, so from the
      // front the tail is hidden rather than floating over the face.
      { type: 'box', size: [h * 0.22, h * 0.2, h * 0.3], position: [-h * 0.53, y + h * 0.3, 0], material: 'hair' },
      { type: 'box', size: [h * 0.2, h * 0.62, h * 0.24], position: [-h * 0.6, y - h * 0.02, 0], material: 'hair' },
    ],
  },
  {
    id: 'afro',
    name: 'Afro',
    build: (h, y) => [
      // A sphere terraces into concentric bands under the four-shade ramp,
      // which is exactly how you would hand-paint this.
      {
        type: 'sphere',
        radius: h * 0.6,
        segments: 20,
        scale: [0.92, 0.82, 1],
        position: [-h * 0.06, y + h * 0.3, 0],
        material: 'hair',
      },
    ],
  },
]

export function getOutfit(id: string): Outfit {
  const outfit = OUTFITS.find((entry) => entry.id === id)
  if (!outfit) throw new Error(`Unknown outfit "${id}"`)
  return outfit
}

export function getHairStyle(id: string): HairStyle {
  const style = HAIR_STYLES.find((entry) => entry.id === id)
  if (!style) throw new Error(`Unknown hair style "${id}"`)
  return style
}

export interface BuildOptions {
  proportions?: CharacterProportions
  /** Outfit id. Defaults to the first in the catalogue. */
  outfit?: string
  /** Hair style id. Defaults to bald - hair is usually a separate pass. */
  hair?: string
}

/**
 * Build the primitive list for one pose.
 *
 * Hair parts are tagged onto their own layer so the renderer can isolate them,
 * which is what lets hair styles and outfits be exported as two lists that
 * compose rather than as one list of every combination.
 */
export function buildCharacterParts(pose: Pose, options: BuildOptions = {}): PrimitiveSpec[] {
  const p = options.proportions ?? DEFAULT_PROPORTIONS
  const skeleton = buildSkeleton(pose, p)
  const outfit = getOutfit(options.outfit ?? OUTFITS[0].id)

  const parts: PrimitiveSpec[] = [
    ...outfit.build(skeleton),
    {
      type: 'box',
      size: [p.headSize * 0.85, p.headSize, p.headSize * 0.9],
      position: [0, skeleton.headY, 0],
      material: 'skin',
    },
    // Eyes: two pixels of dark on the front face. At a 30px head this is the
    // difference between "facing away" and "facing away, probably".
    ...[-1, 1].map(
      (side): PrimitiveSpec => ({
        type: 'box',
        size: [p.headSize * 0.06, p.headSize * 0.16, p.headSize * 0.16],
        position: [p.headSize * 0.44, skeleton.headY + p.headSize * 0.06, side * p.headSize * 0.22],
        material: 'eyes',
      })
    ),
  ]

  for (const part of getHairStyle(options.hair ?? 'bald').build(p.headSize, skeleton.headY)) {
    parts.push({ ...part, layer: HAIR_LAYER })
  }

  return pose.recline ? parts.map((part) => recline(part, pose.recline, p)) : parts
}

/**
 * Tip one part about +Z, and rest the body on the surface it is lying on.
 *
 * Every joint in the rig swings about +Z, so reclining composes with a swing by
 * plain addition on that one axis - which is the whole reason lying down can be
 * a transform of an ordinary pose rather than a second rig.
 *
 * The lift is half the torso depth: after the turn, what was the body's front
 * points up, so its back is half a torso below the origin and would otherwise
 * be buried in the mattress.
 */
function recline(part: PrimitiveSpec, degrees: number, p: CharacterProportions): PrimitiveSpec {
  const radians = degrees * DEG
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const [x, y, z] = part.position ?? [0, 0, 0]
  const [rx, ry, rz] = part.rotation ?? [0, 0, 0]

  return {
    ...part,
    position: [x * cos - y * sin, x * sin + y * cos + p.torsoDepth / 2, z],
    rotation: [rx, ry, rz + degrees],
  }
}

/** A walk cycle: legs and arms swing in opposition, with a bob at mid-stride. */
export function walkPose(frame: number, frameCount: number): Pose {
  const phase = (frame / frameCount) * Math.PI * 2
  const swingAmount = 32
  return {
    ...NEUTRAL_POSE,
    leftLeg: Math.sin(phase) * swingAmount,
    rightLeg: -Math.sin(phase) * swingAmount,
    leftArm: -Math.sin(phase) * swingAmount * 0.7,
    rightArm: Math.sin(phase) * swingAmount * 0.7,
    // Two bobs per cycle: one per footfall.
    bob: Math.abs(Math.cos(phase)) * 0.03 - 0.015,
    lean: 4,
  }
}

/** Standing still, with arms just off the body so the silhouette reads. */
export function idlePose(): Pose {
  return { ...NEUTRAL_POSE, leftArm: 4, rightArm: -4 }
}

/**
 * Sitting: thighs forward, shins down, hips dropped to seat height.
 *
 * The drop is what lets the game place a sitter using the seat offset the
 * furniture pipeline measured, without the legs ending up inside the chair.
 */
export function sitPose(proportions: CharacterProportions = DEFAULT_PROPORTIONS): Pose {
  return {
    ...NEUTRAL_POSE,
    leftLeg: 82,
    rightLeg: 82,
    leftArm: 18,
    rightArm: 18,
    knee: 84,
    // Drop the hips to the model origin: the game places a sitter using the
    // seat offset, so the origin lands on the seat surface and the shins hang
    // below it. Any other value floats the character above or sinks them in.
    crouch: proportions.legLength * proportions.thighRatio,
    lean: -3,
  }
}

/**
 * Lying down: reclined onto the back, hips at the model origin.
 *
 * Anchored the same way sitting is - hips at y = 0 - so the game places someone
 * on a bed with the mattress offset the furniture pipeline measured, exactly as
 * it places a sitter on a seat. The head ends up along -X, which is why a bed's
 * lay spots put the headboard on that side.
 */
export function layPose(proportions: CharacterProportions = DEFAULT_PROPORTIONS): Pose {
  return {
    ...NEUTRAL_POSE,
    crouch: proportions.legLength,
    recline: 90,
    // Not perfectly straight: a body with both legs and both arms in exactly
    // the same place reads as one limb from the side.
    leftLeg: 7,
    rightLeg: -5,
    knee: 6,
    leftArm: 14,
    rightArm: -10,
  }
}

/** Reaching for something: one arm out, weight forward. Drawn for `use` spots. */
export function reachPose(): Pose {
  return {
    ...NEUTRAL_POSE,
    rightArm: 68,
    leftArm: -8,
    lean: 7,
    leftLeg: -4,
    rightLeg: 4,
  }
}

export const DANCE_FRAMES = 4

/**
 * A four-frame loop: arms alternate overhead, with a bob and a rock on the
 * beat. The in-between frames put both arms mid-height so the switch reads as
 * one motion rather than as a jump.
 */
export function dancePose(frame: number): Pose {
  const beat = frame % DANCE_FRAMES
  const swap = beat === 0 ? 1 : beat === 2 ? -1 : 0

  return {
    ...NEUTRAL_POSE,
    leftArm: swap === 0 ? 62 : swap > 0 ? 162 : -18,
    rightArm: swap === 0 ? 62 : swap > 0 ? -18 : 162,
    leftLeg: swap * 11,
    rightLeg: swap * -11,
    lean: swap * 5,
    bob: swap === 0 ? 0 : 0.035,
  }
}

export const WAVE_FRAMES = 2

/** Two frames of one raised arm, which at this size is a wave. */
export function wavePose(frame: number): Pose {
  return {
    ...NEUTRAL_POSE,
    rightArm: frame % 2 === 0 ? 148 : 172,
    leftArm: -6,
    lean: -2,
  }
}

export interface CharacterSpec {
  id: string
  name: string
  palette: CharacterPalette
  proportions?: CharacterProportions
  animations: Record<string, Pose[]>
}

export const WALK_FRAMES = 6

/**
 * The palette every character sprite is *generated* with.
 *
 * This is not the palette anyone sees - the game maps each slot's ramp onto a
 * ramp derived from the colour a player picked - so these are keys, chosen to
 * be told apart rather than to look good:
 *
 *   - the twenty-four ramp entries must all be distinct, or a pixel would be
 *     ambiguous between two slots. Note that this rules out very dark bases:
 *     the darkest shade is 0.24 below the base in lightness, so anything under
 *     that clamps to black and collides with every other near-black slot.
 *   - slots are spread around the hue circle, because the downsampler averages
 *     across shared edges before snapping, and neighbours far apart in hue give
 *     that average somewhere unambiguous to land.
 */
export const GENERATION_PALETTE: CharacterPalette = {
  skin: '#e0a878',
  hair: '#6b4530',
  shirt: '#4a72a8',
  trousers: '#3c4557',
  shoes: '#544b5e',
  eyes: '#3d5f52',
}

/**
 * Every clip the game can ask for.
 *
 * One per interaction type the furniture pipeline can emit, so nothing the
 * catalogue declares is left with no way to draw it - `lay` used to fall back
 * to `sit`, which put people on beds in a chair pose.
 */
export const DEFAULT_ANIMATIONS: Record<string, Pose[]> = {
  idle: [idlePose()],
  walk: Array.from({ length: WALK_FRAMES }, (_, frame) => walkPose(frame, WALK_FRAMES)),
  sit: [sitPose()],
  lay: [layPose()],
  use: [reachPose()],
  dance: Array.from({ length: DANCE_FRAMES }, (_, frame) => dancePose(frame)),
  wave: Array.from({ length: WAVE_FRAMES }, (_, frame) => wavePose(frame)),
}

export const DEFAULT_CHARACTER: CharacterSpec = {
  id: 'guest',
  name: 'Guest',
  palette: GENERATION_PALETTE,
  animations: DEFAULT_ANIMATIONS,
}

export interface PoseAssetOptions {
  outfit?: string
  hair?: string
  /** Render only this layer, with the rest present as depth. */
  isolateLayer?: string
  /** Contact shadows belong to the body pass; overlays would double them up. */
  shadow?: boolean
}

/**
 * Wrap one pose as an AssetSpec so it can go through the ordinary renderer.
 *
 * Characters occupy one tile and face freely, hence eight directions and a 1x1
 * footprint. The behaviour block is inert - nothing collides with a sprite -
 * but the renderer expects one.
 */
export function poseAsset(
  character: CharacterSpec,
  animation: string,
  frame: number,
  pose: Pose,
  options: PoseAssetOptions = {}
): AssetSpec {
  const materials: Record<string, MaterialSpec> = {
    skin: { colour: character.palette.skin },
    hair: { colour: character.palette.hair },
    shirt: { colour: character.palette.shirt },
    trousers: { colour: character.palette.trousers },
    shoes: { colour: character.palette.shoes },
    // Unlit: a 2px eye that obeys the key light disappears on the shaded side.
    eyes: { colour: character.palette.eyes, unlit: true },
  }

  return {
    id: `${character.id}-${animation}-${frame}`,
    name: character.name,
    facing: 'south',
    directionCount: 8,
    footprint: { width: 1, height: 1 },
    behaviour: {
      category: 'decoration',
      walkable: true,
      stackable: false,
      rotatable: true,
      collision: { blocksMovement: false, blocksVision: false, height: 0, shape: 'rectangle' },
    },
    materials,
    isolateLayer: options.isolateLayer,
    shadow: { enabled: options.shadow ?? true },
    parts: buildCharacterParts(pose, {
      proportions: character.proportions,
      outfit: options.outfit,
      hair: options.hair,
    }),
  }
}
