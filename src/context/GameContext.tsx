import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react'

// Types
export interface Player {
  id: number
  x: number
  y: number
  targetX: number
  targetY: number
  color: string
  name: string
  size: number
  isMoving: boolean
  moveSpeed: number
  moveTimer: number
  moveDelay: number
  path: Array<{ x: number; y: number }>
  pathIndex: number
  action: 'idle' | 'sitting' | 'dancing' | 'waving'
  actionTimer: number
  lastDirection: string
}

export interface Furniture {
  id: string
  x: number
  y: number
  type: string
}

export interface Room {
  id: string
  name: string
  width: number
  height: number
  floorTiles: Array<{ x: number; y: number }>
  furniture: Furniture[]
  walls: Array<{ x: number; y: number; type: 'north-east' | 'north-west' }>
  doorway?: { x: number; y: number; type: 'north-east' | 'north-west' }
  spawnPoint?: { x: number; y: number }
}

export type RoomLayoutUpdate = {
  width: number
  height: number
  doorway?: { x: number; y: number; type: 'north-east' | 'north-west' }
  spawnPoint?: { x: number; y: number }
}

export interface ChatMessage {
  text: string
  timestamp: number
}

export interface GameState {
  currentTool: 'move' | 'furniture' | 'room'
  selectedFurniture: string | null
  isPlacing: boolean
  rooms: Room[]
  currentRoom: Room | null
  players: Player[]
  currentPlayerId: number
  chatMessages: ChatMessage[]
  showChat: boolean
  contextMenuVisible: boolean
  contextMenuTarget: Player | null
  hoverGridPos: { x: number; y: number } | null
  previewFurniture: { x: number; y: number; type: string } | null
}

// Action types
export type GameAction =
  | { type: 'SET_TOOL'; payload: 'move' | 'furniture' | 'room' }
  | { type: 'SELECT_FURNITURE'; payload: string | null }
  | { type: 'SET_PLACING'; payload: boolean }
  | { type: 'ADD_ROOM'; payload: Room }
  | { type: 'SET_CURRENT_ROOM'; payload: Room }
  | { type: 'DELETE_ROOM'; payload: string }
  | { type: 'RENAME_ROOM'; payload: { roomId: string; newName: string } }
  | {
      type: 'UPDATE_ROOM_LAYOUT'
      payload: { roomId: string } & RoomLayoutUpdate
    }
  | { type: 'TOGGLE_FLOOR_TILE'; payload: { x: number; y: number } }
  | { type: 'FILL_ROOM_FLOOR' }
  | { type: 'CLEAR_ROOM_FLOOR' }
  | { type: 'ADD_FURNITURE'; payload: Furniture }
  | { type: 'ADD_PLAYER'; payload: Player }
  | { type: 'SET_CURRENT_PLAYER'; payload: number }
  | { type: 'MOVE_PLAYER'; payload: { playerId: number; x: number; y: number; path: Array<{ x: number; y: number }> } }
  | { type: 'SET_PLAYER_ACTION'; payload: { playerId: number; action: Player['action'] } }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_SHOW_CHAT'; payload: boolean }
  | { type: 'SHOW_CONTEXT_MENU'; payload: { x: number; y: number; player: Player } }
  | { type: 'HIDE_CONTEXT_MENU' }
  | { type: 'SET_HOVER_GRID'; payload: { x: number; y: number } | null }
  | { type: 'SET_PREVIEW_FURNITURE'; payload: { x: number; y: number; type: string } | null }

// Initial state
const initialState: GameState = {
  currentTool: 'move',
  selectedFurniture: null,
  isPlacing: false,
  rooms: [],
  currentRoom: null,
  players: [],
  currentPlayerId: 0,
  chatMessages: [],
  showChat: false,
  contextMenuVisible: false,
  contextMenuTarget: null,
  hoverGridPos: null,
  previewFurniture: null,
}

// Reducer
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_TOOL':
      return { ...state, currentTool: action.payload }
    
    case 'SELECT_FURNITURE':
      return { ...state, selectedFurniture: action.payload, isPlacing: !!action.payload }
    
    case 'SET_PLACING':
      return { ...state, isPlacing: action.payload }
    
    case 'ADD_ROOM':
      return { ...state, rooms: [...state.rooms, ensureRoomFloorTiles(action.payload)] }

    case 'SET_CURRENT_ROOM':
      return { ...state, currentRoom: ensureRoomFloorTiles(action.payload) }
    
    case 'DELETE_ROOM': {
      const remainingRooms = state.rooms.filter(room => room.id !== action.payload)
      const newCurrentRoom = state.currentRoom?.id === action.payload
        ? (remainingRooms[0] ? ensureRoomFloorTiles(remainingRooms[0]) : null)
        : (state.currentRoom ? ensureRoomFloorTiles(state.currentRoom) : null)
      return {
        ...state,
        rooms: remainingRooms,
        currentRoom: newCurrentRoom
      }
    }
    
    case 'RENAME_ROOM':
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === action.payload.roomId
            ? { ...room, name: action.payload.newName }
            : room
        ),
        currentRoom: state.currentRoom?.id === action.payload.roomId
          ? { ...state.currentRoom, name: action.payload.newName }
          : state.currentRoom
      }

    case 'UPDATE_ROOM_LAYOUT': {
      const { roomId, width, height } = action.payload
      const normalizedDoorway = normalizeDoorway(width, height, action.payload.doorway)

      const updateRoomLayout = (room: Room) => {
        if (room.id !== roomId) return room

        const filteredFurniture = room.furniture.filter(
          furniture =>
            furniture.x >= 0 &&
            furniture.y >= 0 &&
            furniture.x < width &&
            furniture.y < height
        )

        const existingFloorTiles = (room.floorTiles?.length ? room.floorTiles : createFullFloorTiles(room.width, room.height))
          .filter(tile => tile.x >= 0 && tile.x < width && tile.y >= 0 && tile.y < height)

        const tileSet = new Set(existingFloorTiles.map(tile => `${tile.x},${tile.y}`))

        if (width > room.width || height > room.height) {
          for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
              if ((x >= room.width || y >= room.height) && !tileSet.has(`${x},${y}`)) {
                existingFloorTiles.push({ x, y })
                tileSet.add(`${x},${y}`)
              }
            }
          }
        }

        const ensureFloorTile = (x: number, y: number) => {
          const key = `${x},${y}`
          if (!tileSet.has(key)) {
            existingFloorTiles.push({ x, y })
            tileSet.add(key)
          }
        }

        filteredFurniture.forEach(furniture => ensureFloorTile(furniture.x, furniture.y))

        const targetDoorway = normalizedDoorway ?? room.doorway
        const adjustedDoorway = adjustDoorwayForFloorTiles(targetDoorway, existingFloorTiles, width, height)

        const spawnPoint = normalizeSpawnPoint(
          width,
          height,
          action.payload.spawnPoint ?? defaultSpawnFromDoorway(width, height, adjustedDoorway)
        )

        if (spawnPoint) {
          ensureFloorTile(spawnPoint.x, spawnPoint.y)
        }

        return {
          ...room,
          width,
          height,
          floorTiles: existingFloorTiles,
          furniture: filteredFurniture,
          walls: buildRoomWalls(width, height, adjustedDoorway, existingFloorTiles),
          doorway: adjustedDoorway,
          spawnPoint
        }
      }

      const updatedRooms = state.rooms.map(updateRoomLayout)

      return {
        ...state,
        rooms: updatedRooms,
        currentRoom: state.currentRoom?.id === roomId
          ? updateRoomLayout(state.currentRoom)
          : state.currentRoom
      }
    }

    case 'TOGGLE_FLOOR_TILE': {
      if (!state.currentRoom) return state

      const { x, y } = action.payload
      if (x < 0 || x >= state.currentRoom.width || y < 0 || y >= state.currentRoom.height) {
        return state
      }

      const hasFurniture = state.currentRoom.furniture.some(f => f.x === x && f.y === y)
      const hasPlayer = state.players.some(player => Math.round(player.x) === x && Math.round(player.y) === y)
      const isSpawnTile = state.currentRoom.spawnPoint
        ? state.currentRoom.spawnPoint.x === x && state.currentRoom.spawnPoint.y === y
        : false

      if (hasFurniture || hasPlayer || isSpawnTile) {
        return state
      }

      const toggleFloor = (room: Room) => {
        if (room.id !== state.currentRoom!.id) return room

        const baseTiles = room.floorTiles && room.floorTiles.length > 0
          ? room.floorTiles
          : createFullFloorTiles(room.width, room.height)

        const hasTile = baseTiles.some(tile => tile.x === x && tile.y === y)
        const floorTiles = hasTile
          ? baseTiles.filter(tile => !(tile.x === x && tile.y === y))
          : [...baseTiles, { x, y }]

        const adjustedDoorway = adjustDoorwayForFloorTiles(room.doorway, floorTiles, room.width, room.height)

        return {
          ...room,
          floorTiles,
          doorway: adjustedDoorway,
          walls: buildRoomWalls(room.width, room.height, adjustedDoorway, floorTiles)
        }
      }

      const updatedRooms = state.rooms.map(toggleFloor)

      return {
        ...state,
        rooms: updatedRooms,
        currentRoom: toggleFloor(state.currentRoom)
      }
    }

    case 'FILL_ROOM_FLOOR': {
      if (!state.currentRoom) return state

      const fillRoom = (room: Room) => {
        if (room.id !== state.currentRoom!.id) return room

        const floorTiles = createFullFloorTiles(room.width, room.height)
        const adjustedDoorway = adjustDoorwayForFloorTiles(room.doorway, floorTiles, room.width, room.height)
        return {
          ...room,
          floorTiles,
          doorway: adjustedDoorway,
          walls: buildRoomWalls(room.width, room.height, adjustedDoorway, floorTiles)
        }
      }

      const updatedRooms = state.rooms.map(fillRoom)

      return {
        ...state,
        rooms: updatedRooms,
        currentRoom: fillRoom(state.currentRoom)
      }
    }

    case 'CLEAR_ROOM_FLOOR': {
      if (!state.currentRoom) return state

      const protectedTiles = new Set<string>()

      state.currentRoom.furniture.forEach(f => {
        protectedTiles.add(`${f.x},${f.y}`)
      })

      if (state.currentRoom.spawnPoint) {
        protectedTiles.add(`${state.currentRoom.spawnPoint.x},${state.currentRoom.spawnPoint.y}`)
      }

      state.players.forEach(player => {
        const px = Math.round(player.x)
        const py = Math.round(player.y)
        if (px >= 0 && px < state.currentRoom!.width && py >= 0 && py < state.currentRoom!.height) {
          protectedTiles.add(`${px},${py}`)
        }
      })

      const clearRoom = (room: Room) => {
        if (room.id !== state.currentRoom!.id) return room

        const baseTiles = room.floorTiles && room.floorTiles.length > 0
          ? room.floorTiles
          : createFullFloorTiles(room.width, room.height)

        const floorTiles = baseTiles.filter(tile => protectedTiles.has(`${tile.x},${tile.y}`))

        const adjustedDoorway = adjustDoorwayForFloorTiles(room.doorway, floorTiles, room.width, room.height)

        return {
          ...room,
          floorTiles,
          doorway: adjustedDoorway,
          walls: buildRoomWalls(room.width, room.height, adjustedDoorway, floorTiles)
        }
      }

      const updatedRooms = state.rooms.map(clearRoom)

      return {
        ...state,
        rooms: updatedRooms,
        currentRoom: clearRoom(state.currentRoom)
      }
    }

    case 'ADD_FURNITURE':
      if (!state.currentRoom) return state
      return {
        ...state,
        currentRoom: {
          ...state.currentRoom,
          furniture: [...state.currentRoom.furniture, action.payload]
        }
      }
    
    case 'ADD_PLAYER':
      return {
        ...state,
        players: [...state.players, action.payload]
      }
    
    case 'SET_CURRENT_PLAYER':
      return { ...state, currentPlayerId: action.payload }
    
    case 'MOVE_PLAYER':
      return {
        ...state,
        players: state.players.map(player =>
          player.id === action.payload.playerId
            ? { 
                ...player, 
                targetX: action.payload.x, 
                targetY: action.payload.y, 
                isMoving: true,
                path: action.payload.path || [],
                pathIndex: 0
              }
            : player
        )
      }
    
    case 'SET_PLAYER_ACTION':
      return {
        ...state,
        players: state.players.map(player =>
          player.id === action.payload.playerId
            ? { ...player, action: action.payload.action, actionTimer: 0 }
            : player
        )
      }
    
    case 'ADD_CHAT_MESSAGE':
      return {
        ...state,
        chatMessages: [...state.chatMessages.slice(-49), action.payload]
      }
    
    case 'SET_SHOW_CHAT':
      return { ...state, showChat: action.payload }
    
    case 'SHOW_CONTEXT_MENU':
      return {
        ...state,
        contextMenuVisible: true,
        contextMenuTarget: action.payload.player,
        currentPlayerId: action.payload.player.id
      }
    
    case 'HIDE_CONTEXT_MENU':
      return {
        ...state,
        contextMenuVisible: false,
        contextMenuTarget: null
      }
    
    case 'SET_HOVER_GRID':
      return { ...state, hoverGridPos: action.payload }
    
    case 'SET_PREVIEW_FURNITURE':
      return { ...state, previewFurniture: action.payload }
    
    default:
      return state
  }
}

// Context
const GameContext = createContext<{
  state: GameState
  dispatch: React.Dispatch<GameAction>
  roomManager: {
    createRoom: (name: string, width: number, height: number) => Room
    selectRoom: (room: Room) => void
    deleteRoom: (roomId: string) => void
    renameRoom: (roomId: string, newName: string) => void
    updateLayout: (roomId: string, layout: RoomLayoutUpdate) => void
  }
} | null>(null)

// Helper function to generate unique IDs
const generateId = (prefix: string = '') => `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const createFullFloorTiles = (width: number, height: number) => {
  const tiles: Array<{ x: number; y: number }> = []

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      tiles.push({ x, y })
    }
  }

  return tiles
}

const adjustDoorwayForFloorTiles = (
  doorway: { x: number; y: number; type: 'north-east' | 'north-west' } | undefined,
  floorTiles: Array<{ x: number; y: number }> | undefined,
  width: number,
  height: number
) => {
  if (!doorway) return undefined

  const effectiveFloorTiles = floorTiles && floorTiles.length > 0
    ? floorTiles
    : createFullFloorTiles(width, height)

  if (doorway.type === 'north-east') {
    const columnTiles = effectiveFloorTiles.filter(tile => tile.x === doorway.x)
    if (columnTiles.length === 0) return undefined
    const minY = Math.min(...columnTiles.map(tile => tile.y))
    return { x: doorway.x, y: minY - 1, type: 'north-east' as const }
  }

  const rowTiles = effectiveFloorTiles.filter(tile => tile.y === doorway.y)
  if (rowTiles.length === 0) return undefined
  const minX = Math.min(...rowTiles.map(tile => tile.x))
  return { x: minX - 1, y: doorway.y, type: 'north-west' as const }
}

const ensureRoomFloorTiles = (room: Room): Room => {
  const floorTiles = room.floorTiles && room.floorTiles.length > 0
    ? room.floorTiles
    : createFullFloorTiles(room.width, room.height)

  const doorway = adjustDoorwayForFloorTiles(room.doorway, floorTiles, room.width, room.height)

  return {
    ...room,
    floorTiles,
    doorway,
    walls: buildRoomWalls(room.width, room.height, doorway, floorTiles)
  }
}

const normalizeDoorway = (
  width: number,
  height: number,
  doorway?: { x: number; y: number; type: 'north-east' | 'north-west' }
) => {
  if (!doorway) return undefined

  if (doorway.type === 'north-east') {
    const x = clamp(Math.round(doorway.x), 0, Math.max(width - 1, 0))
    return { x, y: -1, type: 'north-east' as const }
  }

  const y = clamp(Math.round(doorway.y), 0, Math.max(height - 1, 0))
  return { x: -1, y, type: 'north-west' as const }
}

const normalizeSpawnPoint = (width: number, height: number, spawnPoint?: { x: number; y: number }) => {
  if (!spawnPoint) return undefined

  const x = clamp(Math.round(spawnPoint.x), 0, Math.max(width - 1, 0))
  const y = clamp(Math.round(spawnPoint.y), 0, Math.max(height - 1, 0))

  return { x, y }
}

function buildRoomWalls(
  width: number,
  height: number,
  doorway?: { x: number; y: number; type: 'north-east' | 'north-west' },
  floorTiles?: Array<{ x: number; y: number }>
) {
  const effectiveFloorTiles = floorTiles && floorTiles.length > 0
    ? floorTiles
    : createFullFloorTiles(width, height)

  const tileSet = new Set(effectiveFloorTiles.map(tile => `${tile.x},${tile.y}`))
  const walls: Array<{ x: number; y: number; type: 'north-east' | 'north-west' }> = []

  effectiveFloorTiles.forEach(tile => {
    const northKey = `${tile.x},${tile.y - 1}`
    if (!tileSet.has(northKey)) {
      if (!(doorway?.type === 'north-east' && doorway.x === tile.x && doorway.y === tile.y - 1)) {
        walls.push({ x: tile.x, y: tile.y - 1, type: 'north-east' })
      }
    }

    const westKey = `${tile.x - 1},${tile.y}`
    if (!tileSet.has(westKey)) {
      if (!(doorway?.type === 'north-west' && doorway.x === tile.x - 1 && doorway.y === tile.y)) {
        walls.push({ x: tile.x - 1, y: tile.y, type: 'north-west' })
      }
    }
  })

  return walls
}

const defaultSpawnFromDoorway = (
  width: number,
  height: number,
  doorway?: { x: number; y: number; type: 'north-east' | 'north-west' }
) => {
  if (!doorway) {
    return { x: Math.floor(width / 2), y: Math.floor(height / 2) }
  }

  if (doorway.type === 'north-east') {
    return { x: clamp(doorway.x, 0, Math.max(width - 1, 0)), y: 0 }
  }

  return { x: 0, y: clamp(doorway.y, 0, Math.max(height - 1, 0)) }
}

// Helper function to create a new room
const createRoom = (name: string, width: number, height: number): Room => {
  const doorway = normalizeDoorway(width, height, {
    x: Math.floor(width / 2),
    y: -1,
    type: 'north-east'
  })

  const spawnPoint = normalizeSpawnPoint(width, height, {
    x: doorway?.x ?? Math.floor(width / 2),
    y: 0
  })

  const adjustedDoorway = adjustDoorwayForFloorTiles(doorway, undefined, width, height)

  return {
    id: generateId('room-'),
    name,
    width,
    height,
    floorTiles: createFullFloorTiles(width, height),
    furniture: [],
    walls: buildRoomWalls(width, height, adjustedDoorway),
    doorway: adjustedDoorway,
    spawnPoint
  }
}

// Provider
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  // Initialize game with default room and players
  useEffect(() => {
    // Create default room
    const defaultRoom = createRoom('Main Room', 20, 15)

    // Create players
    const players: Player[] = [
      {
        id: 0,
        x: defaultRoom.spawnPoint?.x || 5,
        y: defaultRoom.spawnPoint?.y || 5,
        targetX: defaultRoom.spawnPoint?.x || 5,
        targetY: defaultRoom.spawnPoint?.y || 5,
        color: '#FF6B6B',
        name: 'Player1',
        size: 0.8,
        isMoving: false,
        moveSpeed: 0.1,
        moveTimer: 0,
        moveDelay: 400,
        path: [],
        pathIndex: 0,
        action: 'idle',
        actionTimer: 0,
        lastDirection: 'south'
      },
      {
        id: 1,
        x: (defaultRoom.spawnPoint?.x || 5) + 1,
        y: (defaultRoom.spawnPoint?.y || 5) + 1,
        targetX: (defaultRoom.spawnPoint?.x || 5) + 1,
        targetY: (defaultRoom.spawnPoint?.y || 5) + 1,
        color: '#4ECDC4',
        name: 'Player2',
        size: 0.8,
        isMoving: false,
        moveSpeed: 0.1,
        moveTimer: 0,
        moveDelay: 400,
        path: [],
        pathIndex: 0,
        action: 'idle',
        actionTimer: 0,
        lastDirection: 'south'
      },
      {
        id: 2,
        x: (defaultRoom.spawnPoint?.x || 5) + 2,
        y: (defaultRoom.spawnPoint?.y || 5) + 2,
        targetX: (defaultRoom.spawnPoint?.x || 5) + 2,
        targetY: (defaultRoom.spawnPoint?.y || 5) + 2,
        color: '#45B7D1',
        name: 'Player3',
        size: 0.8,
        isMoving: false,
        moveSpeed: 0.1,
        moveTimer: 0,
        moveDelay: 400,
        path: [],
        pathIndex: 0,
        action: 'idle',
        actionTimer: 0,
        lastDirection: 'south'
      },
      {
        id: 3,
        x: (defaultRoom.spawnPoint?.x || 5) + 3,
        y: (defaultRoom.spawnPoint?.y || 5) + 3,
        targetX: (defaultRoom.spawnPoint?.x || 5) + 3,
        targetY: (defaultRoom.spawnPoint?.y || 5) + 3,
        color: '#96CEB4',
        name: 'Player4',
        size: 0.8,
        isMoving: false,
        moveSpeed: 0.1,
        moveTimer: 0,
        moveDelay: 400,
        path: [],
        pathIndex: 0,
        action: 'idle',
        actionTimer: 0,
        lastDirection: 'south'
      }
    ]

    // Initialize game state
    dispatch({ type: 'ADD_ROOM', payload: defaultRoom })
    dispatch({ type: 'SET_CURRENT_ROOM', payload: defaultRoom })
    
    // Add players to state (we'll need to add this action)
    players.forEach(player => {
      dispatch({ type: 'ADD_PLAYER', payload: player })
    })
  }, [])

  // Room management functions
  const roomManager = {
    createRoom: (name: string, width: number, height: number) => {
      const newRoom = createRoom(name, width, height)
      dispatch({ type: 'ADD_ROOM', payload: newRoom })
      return newRoom
    },
    selectRoom: (room: Room) => {
      dispatch({ type: 'SET_CURRENT_ROOM', payload: room })
    },
    deleteRoom: (roomId: string) => {
      dispatch({ type: 'DELETE_ROOM', payload: roomId })
    },
    renameRoom: (roomId: string, newName: string) => {
      dispatch({ type: 'RENAME_ROOM', payload: { roomId, newName } })
    },
    updateLayout: (roomId: string, layout: RoomLayoutUpdate) => {
      dispatch({ type: 'UPDATE_ROOM_LAYOUT', payload: { roomId, ...layout } })
    }
  }

  return (
    <GameContext.Provider value={{ state, dispatch, roomManager }}>
      {children}
    </GameContext.Provider>
  )
}

// Hook
// This hook intentionally lives alongside the provider for convenient imports.
// eslint-disable-next-line react-refresh/only-export-components
export function useGame() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}
