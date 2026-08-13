/**
 * A tiny bridge between the toolbar and the game engine's camera.
 *
 * Zoom and pan live in the engine, not in game state: panning updates on every
 * mouse-move, and dispatching that through the reducer would re-render the whole
 * interface sixty times a second. The engine registers itself here, the bar
 * calls in, and only the zoom *label* subscribes for re-rendering.
 */

export interface ViewApi {
  zoomIn(): void
  zoomOut(): void
  /** Back to auto-fit, centred. */
  reset(): void
  getZoom(): number
  canZoomIn(): boolean
  canZoomOut(): boolean
}

let api: ViewApi | null = null
const listeners = new Set<() => void>()

export function registerView(next: ViewApi | null) {
  api = next
  notifyView()
}

/** Called by the engine whenever zoom changes, so the label stays honest. */
export function notifyView() {
  listeners.forEach(listener => listener())
}

export function subscribeView(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const view = {
  zoomIn: () => api?.zoomIn(),
  zoomOut: () => api?.zoomOut(),
  reset: () => api?.reset(),
  getZoom: () => api?.getZoom() ?? 1,
  canZoomIn: () => api?.canZoomIn() ?? false,
  canZoomOut: () => api?.canZoomOut() ?? false
}
