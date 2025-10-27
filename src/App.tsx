import GameCanvas from './components/GameCanvas'
import Toolbar from './components/Toolbar'
import Minimap from './components/Minimap'
import Controls from './components/Controls'
import ChatSystem from './components/ChatSystem'
import PlayerInfo from './components/PlayerInfo'
import ContextMenu from './components/ContextMenu'
import { RoomManager } from './components/RoomManager'
import { RoomCustomization } from './components/RoomCustomization'
import { FurnitureSelector } from './components/FurnitureSelector'
import { GameProvider, useGame } from './context/GameContext'

function App() {
  return (
    <GameProvider>
      <div className="habbo-shell">
        <header className="habbo-header">
          <div className="habbo-header__logo">
            Iso<span>Game</span> Plaza
          </div>
          <div className="habbo-header__status">
            <span className="habbo-status-dot" />
            <span className="habbo-header__status-text">Now welcoming guests</span>
          </div>
        </header>

        <div className="habbo-main">
          <aside className="habbo-side-panel">
            <Toolbar />
            <RoomCustomization />
          </aside>

          <div className="habbo-stage">
            <div className="habbo-stage-inner">
              <div className="habbo-room-frame">
                <GameCanvas />
              </div>
              <ContextMenu />
            </div>
            <div className="habbo-stage-overlay">
              <Minimap />
              <div className="habbo-stage-overlay__stack">
                <PlayerInfo />
                <Controls />
              </div>
            </div>
          </div>

          <aside className="habbo-side-panel habbo-side-panel--right">
            <RoomManagerWrapper />
            <FurnitureSelector />
          </aside>
        </div>

        <footer className="habbo-footer">
          <ChatSystem />
        </footer>
      </div>
    </GameProvider>
  )
}

// Wrapper component to use the room manager
function RoomManagerWrapper() {
  const { state, roomManager } = useGame()

  if (!state || !roomManager) return null

  return (
    <RoomManager
      rooms={state.rooms}
      currentRoom={state.currentRoom}
      onRoomSelect={roomManager.selectRoom}
      onRoomCreate={roomManager.createRoom}
      onRoomDelete={roomManager.deleteRoom}
      onRoomRename={roomManager.renameRoom}
    />
  )
}

export default App
