import { FurnitureDefinition } from '../context/GameContext'

export const FURNITURE_DEFINITIONS: Record<string, FurnitureDefinition> = {
  'club_sofa': {
    id: 'club_sofa',
    name: 'Club Sofa',
    sprite: '/src/assets/furniture/club_sofa.png',
    width: 2,
    height: 1,
    interactions: [
      {
        type: 'sit',
        positions: [
          { x: 0, y: 0, direction: 'south' },
          { x: 1, y: 0, direction: 'south' }
        ],
        animation: 'sit',
        duration: 0 // Permanent until player moves
      }
    ],
    collision: {
      blocksMovement: true,
      blocksVision: false,
      height: 1,
      shape: 'rectangle'
    },
    walkable: false,
    stackable: false,
    rotatable: true,
    category: 'seating'
  },

  'wooden_chair': {
    id: 'wooden_chair',
    name: 'Wooden Chair',
    sprite: '/src/assets/furniture/wooden_chair.png',
    width: 1,
    height: 1,
    interactions: [
      {
        type: 'sit',
        positions: [
          { x: 0, y: 0, direction: 'south' }
        ],
        animation: 'sit',
        duration: 0
      }
    ],
    collision: {
      blocksMovement: true,
      blocksVision: false,
      height: 1,
      shape: 'rectangle'
    },
    walkable: false,
    stackable: false,
    rotatable: true,
    category: 'seating'
  },

  'bed': {
    id: 'bed',
    name: 'Bed',
    sprite: '/src/assets/furniture/bed.png',
    width: 2,
    height: 1,
    interactions: [
      {
        type: 'lay',
        positions: [
          { x: 0, y: 0, direction: 'south' },
          { x: 1, y: 0, direction: 'south' }
        ],
        animation: 'lay',
        duration: 0
      },
      {
        type: 'sleep',
        positions: [
          { x: 0, y: 0, direction: 'south' },
          { x: 1, y: 0, direction: 'south' }
        ],
        animation: 'sleep',
        duration: 30000 // 30 seconds
      }
    ],
    collision: {
      blocksMovement: true,
      blocksVision: false,
      height: 1,
      shape: 'rectangle'
    },
    walkable: false,
    stackable: false,
    rotatable: true,
    category: 'seating'
  },

  'table': {
    id: 'table',
    name: 'Table',
    sprite: '/src/assets/furniture/table.png',
    width: 2,
    height: 2,
    interactions: [
      {
        type: 'use',
        positions: [
          { x: 0, y: 0, direction: 'south' },
          { x: 1, y: 0, direction: 'south' },
          { x: 0, y: 1, direction: 'north' },
          { x: 1, y: 1, direction: 'north' }
        ],
        animation: 'use',
        duration: 5000 // 5 seconds
      }
    ],
    collision: {
      blocksMovement: true,
      blocksVision: false,
      height: 1,
      shape: 'rectangle'
    },
    walkable: false,
    stackable: true,
    rotatable: true,
    category: 'functional'
  },

  'rug': {
    id: 'rug',
    name: 'Rug',
    sprite: '/src/assets/furniture/rug.png',
    width: 3,
    height: 2,
    interactions: [
      {
        type: 'dance',
        positions: [
          { x: 0, y: 0, direction: 'south' },
          { x: 1, y: 0, direction: 'south' },
          { x: 2, y: 0, direction: 'south' },
          { x: 0, y: 1, direction: 'north' },
          { x: 1, y: 1, direction: 'north' },
          { x: 2, y: 1, direction: 'north' }
        ],
        animation: 'dance',
        duration: 10000 // 10 seconds
      }
    ],
    collision: {
      blocksMovement: false,
      blocksVision: false,
      height: 0,
      shape: 'rectangle'
    },
    walkable: true,
    stackable: true,
    rotatable: true,
    category: 'flooring'
  },

  'plant': {
    id: 'plant',
    name: 'Plant',
    sprite: '/src/assets/furniture/plant.png',
    width: 1,
    height: 1,
    interactions: [],
    collision: {
      blocksMovement: true,
      blocksVision: false,
      height: 2,
      shape: 'circle'
    },
    walkable: false,
    stackable: false,
    rotatable: true,
    category: 'decoration'
  },

  'lamp': {
    id: 'lamp',
    name: 'Lamp',
    sprite: '/src/assets/furniture/lamp.png',
    width: 1,
    height: 1,
    interactions: [
      {
        type: 'use',
        positions: [
          { x: 0, y: 0, direction: 'south' }
        ],
        animation: 'use',
        duration: 2000 // 2 seconds
      }
    ],
    collision: {
      blocksMovement: true,
      blocksVision: false,
      height: 2,
      shape: 'circle'
    },
    walkable: false,
    stackable: false,
    rotatable: true,
    category: 'functional'
  },

  'bookshelf': {
    id: 'bookshelf',
    name: 'Bookshelf',
    sprite: '/src/assets/furniture/bookshelf.png',
    width: 1,
    height: 1,
    interactions: [
      {
        type: 'use',
        positions: [
          { x: 0, y: 0, direction: 'south' }
        ],
        animation: 'use',
        duration: 3000 // 3 seconds
      }
    ],
    collision: {
      blocksMovement: true,
      blocksVision: true,
      height: 2,
      shape: 'rectangle'
    },
    walkable: false,
    stackable: false,
    rotatable: true,
    category: 'wall'
  }
}

export const getFurnitureDefinition = (id: string): FurnitureDefinition | null => {
  return FURNITURE_DEFINITIONS[id] || null
}

export const getFurnitureByCategory = (category: FurnitureDefinition['category']): FurnitureDefinition[] => {
  return Object.values(FURNITURE_DEFINITIONS).filter(furniture => furniture.category === category)
}

export const getAllFurnitureDefinitions = (): FurnitureDefinition[] => {
  return Object.values(FURNITURE_DEFINITIONS)
}
