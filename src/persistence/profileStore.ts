/**
 * The local player's profile.
 *
 * Deliberately separate from the world document. A room belongs to whoever
 * built it; an appearance belongs to a person and follows them between rooms,
 * so folding it into the world would mean either duplicating it in every room
 * or giving the world a field that is not about the world. When a server
 * arrives these are two endpoints, not one.
 *
 * The other guests' appearances are not stored at all - they are session state,
 * derived from their id, exactly like their positions.
 */

import { Appearance, normaliseAppearance } from '../data/appearance'

/** Bump when the document shape changes in a way older data cannot satisfy. */
export const PROFILE_SCHEMA_VERSION = 1

export interface ProfileDocument {
  schemaVersion: number
  appearance: Appearance
  updatedAt: string
}

export interface ProfileStore {
  load(): Promise<ProfileDocument | null>
  save(document: ProfileDocument): Promise<ProfileDocument>
  clear(): Promise<void>
}

const STORAGE_KEY = 'isogame.profile.v1'

function isUsable(value: unknown): value is ProfileDocument {
  if (!value || typeof value !== 'object') return false
  const document = value as Partial<ProfileDocument>
  return document.schemaVersion === PROFILE_SCHEMA_VERSION && Boolean(document.appearance)
}

export class LocalProfileStore implements ProfileStore {
  constructor(private readonly key: string = STORAGE_KEY) {}

  async load(): Promise<ProfileDocument | null> {
    try {
      const raw = window.localStorage.getItem(this.key)
      if (!raw) return null

      const parsed: unknown = JSON.parse(raw)
      if (!isUsable(parsed)) {
        console.warn('Ignoring saved profile: unrecognised schema')
        return null
      }
      // A saved look can name an outfit or hair style that has since been
      // renamed or removed; normalising here means an old profile degrades to
      // the default piece rather than to an invisible character.
      return { ...parsed, appearance: normaliseAppearance(parsed.appearance) }
    } catch (error) {
      console.error('Failed to read saved profile', error)
      return null
    }
  }

  async save(document: ProfileDocument): Promise<ProfileDocument> {
    try {
      window.localStorage.setItem(this.key, JSON.stringify(document))
    } catch (error) {
      console.error('Failed to save profile', error)
    }
    return document
  }

  async clear(): Promise<void> {
    try {
      window.localStorage.removeItem(this.key)
    } catch (error) {
      console.error('Failed to clear saved profile', error)
    }
  }
}

export function toProfileDocument(appearance: Appearance): ProfileDocument {
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    appearance,
    updatedAt: new Date().toISOString()
  }
}

let store: ProfileStore | null = null

/** The profile store this build uses. Swap the implementation here. */
export function getProfileStore(): ProfileStore {
  if (!store) store = new LocalProfileStore()
  return store
}

/** Override the backend, for tests or once a server exists. */
export function setProfileStore(next: ProfileStore) {
  store = next
}
