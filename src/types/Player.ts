// Extended player state for online multiplayer
export interface PlayerState {
  // Basic player info
  id: number
  name: string
  color: string
  
  // Position and movement
  x: number
  y: number
  targetX: number
  targetY: number
  isMoving: boolean
  moveSpeed: number
  moveTimer: number
  moveDelay: number
  path: Array<{ x: number; y: number }>
  pathIndex: number
  
  // Visual properties
  size: number
  
  // Actions and animations
  action: 'idle' | 'sitting' | 'dancing' | 'waving'
  actionTimer: number
  
  // Online multiplayer properties
  isOnline: boolean
  lastSeen: number
  connectionId?: string
  roomId: string
  
  // Player-specific data
  level: number
  experience: number
  avatar: string
  inventory: Array<{ id: string; type: string; quantity: number }>
  
  // Social features
  friends: number[]
  isTyping: boolean
  currentChatMessage?: string
  
  // Game-specific properties
  isModerator: boolean
  isMuted: boolean
  isBanned: boolean
  permissions: string[]
}

// Player action types for networking
export type PlayerAction = 
  | { type: 'MOVE'; payload: { x: number; y: number; path: Array<{ x: number; y: number }> } }
  | { type: 'SET_ACTION'; payload: { action: string } }
  | { type: 'UPDATE_POSITION'; payload: { x: number; y: number } }
  | { type: 'SET_TYPING'; payload: { isTyping: boolean } }
  | { type: 'SEND_MESSAGE'; payload: { message: string } }
  | { type: 'JOIN_ROOM'; payload: { roomId: string } }
  | { type: 'LEAVE_ROOM'; payload: { roomId: string } }

// Player event types
export interface PlayerEvent {
  playerId: number
  type: 'join' | 'leave' | 'move' | 'action' | 'message' | 'typing'
  data: any
  timestamp: number
}
