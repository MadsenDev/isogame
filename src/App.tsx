import GameCanvas from './components/GameCanvas'
import Toolbar from './components/Toolbar'
import Minimap from './components/Minimap'
import Controls from './components/Controls'
import ChatSystem from './components/ChatSystem'
import PlayerInfo from './components/PlayerInfo'
import ContextMenu from './components/ContextMenu'
import { RoomManager } from './components/RoomManager'
import { RoomCustomization } from './components/RoomCustomization'
import { GameProvider, useGame } from './context/GameContext'

function App() {
  return (
    <GameProvider>
      <div className="game-container">
        <GameCanvas />
        <Toolbar />
        <Minimap />
        <Controls />
        <ChatSystem />
        <PlayerInfo />
        <ContextMenu />
        <RoomManagerWrapper />
        <RoomCustomization />
      </div>
    </GameProvider>
  )
}

// Wrapper component to use the room manager
function RoomManagerWrapper() {
  const { state, roomManager } = useGame()
  
  if (!state || !roomManager) return null
  
  return (
    <div className="absolute top-4 right-4 z-50">
      <RoomManager
        rooms={state.rooms}
        currentRoom={state.currentRoom}
        onRoomSelect={roomManager.selectRoom}
        onRoomCreate={roomManager.createRoom}
        onRoomDelete={roomManager.deleteRoom}
        onRoomRename={roomManager.renameRoom}
      />
    </div>
  )
}

export default App
