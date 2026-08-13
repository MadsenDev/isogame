/**
 * Room structure: floor tiles and wall panels.
 *
 * These were the last things drawn by hand, as canvas polygons with their own
 * colour constants, their own light direction and a pile of seam fudges. Coming
 * out of the pipeline instead, they share the furniture's camera, palette and
 * key light, and - the point of the exercise - a wall-mounted lamp now aligns
 * with the wall it hangs on *by construction*, because both are authored in the
 * same 3D space against the same plane.
 *
 * Geometry conventions:
 *   - a floor tile is a 1x1 slab whose top face is exactly the 64x32 diamond
 *   - a wall panel stands on the tile edge at x = -0.5, WALL_HEIGHT tall, and
 *     renders in the two orientations an isometric room can show
 *
 * Because every segment is identical geometry offset by exactly one tile, and
 * one tile is an integer pixel offset (+32, +16), the sprites tile seamlessly.
 * That is what replaces the old `seamOverlap` patches.
 */

import { WALL_HEIGHT } from './iso'
import { AssetSpec, PrimitiveSpec } from './model'

/** Inert stats: structures are drawn, not placed or collided with as furniture. */
const STRUCTURE_BEHAVIOUR: AssetSpec['behaviour'] = {
  category: 'flooring',
  walkable: true,
  stackable: false,
  rotatable: false,
  collision: { blocksMovement: false, blocksVision: false, height: 0, shape: 'rectangle' },
}

/** A floor slab thin enough that its sides never peek past the tile in front. */
const SLAB_THICKNESS = 0.02

/** Wall depth, measured outward from the tile boundary. */
const WALL_THICKNESS = 0.12

function slab(colour: string): PrimitiveSpec {
  return {
    type: 'box',
    size: [1, SLAB_THICKNESS, 1],
    position: [0, -SLAB_THICKNESS / 2, 0],
    material: colour,
  }
}

/**
 * Inlay sitting a hair above the slab.
 *
 * Detail on a floor cannot come from lighting - every top face has the same
 * normal and therefore lands in the same shade band - so it has to come from
 * separate materials. Raising each piece slightly avoids z-fighting.
 */
function inlay(
  material: string,
  size: [number, number],
  position: [number, number],
  lift = 0.004
): PrimitiveSpec {
  return {
    type: 'box',
    size: [size[0], SLAB_THICKNESS, size[1]],
    position: [position[0], -SLAB_THICKNESS / 2 + lift, position[1]],
    material,
  }
}

function floorTile(
  id: string,
  name: string,
  materials: AssetSpec['materials'],
  parts: PrimitiveSpec[]
): AssetSpec {
  return {
    id,
    name,
    facing: 'south',
    footprint: { width: 1, height: 1 },
    behaviour: STRUCTURE_BEHAVIOUR,
    // A grid line rather than a silhouette: floors abut, so a full dark outline
    // would double up into a heavy border between every pair of tiles.
    outline: { enabled: false },
    shadow: { enabled: false },
    materials,
    parts,
  }
}

export const STRUCTURES: AssetSpec[] = [
  floorTile(
    'floor_wood',
    'Wood Floor',
    {
      base: { colour: '#8a5f38' },
      plank: { colour: '#a2703f' },
      plankAlt: { colour: '#96683b' },
    },
    [
      slab('base'),
      // Planks run along +z, with the base colour showing through as seams.
      inlay('plank', [0.94, 0.2], [0, -0.36]),
      inlay('plankAlt', [0.94, 0.2], [0, -0.12]),
      inlay('plank', [0.94, 0.2], [0, 0.12]),
      inlay('plankAlt', [0.94, 0.2], [0, 0.36]),
    ]
  ),

  floorTile(
    'floor_stone',
    'Stone Floor',
    {
      base: { colour: '#6f6a66' },
      slab1: { colour: '#8b857f' },
      slab2: { colour: '#7d7770' },
    },
    [
      slab('base'),
      inlay('slab1', [0.44, 0.44], [-0.24, -0.24]),
      inlay('slab2', [0.44, 0.44], [0.24, -0.24]),
      inlay('slab2', [0.44, 0.44], [-0.24, 0.24]),
      inlay('slab1', [0.44, 0.44], [0.24, 0.24]),
    ]
  ),

  floorTile(
    'floor_carpet',
    'Carpet',
    {
      base: { colour: '#8a4f5e' },
      field: { colour: '#9c5b6b' },
    },
    [slab('base'), inlay('field', [0.9, 0.9], [0, 0])]
  ),

  floorTile(
    'floor_marble',
    'Marble Floor',
    {
      base: { colour: '#c9c6bd' },
      vein: { colour: '#b8b4a9' },
      polish: { colour: '#d6d3cb' },
    },
    [
      slab('base'),
      inlay('vein', [0.5, 0.1], [-0.14, -0.18]),
      inlay('vein', [0.1, 0.42], [0.22, 0.1]),
      inlay('polish', [0.3, 0.16], [-0.2, 0.28]),
    ]
  ),

  {
    id: 'wall_panel',
    name: 'Wall Panel',
    facing: 'south',
    // Renders the two orientations a room can show, exactly like wall-mounted
    // furniture - and against the same plane, which is what makes them line up.
    placement: 'wall',
    footprint: { width: 1, height: 1 },
    behaviour: { ...STRUCTURE_BEHAVIOUR, category: 'wall', walkable: false },
    notes: 'Face on the tile boundary at x = -0.5, thickness outside the room.',
    outline: { enabled: false },
    shadow: { enabled: false },
    materials: {
      face: { colour: '#b08152' },
      skirting: { colour: '#7d5735' },
      rail: { colour: '#c08f5e' },
    },
    parts: [
      // The wall's thickness sits *outside* the tile, so the visible face lands
      // exactly on the tile boundary at x = -0.5.
      //
      // With the thickness inside, each run's face overshot the corner by half
      // the wall thickness; the two faces then overlapped by ~6px and whichever
      // drew last put the corner line off-centre. Faces flush with the boundary
      // meet at exactly one point, so the corner closes on its own.
      // Exactly one tile long. Running long to cover the outer corner made
      // free-standing interior walls overshoot their run by a visible margin,
      // and put each face back over its neighbour's at a corner. The corner
      // square is filled by wall_corner instead.
      {
        type: 'box',
        size: [WALL_THICKNESS, WALL_HEIGHT, 1],
        position: [-0.5 - WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0],
        material: 'face',
      },
      {
        type: 'box',
        size: [WALL_THICKNESS + 0.03, 0.1, 1],
        position: [-0.5 - WALL_THICKNESS / 2 + 0.015, 0.05, 0],
        material: 'skirting',
      },
      {
        type: 'box',
        size: [WALL_THICKNESS + 0.02, 0.05, 1],
        position: [-0.5 - WALL_THICKNESS / 2 + 0.01, WALL_HEIGHT * 0.72, 0],
        material: 'rail',
      },
    ],
  },
]

/**
 * The post that closes an inside corner.
 *
 * Two perpendicular runs each stop at the tile boundary, which leaves the
 * square of wall thickness *outside* that boundary claimed by neither. Filling
 * it with its own piece keeps both runs exactly one tile long, so nothing
 * overshoots and neither face is ever drawn over the other.
 */
const WALL_CORNER: AssetSpec = {
  id: 'wall_corner',
  name: 'Wall Corner',
  facing: 'south',
  footprint: { width: 1, height: 1 },
  behaviour: { ...STRUCTURE_BEHAVIOUR, category: 'wall', walkable: false },
  outline: { enabled: false },
  shadow: { enabled: false },
  materials: {
    face: { colour: '#b08152' },
    skirting: { colour: '#7d5735' },
    rail: { colour: '#c08f5e' },
  },
  parts: [
    {
      type: 'box',
      size: [WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS],
      position: [-0.5 - WALL_THICKNESS / 2, WALL_HEIGHT / 2, -0.5 - WALL_THICKNESS / 2],
      material: 'face',
    },
    {
      type: 'box',
      size: [WALL_THICKNESS + 0.03, 0.1, WALL_THICKNESS + 0.03],
      position: [-0.5 - WALL_THICKNESS / 2 + 0.015, 0.05, -0.5 - WALL_THICKNESS / 2 + 0.015],
      material: 'skirting',
    },
    {
      type: 'box',
      size: [WALL_THICKNESS + 0.02, 0.05, WALL_THICKNESS + 0.02],
      position: [-0.5 - WALL_THICKNESS / 2 + 0.01, WALL_HEIGHT * 0.72, -0.5 - WALL_THICKNESS / 2 + 0.01],
      material: 'rail',
    },
  ],
}

STRUCTURES.push(WALL_CORNER)

/**
 * A doorway: the same wall, with a hole in it.
 *
 * Built to the wall's dimensions - same thickness, same face plane, same one
 * tile long - so it drops into a run without a seam. The opening is tall enough
 * to walk through, which is what forced WALL_HEIGHT up: at the old height a
 * guest was taller than the wall containing the door.
 */
const DOOR_OPENING_WIDTH = 0.66
const DOOR_OPENING_HEIGHT = 1.62
const DOOR_POST_WIDTH = (1 - DOOR_OPENING_WIDTH) / 2

const DOOR: AssetSpec = {
  id: 'door',
  name: 'Doorway',
  facing: 'south',
  placement: 'wall',
  footprint: { width: 1, height: 1 },
  behaviour: { ...STRUCTURE_BEHAVIOUR, category: 'wall', walkable: true },
  outline: { enabled: false },
  shadow: { enabled: false },
  materials: {
    face: { colour: '#b08152' },
    skirting: { colour: '#7d5735' },
    frame: { colour: '#8a5f38' },
    // Unlit: what is past the door is not in this room's light.
    beyond: { colour: '#241d2b', unlit: true },
    threshold: { colour: '#9a7248' },
  },
  parts: [
    // Posts either side of the opening.
    {
      type: 'box',
      size: [WALL_THICKNESS, WALL_HEIGHT, DOOR_POST_WIDTH],
      position: [-0.5 - WALL_THICKNESS / 2, WALL_HEIGHT / 2, -0.5 + DOOR_POST_WIDTH / 2],
      material: 'face',
    },
    {
      type: 'box',
      size: [WALL_THICKNESS, WALL_HEIGHT, DOOR_POST_WIDTH],
      position: [-0.5 - WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0.5 - DOOR_POST_WIDTH / 2],
      material: 'face',
    },
    // Lintel over the opening.
    {
      type: 'box',
      size: [WALL_THICKNESS, WALL_HEIGHT - DOOR_OPENING_HEIGHT, 1],
      position: [
        -0.5 - WALL_THICKNESS / 2,
        DOOR_OPENING_HEIGHT + (WALL_HEIGHT - DOOR_OPENING_HEIGHT) / 2,
        0,
      ],
      material: 'face',
    },
    // Darkness beyond, set behind the wall so the opening reads as a hole
    // rather than as a painted rectangle.
    {
      type: 'box',
      size: [0.04, DOOR_OPENING_HEIGHT, DOOR_OPENING_WIDTH],
      position: [-0.5 - WALL_THICKNESS - 0.02, DOOR_OPENING_HEIGHT / 2, 0],
      material: 'beyond',
    },
    // Frame trim, standing slightly proud of the wall face.
    {
      type: 'box',
      size: [WALL_THICKNESS + 0.05, DOOR_OPENING_HEIGHT + 0.08, 0.07],
      position: [-0.5 - WALL_THICKNESS / 2 + 0.025, (DOOR_OPENING_HEIGHT + 0.08) / 2, -DOOR_OPENING_WIDTH / 2],
      material: 'frame',
    },
    {
      type: 'box',
      size: [WALL_THICKNESS + 0.05, DOOR_OPENING_HEIGHT + 0.08, 0.07],
      position: [-0.5 - WALL_THICKNESS / 2 + 0.025, (DOOR_OPENING_HEIGHT + 0.08) / 2, DOOR_OPENING_WIDTH / 2],
      material: 'frame',
    },
    {
      type: 'box',
      size: [WALL_THICKNESS + 0.05, 0.08, DOOR_OPENING_WIDTH + 0.14],
      position: [-0.5 - WALL_THICKNESS / 2 + 0.025, DOOR_OPENING_HEIGHT + 0.04, 0],
      material: 'frame',
    },
    // Threshold across the floor of the opening.
    {
      type: 'box',
      size: [WALL_THICKNESS + 0.06, 0.03, DOOR_OPENING_WIDTH],
      position: [-0.5 - WALL_THICKNESS / 2 + 0.03, 0.015, 0],
      material: 'threshold',
    },
    // Skirting continues across the posts only, so the run reads unbroken.
    {
      type: 'box',
      size: [WALL_THICKNESS + 0.03, 0.1, DOOR_POST_WIDTH],
      position: [-0.5 - WALL_THICKNESS / 2 + 0.015, 0.05, -0.5 + DOOR_POST_WIDTH / 2],
      material: 'skirting',
    },
    {
      type: 'box',
      size: [WALL_THICKNESS + 0.03, 0.1, DOOR_POST_WIDTH],
      position: [-0.5 - WALL_THICKNESS / 2 + 0.015, 0.05, 0.5 - DOOR_POST_WIDTH / 2],
      material: 'skirting',
    },
  ],
}

STRUCTURES.push(DOOR)

export function findStructure(id: string): AssetSpec | undefined {
  return STRUCTURES.find((structure) => structure.id === id)
}

/** Ids the game treats as floor textures, in catalogue order. */
export const FLOOR_TILE_IDS = STRUCTURES.filter((s) => s.id.startsWith('floor_')).map((s) => s.id)
