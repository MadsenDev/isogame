/**
 * The furniture catalogue.
 *
 * Every id here matches an entry in src/data/furnitureDefinitions.ts, so the
 * pipeline's output drops straight into the game. Footprints match the tile
 * sizes the game already collides against.
 *
 * Authoring rules:
 *   - one unit is one tile edge, y = 0 is the floor
 *   - the model is centred on its own footprint in X/Z
 *   - keep it blocky; this is going to be about 60 pixels tall
 */

import { WALL_HEIGHT } from './iso'
import { AssetSpec } from './model'

const WOOD = '#b07a42'
const WOOD_DARK = '#875531'
const WOOD_WARM = '#c08b52'
const FABRIC_RED = '#c4544c'
const FABRIC_CREAM = '#ded3c0'
const LINEN = '#e4ded2'
const METAL = '#98a2ad'
const LEAF = '#4f9d52'
const LEAF_DEEP = '#3d7d43'
const TERRACOTTA = '#c1734a'
const SOIL = '#5b4433'
const LAMP_GLOW = '#ffdf9e'

export const CATALOG: AssetSpec[] = [
  {
    id: 'wooden_chair',
    name: 'Wooden Chair',
    facing: 'south',
    footprint: { width: 1, height: 1 },
    notes: 'The validation asset. If this does not read as IsoGame furniture, nothing else will.',
    behaviour: {
      category: 'seating',
      walkable: false,
      stackable: false,
      rotatable: true,
      collision: { blocksMovement: true, blocksVision: false, height: 1, shape: 'rectangle' },
    },
    interactions: [
      {
        type: 'sit',
        animation: 'sit',
        // The seat surface, 0.48 up: this is what puts the sitter on the chair
        // instead of on the floor tile underneath it.
        spots: [{ tile: { x: 0, y: 0 }, point: [0.02, 0.48, 0], facing: 'south' }],
      },
    ],
    materials: {
      wood: { colour: WOOD },
      woodDark: { colour: WOOD_DARK },
    },
    parts: [
      { type: 'box', size: [0.08, 0.44, 0.08], position: [0.18, 0.22, 0.18], material: 'woodDark' },
      { type: 'box', size: [0.08, 0.44, 0.08], position: [0.18, 0.22, -0.18], material: 'woodDark' },
      { type: 'box', size: [0.08, 0.44, 0.08], position: [-0.18, 0.22, 0.18], material: 'woodDark' },
      { type: 'box', size: [0.08, 0.44, 0.08], position: [-0.18, 0.22, -0.18], material: 'woodDark' },
      { type: 'box', size: [0.52, 0.09, 0.52], position: [0, 0.48, 0], material: 'wood' },
      { type: 'box', size: [0.09, 0.42, 0.5], position: [-0.2, 0.73, 0], material: 'wood' },
      { type: 'box', size: [0.12, 0.09, 0.52], position: [-0.2, 0.97, 0], material: 'wood' },
    ],
  },

  {
    id: 'club_sofa',
    name: 'Club Sofa',
    // Authored long-side-on: a two-seater sits across its footprint, not along it.
    facing: 'east',
    footprint: { width: 2, height: 1 },
    behaviour: {
      category: 'seating',
      walkable: false,
      stackable: false,
      rotatable: true,
      collision: { blocksMovement: true, blocksVision: false, height: 1, shape: 'rectangle' },
    },
    interactions: [
      {
        type: 'sit',
        animation: 'sit',
        spots: [
          { tile: { x: 0, y: 0 }, point: [-0.47, 0.46, 0.06], facing: 'east' },
          { tile: { x: 1, y: 0 }, point: [0.47, 0.46, 0.06], facing: 'east' },
        ],
      },
    ],
    materials: {
      frame: { colour: WOOD_DARK },
      fabric: { colour: FABRIC_RED },
      cushion: { colour: '#d06b62' },
    },
    parts: [
      { type: 'box', size: [1.9, 0.3, 0.78], position: [0, 0.15, 0.02], material: 'frame' },
      { type: 'box', size: [0.86, 0.16, 0.62], position: [-0.47, 0.38, 0.06], material: 'cushion' },
      { type: 'box', size: [0.86, 0.16, 0.62], position: [0.47, 0.38, 0.06], material: 'cushion' },
      { type: 'box', size: [1.9, 0.52, 0.2], position: [0, 0.5, -0.29], material: 'fabric' },
      { type: 'box', size: [0.16, 0.3, 0.8], position: [-0.87, 0.44, 0.02], material: 'fabric' },
      { type: 'box', size: [0.16, 0.3, 0.8], position: [0.87, 0.44, 0.02], material: 'fabric' },
    ],
  },

  {
    id: 'bed',
    name: 'Bed',
    facing: 'south',
    footprint: { width: 2, height: 1 },
    behaviour: {
      category: 'seating',
      walkable: false,
      stackable: false,
      rotatable: true,
      collision: { blocksMovement: true, blocksVision: false, height: 1, shape: 'rectangle' },
    },
    interactions: [
      {
        type: 'lay',
        animation: 'lay',
        spots: [
          { tile: { x: 0, y: 0 }, point: [-0.45, 0.39, 0], facing: 'south' },
          { tile: { x: 1, y: 0 }, point: [0.45, 0.39, 0], facing: 'south' },
        ],
      },
      {
        type: 'sleep',
        animation: 'sleep',
        durationMs: 30000,
        spots: [{ tile: { x: 0, y: 0 }, point: [-0.45, 0.39, 0], facing: 'south' }],
      },
    ],
    materials: {
      frame: { colour: WOOD_DARK },
      mattress: { colour: LINEN },
      blanket: { colour: '#5b86b8' },
      pillow: { colour: FABRIC_CREAM },
    },
    parts: [
      { type: 'box', size: [1.92, 0.24, 0.86], position: [0, 0.12, 0], material: 'frame' },
      { type: 'box', size: [1.8, 0.16, 0.8], position: [0.03, 0.31, 0], material: 'mattress' },
      { type: 'box', size: [0.34, 0.11, 0.62], position: [-0.68, 0.44, 0], material: 'pillow' },
      { type: 'box', size: [0.98, 0.12, 0.82], position: [0.42, 0.44, 0], material: 'blanket' },
      { type: 'box', size: [0.14, 0.48, 0.86], position: [-0.92, 0.36, 0], material: 'frame' },
    ],
  },

  {
    id: 'table',
    name: 'Table',
    facing: 'south',
    footprint: { width: 2, height: 2 },
    behaviour: {
      category: 'functional',
      walkable: false,
      stackable: true,
      rotatable: true,
      collision: { blocksMovement: true, blocksVision: false, height: 1, shape: 'rectangle' },
    },
    interactions: [
      {
        type: 'use',
        animation: 'use',
        durationMs: 5000,
        // Standing spots around the table; the player stays on the floor, so
        // the attachment point is at floor level on their own tile.
        spots: [
          { tile: { x: 0, y: 0 }, point: [-0.5, 0, -0.5], facing: 'south' },
          { tile: { x: 1, y: 0 }, point: [0.5, 0, -0.5], facing: 'south' },
          { tile: { x: 0, y: 1 }, point: [-0.5, 0, 0.5], facing: 'north' },
          { tile: { x: 1, y: 1 }, point: [0.5, 0, 0.5], facing: 'north' },
        ],
      },
    ],
    materials: {
      top: { colour: WOOD_WARM },
      leg: { colour: WOOD_DARK },
    },
    parts: [
      { type: 'box', size: [1.82, 0.13, 1.82], position: [0, 0.62, 0], material: 'top' },
      { type: 'box', size: [0.13, 0.56, 0.13], position: [0.74, 0.28, 0.74], material: 'leg' },
      { type: 'box', size: [0.13, 0.56, 0.13], position: [0.74, 0.28, -0.74], material: 'leg' },
      { type: 'box', size: [0.13, 0.56, 0.13], position: [-0.74, 0.28, 0.74], material: 'leg' },
      { type: 'box', size: [0.13, 0.56, 0.13], position: [-0.74, 0.28, -0.74], material: 'leg' },
    ],
  },

  {
    id: 'rug',
    name: 'Rug',
    facing: 'south',
    footprint: { width: 3, height: 2 },
    // A rug is a floor decal: an outline would fight the tile grid it sits on.
    outline: { enabled: false },
    behaviour: {
      category: 'flooring',
      walkable: true,
      stackable: true,
      rotatable: true,
      collision: { blocksMovement: false, blocksVision: false, height: 0, shape: 'rectangle' },
    },
    interactions: [
      {
        type: 'dance',
        animation: 'dance',
        durationMs: 10000,
        spots: [
          { tile: { x: 1, y: 0 }, point: [0, 0.045, -0.5], facing: 'south' },
          { tile: { x: 1, y: 1 }, point: [0, 0.045, 0.5], facing: 'north' },
        ],
      },
    ],
    materials: {
      border: { colour: '#8f4d63' },
      field: { colour: '#c07f92' },
    },
    parts: [
      { type: 'box', size: [2.92, 0.03, 1.92], position: [0, 0.015, 0], material: 'border' },
      { type: 'box', size: [2.44, 0.03, 1.44], position: [0, 0.03, 0], material: 'field' },
    ],
  },

  {
    id: 'plant',
    name: 'Plant',
    facing: 'south',
    footprint: { width: 1, height: 1 },
    behaviour: {
      category: 'decoration',
      walkable: false,
      stackable: false,
      rotatable: true,
      collision: { blocksMovement: true, blocksVision: false, height: 2, shape: 'circle' },
    },
    materials: {
      pot: { colour: TERRACOTTA },
      soil: { colour: SOIL },
      stem: { colour: LEAF_DEEP },
      leaf: { colour: LEAF },
      leafDeep: { colour: LEAF_DEEP },
    },
    parts: [
      { type: 'cylinder', radius: 0.18, radiusTop: 0.26, height: 0.34, position: [0, 0.17, 0], material: 'pot' },
      { type: 'cylinder', radius: 0.28, height: 0.07, position: [0, 0.33, 0], material: 'pot' },
      { type: 'cylinder', radius: 0.24, height: 0.03, position: [0, 0.37, 0], material: 'soil' },
      { type: 'cylinder', radius: 0.035, height: 0.4, position: [0, 0.55, 0], material: 'stem' },
      { type: 'sphere', radius: 0.25, scale: [1, 0.78, 1], position: [0, 0.86, 0], material: 'leaf' },
      { type: 'sphere', radius: 0.19, scale: [1, 0.75, 1], position: [0.17, 0.72, 0.09], material: 'leafDeep' },
      { type: 'sphere', radius: 0.17, scale: [1, 0.75, 1], position: [-0.15, 0.75, -0.11], material: 'leaf' },
    ],
  },

  {
    id: 'lamp',
    name: 'Lamp',
    facing: 'south',
    footprint: { width: 1, height: 1 },
    behaviour: {
      category: 'functional',
      walkable: false,
      stackable: false,
      rotatable: true,
      collision: { blocksMovement: true, blocksVision: false, height: 2, shape: 'circle' },
    },
    interactions: [
      {
        type: 'use',
        animation: 'use',
        durationMs: 2000,
        spots: [{ tile: { x: 0, y: 0 }, point: [0, 0, 0], facing: 'south' }],
      },
    ],
    materials: {
      base: { colour: METAL },
      pole: { colour: '#7d858f' },
      // Unlit: a lampshade that obeys the key light reads as switched off.
      shade: { colour: LAMP_GLOW, unlit: true },
    },
    parts: [
      { type: 'cylinder', radius: 0.22, height: 0.06, position: [0, 0.03, 0], material: 'base' },
      { type: 'cylinder', radius: 0.035, height: 1.02, position: [0, 0.57, 0], material: 'pole' },
      { type: 'cylinder', radius: 0.26, radiusTop: 0.15, height: 0.32, position: [0, 1.19, 0], material: 'shade' },
    ],
  },

  {
    id: 'bookshelf',
    name: 'Bookshelf',
    facing: 'south',
    footprint: { width: 1, height: 1 },
    behaviour: {
      category: 'wall',
      walkable: false,
      stackable: false,
      rotatable: true,
      collision: { blocksMovement: true, blocksVision: true, height: 2, shape: 'rectangle' },
    },
    interactions: [
      {
        type: 'use',
        animation: 'use',
        durationMs: 3000,
        spots: [{ tile: { x: 0, y: 0 }, point: [0, 0, 0], facing: 'south' }],
      },
    ],
    materials: {
      case: { colour: WOOD_DARK },
      interior: { colour: '#6b432a' },
      shelf: { colour: WOOD },
      bookRed: { colour: '#b5504a' },
      bookBlue: { colour: '#4a72a8' },
      bookGreen: { colour: '#4f8f5c' },
      bookCream: { colour: FABRIC_CREAM },
    },
    parts: [
      { type: 'box', size: [0.34, 1.5, 0.88], position: [0, 0.75, 0], material: 'case' },
      { type: 'box', size: [0.3, 1.36, 0.78], position: [0.04, 0.78, 0], material: 'interior' },
      { type: 'box', size: [0.3, 0.05, 0.78], position: [0.04, 0.44, 0], material: 'shelf' },
      { type: 'box', size: [0.3, 0.05, 0.78], position: [0.04, 0.82, 0], material: 'shelf' },
      { type: 'box', size: [0.3, 0.05, 0.78], position: [0.04, 1.2, 0], material: 'shelf' },
      { type: 'box', size: [0.2, 0.26, 0.07], position: [0.06, 0.59, -0.3], material: 'bookRed' },
      { type: 'box', size: [0.2, 0.29, 0.06], position: [0.06, 0.61, -0.22], material: 'bookBlue' },
      { type: 'box', size: [0.2, 0.24, 0.08], position: [0.06, 0.58, -0.14], material: 'bookCream' },
      { type: 'box', size: [0.2, 0.28, 0.06], position: [0.06, 0.6, 0.16], material: 'bookGreen' },
      { type: 'box', size: [0.2, 0.25, 0.07], position: [0.06, 0.59, 0.24], material: 'bookRed' },
      { type: 'box', size: [0.2, 0.27, 0.06], position: [0.06, 0.98, -0.28], material: 'bookGreen' },
      { type: 'box', size: [0.2, 0.24, 0.08], position: [0.06, 0.96, -0.2], material: 'bookCream' },
      { type: 'box', size: [0.2, 0.29, 0.06], position: [0.06, 0.99, 0.18], material: 'bookBlue' },
      { type: 'box', size: [0.2, 0.26, 0.07], position: [0.06, 0.97, 0.26], material: 'bookRed' },
      { type: 'box', size: [0.2, 0.25, 0.07], position: [0.06, 1.35, -0.26], material: 'bookBlue' },
      { type: 'box', size: [0.2, 0.28, 0.06], position: [0.06, 1.37, 0.22], material: 'bookCream' },
    ],
  },

  {
    id: 'wall_lamp',
    name: 'Wall Lamp',
    facing: 'south',
    // Wall assets are authored against the plane behind their tile (x = -0.5)
    // and only render the two orientations an isometric room can show.
    placement: 'wall',
    footprint: { width: 1, height: 1 },
    notes: 'Mounted at 0.65 of wall height. Renders two frames, not four.',
    behaviour: {
      category: 'wall',
      walkable: true,
      stackable: false,
      rotatable: false,
      // Nothing on a wall blocks the floor beneath it.
      collision: { blocksMovement: false, blocksVision: false, height: 0, shape: 'rectangle' },
    },
    interactions: [
      {
        type: 'use',
        animation: 'use',
        durationMs: 2000,
        spots: [{ tile: { x: 0, y: 0 }, point: [0, 0, 0], facing: 'south' }],
      },
    ],
    materials: {
      bracket: { colour: '#7d858f' },
      shade: { colour: LAMP_GLOW, unlit: true },
    },
    parts: [
      { type: 'box', size: [0.06, 0.22, 0.16], position: [-0.47, WALL_HEIGHT * 0.65, 0], material: 'bracket' },
      { type: 'cylinder', radius: 0.04, height: 0.22, rotation: [0, 0, 90], position: [-0.36, WALL_HEIGHT * 0.65, 0], material: 'bracket' },
      {
        type: 'cylinder',
        radius: 0.2,
        radiusTop: 0.11,
        height: 0.24,
        position: [-0.22, WALL_HEIGHT * 0.68, 0],
        material: 'shade',
      },
    ],
  },

  {
    id: 'ceiling_lamp',
    name: 'Ceiling Lamp',
    facing: 'south',
    placement: 'ceiling',
    footprint: { width: 1, height: 1 },
    notes: 'Hangs from WALL_HEIGHT. The anchor is still the floor tile, so the game places it like any other piece.',
    behaviour: {
      category: 'decoration',
      walkable: true,
      stackable: false,
      rotatable: false,
      collision: { blocksMovement: false, blocksVision: false, height: 0, shape: 'circle' },
    },
    materials: {
      cord: { colour: '#4a4450' },
      shade: { colour: LAMP_GLOW, unlit: true },
      fitting: { colour: '#7d858f' },
    },
    parts: [
      { type: 'cylinder', radius: 0.09, height: 0.05, position: [0, WALL_HEIGHT - 0.02, 0], material: 'fitting' },
      { type: 'cylinder', radius: 0.015, height: 0.4, position: [0, WALL_HEIGHT - 0.24, 0], material: 'cord' },
      {
        type: 'cone',
        radius: 0.28,
        height: 0.26,
        rotation: [180, 0, 0],
        position: [0, WALL_HEIGHT - 0.56, 0],
        material: 'shade',
      },
    ],
  },
]

export function findAsset(id: string): AssetSpec | undefined {
  return CATALOG.find((asset) => asset.id === id)
}
