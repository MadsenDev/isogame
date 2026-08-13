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
- **Walls and floors through the factory.** Floor tiles and wall panels are
  generated, walls belong to a tile edge instead of a phantom tile outside the
  room, and they join the depth-sorted pass so you can walk behind one.
- **Windows.** Placed with the Style tool, replacing a wall segment rather than
  overlaying it.
- **Doorways.** A generated door panel replaces the bare gap. Adding it forced
  WALL_HEIGHT up: at the old height a guest was taller than the wall, so no
  opening could be tall enough to walk through.
- **Contact shadows.** Generated from the geometry in a second render pass and
  drawn in their own pass between the floor and the objects.
- **Panel contents rebuilt.** Catalog, styling and rooms share one set of panel
  primitives; floor swatches preview the generated tile rather than the retired
  tilesheet.
- **Pixel-perfect rendering.** The canvas backing store matches its displayed
  size and zoom snaps to whole multiples, so sprites are never resampled.

## Next

### 1. Expand the catalogue

Pure content, no engine work: shelving, seating variants, more plants and
lighting, wall art. Also the honest stress test of whether authoring furniture
as primitives actually scales past ten pieces, or whether it needs a visual
editor.

### 2. Character variety

One `guest` exists. The rig takes a palette (skin, hair, shirt, trousers, shoes)
and proportions, so per-player appearance is mostly a matter of passing different
values and exporting more than one character. Clothing shapes would need new
primitives.

## Known bugs and rough edges

Found while wiring up the pipeline, not yet fixed:

- **Frame-rate-dependent movement.** `GameEngine.update()` adds a hardcoded
  `16` ms per frame instead of a real delta, so walking speed tracks the frame
  rate. Under software rendering a step takes ~2.5s instead of 400ms.
- **No multi-tile furniture preview.** The placement preview draws the sprite,
  but the validity highlight only tints the origin tile.
- **Room persistence.** Furniture is lost on reload; there is no serialisation.
- **`tileset.jpg` is now only a fallback.** Floors use generated sprites; the
  skewed-tilesheet path remains until they load.

### 3. Room persistence

Nothing is saved. With furniture, walls and floors all now described by plain
data, serialising a room is mostly a matter of deciding where to put it.

## Design notes worth keeping

- **One tile = one world unit = 64x32 px on screen.** Camera elevation is
  therefore exactly 30°, yaw 45°, at 64/√2 ≈ 45.25 px per unit. Every asset and
  any future wall/character work must use these numbers.
- **Anchors, not centring.** Sprites record where tile (0,0) sits inside the
  frame. This is what lets assets of wildly different heights share one
  coordinate.
- **Wall thickness lives outside the tile boundary.** With it inside, each run's
  visible face overshoots the corner by half the thickness, the two faces
  overlap, and whichever draws last puts the corner line off-centre. Faces flush
  with the boundary meet at exactly one point; the square outside it that
  neither run reaches is filled by `wall_corner`.
- **Never scale sprites by a fraction.** Nearest-neighbour at 1.2x makes some
  source pixels one screen pixel wide and others two. Zoom snaps to whole
  multiples, and the canvas backing store matches its CSS size so the browser
  never resamples the finished frame either.
- **`layer` is decided by facing, not by centroid.** Furniture facing north or
  west shows its back to the camera, so its occupant is drawn underneath it.
  Comparing against a model centroid puts the two seats of one sofa on different
  layers.
