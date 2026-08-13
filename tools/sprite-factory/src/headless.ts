/**
 * Headless entry point. Exposes the pipeline on `window` so the Playwright
 * driver in scripts/render-sprites.mjs can call it inside a real GPU context.
 */

import { renderAll, renderCharacter, renderModelFile } from './factory'
import { CATALOG } from './catalog'
import { exportExampleGlb } from './example-model'

declare global {
  interface Window {
    spriteFactory?: {
      renderAll: typeof renderAll
      renderCharacter: typeof renderCharacter
      renderModelFile: typeof renderModelFile
      exportExampleGlb: typeof exportExampleGlb
      assetIds: string[]
    }
    spriteFactoryError?: string
  }
}

try {
  window.spriteFactory = {
    renderAll,
    renderCharacter,
    renderModelFile,
    exportExampleGlb,
    assetIds: CATALOG.map((asset) => asset.id),
  }
} catch (error) {
  window.spriteFactoryError = error instanceof Error ? error.stack ?? error.message : String(error)
}

export {}
