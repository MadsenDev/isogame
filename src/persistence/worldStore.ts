/**
 * Storage backends for the world document.
 *
 * Only the browser-local one exists today. The point of the interface is that
 * the day a server does exist, it arrives as one more implementation here and
 * nothing else in the game changes:
 *
 * ```ts
 * class HttpWorldStore implements WorldStore {
 *   async load() {
 *     const response = await fetch('/api/world')
 *     return response.status === 404 ? null : response.json()
 *   }
 *   async save(document: WorldDocument) {
 *     const response = await fetch('/api/world', {
 *       method: 'PUT',
 *       headers: { 'content-type': 'application/json' },
 *       body: JSON.stringify(document)
 *     })
 *     // A 409 means someone else saved first; the response carries their copy.
 *     return response.json()
 *   }
 *   async clear() { await fetch('/api/world', { method: 'DELETE' }) }
 * }
 * ```
 */

import { SCHEMA_VERSION, WorldDocument, WorldStore } from './types'

const STORAGE_KEY = 'isogame.world.v1'

/**
 * Reject anything that is not a world document we understand.
 *
 * Saved data outlives the code that wrote it, so this is the boundary where a
 * stale or hand-edited payload gets thrown away rather than crashing the game
 * halfway through hydrating a room.
 */
function isUsable(value: unknown): value is WorldDocument {
  if (!value || typeof value !== 'object') return false
  const document = value as Partial<WorldDocument>
  return (
    document.schemaVersion === SCHEMA_VERSION &&
    Array.isArray(document.rooms)
  )
}

export class LocalWorldStore implements WorldStore {
  constructor(private readonly key: string = STORAGE_KEY) {}

  async load(): Promise<WorldDocument | null> {
    try {
      const raw = window.localStorage.getItem(this.key)
      if (!raw) return null

      const parsed: unknown = JSON.parse(raw)
      if (!isUsable(parsed)) {
        console.warn('Ignoring saved world: unrecognised schema')
        return null
      }
      return parsed
    } catch (error) {
      console.error('Failed to read saved world', error)
      return null
    }
  }

  async save(document: WorldDocument): Promise<WorldDocument> {
    try {
      window.localStorage.setItem(this.key, JSON.stringify(document))
    } catch (error) {
      // Quota, private browsing, or storage disabled. The game keeps working;
      // it just will not remember.
      console.error('Failed to save world', error)
    }
    return document
  }

  async clear(): Promise<void> {
    try {
      window.localStorage.removeItem(this.key)
    } catch (error) {
      console.error('Failed to clear saved world', error)
    }
  }
}

let store: WorldStore | null = null

/** The world store this build uses. Swap the implementation here. */
export function getWorldStore(): WorldStore {
  if (!store) store = new LocalWorldStore()
  return store
}

/** Override the backend, for tests or once a server exists. */
export function setWorldStore(next: WorldStore) {
  store = next
}
