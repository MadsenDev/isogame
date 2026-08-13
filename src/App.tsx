import { useState } from 'react'
import GameCanvas from './components/GameCanvas'
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
      <AppShell />
    </GameProvider>
  )
}

/**
 * Tools are modes, not windows.
 *
 * The old shell had a dock of seven launchers *and* seven draggable windows, so
 * every action cost two clicks and the panels opened on top of each other and
 * on top of the dock. Here the bar picks a mode and one contextual panel shows
 * whatever that mode needs.
 */
type ToolId = 'move' | 'build' | 'style' | 'rooms'

interface Tool {
  id: ToolId
  label: string
  icon: string
  /** What the engine should treat the pointer as doing. */
  engineTool: 'move' | 'furniture' | 'room'
  panelTitle?: string
  hint: string
}

const TOOLS: Tool[] = [
  {
    id: 'move',
    label: 'Walk',
    icon: '🚶',
    engineTool: 'move',
    hint: 'Click the floor to walk. Walk onto a chair to sit.'
  },
  {
    id: 'build',
    label: 'Build',
    icon: '🪑',
    engineTool: 'furniture',
    panelTitle: 'Furniture',
    hint: 'Pick a piece, then click a tile. R rotates it.'
  },
  {
    id: 'style',
    label: 'Style',
    icon: '🎨',
    engineTool: 'room',
    panelTitle: 'Room styling',
    hint: 'Paint floor tiles and adjust the room.'
  },
  {
    id: 'rooms',
    label: 'Rooms',
    icon: '🗂️',
    engineTool: 'move',
    panelTitle: 'Rooms',
    hint: 'Switch between rooms, or make a new one.'
  }
]

function AppShell() {
  const { state, dispatch, roomManager } = useGame()
  const [activeTool, setActiveTool] = useState<ToolId>('move')
  const [panelOpen, setPanelOpen] = useState(false)
  const [showMap, setShowMap] = useState(true)
  // Purely presentational, so it stays out of the game reducer.
  const [showGuide, setShowGuide] = useState(false)

  const tool = TOOLS.find(entry => entry.id === activeTool) ?? TOOLS[0]

  const selectTool = (next: Tool) => {
    setActiveTool(next.id)
    // Re-tapping the active tool closes its panel, so the room can be seen.
    setPanelOpen(next.id === activeTool ? !panelOpen : Boolean(next.panelTitle))
    dispatch({ type: 'SET_TOOL', payload: next.engineTool })

    if (next.engineTool !== 'furniture') {
      dispatch({ type: 'SET_PLACING', payload: false })
      dispatch({ type: 'SELECT_FURNITURE', payload: null })
    }
  }

  const currentPlayer = state.players[state.currentPlayerId]
  const showPanel = panelOpen && Boolean(tool.panelTitle)

  return (
    <div className="iso-shell">
      <div className="iso-stage">
        <GameCanvas />
        <ContextMenu />

        <div className="iso-brand">
          <span className="iso-brand__mark">Iso</span>
          <span>{state.currentRoom?.name ?? 'Game'}</span>
        </div>

        {showMap && (
          <div className="iso-overlay iso-overlay--map">
            <Minimap />
          </div>
        )}

        {showPanel && (
          <aside className="iso-panel">
            <header className="iso-panel__header">
              <span>{tool.panelTitle}</span>
              <button
                className="iso-panel__close"
                onClick={() => setPanelOpen(false)}
                aria-label="Close panel"
              >
                ×
              </button>
            </header>
            <div className="iso-panel__body">
              {activeTool === 'build' && <FurnitureSelector />}
              {activeTool === 'style' && <RoomCustomization />}
              {activeTool === 'rooms' && roomManager && (
                <RoomManager
                  rooms={state.rooms}
                  currentRoom={state.currentRoom}
                  onRoomSelect={roomManager.selectRoom}
                  onRoomCreate={roomManager.createRoom}
                  onRoomDelete={roomManager.deleteRoom}
                  onRoomRename={roomManager.renameRoom}
                />
              )}
            </div>
          </aside>
        )}

        {state.showChat && (
          <div className="iso-overlay iso-overlay--chat">
            <ChatSystem visible />
          </div>
        )}

        {showGuide && (
          <aside className="iso-panel">
            <header className="iso-panel__header">
              <span>Guide</span>
              <button
                className="iso-panel__close"
                onClick={() => setShowGuide(false)}
                aria-label="Close guide"
              >
                ×
              </button>
            </header>
            <div className="iso-panel__body">
              <PlayerInfo />
              <Controls />
            </div>
          </aside>
        )}

        <p className="iso-hint">{tool.hint}</p>
      </div>

      <nav className="iso-bar" aria-label="Tools">
        <div className="iso-bar__group">
          {TOOLS.map(entry => (
            <button
              key={entry.id}
              className={`iso-tool ${entry.id === activeTool ? 'is-active' : ''}`}
              onClick={() => selectTool(entry)}
              aria-pressed={entry.id === activeTool}
            >
              <span className="iso-tool__icon" aria-hidden="true">{entry.icon}</span>
              <span>{entry.label}</span>
            </button>
          ))}
        </div>

        <div className="iso-bar__spacer" />

        {currentPlayer && (
          <span className="iso-guest">
            <span className="iso-guest__swatch" style={{ background: currentPlayer.color }} />
            {currentPlayer.name}
          </span>
        )}

        <div className="iso-bar__group">
          <button
            className={`iso-tool iso-tool--icon ${showMap ? 'is-active' : ''}`}
            onClick={() => setShowMap(value => !value)}
            aria-pressed={showMap}
            title="Minimap"
          >
            <span className="iso-tool__icon" aria-hidden="true">🗺️</span>
          </button>
          <button
            className={`iso-tool iso-tool--icon ${state.showChat ? 'is-active' : ''}`}
            onClick={() => dispatch({ type: 'SET_SHOW_CHAT', payload: !state.showChat })}
            aria-pressed={state.showChat}
            title="Chat"
          >
            <span className="iso-tool__icon" aria-hidden="true">💬</span>
          </button>
          <button
            className={`iso-tool iso-tool--icon ${showGuide ? 'is-active' : ''}`}
            onClick={() => setShowGuide(value => !value)}
            aria-pressed={showGuide}
            title="Guide"
          >
            <span className="iso-tool__icon" aria-hidden="true">ℹ️</span>
          </button>
        </div>
      </nav>
    </div>
  )
}

export default App
