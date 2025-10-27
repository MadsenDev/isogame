import React, { useEffect, useMemo, useState } from 'react'
import { Room, RoomLayoutUpdate } from '../context/GameContext'

interface RoomEditorProps {
  room: Room | null
  onUpdateLayout: (roomId: string, layout: RoomLayoutUpdate) => void
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const RoomEditor: React.FC<RoomEditorProps> = ({ room, onUpdateLayout }) => {
  const [width, setWidth] = useState(room?.width ?? 10)
  const [height, setHeight] = useState(room?.height ?? 10)
  const [doorwayEdge, setDoorwayEdge] = useState<'north-east' | 'north-west'>(room?.doorway?.type ?? 'north-east')
  const [doorwayIndex, setDoorwayIndex] = useState(0)
  const [spawnX, setSpawnX] = useState(0)
  const [spawnY, setSpawnY] = useState(0)

  useEffect(() => {
    if (!room) return

    setWidth(room.width)
    setHeight(room.height)
    setDoorwayEdge(room.doorway?.type ?? 'north-east')

    if (room.doorway?.type === 'north-east') {
      setDoorwayIndex(room.doorway.x)
    } else if (room.doorway?.type === 'north-west') {
      setDoorwayIndex(room.doorway.y)
    } else {
      setDoorwayIndex(Math.floor(room.width / 2))
    }

    setSpawnX(room.spawnPoint?.x ?? Math.floor(room.width / 2))
    setSpawnY(room.spawnPoint?.y ?? Math.floor(room.height / 2))
  }, [room])

  const doorwayMax = useMemo(() => (doorwayEdge === 'north-east' ? Math.max(width - 1, 0) : Math.max(height - 1, 0)), [doorwayEdge, width, height])

  const applyLayout = () => {
    if (!room) return

    const sanitizedWidth = clamp(Math.round(width), 5, 50)
    const sanitizedHeight = clamp(Math.round(height), 5, 50)

    const sanitizedDoorwayIndex = clamp(Math.round(doorwayIndex), 0, doorwayEdge === 'north-east' ? Math.max(sanitizedWidth - 1, 0) : Math.max(sanitizedHeight - 1, 0))

    const doorway =
      doorwayEdge === 'north-east'
        ? { x: sanitizedDoorwayIndex, y: -1, type: 'north-east' as const }
        : { x: -1, y: sanitizedDoorwayIndex, type: 'north-west' as const }

    const sanitizedSpawnX = clamp(Math.round(spawnX), 0, Math.max(sanitizedWidth - 1, 0))
    const sanitizedSpawnY = clamp(Math.round(spawnY), 0, Math.max(sanitizedHeight - 1, 0))

    onUpdateLayout(room.id, {
      width: sanitizedWidth,
      height: sanitizedHeight,
      doorway,
      spawnPoint: { x: sanitizedSpawnX, y: sanitizedSpawnY }
    })

    setWidth(sanitizedWidth)
    setHeight(sanitizedHeight)
    setDoorwayIndex(sanitizedDoorwayIndex)
    setSpawnX(sanitizedSpawnX)
    setSpawnY(sanitizedSpawnY)
  }

  const resetLayout = () => {
    if (!room) return

    setWidth(room.width)
    setHeight(room.height)
    setDoorwayEdge(room.doorway?.type ?? 'north-east')

    if (room.doorway?.type === 'north-east') {
      setDoorwayIndex(room.doorway.x)
    } else if (room.doorway?.type === 'north-west') {
      setDoorwayIndex(room.doorway.y)
    } else {
      setDoorwayIndex(Math.floor(room.width / 2))
    }

    setSpawnX(room.spawnPoint?.x ?? Math.floor(room.width / 2))
    setSpawnY(room.spawnPoint?.y ?? Math.floor(room.height / 2))
  }

  if (!room) {
    return (
      <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg w-80">
        <h3 className="text-lg font-semibold mb-2">Room Editor</h3>
        <p className="text-sm text-gray-300">Select a room to edit its layout.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg w-80 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Room Editor</h3>
        <span className="text-xs text-gray-400 uppercase">Admin Tool</span>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-200 mb-2">Dimensions</h4>
        <div className="flex space-x-2">
          <label className="flex-1 text-xs uppercase text-gray-400">
            Width
            <input
              type="number"
              min={5}
              max={50}
              value={width}
              onChange={(event) => setWidth(Number(event.target.value))}
              className="mt-1 w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded"
            />
          </label>
          <label className="flex-1 text-xs uppercase text-gray-400">
            Height
            <input
              type="number"
              min={5}
              max={50}
              value={height}
              onChange={(event) => setHeight(Number(event.target.value))}
              className="mt-1 w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded"
            />
          </label>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-200 mb-2">Doorway</h4>
        <div className="space-y-2">
          <div className="flex space-x-2">
            <button
              onClick={() => setDoorwayEdge('north-east')}
              className={`flex-1 px-2 py-1 rounded text-xs uppercase transition-colors ${
                doorwayEdge === 'north-east' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              North-East Wall
            </button>
            <button
              onClick={() => setDoorwayEdge('north-west')}
              className={`flex-1 px-2 py-1 rounded text-xs uppercase transition-colors ${
                doorwayEdge === 'north-west' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              North-West Wall
            </button>
          </div>
          <label className="block text-xs uppercase text-gray-400">
            Position
            <input
              type="number"
              min={0}
              max={doorwayMax}
              value={doorwayIndex}
              onChange={(event) => setDoorwayIndex(Number(event.target.value))}
              className="mt-1 w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded"
            />
            <span className="text-[0.65rem] text-gray-500 mt-1 block">
              {doorwayEdge === 'north-east'
                ? '0 is the west corner, higher values move east'
                : '0 is the north corner, higher values move south'}
            </span>
          </label>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-200 mb-2">Spawn Point</h4>
        <div className="flex space-x-2">
          <label className="flex-1 text-xs uppercase text-gray-400">
            X
            <input
              type="number"
              min={0}
              max={Math.max(width - 1, 0)}
              value={spawnX}
              onChange={(event) => setSpawnX(Number(event.target.value))}
              className="mt-1 w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded"
            />
          </label>
          <label className="flex-1 text-xs uppercase text-gray-400">
            Y
            <input
              type="number"
              min={0}
              max={Math.max(height - 1, 0)}
              value={spawnY}
              onChange={(event) => setSpawnY(Number(event.target.value))}
              className="mt-1 w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded"
            />
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          Editing: <span className="text-gray-200 font-semibold">{room.name}</span>
        </span>
        <span>
          {room.width}×{room.height}
        </span>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={applyLayout}
          className="flex-1 bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-semibold"
        >
          Apply Changes
        </button>
        <button
          onClick={resetLayout}
          className="px-3 py-1 rounded text-sm bg-gray-700 hover:bg-gray-600"
        >
          Reset
        </button>
      </div>

      <p className="text-[0.65rem] text-gray-500 leading-relaxed">
        Changing dimensions will trim furniture that no longer fits the room. Doorway and spawn
        settings update instantly so you can test new layouts on the live canvas.
      </p>
    </div>
  )
}

export default RoomEditor
