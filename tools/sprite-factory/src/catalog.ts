/**
 * The furniture catalogue.
 *
 * Every id here becomes an entry in src/data/furnitureDefinitions.generated.json,
 * so the pipeline's output drops straight into the game.
 *
 * Authoring rules:
 *   - one unit is one tile edge, y = 0 is the floor
 *   - the model is centred on its own footprint in X/Z
 *   - the piece faces +X at rotation 0, which is "south" in IsoGame terms; a
 *     piece whose front is its *long* side is authored facing 'east' instead, so
 *     the long axis can stay along X
 *   - keep it blocky; this is going to be about 60 pixels tall
 *
 * The behaviour and interaction helpers come from ./authoring. They exist so
 * that what is written down here is the part that differs between pieces.
 */

import {
  behaviour,
  dance,
  lay,
  legs,
  mirrorX,
  mirrorZ,
  repeatY,
  sit,
  sleep,
  standBeside,
  usedInPlace,
} from './authoring'
import { WALL_HEIGHT } from './iso'
import { AssetSpec } from './model'

const WOOD = '#b07a42'
const WOOD_DARK = '#875531'
const WOOD_WARM = '#c08b52'
const FABRIC_RED = '#c4544c'
const FABRIC_CREAM = '#ded3c0'
const LINEN = '#e4ded2'
const METAL = '#98a2ad'
const METAL_DARK = '#7d858f'
const LEAF = '#4f9d52'
const LEAF_DEEP = '#3d7d43'
const TERRACOTTA = '#c1734a'
const SOIL = '#5b4433'
const LAMP_GLOW = '#ffdf9e'
const BARK = '#6f4b32'
const SLATE = '#4a4450'

const BOOKS = {
  bookRed: { colour: '#b5504a' },
  bookBlue: { colour: '#4a72a8' },
  bookGreen: { colour: '#4f8f5c' },
  bookCream: { colour: FABRIC_CREAM },
}

export const CATALOG: AssetSpec[] = [
  {
    id: 'wooden_chair',
    name: 'Wooden Chair',
    facing: 'south',
    footprint: { width: 1, height: 1 },
    notes: 'The validation asset. If this does not read as IsoGame furniture, nothing else will.',
    behaviour: behaviour.seating(),
    // The seat surface, 0.48 up: this is what puts the sitter on the chair
    // instead of on the floor tile underneath it.
    interactions: [sit([{ tile: [0, 0], point: [0.02, 0.48, 0], facing: 'south' }])],
    materials: {
      wood: { colour: WOOD },
      woodDark: { colour: WOOD_DARK },
    },
    parts: [
      ...legs({ thickness: 0.08, height: 0.44, dx: 0.18, dz: 0.18, material: 'woodDark' }),
      { type: 'box', size: [0.52, 0.09, 0.52], position: [0, 0.48, 0], material: 'wood' },
      { type: 'box', size: [0.09, 0.42, 0.5], position: [-0.2, 0.73, 0], material: 'wood' },
      { type: 'box', size: [0.12, 0.09, 0.52], position: [-0.2, 0.97, 0], material: 'wood' },
    ],
  },
  {
    id: 'armchair',
    name: 'Armchair',
    facing: 'south',
    footprint: { width: 1, height: 1 },
    behaviour: behaviour.seating(),
    interactions: [sit([{ tile: [0, 0], point: [0.02, 0.46, 0], facing: 'south' }])],
    materials: {
      foot: { colour: WOOD_DARK },
      fabric: { colour: '#5e7f9e' },
      cushion: { colour: '#6f92b0' },
    },
    parts: [
      ...legs({ thickness: 0.07, height: 0.16, dx: 0.2, dz: 0.22, material: 'foot' }),
      { type: 'box', size: [0.62, 0.2, 0.66], position: [0.02, 0.26, 0], material: 'fabric' },
      { type: 'box', size: [0.5, 0.1, 0.54], position: [0.04, 0.41, 0], material: 'cushion' },
      { type: 'box', size: [0.16, 0.62, 0.7], position: [-0.26, 0.61, 0], material: 'fabric' },
      ...mirrorZ({
        type: 'box',
        size: [0.6, 0.24, 0.12],
        position: [0.04, 0.48, 0.29],
        material: 'fabric',
      }),
    ],
  },
  {
    id: 'stool',
    name: 'Stool',
    facing: 'south',
    footprint: { width: 1, height: 1 },
    behaviour: behaviour.seating(),
    interactions: [sit([{ tile: [0, 0], point: [0, 0.5, 0], facing: 'south' }])],
    materials: {
      wood: { colour: WOOD },
      woodDark: { colour: WOOD_DARK },
    },
    parts: [
      ...legs({ thickness: 0.06, height: 0.46, dx: 0.14, dz: 0.14, material: 'woodDark' }),
      // A stretcher between the legs: without it the legs read as four
      // unrelated sticks once they are three pixels wide.
      { type: 'box', size: [0.36, 0.05, 0.05], position: [0, 0.16, 0], material: 'woodDark' },
      { type: 'box', size: [0.05, 0.05, 0.36], position: [0, 0.16, 0], material: 'woodDark' },
      { type: 'cylinder', radius: 0.23, height: 0.08, position: [0, 0.5, 0], material: 'wood' },
    ],
  },
  {
    id: 'bench',
    name: 'Bench',
    // Authored long-side-on, like the sofa: two people sit across the footprint.
    facing: 'east',
    footprint: { width: 2, height: 1 },
    behaviour: behaviour.seating(),
    interactions: [
      sit([
        { tile: [0, 0], point: [-0.47, 0.44, 0], facing: 'east' },
        { tile: [1, 0], point: [0.47, 0.44, 0], facing: 'east' },
      ]),
    ],
    materials: {
      wood: { colour: WOOD },
      woodDark: { colour: WOOD_DARK },
    },
    parts: [
      ...legs({ thickness: 0.09, height: 0.42, dx: 0.76, dz: 0.16, material: 'woodDark' }),
      { type: 'box', size: [1.9, 0.06, 0.44], position: [0, 0.45, 0], material: 'wood' },
      { type: 'box', size: [1.9, 0.06, 0.44], position: [0, 0.39, 0], material: 'woodDark' },
    ],
  },
  {
    id: 'club_sofa',
    name: 'Club Sofa',
    // Authored long-side-on: a two-seater sits across its footprint, not along it.
    facing: 'east',
    footprint: { width: 2, height: 1 },
    behaviour: behaviour.seating(),
    interactions: [
      sit([
        { tile: [0, 0], point: [-0.47, 0.46, 0.06], facing: 'east' },
        { tile: [1, 0], point: [0.47, 0.46, 0.06], facing: 'east' },
      ]),
    ],
    materials: {
      frame: { colour: WOOD_DARK },
      fabric: { colour: FABRIC_RED },
      cushion: { colour: '#d06b62' },
    },
    parts: [
      { type: 'box', size: [1.9, 0.3, 0.78], position: [0, 0.15, 0.02], material: 'frame' },
      ...mirrorX({
        type: 'box',
        size: [0.86, 0.16, 0.62],
        position: [-0.47, 0.38, 0.06],
        material: 'cushion',
      }),
      { type: 'box', size: [1.9, 0.52, 0.2], position: [0, 0.5, -0.29], material: 'fabric' },
      ...mirrorX({
        type: 'box',
        size: [0.16, 0.3, 0.8],
        position: [-0.87, 0.44, 0.02],
        material: 'fabric',
      }),
    ],
  },
  {
    id: 'bed',
    name: 'Bed',
    facing: 'south',
    footprint: { width: 2, height: 1 },
    behaviour: behaviour.seating(),
    // One spot, not two. The old pair put two people head-to-toe along the
    // long axis of a single bed - invisible while the game ignored lay spots.
    // The lay pose puts the head at -X of its origin, which is why the hips
    // land just short of the headboard.
    interactions: [
      lay([{ tile: [0, 0], point: [0.02, 0.4, 0], facing: 'south' }]),
      sleep([{ tile: [0, 0], point: [0.02, 0.4, 0], facing: 'south' }]),
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
    behaviour: behaviour.surface(),
    // Spots on the free tiles around the table, not on its own: those are the
    // ones it blocks.
    interactions: [standBeside(2, 2)],
    materials: {
      top: { colour: WOOD_WARM },
      leg: { colour: WOOD_DARK },
    },
    parts: [
      { type: 'box', size: [1.82, 0.13, 1.82], position: [0, 0.62, 0], material: 'top' },
      ...legs({ thickness: 0.13, height: 0.56, dx: 0.74, dz: 0.74, material: 'leg' }),
    ],
  },
  {
    id: 'side_table',
    name: 'Side Table',
    facing: 'south',
    footprint: { width: 1, height: 1 },
    behaviour: behaviour.surface({ shape: 'circle' }),
    materials: {
      top: { colour: WOOD_WARM },
      stem: { colour: WOOD_DARK },
    },
    parts: [
      { type: 'cylinder', radius: 0.22, height: 0.05, position: [0, 0.03, 0], material: 'stem' },
      { type: 'cylinder', radius: 0.06, height: 0.5, position: [0, 0.29, 0], material: 'stem' },
      { type: 'cylinder', radius: 0.34, height: 0.08, position: [0, 0.57, 0], material: 'top' },
    ],
  },
  {
    id: 'desk',
    name: 'Desk',
    facing: 'east',
    footprint: { width: 2, height: 1 },
    behaviour: behaviour.surface(),
    interactions: [standBeside(2, 1)],
    materials: {
      top: { colour: WOOD_WARM },
      carcass: { colour: WOOD_DARK },
      drawer: { colour: WOOD },
      handle: { colour: METAL },
    },
    parts: [
      { type: 'box', size: [1.88, 0.09, 0.84], position: [0, 0.68, 0], material: 'top' },
      // Drawers at one end, legs at the other: a desk that is symmetrical reads
      // as a table.
      { type: 'box', size: [0.62, 0.6, 0.76], position: [0.6, 0.33, 0], material: 'carcass' },
      ...repeatY(
        { type: 'box', size: [0.56, 0.15, 0.03], position: [0.6, 0, 0.39], material: 'drawer' },
        3,
        0.14,
        0.52
      ),
      ...repeatY(
        { type: 'box', size: [0.2, 0.03, 0.03], position: [0.6, 0, 0.41], material: 'handle' },
        3,
        0.14,
        0.52
      ),
      ...mirrorZ({
        type: 'box',
        size: [0.09, 0.63, 0.09],
        position: [-0.85, 0.32, 0.35],
        material: 'carcass',
      }),
    ],
  },
  {
    id: 'dresser',
    name: 'Dresser',
    facing: 'east',
    footprint: { width: 2, height: 1 },
    // Waist high, so unlike a bookshelf it does not hide what is behind it.
    behaviour: behaviour.storage({ height: 1, blocksVision: false }),
    interactions: [standBeside(2, 1, 3000)],
    materials: {
      carcass: { colour: WOOD_DARK },
      top: { colour: WOOD_WARM },
      drawer: { colour: WOOD },
      handle: { colour: METAL },
    },
    parts: [
      { type: 'box', size: [1.84, 0.84, 0.62], position: [0, 0.42, 0], material: 'carcass' },
      { type: 'box', size: [1.94, 0.08, 0.7], position: [0, 0.88, 0], material: 'top' },
      ...repeatY(
        { type: 'box', size: [1.7, 0.22, 0.03], position: [0, 0, 0.32], material: 'drawer' },
        3,
        0.16,
        0.7
      ),
      ...repeatY(
        { type: 'box', size: [0.4, 0.03, 0.04], position: [0, 0, 0.34], material: 'handle' },
        3,
        0.16,
        0.7
      ),
    ],
  },
  {
    id: 'crate',
    name: 'Crate',
    facing: 'south',
    footprint: { width: 1, height: 1 },
    behaviour: behaviour.surface(),
    materials: {
      panel: { colour: WOOD },
      post: { colour: WOOD_DARK },
    },
    parts: [
      { type: 'box', size: [0.68, 0.68, 0.68], position: [0, 0.34, 0], material: 'panel' },
      ...legs({ thickness: 0.09, height: 0.7, dx: 0.31, dz: 0.31, material: 'post' }),
      { type: 'box', size: [0.72, 0.07, 0.72], position: [0, 0.66, 0], material: 'post' },
      { type: 'box', size: [0.72, 0.07, 0.72], position: [0, 0.04, 0], material: 'post' },
    ],
  },
  {
    id: 'rug',
    name: 'Rug',
    facing: 'south',
    footprint: { width: 3, height: 2 },
    // A rug is a floor decal: an outline would fight the tile grid it sits on.
    outline: { enabled: false },
    behaviour: behaviour.decal(),
    interactions: [
      dance([
        { tile: [1, 0], point: [0, 0.045, -0.5], facing: 'south' },
        { tile: [1, 1], point: [0, 0.045, 0.5], facing: 'north' },
      ]),
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
    id: 'round_rug',
    name: 'Round Rug',
    facing: 'south',
    footprint: { width: 2, height: 2 },
    outline: { enabled: false },
    behaviour: behaviour.decal({ shape: 'circle' }),
    interactions: [
      dance([
        { tile: [0, 0], point: [-0.5, 0.05, -0.5], facing: 'south' },
        { tile: [1, 0], point: [0.5, 0.05, -0.5], facing: 'south' },
        { tile: [0, 1], point: [-0.5, 0.05, 0.5], facing: 'north' },
        { tile: [1, 1], point: [0.5, 0.05, 0.5], facing: 'north' },
      ]),
    ],
    materials: {
      border: { colour: '#4a7a72' },
      field: { colour: '#6fa79c' },
      centre: { colour: FABRIC_CREAM },
    },
    parts: [
      // Plenty of segments: at 128px across, a 16-sided circle reads as a
      // polygon even after the palette snap.
      { type: 'cylinder', radius: 0.96, height: 0.03, segments: 40, position: [0, 0.015, 0], material: 'border' },
      { type: 'cylinder', radius: 0.76, height: 0.03, segments: 40, position: [0, 0.03, 0], material: 'field' },
      { type: 'cylinder', radius: 0.34, height: 0.03, segments: 32, position: [0, 0.045, 0], material: 'centre' },
    ],
  },
  {
    id: 'plant',
    name: 'Plant',
    facing: 'south',
    footprint: { width: 1, height: 1 },
    behaviour: behaviour.decor({ height: 2, shape: 'circle' }),
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
    id: 'potted_tree',
    name: 'Potted Tree',
    facing: 'south',
    footprint: { width: 1, height: 1 },
    behaviour: behaviour.decor({ height: 2, shape: 'circle' }),
    notes: 'Tops out under WALL_HEIGHT, so it never pokes through the ceiling line.',
    materials: {
      pot: { colour: '#9c9187' },
      soil: { colour: SOIL },
      bark: { colour: BARK },
      leaf: { colour: LEAF },
      leafDeep: { colour: LEAF_DEEP },
    },
    parts: [
      { type: 'cylinder', radius: 0.2, radiusTop: 0.28, height: 0.4, position: [0, 0.2, 0], material: 'pot' },
      { type: 'cylinder', radius: 0.3, height: 0.07, position: [0, 0.39, 0], material: 'pot' },
      { type: 'cylinder', radius: 0.26, height: 0.03, position: [0, 0.43, 0], material: 'soil' },
      { type: 'cylinder', radius: 0.05, height: 0.76, position: [0, 0.83, 0], material: 'bark' },
      { type: 'sphere', radius: 0.34, scale: [1, 0.86, 1], position: [0, 1.4, 0], material: 'leafDeep' },
      { type: 'sphere', radius: 0.24, scale: [1, 0.8, 1], position: [0.21, 1.22, 0.12], material: 'leaf' },
      { type: 'sphere', radius: 0.21, scale: [1, 0.8, 1], position: [-0.18, 1.28, -0.15], material: 'leaf' },
    ],
  },
  {
    id: 'vase',
    name: 'Vase',
    facing: 'south',
    footprint: { width: 1, height: 1 },
    behaviour: behaviour.decor({ shape: 'circle' }),
    notes: 'The smallest thing in the catalogue: about 22px tall. A useful test of what survives the downsample.',
    materials: {
      glaze: { colour: '#7fa8c4' },
      stem: { colour: LEAF_DEEP },
      bloomPink: { colour: '#d98aa8' },
      bloomCream: { colour: FABRIC_CREAM },
    },
    parts: [
      { type: 'sphere', radius: 0.15, scale: [1, 1.05, 1], position: [0, 0.16, 0], material: 'glaze' },
      { type: 'cylinder', radius: 0.06, radiusTop: 0.09, height: 0.14, position: [0, 0.33, 0], material: 'glaze' },
      { type: 'cylinder', radius: 0.02, height: 0.22, position: [0, 0.46, 0], material: 'stem' },
      { type: 'cylinder', radius: 0.018, height: 0.18, rotation: [0, 0, 16], position: [-0.05, 0.44, 0.03], material: 'stem' },
      { type: 'sphere', radius: 0.07, position: [0, 0.58, 0], material: 'bloomPink' },
      { type: 'sphere', radius: 0.055, position: [-0.08, 0.53, 0.04], material: 'bloomCream' },
    ],
  },
  {
    id: 'lamp',
    name: 'Lamp',
    facing: 'south',
    footprint: { width: 1, height: 1 },
    behaviour: behaviour.device({ height: 2, shape: 'circle' }),
    interactions: [standBeside(1, 1, 2000)],
    materials: {
      base: { colour: METAL },
      pole: { colour: METAL_DARK },
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
    // Stands on the floor against a wall; it is not a *wall item*. It used to be
    // categorised 'wall', which put it in the picker's wall filter next to
    // things that actually hang.
    behaviour: behaviour.storage(),
    interactions: [standBeside(1, 1, 3000)],
    materials: {
      case: { colour: WOOD_DARK },
      interior: { colour: '#6b432a' },
      shelf: { colour: WOOD },
      ...BOOKS,
    },
    parts: [
      { type: 'box', size: [0.34, 1.5, 0.88], position: [0, 0.75, 0], material: 'case' },
      { type: 'box', size: [0.3, 1.36, 0.78], position: [0.04, 0.78, 0], material: 'interior' },
      ...repeatY(
        { type: 'box', size: [0.3, 0.05, 0.78], position: [0.04, 0, 0], material: 'shelf' },
        3,
        0.44,
        1.2
      ),
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
    behaviour: behaviour.mounted(),
    interactions: [usedInPlace(2000)],
    materials: {
      bracket: { colour: METAL_DARK },
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
    id: 'wall_art',
    name: 'Framed Print',
    facing: 'south',
    placement: 'wall',
    footprint: { width: 1, height: 1 },
    behaviour: behaviour.mounted(),
    materials: {
      frame: { colour: WOOD_DARK },
      mount: { colour: LINEN },
      // Unlit, so the picture inside the frame reads as an image rather than as
      // a differently-shaded piece of the wall.
      sky: { colour: '#8fb9d6', unlit: true },
      hill: { colour: '#4f8f5c', unlit: true },
      sun: { colour: LAMP_GLOW, unlit: true },
    },
    parts: [
      { type: 'box', size: [0.05, 0.66, 0.54], position: [-0.47, WALL_HEIGHT * 0.62, 0], material: 'frame' },
      { type: 'box', size: [0.03, 0.58, 0.46], position: [-0.44, WALL_HEIGHT * 0.62, 0], material: 'mount' },
      { type: 'box', size: [0.02, 0.46, 0.36], position: [-0.425, WALL_HEIGHT * 0.62, 0], material: 'sky' },
      { type: 'box', size: [0.015, 0.16, 0.36], position: [-0.42, WALL_HEIGHT * 0.62 - 0.15, 0], material: 'hill' },
      { type: 'cylinder', radius: 0.06, height: 0.015, rotation: [0, 0, 90], position: [-0.42, WALL_HEIGHT * 0.62 + 0.12, 0.1], material: 'sun' },
    ],
  },
  {
    id: 'wall_shelf',
    name: 'Wall Shelf',
    facing: 'south',
    placement: 'wall',
    footprint: { width: 1, height: 1 },
    behaviour: behaviour.mounted(),
    interactions: [usedInPlace()],
    materials: {
      shelf: { colour: WOOD },
      bracket: { colour: METAL_DARK },
      pot: { colour: TERRACOTTA },
      leaf: { colour: LEAF },
      ...BOOKS,
    },
    parts: [
      { type: 'box', size: [0.26, 0.05, 0.74], position: [-0.37, WALL_HEIGHT * 0.55, 0], material: 'shelf' },
      ...mirrorZ({
        type: 'box',
        size: [0.2, 0.1, 0.04],
        position: [-0.4, WALL_HEIGHT * 0.55 - 0.07, 0.26],
        material: 'bracket',
      }),
      { type: 'box', size: [0.14, 0.17, 0.05], position: [-0.38, WALL_HEIGHT * 0.55 + 0.11, -0.24], material: 'bookRed' },
      { type: 'box', size: [0.14, 0.2, 0.04], position: [-0.38, WALL_HEIGHT * 0.55 + 0.13, -0.18], material: 'bookBlue' },
      { type: 'box', size: [0.14, 0.15, 0.05], position: [-0.38, WALL_HEIGHT * 0.55 + 0.1, -0.12], material: 'bookCream' },
      { type: 'cylinder', radius: 0.07, height: 0.11, position: [-0.37, WALL_HEIGHT * 0.55 + 0.08, 0.22], material: 'pot' },
      { type: 'sphere', radius: 0.1, scale: [1, 0.8, 1], position: [-0.37, WALL_HEIGHT * 0.55 + 0.18, 0.22], material: 'leaf' },
    ],
  },
  {
    id: 'wall_clock',
    name: 'Wall Clock',
    facing: 'south',
    placement: 'wall',
    footprint: { width: 1, height: 1 },
    behaviour: behaviour.mounted(),
    materials: {
      case: { colour: SLATE },
      face: { colour: LINEN, unlit: true },
      hand: { colour: SLATE },
    },
    parts: [
      // Rotated 90 degrees about Z so the cylinder's axis runs along X, which
      // points the round face out of the wall.
      { type: 'cylinder', radius: 0.19, height: 0.06, segments: 24, rotation: [0, 0, 90], position: [-0.45, WALL_HEIGHT * 0.72, 0], material: 'case' },
      { type: 'cylinder', radius: 0.155, height: 0.03, segments: 24, rotation: [0, 0, 90], position: [-0.415, WALL_HEIGHT * 0.72, 0], material: 'face' },
      { type: 'box', size: [0.02, 0.1, 0.02], position: [-0.4, WALL_HEIGHT * 0.72 + 0.04, 0], material: 'hand' },
      { type: 'box', size: [0.02, 0.02, 0.08], position: [-0.4, WALL_HEIGHT * 0.72, 0.035], material: 'hand' },
    ],
  },
  {
    id: 'ceiling_lamp',
    name: 'Ceiling Lamp',
    facing: 'south',
    placement: 'ceiling',
    footprint: { width: 1, height: 1 },
    notes: 'Hangs from WALL_HEIGHT. The anchor is still the floor tile, so the game places it like any other piece.',
    behaviour: behaviour.mounted({ category: 'decoration', shape: 'circle' }),
    materials: {
      cord: { colour: SLATE },
      shade: { colour: LAMP_GLOW, unlit: true },
      fitting: { colour: METAL_DARK },
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
