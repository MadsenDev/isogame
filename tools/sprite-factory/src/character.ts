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

export interface CharacterPalette {
  skin: string
  hair: string
  shirt: string
  trousers: string
  shoes: string
  eyes: string
}

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

/** Build the primitive list for one pose. */
export function buildCharacterParts(
  pose: Pose,
  proportions: CharacterProportions = DEFAULT_PROPORTIONS
): PrimitiveSpec[] {
  const p = proportions
  const drop = pose.bob - pose.crouch

  const hipY = p.legLength + drop
  const torsoY = hipY + p.torsoHeight / 2
  const shoulderY = hipY + p.torsoHeight
  const headY = shoulderY + p.neck + p.headSize / 2

  const thighLength = p.legLength * p.thighRatio
  const shinLength = p.legLength - thighLength

  // A leg is two segments so it can bend. Without a knee, a sitting character's
  // legs stick straight out in front of them like a mannequin.
  const buildLeg = (legAngle: number, z: number) => {
    const thigh = swing([0, hipY, z], thighLength, legAngle)
    const radians = legAngle * DEG
    const kneePoint: Vec3 = [
      thigh.position[0] - (thighLength / 2) * Math.sin(radians),
      thigh.position[1] - (thighLength / 2) * Math.cos(radians),
      z,
    ]
    const shin = swing(kneePoint, shinLength, legAngle - pose.knee)
    return { thigh, shin, shinAngle: legAngle - pose.knee }
  }

  const legs = [buildLeg(pose.leftLeg, -p.hipWidth / 2), buildLeg(pose.rightLeg, p.hipWidth / 2)]
  const leftArm = swing([0, shoulderY - 0.04, -p.shoulderWidth / 2], p.armLength, pose.leftArm)
  const rightArm = swing([0, shoulderY - 0.04, p.shoulderWidth / 2], p.armLength, pose.rightArm)

  const parts: PrimitiveSpec[] = [
    // Legs first so the torso overlaps them at the hip.
    ...legs.flatMap((leg): PrimitiveSpec[] => [
      {
        type: 'box',
        size: [p.legThickness, thighLength, p.legThickness],
        position: leg.thigh.position,
        rotation: leg.thigh.rotation,
        material: 'trousers',
      },
      {
        type: 'box',
        size: [p.legThickness * 0.92, shinLength, p.legThickness * 0.92],
        position: leg.shin.position,
        rotation: leg.shin.rotation,
        material: 'trousers',
      },
    ]),
    {
      type: 'box',
      size: [p.torsoDepth, p.torsoHeight, p.torsoWidth],
      position: [0, torsoY, 0],
      rotation: [0, 0, -pose.lean],
      material: 'shirt',
    },
    {
      type: 'box',
      size: [p.armThickness, p.armLength, p.armThickness],
      position: leftArm.position,
      rotation: leftArm.rotation,
      material: 'shirt',
    },
    {
      type: 'box',
      size: [p.armThickness, p.armLength, p.armThickness],
      position: rightArm.position,
      rotation: rightArm.rotation,
      material: 'shirt',
    },
    // Hands, so a swinging arm still reads at this size.
    {
      type: 'box',
      size: [p.armThickness, p.armThickness, p.armThickness],
      position: [
        leftArm.position[0] - (p.armLength / 2) * Math.sin(pose.leftArm * DEG),
        leftArm.position[1] - (p.armLength / 2) * Math.cos(pose.leftArm * DEG),
        leftArm.position[2],
      ],
      material: 'skin',
    },
    {
      type: 'box',
      size: [p.armThickness, p.armThickness, p.armThickness],
      position: [
        rightArm.position[0] - (p.armLength / 2) * Math.sin(pose.rightArm * DEG),
        rightArm.position[1] - (p.armLength / 2) * Math.cos(pose.rightArm * DEG),
        rightArm.position[2],
      ],
      material: 'skin',
    },
    {
      type: 'box',
      size: [p.headSize * 0.85, p.headSize, p.headSize * 0.9],
      position: [0, headY, 0],
      material: 'skin',
    },
    // Eyes: two pixels of dark on the front face. At a 30px head this is the
    // difference between "facing away" and "facing away, probably".
    {
      type: 'box',
      size: [p.headSize * 0.06, p.headSize * 0.16, p.headSize * 0.16],
      position: [p.headSize * 0.44, headY + p.headSize * 0.06, -p.headSize * 0.22],
      material: 'eyes',
    },
    {
      type: 'box',
      size: [p.headSize * 0.06, p.headSize * 0.16, p.headSize * 0.16],
      position: [p.headSize * 0.44, headY + p.headSize * 0.06, p.headSize * 0.22],
      material: 'eyes',
    },
    // Hair: a slab on top and a shorter one at the back, which is enough to
    // tell which way a 30px head is facing.
    {
      type: 'box',
      size: [p.headSize * 0.88, p.headSize * 0.3, p.headSize * 0.93],
      position: [0, headY + p.headSize * 0.4, 0],
      material: 'hair',
    },
    {
      type: 'box',
      size: [p.headSize * 0.22, p.headSize * 0.55, p.headSize * 0.93],
      position: [-p.headSize * 0.36, headY + p.headSize * 0.1, 0],
      material: 'hair',
    },
  ]

  // Feet, at the end of each shin.
  for (const [index, leg] of legs.entries()) {
    const radians = leg.shinAngle * DEG
    const z = index === 0 ? -p.hipWidth / 2 : p.hipWidth / 2
    parts.push({
      type: 'box',
      size: [p.legThickness * 1.5, p.legThickness * 0.55, p.legThickness],
      position: [
        leg.shin.position[0] - (shinLength / 2) * Math.sin(radians) + 0.03,
        leg.shin.position[1] - (shinLength / 2) * Math.cos(radians),
        z,
      ],
      material: 'shoes',
    })
  }

  return parts
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

export interface CharacterSpec {
  id: string
  name: string
  palette: CharacterPalette
  proportions?: CharacterProportions
  animations: Record<string, Pose[]>
}

export const WALK_FRAMES = 6

export const DEFAULT_CHARACTER: CharacterSpec = {
  id: 'guest',
  name: 'Guest',
  palette: {
    skin: '#e0a878',
    hair: '#5a3b28',
    shirt: '#4a72a8',
    trousers: '#3c4557',
    shoes: '#2f2a33',
    eyes: '#2b2430',
  },
  animations: {
    idle: [idlePose()],
    walk: Array.from({ length: WALK_FRAMES }, (_, frame) => walkPose(frame, WALK_FRAMES)),
    sit: [sitPose()],
  },
}

/**
 * Wrap one pose as an AssetSpec so it can go through the ordinary renderer.
 *
 * Characters occupy one tile and face freely, hence eight directions and a 1x1
 * footprint. The behaviour block is inert - nothing collides with a sprite -
 * but the renderer expects one.
 */
export function poseAsset(character: CharacterSpec, animation: string, frame: number, pose: Pose): AssetSpec {
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
    parts: buildCharacterParts(pose, character.proportions),
  }
}
