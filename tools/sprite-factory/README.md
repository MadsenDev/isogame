# IsoGame Sprite Factory

**3D models in, isometric pixel-art sprites and game-ready object definitions out.**

We don't draw isometric pixel art by hand. We build simple 3D geometry and run it
through one fixed camera, so perspective, scale, lighting and orientation are
consistent across every asset for free.

```
model (primitives or .glb) → fixed iso camera → banded shading → supersampled render
    → downsample → alpha threshold → palette snap → outline → crop
    → PNG frames + sprite sheet + metadata + game definition
```

## Usage

```bash
npm run sprites                  # render the whole catalogue into the game
npm run dev                      # then open /tools/sprite-factory/ to tune assets
```

Useful flags:

```bash
npm run sprites -- --only=wooden_chair          # one asset, leaves the rest alone
npm run sprites -- --supersample=8              # slower, cleaner edges
npm run sprites -- --no-outline                 # drop the dark silhouette
npm run sprites -- --alpha-cutoff=160           # tighter silhouettes
npm run sprites -- --model=path/to/chair.glb --id=my_chair --footprint=1x1
```

The renderer runs in headless Chromium driven by Playwright, against a
programmatically started Vite server. That means the CLI and the interactive page
execute the *same* code — what you tune in the browser is what lands in the repo.

## Output

```
public/furniture/<id>/{south,west,north,east}.png   individual frames
public/furniture/<id>/sheet.png                     4-frame strip
public/furniture/<id>/sprite.json                   per-asset metadata
public/furniture/manifest.json                      everything, for tooling
src/data/furnitureSprites.generated.json            sprite metadata for the game
src/data/furnitureDefinitions.generated.json        full game objects
```

`src/data/furnitureDefinitions.ts` reads the last of these, so a piece of
furniture's artwork, footprint, collision box and interaction spots are produced
in one pass and cannot drift apart.

## Why it looks like pixel art rather than a small 3D render

Four decisions do the work:

- **Banded shading.** Each material declares one base colour; the pipeline derives
  a four-shade ramp (shadows pushed toward blue, highlights desaturated) and the
  fragment shader snaps lighting into one of those four bands. Nothing else can
  come out of it. With the fixed light rig, a box lands on three predictable
  bands: top highlight, left base, right shadow.
- **Supersample, then quantise.** Rendering at 4x and box-filtering gives good
  decisions about *where* an edge is. Alpha thresholding and palette snapping then
  throw away the blurry evidence of how we got there.
- **A locked palette.** Every colour is known before rendering starts, so a sprite
  is 7 colours because we said so, not because a quantiser found 7.
- **Deliberately crude geometry.** The models are boxes and cylinders because the
  output is 60 pixels tall. The 3D is designed around the limits of the sprite.

## Geometry

Everything derives from one fact: IsoGame draws a 1x1 tile as a 64x32 diamond.
That forces a camera elevation of exactly 30° (`asin(32/64)`) at 45° yaw, and
`64/√2 ≈ 45.25` pixels per world unit. One world unit is one tile edge; `y = 0`
is the floor.

The camera frustum is symmetric around the asset's origin tile, so that tile
projects to the exact centre of the render — which is what makes every sprite
anchor an integer instead of a rounded approximation.

## Anchors

Sprites are not centred on their tile. Each frame records `anchorX`/`anchorY`:
the pixel position of the centre of footprint tile (0,0) at floor level. The game
draws at `(screenX - anchorX * zoom, screenY - anchorY * zoom)`, so a 78px
bookshelf and a flat rug both line up from the same tile coordinate.

## Interaction spots

Each interaction declares a 3D `point` — the seat surface of a chair, the mattress
of a bed. The pipeline projects it through the same camera for every rotation and
emits pixel offsets, so a sitter lands *on* the seat rather than on the floor
beneath it. Tiles, facings and points all rotate together:

```
south  sit tile=(0,0) faces=south offset=(1,-18)  layer=front
west   sit tile=(0,0) faces=west  offset=(1,-19)  layer=behind
```

`layer` says whether the player draws over the furniture or under it. Furniture
facing north or west shows its back to the camera, so the sitter is occluded by
it; facing south or east, the sitter is in front.

## Placement

| Placement | Frames | Authored |
| --- | --- | --- |
| `floor` | 4 | on `y = 0`, centred on its footprint |
| `wall` | 2 | against the plane behind its tile (`x = -0.5`) |
| `ceiling` | 4 | hanging from `WALL_HEIGHT` (√2 units, matching the game's walls) |

Wall assets only render the two orientations an isometric room can actually show
a wall in; four would ship two frames facing into masonry.

## Adding an asset

Edit `src/catalog.ts`:

```ts
{
  id: 'side_table',                        // must match the game's furniture id
  name: 'Side Table',
  facing: 'south',                         // which way it points as authored
  footprint: { width: 1, height: 1 },
  behaviour: {
    category: 'functional',
    walkable: false, stackable: true, rotatable: true,
    collision: { blocksMovement: true, blocksVision: false, height: 1, shape: 'rectangle' },
  },
  materials: { top: { colour: '#c08b52' }, leg: { colour: '#875531' } },
  parts: [
    { type: 'box', size: [0.7, 0.1, 0.7], position: [0, 0.5, 0], material: 'top' },
    { type: 'box', size: [0.08, 0.5, 0.08], position: [0.28, 0.25, 0.28], material: 'leg' },
  ],
}
```

Then `npm run sprites`.

## Model files

Primitives are the fast path, but nothing downstream of the model cares where the
geometry came from, so `.glb`, `.gltf` and `.obj` work too:

```ts
source: { file: '/tools/sprite-factory/models/chair.glb', autoFit: false }
```

By default the file's materials are replaced with pixel-toon ramps derived from
their base colours, so imported models shade consistently with the catalogue.
`autoFit` is off by default — a model exported in metres already lands at a
sensible size when one tile is one metre.

`models/example-wooden-chair.glb` is a fixture: the catalogue chair, rebuilt with
standard glTF materials and exported as binary glTF. Rendering it through the
model-file path produces **byte-identical PNGs** to the primitive path, which is
the regression test for the loader:

```bash
node tools/sprite-factory/scripts/make-example-model.mjs
npm run sprites -- --model=tools/sprite-factory/models/example-wooden-chair.glb \
                   --id=imported_chair --footprint=1x1
```

## Requirements

Playwright's Chromium. If the bundled download is missing, the exporter falls back
to `CHROMIUM_EXECUTABLE` or a system Chromium before failing.

## Known gaps

- Characters are not generated yet. That needs arbitrary rotation counts (8 × 45°
  rather than 4 × 90°) and posed animation frames.
- Walls and floor tiles are still drawn by hand in canvas rather than generated.
- No contact shadows; the game draws no shadow under furniture either.
