/**
 * Converting between the runtime room and the persisted document.
 *
 * The asymmetry is the interesting part. Saving throws away everything derived
 * or generated; loading rebuilds it. That is what stops a saved room from
 * drifting away from the code that renders it.
 */

import { Furniture, Room, buildRoomWalls } from '../context/GameContext'
import { getFurnitureDefinition } from '../data/furnitureDefinitions'
import { PersistedRoom, SCHEMA_VERSION, WorldDocument } from './types'

/**
 * A unique id that does not depend on the clock.
 *
 * Furniture ids used to be `furniture-${Date.now()}`, which collides whenever
 * two pieces are placed inside the same millisecond and is not something a
 * server could trust as a primary key.
 */
export function createId(prefix: string): string {
  const unique =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${unique}`
}

export function toPersistedRoom(room: Room, previous?: PersistedRoom): PersistedRoom {
  return {
    id: room.id,
    name: room.name,
    width: room.width,
    height: room.height,
    floorTexture: room.floorTexture,
    floorTiles: room.floorTiles.map(tile => ({ x: tile.x, y: tile.y, texture: tile.texture })),
    windows: (room.windows ?? []).map(window => ({ ...window })),
    // Only the type is stored; the definition is generated data.
    furniture: room.furniture.map(piece => ({
      id: piece.id,
      type: piece.type,
      x: piece.x,
      y: piece.y,
      z: piece.z || undefined,
      direction: piece.direction
    })),
    doorway: room.doorway,
    spawnPoint: room.spawnPoint,
    revision: (previous?.revision ?? 0) + 1,
    updatedAt: new Date().toISOString()
  }
}

/**
 * Rebuild a runtime room.
 *
 * Furniture whose type has since left the catalogue is dropped rather than
 * carried as a broken reference - regenerating the Sprite Factory catalogue
 * with a renamed id should not wedge someone's saved room.
 */
export function fromPersistedRoom(persisted: PersistedRoom): Room {
  const furniture: Furniture[] = []

  for (const piece of persisted.furniture) {
    const definition = getFurnitureDefinition(piece.type)
    if (!definition) {
      console.warn(`Dropping saved furniture with unknown type "${piece.type}"`)
      continue
    }

    furniture.push({
      id: piece.id,
      type: piece.type,
      x: piece.x,
      y: piece.y,
      z: piece.z ?? 0,
      direction: piece.direction as Furniture['direction'],
      definition
    })
  }

  const floorTiles = persisted.floorTiles.map(tile => ({ ...tile }))

  return {
    id: persisted.id,
    name: persisted.name,
    width: persisted.width,
    height: persisted.height,
    floorTexture: persisted.floorTexture,
    floorTiles,
    furniture,
    windows: persisted.windows.map(window => ({ ...window })),
    doorway: persisted.doorway,
    spawnPoint: persisted.spawnPoint,
    // Derived, never stored: recomputed from the layout that was.
    walls: buildRoomWalls(persisted.width, persisted.height, persisted.doorway, floorTiles)
  }
}

export function toWorldDocument(
  rooms: Room[],
  currentRoomId: string | null,
  previous?: WorldDocument | null
): WorldDocument {
  const previousById = new Map((previous?.rooms ?? []).map(room => [room.id, room]))

  return {
    schemaVersion: SCHEMA_VERSION,
    rooms: rooms.map(room => toPersistedRoom(room, previousById.get(room.id))),
    currentRoomId,
    updatedAt: new Date().toISOString()
  }
}
