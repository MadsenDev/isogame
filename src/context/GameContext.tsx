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
  furniture: Furniture[]
  walls: Array<{ x: number; y: number; type: string }>
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
type GameAction =
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
  | { type: 'ADD_FURNITURE'; payload: Furniture }
  | { type: 'ADD_PLAYER'; payload: Player }
  | { type: 'SET_CURRENT_PLAYER'; payload: number }
  | { type: 'MOVE_PLAYER'; payload: { playerId: number; x: number; y: number; path: Array<{ x: number; y: number }> } }
  | { type: 'SET_PLAYER_ACTION'; payload: { playerId: number; action: string } }
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
      return { ...state, rooms: [...state.rooms, action.payload] }
    
    case 'SET_CURRENT_ROOM':
      return { ...state, currentRoom: action.payload }
    
    case 'DELETE_ROOM':
      const remainingRooms = state.rooms.filter(room => room.id !== action.payload)
      const newCurrentRoom = state.currentRoom?.id === action.payload 
        ? remainingRooms[0] || null 
        : state.currentRoom
      return { 
        ...state, 
        rooms: remainingRooms,
        currentRoom: newCurrentRoom
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
      const doorway = normalizeDoorway(width, height, action.payload.doorway)

      const spawnPoint = normalizeSpawnPoint(
        width,
        height,
        action.payload.spawnPoint ?? defaultSpawnFromDoorway(width, height, doorway)
      )

      const updateRoomLayout = (room: Room) => {
        if (room.id !== roomId) return room

        const filteredFurniture = room.furniture.filter(
          furniture =>
            furniture.x >= 0 &&
            furniture.y >= 0 &&
            furniture.x < width &&
            furniture.y < height
        )

        return {
          ...room,
          width,
          height,
          furniture: filteredFurniture,
          walls: buildRoomWalls(width, height, doorway),
          doorway,
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
            ? { ...player, action: action.payload.action as any, actionTimer: 0 }
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

const buildRoomWalls = (
  width: number,
  height: number,
  doorway?: { x: number; y: number; type: 'north-east' | 'north-west' }
) => {
  const walls: Array<{ x: number; y: number; type: string }> = []

  for (let x = 0; x < width; x++) {
    if (!(doorway?.type === 'north-east' && doorway.x === x)) {
      walls.push({ x, y: -1, type: 'north-east' })
    }
  }

  for (let y = 0; y < height; y++) {
    if (!(doorway?.type === 'north-west' && doorway.y === y)) {
      walls.push({ x: -1, y, type: 'north-west' })
    }
  }

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

  return {
    id: generateId('room-'),
    name,
    width,
    height,
    furniture: [],
    walls: buildRoomWalls(width, height, doorway),
    doorway,
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
        actionTimer: 0
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
        actionTimer: 0
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
        actionTimer: 0
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
        actionTimer: 0
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
export function useGame() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}
