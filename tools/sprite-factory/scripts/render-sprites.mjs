#!/usr/bin/env node
/**
 * IsoGame Sprite Factory - headless exporter.
 *
 * Spins up Vite, opens the pipeline in headless Chromium, renders the whole
 * catalogue and writes the results into the repo:
 *
 *   public/furniture/<id>/{south,west,north,east}.png   individual frames
 *   public/furniture/<id>/sheet.png                     4-frame strip
 *   public/furniture/<id>/sprite.json                   per-asset metadata
 *   public/furniture/manifest.json                      everything, for tooling
 *   src/data/furnitureSprites.generated.json            sprite metadata
 *   src/data/furnitureDefinitions.generated.json        full game objects
 *
 * A real browser is doing the rendering rather than a headless GL binding, so
 * the CLI and the interactive page cannot drift apart.
 *
 * Usage:
 *   npm run sprites
 *   npm run sprites -- --supersample=4 --no-outline --only=wooden_chair
 *   npm run sprites -- --model=tools/sprite-factory/models/example-chair.glb \
 *                      --id=imported_chair --footprint=1x1
 */

import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../../..')
const SPRITE_DIR = join(REPO_ROOT, 'public/furniture')
const GAME_DATA = join(REPO_ROOT, 'src/data/furnitureSprites.generated.json')
const GAME_DEFINITIONS = join(REPO_ROOT, 'src/data/furnitureDefinitions.generated.json')
const STRUCTURE_DIR = join(REPO_ROOT, 'public/structures')
const GAME_STRUCTURES = join(REPO_ROOT, 'src/data/structureSprites.generated.json')
const CHARACTER_DIR = join(REPO_ROOT, 'public/character')
const GAME_CHARACTERS = join(REPO_ROOT, 'src/data/characterSprites.generated.json')
const PAGE = '/tools/sprite-factory/headless.html'

function parseArgs(argv) {
  const options = { config: {}, only: null, model: null, charactersOnly: false, skipCharacters: false }

  for (const arg of argv) {
    const [rawKey, rawValue] = arg.replace(/^--/, '').split('=')
    const value = rawValue ?? 'true'

    switch (rawKey) {
      case 'supersample':
        options.config.supersample = Number(value)
        break
      case 'padding':
        options.config.padding = Number(value)
        break
      case 'alpha-cutoff':
        options.config.alphaCutoff = Number(value)
        break
      case 'no-outline':
        options.config.outline = { enabled: false, colour: '#241d2b' }
        break
      case 'outline-colour':
      case 'outline-color':
        options.config.outline = { enabled: true, colour: value }
        break
      case 'no-palette-snap':
        options.config.paletteSnap = false
        break
      case 'characters-only':
        options.charactersOnly = true
        break
      case 'no-characters':
        options.skipCharacters = true
        break
      case 'only':
        options.only = value.split(',').map((id) => id.trim()).filter(Boolean)
        break
      case 'model':
        options.model = { ...(options.model ?? {}), file: value }
        break
      case 'id':
        options.model = { ...(options.model ?? {}), id: value }
        break
      case 'name':
        options.model = { ...(options.model ?? {}), name: value }
        break
      case 'facing':
        options.model = { ...(options.model ?? {}), facing: value }
        break
      case 'footprint': {
        const [w, h] = value.split('x').map(Number)
        if (!w || !h) throw new Error(`--footprint expects WxH, got "${value}"`)
        options.model = { ...(options.model ?? {}), footprint: { width: w, height: h } }
        break
      }
      case 'keep-materials':
        options.model = { ...(options.model ?? {}), keepMaterials: true }
        break
      case 'fit':
        options.model = { ...(options.model ?? {}), autoFit: true }
        break
      case 'fill':
        options.model = { ...(options.model ?? {}), autoFit: true, fill: Number(value) }
        break
      default:
        throw new Error(`Unknown option: --${rawKey}`)
    }
  }

  return options
}

/**
 * Launch Chromium, tolerating environments where Playwright's own download is
 * missing but a compatible browser is already on disk (CI images, sandboxes).
 * Set CHROMIUM_EXECUTABLE to point at a specific binary.
 */
async function launchBrowser(chromium) {
  // SwiftShader gives us a software GL context; there is no GPU in CI.
  const launchOptions = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }

  const fallbacks = [process.env.CHROMIUM_EXECUTABLE, '/opt/pw-browsers/chromium'].filter(Boolean)

  try {
    return await chromium.launch(launchOptions)
  } catch (error) {
    for (const executablePath of fallbacks) {
      if (!existsSync(executablePath)) continue
      console.log(`Playwright's bundled browser is missing; using ${executablePath}`)
      return chromium.launch({ ...launchOptions, executablePath })
    }
    throw new Error(
      `${error.message}\n\nInstall a browser with: npx playwright install chromium\n` +
        'Or point CHROMIUM_EXECUTABLE at an existing Chromium binary.'
    )
  }
}

function decodeDataUrl(dataUrl) {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) throw new Error('Malformed data URL')
  return Buffer.from(dataUrl.slice(comma + 1), 'base64')
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  const [{ createServer }, { chromium }] = await Promise.all([
    import('vite'),
    import('playwright').catch(() => {
      throw new Error('playwright is required for sprite export. Run: npm install')
    }),
  ])

  const server = await createServer({
    root: REPO_ROOT,
    configFile: false,
    logLevel: 'error',
    server: { port: 0, host: '127.0.0.1' },
  })
  await server.listen()

  const address = server.httpServer.address()
  const baseUrl = `http://127.0.0.1:${address.port}`

  const browser = await launchBrowser(chromium)

  const failures = []

  try {
    const page = await browser.newPage()
    page.on('pageerror', (error) => failures.push(String(error)))
    page.on('console', (message) => {
      // Failed requests are reported via the response handler below, with the
      // URL attached; the bare console line would just say "404".
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
        failures.push(message.text())
      }
    })
    page.on('response', (response) => {
      // The headless page has no favicon and does not need one.
      if (response.status() >= 400 && !response.url().includes('favicon')) {
        failures.push(`${response.status()} ${response.url()}`)
      }
    })

    await page.goto(`${baseUrl}${PAGE}`, { waitUntil: 'load' })
    await page.waitForFunction(
      () => Boolean(window.spriteFactory) || Boolean(window.spriteFactoryError),
      null,
      { timeout: 60_000 }
    )

    const loadError = await page.evaluate(() => window.spriteFactoryError ?? null)
    if (loadError) throw new Error(`Pipeline failed to load:\n${loadError}`)

    let payload
    if (options.charactersOnly) {
      payload = { generator: null, assets: [] }
    } else if (options.model) {
      if (!options.model.file) throw new Error('--model requires a file path')
      const id = options.model.id ?? basename(options.model.file).replace(/\.[^.]+$/, '')
      // The dev server has the repo as its root, so a repo-relative path is a URL.
      const url = `/${relative(REPO_ROOT, resolve(options.model.file)).split(sep).join('/')}`

      console.log(`Rendering model file ${url}...`)
      payload = await page.evaluate(
        async (request) => {
          const result = await window.spriteFactory.renderModelFile(request)
          return JSON.parse(JSON.stringify(result))
        },
        {
          file: url,
          id,
          name: options.model.name,
          footprint: options.model.footprint,
          facing: options.model.facing,
          source: {
            keepMaterials: options.model.keepMaterials ?? false,
            autoFit: options.model.autoFit ?? false,
            fill: options.model.fill,
          },
          config: options.config,
        }
      )
    } else {
      console.log('Rendering catalogue...')
      payload = await page.evaluate(async (config) => {
        const result = await window.spriteFactory.renderAll(config)
        return JSON.parse(JSON.stringify(result))
      }, options.config)
    }

    if (failures.length) {
      throw new Error(`Browser reported errors:\n  ${failures.join('\n  ')}`)
    }

    const assets = options.only
      ? payload.assets.filter((asset) => options.only.includes(asset.metadata.id))
      : payload.assets

    if (options.only) {
      const missing = options.only.filter(
        (id) => !payload.assets.some((asset) => asset.metadata.id === id)
      )
      if (missing.length) throw new Error(`No such asset(s): ${missing.join(', ')}`)
    } else if (!options.model) {
      // A full catalogue run owns the directory; partial runs only add to it.
      await rm(SPRITE_DIR, { recursive: true, force: true })
    }

    await mkdir(SPRITE_DIR, { recursive: true })

    for (const asset of assets) {
      const assetDir = join(SPRITE_DIR, asset.metadata.id)
      await mkdir(assetDir, { recursive: true })

      for (const file of asset.files) {
        const target = join(SPRITE_DIR, file.path)
        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, decodeDataUrl(file.dataUrl))
      }

      await writeFile(join(assetDir, 'sprite.json'), `${JSON.stringify(asset.metadata, null, 2)}\n`)

      const frames = Object.values(asset.metadata.directions)
      const size = `${Math.max(...frames.map((f) => f.width))}x${Math.max(...frames.map((f) => f.height))}`
      console.log(
        `  ${asset.metadata.id.padEnd(16)} ${String(size).padEnd(9)} ` +
          `${asset.metadata.palette.length} colours, ${frames.length} directions`
      )
    }

    const partial = Boolean(options.only || options.model)
    const existing = partial && existsSync(GAME_DATA)
      ? JSON.parse(await readFile(GAME_DATA, 'utf8')).assets ?? {}
      : {}

    const manifest = {
      generator: payload.generator,
      basePath: '/furniture',
      assets: {
        ...existing,
        ...Object.fromEntries(assets.map((asset) => [asset.metadata.id, asset.metadata])),
      },
    }

    const existingDefinitions = partial && existsSync(GAME_DEFINITIONS)
      ? JSON.parse(await readFile(GAME_DEFINITIONS, 'utf8'))
      : {}

    const definitions = {
      ...existingDefinitions,
      ...Object.fromEntries(assets.map((asset) => [asset.definition.id, asset.definition])),
    }

    // Guard: a run that rendered no furniture must not rewrite the furniture
    // manifests, or --characters-only silently empties the game's catalogue.
    if (assets.length > 0) {
      await writeFile(join(SPRITE_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
      await writeFile(GAME_DATA, `${JSON.stringify(manifest, null, 2)}\n`)
      await writeFile(GAME_DEFINITIONS, `${JSON.stringify(definitions, null, 2)}\n`)
    }

    // Structures: floor tiles and wall panels. Same shape as furniture, but a
    // separate output tree because the game consumes them differently.
    if (!options.model && !options.only && !options.charactersOnly) {
      console.log('\nRendering structures...')
      const structures = await page.evaluate(async (config) => {
        const result = await window.spriteFactory.renderStructures(config)
        return JSON.parse(JSON.stringify(result))
      }, options.config)

      await rm(STRUCTURE_DIR, { recursive: true, force: true })
      await mkdir(STRUCTURE_DIR, { recursive: true })

      for (const asset of structures.assets) {
        for (const file of asset.files) {
          const target = join(STRUCTURE_DIR, file.path)
          await mkdir(dirname(target), { recursive: true })
          await writeFile(target, decodeDataUrl(file.dataUrl))
        }
        const frames = Object.values(asset.metadata.directions)
        console.log(
          `  ${asset.metadata.id.padEnd(16)} ${frames[0].width}x${frames[0].height}`.padEnd(32) +
            `${asset.metadata.palette.length} colours, ${frames.length} directions`
        )
      }

      const structureManifest = {
        generator: structures.generator,
        basePath: '/structures',
        structures: Object.fromEntries(
          structures.assets.map((asset) => [asset.metadata.id, asset.definition])
        ),
      }
      await writeFile(
        join(STRUCTURE_DIR, 'manifest.json'),
        `${JSON.stringify(structureManifest, null, 2)}\n`
      )
      await writeFile(GAME_STRUCTURES, `${JSON.stringify(structureManifest, null, 2)}\n`)
    }

    // Characters: rendered from poses, so they get their own layout of
    // animation/direction/frame rather than the furniture one. Bodies and hair
    // are separate layers the game stacks, so the two catalogues add rather
    // than multiply.
    if (!options.model && !options.only && !options.skipCharacters) {
      console.log('\nRendering characters...')
      const characters = await page.evaluate(async (config) => {
        const result = await window.spriteFactory.renderCharacterSet(undefined, config)
        return JSON.parse(JSON.stringify(result))
      }, options.config)

      // Scoped to the directories this pipeline owns: public/character may hold
      // art it did not generate.
      for (const owned of ['body', 'hair']) {
        await rm(join(CHARACTER_DIR, owned), { recursive: true, force: true })
      }
      await mkdir(CHARACTER_DIR, { recursive: true })

      for (const file of characters.files) {
        const target = join(CHARACTER_DIR, file.path)
        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, decodeDataUrl(file.dataUrl))
      }

      const characterManifest = { basePath: '/character', ...characters.metadata }
      await writeFile(
        join(CHARACTER_DIR, 'manifest.json'),
        `${JSON.stringify(characterManifest, null, 2)}\n`
      )
      await writeFile(GAME_CHARACTERS, `${JSON.stringify(characterManifest, null, 2)}\n`)

      const describe = (layer) =>
        `${layer.id}${Object.keys(layer.animations).length === 0 ? ' (no geometry)' : ''}`
      console.log(`  outfits    ${characters.metadata.bodies.map(describe).join(', ')}`)
      console.log(`  hair       ${characters.metadata.hair.map(describe).join(', ')}`)
      console.log(
        `  ${characters.metadata.directions.length} directions, ` +
          `${Object.keys(characters.metadata.slots).length} recolourable slots, ` +
          `${characters.files.length} images`
      )
    }

    if (assets.length > 0) {
      console.log(`\nWrote ${assets.length} asset(s) to public/furniture/`)
      console.log('Game metadata: src/data/furnitureSprites.generated.json')
      console.log('Game objects:  src/data/furnitureDefinitions.generated.json')
    }
  } finally {
    await browser.close()
    await server.close()
  }
}

main().catch((error) => {
  console.error(`\nSprite export failed: ${error.message}`)
  process.exit(1)
})
