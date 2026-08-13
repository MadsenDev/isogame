# IsoGame roadmap

Working notes on what comes next, in rough priority order. The premise driving
all of it: **we don't draw isometric pixel art, we build a pipeline that makes it
for us.** See [`tools/sprite-factory`](../tools/sprite-factory).

## Done

- **Sprite Factory.** 3D models (primitives or `.glb`/`.gltf`/`.obj`) through one
  fixed isometric camera, producing sprites, sheets, anchors and full game object
  definitions in a single pass.
- **Wired into the game.** Anchored sprite drawing, furniture rotation, depth
  sorting, interaction spots with generated seat offsets, wall/ceiling placement.
- **Characters through the factory.** Eight directions, idle/walk/sit poses, at
  correct scale against the furniture. Direction naming unified on the
  world-axis convention across furniture and characters.

## Next

### 1. Walls and floor tiles as generated assets

`WallComponent` has been patched rather than designed: a `wallBorderOffset = 2`
fudge, per-face colour constants, manual seam overlaps, and separate code paths
for the two wall orientations. It does not share a light direction or palette
with the generated furniture.

Generating wall segments and floor tiles through the pipeline would make
wall-mounted furniture align with walls *by construction* instead of by matching
constants in two places. `WALL_HEIGHT` already exists in `iso.ts` (√2 units,
derived from the game's `tileHeight * 2`) so a rewrite has a fixed contract to
land on.

This is the change most likely to alter how the game looks overall.

### 2. Expand the catalogue

Pure content, no engine work: doors, windows, shelving, seating variants, more
plants and lighting. Also the honest stress test of whether authoring furniture
as primitives actually scales past ten pieces, or whether it needs a visual
editor.

### 3. Character variety

One `guest` exists. The rig takes a palette (skin, hair, shirt, trousers, shoes)
and proportions, so per-player appearance is mostly a matter of passing different
values and exporting more than one character. Clothing shapes would need new
primitives.

## Known bugs and rough edges

Found while wiring up the pipeline, not yet fixed:

- **Frame-rate-dependent movement.** `GameEngine.update()` adds a hardcoded
  `16` ms per frame instead of a real delta, so walking speed tracks the frame
  rate. Under software rendering a step takes ~2.5s instead of 400ms.
- **Layout reflow shifts the canvas.** Opening or switching tool panels resizes
  the canvas element, so the same screen point maps to a different tile before
  and after. Suspect this is behind past hover-alignment fixes.
- **The dock and floating windows fight for space.** Windows now render above the
  dock (fixed), but the default window positions still stack on top of each other
  and on top of the dock.
- **`FurnitureSelector` is unreachable in the UI.** The Catalog panel exists and
  renders every generated piece, but the dock button overlaps other windows.
- **No multi-tile furniture preview.** The placement preview draws the sprite,
  but the validity highlight only tints the origin tile.
- **Room persistence.** Furniture is lost on reload; there is no serialisation.
- **Old character art is now unused.** `src/assets/character/` and
  `public/character/A_completely_normal_habbo_hotel_-like_character._Isometric/`
  are superseded by the generated `guest`, and were loaded from `/src/assets/...`
  which would not have survived a production build. Left in place rather than
  deleted unprompted.

## Design notes worth keeping

- **One tile = one world unit = 64x32 px on screen.** Camera elevation is
  therefore exactly 30°, yaw 45°, at 64/√2 ≈ 45.25 px per unit. Every asset and
  any future wall/character work must use these numbers.
- **Anchors, not centring.** Sprites record where tile (0,0) sits inside the
  frame. This is what lets assets of wildly different heights share one
  coordinate.
- **`layer` is decided by facing, not by centroid.** Furniture facing north or
  west shows its back to the camera, so its occupant is drawn underneath it.
  Comparing against a model centroid puts the two seats of one sofa on different
  layers.
