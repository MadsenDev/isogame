#!/usr/bin/env node
/**
 * Writes tools/sprite-factory/models/example-chair.glb.
 *
 * Rebuilds the catalogue chair with standard glTF materials and exports it as a
 * binary glTF - the same thing you would get out of Blender. It exists so the
 * model-file path has a fixture to exercise, without vendoring someone else's
 * asset into the repo.
 *
 * Usage: node tools/sprite-factory/scripts/make-example-model.mjs [assetId]
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../../..')
const OUT_DIR = join(REPO_ROOT, 'tools/sprite-factory/models')
const assetId = process.argv[2] ?? 'wooden_chair'

const server = await createServer({
  root: REPO_ROOT,
  configFile: false,
  logLevel: 'error',
  server: { port: 0, host: '127.0.0.1' },
})
await server.listen()

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
})

try {
  const page = await browser.newPage()
  page.on('pageerror', (error) => {
    throw error
  })

  const port = server.httpServer.address().port
  await page.goto(`http://127.0.0.1:${port}/tools/sprite-factory/headless.html`, { waitUntil: 'load' })
  await page.waitForFunction(() => Boolean(window.spriteFactory), null, { timeout: 60_000 })

  const base64 = await page.evaluate((id) => window.spriteFactory.exportExampleGlb(id), assetId)

  await mkdir(OUT_DIR, { recursive: true })
  const target = join(OUT_DIR, `example-${assetId.replace(/_/g, '-')}.glb`)
  await writeFile(target, Buffer.from(base64, 'base64'))
  console.log(`Wrote ${target}`)
} finally {
  await browser.close()
  await server.close()
}
