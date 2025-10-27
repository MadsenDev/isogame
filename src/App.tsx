import { useState } from 'react'
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
import FloatingWindow from './components/FloatingWindow'
import { GameProvider, useGame } from './context/GameContext'

function App() {
  return (
    <GameProvider>
      <AppShell />
    </GameProvider>
  )
}

type WindowKey = 'tools' | 'styling' | 'rooms' | 'catalog' | 'map' | 'guide'

type DockItem = {
  id: WindowKey | 'chat'
  label: string
  icon: string
  type: 'window' | 'chat'
}

const dockItems: DockItem[] = [
  { id: 'tools', label: 'Build tools', icon: '🛠️', type: 'window' },
  { id: 'catalog', label: 'Catalog', icon: '🪑', type: 'window' },
  { id: 'styling', label: 'Room styling', icon: '🎨', type: 'window' },
  { id: 'rooms', label: 'Rooms', icon: '🗂️', type: 'window' },
  { id: 'guide', label: 'Guide', icon: 'ℹ️', type: 'window' },
  { id: 'map', label: 'Map', icon: '🗺️', type: 'window' },
  { id: 'chat', label: 'Chat', icon: '💬', type: 'chat' }
]

function AppShell() {
  const { state, dispatch, roomManager } = useGame()
  const [openWindows, setOpenWindows] = useState<Record<WindowKey, boolean>>({
    tools: true,
    catalog: false,
    styling: false,
    rooms: false,
    guide: true,
    map: true
  })

  const toggleWindow = (key: WindowKey) => {
    setOpenWindows(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleDockClick = (item: DockItem) => {
    if (item.type === 'chat') {
      dispatch({ type: 'SET_SHOW_CHAT', payload: !state.showChat })
      return
    }

    toggleWindow(item.id as WindowKey)
  }

  return (
    <div className="neo-shell">
      <header className="neo-topbar">
        <div className="neo-topbar__branding">
          <span className="neo-topbar__mark">Iso</span>
          <span className="neo-topbar__name">Game Plaza</span>
        </div>
        <div className="neo-topbar__status">
          <span className="neo-status-dot" />
          <span>Now welcoming guests</span>
        </div>
      </header>

      <main className="neo-playfield">
        <div className="neo-stage">
          <GameCanvas />
          <ContextMenu />
        </div>
      </main>

      <div className="neo-window-layer" aria-live="polite">
        {openWindows.tools && (
          <FloatingWindow
            id="tools"
            title="Build tools"
            initialPosition={{ x: 64, y: 160 }}
            width={360}
            onClose={() => toggleWindow('tools')}
          >
            <Toolbar />
          </FloatingWindow>
        )}

        {openWindows.catalog && (
          <FloatingWindow
            id="catalog"
            title="Furniture catalog"
            initialPosition={{ x: 420, y: 180 }}
            width={420}
            onClose={() => toggleWindow('catalog')}
          >
            <FurnitureSelector />
          </FloatingWindow>
        )}

        {openWindows.styling && (
          <FloatingWindow
            id="styling"
            title="Room styling"
            initialPosition={{ x: 720, y: 120 }}
            width={360}
            onClose={() => toggleWindow('styling')}
          >
            <RoomCustomization />
          </FloatingWindow>
        )}

        {openWindows.rooms && state && roomManager && (
          <FloatingWindow
            id="rooms"
            title="Room navigator"
            initialPosition={{ x: 960, y: 320 }}
            width={380}
            onClose={() => toggleWindow('rooms')}
          >
            <RoomManager
              rooms={state.rooms}
              currentRoom={state.currentRoom}
              onRoomSelect={roomManager.selectRoom}
              onRoomCreate={roomManager.createRoom}
              onRoomDelete={roomManager.deleteRoom}
              onRoomRename={roomManager.renameRoom}
            />
          </FloatingWindow>
        )}

        {openWindows.guide && (
          <FloatingWindow
            id="guide"
            title="Resort guide"
            initialPosition={{ x: 64, y: 520 }}
            width={280}
            onClose={() => toggleWindow('guide')}
          >
            <div className="neo-guide">
              <PlayerInfo />
              <Controls />
            </div>
          </FloatingWindow>
        )}

        {openWindows.map && (
          <FloatingWindow
            id="map"
            title="Atrium map"
            initialPosition={{ x: 720, y: 520 }}
            width={260}
            onClose={() => toggleWindow('map')}
          >
            <Minimap />
          </FloatingWindow>
        )}

        {state.showChat && (
          <FloatingWindow
            id="chat"
            title="Lounge chat"
            initialPosition={{ x: 960, y: 520 }}
            width={340}
            onClose={() => dispatch({ type: 'SET_SHOW_CHAT', payload: false })}
          >
            <ChatSystem visible />
          </FloatingWindow>
        )}
      </div>

      <nav className="neo-dock" aria-label="Interface dock">
        {dockItems.map(item => {
          const isActive = item.type === 'chat'
            ? state.showChat
            : openWindows[item.id as WindowKey]

          return (
            <button
              key={item.id}
              onClick={() => handleDockClick(item)}
              className={`neo-dock__button ${isActive ? 'is-active' : ''}`}
              aria-pressed={isActive}
            >
              <span className="neo-dock__icon" aria-hidden="true">{item.icon}</span>
              <span className="neo-dock__label">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export default App
