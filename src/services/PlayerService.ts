import { PlayerState, PlayerAction, PlayerEvent } from '../types/Player'

export class PlayerService {
  private players: Map<number, PlayerState> = new Map()
  private eventListeners: Array<(event: PlayerEvent) => void> = []

  // Add event listener for player events
  addEventListener(listener: (event: PlayerEvent) => void) {
    this.eventListeners.push(listener)
  }

  // Remove event listener
  removeEventListener(listener: (event: PlayerEvent) => void) {
    const index = this.eventListeners.indexOf(listener)
    if (index > -1) {
      this.eventListeners.splice(index, 1)
    }
  }

  // Emit player event
  private emitEvent(event: PlayerEvent) {
    this.eventListeners.forEach(listener => listener(event))
  }

  // Add a new player
  addPlayer(player: PlayerState) {
    this.players.set(player.id, player)
    this.emitEvent({
      playerId: player.id,
      type: 'join',
      data: player,
      timestamp: Date.now()
    })
  }

  // Remove a player
  removePlayer(playerId: number) {
    const player = this.players.get(playerId)
    if (player) {
      this.players.delete(playerId)
      this.emitEvent({
        playerId,
        type: 'leave',
        data: player,
        timestamp: Date.now()
      })
    }
  }

  // Update player state
  updatePlayer(playerId: number, action: PlayerAction) {
    const player = this.players.get(playerId)
    if (!player) return

    switch (action.type) {
      case 'MOVE':
        player.x = action.payload.x
        player.y = action.payload.y
        player.targetX = action.payload.x
        player.targetY = action.payload.y
        player.path = action.payload.path
        player.pathIndex = 0
        player.isMoving = true
        player.lastSeen = Date.now()
        break

      case 'SET_ACTION':
        player.action = action.payload.action as any
        player.actionTimer = 0
        break

      case 'UPDATE_POSITION':
        player.x = action.payload.x
        player.y = action.payload.y
        player.lastSeen = Date.now()
        break

      case 'SET_TYPING':
        player.isTyping = action.payload.isTyping
        break

      case 'SEND_MESSAGE':
        player.currentChatMessage = action.payload.message
        break

      case 'JOIN_ROOM':
        player.roomId = action.payload.roomId
        break

      case 'LEAVE_ROOM':
        player.roomId = ''
        break
    }

    this.emitEvent({
      playerId,
      type: action.type.toLowerCase() as any,
      data: action.payload,
      timestamp: Date.now()
    })
  }

  // Get player by ID
  getPlayer(playerId: number): PlayerState | undefined {
    return this.players.get(playerId)
  }

  // Get all players
  getAllPlayers(): PlayerState[] {
    return Array.from(this.players.values())
  }

  // Get players in a specific room
  getPlayersInRoom(roomId: string): PlayerState[] {
    return Array.from(this.players.values()).filter(player => player.roomId === roomId)
  }

  // Check if player is online
  isPlayerOnline(playerId: number): boolean {
    const player = this.players.get(playerId)
    return player ? player.isOnline : false
  }

  // Update player's last seen timestamp
  updateLastSeen(playerId: number) {
    const player = this.players.get(playerId)
    if (player) {
      player.lastSeen = Date.now()
    }
  }

  // Get offline players (for cleanup)
  getOfflinePlayers(): PlayerState[] {
    const now = Date.now()
    const offlineThreshold = 5 * 60 * 1000 // 5 minutes
    
    return Array.from(this.players.values()).filter(player => 
      !player.isOnline || (now - player.lastSeen) > offlineThreshold
    )
  }

  // Clean up offline players
  cleanupOfflinePlayers() {
    const offlinePlayers = this.getOfflinePlayers()
    offlinePlayers.forEach(player => {
      this.removePlayer(player.id)
    })
  }
}

// Singleton instance
export const playerService = new PlayerService()
