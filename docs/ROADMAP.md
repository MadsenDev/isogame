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
- **Frame-rate-independent simulation.** The loop steps by real elapsed time
  instead of an assumed 16ms per frame, so walking takes the same wall-clock
  time on any machine.
- **Persistence, server-ready.** Rooms, furniture, glazing and floor paint
  survive a reload, saved through a `WorldStore` interface so the backend can
  become a server without touching the game.
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
- **Customisable characters.** Hair styles and outfits as separate render
  layers, plus per-slot recolouring from one generated palette, so shape costs a
  render and colour costs nothing.

## Next

### 1. More catalogue content

Twenty-three pieces now, up from ten: seating variants, surfaces, storage, two
rugs, a second plant, and four things that hang on a wall.

**The scaling question is answered, and the answer was not a visual editor.**
Authoring geometry as primitives was never the problem - the problem was that
most of each entry was not the piece. Every one restated the same eight-line
behaviour block, the same interaction shape, and four near-identical legs, so
the three interesting lines were buried and a mistake in the boilerplate was
invisible because it looked exactly like the boilerplate beside it.
`src/authoring.ts` collapses that into named intent (`behaviour.seating()`,
`sit([...])`, `legs({...})`, `mirrorZ`, `repeatY`). A piece is now roughly as
long as the piece is complicated, which is the property that actually scales.

What a visual editor would still buy is *iteration speed* - nudging a cushion
0.02 units is a re-render away rather than a drag - and that is worth revisiting
if the catalogue heads for a hundred pieces.

Still missing as content: appliances (a TV, a fridge), anything animated, and
larger multi-tile set pieces.

### 2. More character variety

Done: hair styles, outfits, and per-slot recolouring. Bodies and hair are
separate render layers, so the two catalogues add rather than multiply and a new
style is one render.

What is left is content and slots. More outfits and hair styles are pure
authoring. Anything that wants its *own* colour - a jacket over a shirt, shoe
laces, a hat separate from hair - needs a new material slot, which means a new
entry in `GENERATION_PALETTE` that survives the distinctness check. Facial
features beyond the two eye pixels would need a resolution the format does not
really have.

### 3. Interaction depth

The pieces carry the data - `sit`, `lay`, `sleep`, `use`, `dance` spots with
generated attachment points - but the game only acts on `sit`. Beds have lay and
sleep spots nothing reads; the `use` spots on desks, dressers and lamps are
inert. This is the largest gap between what the pipeline emits and what the game
consumes.

## Known bugs and rough edges

Found while wiring up the pipeline, not yet fixed:

- **No multi-tile furniture preview.** The placement preview draws the sprite,
  but the validity highlight only tints the origin tile. Now more visible with
  a 2x2 round rug and several 2x1 pieces in the catalogue.
- **`tileset.jpg` is now only a fallback.** Floors use generated sprites; the
  skewed-tilesheet path remains until they load.

## Moving persistence to a server

The seam is `WorldStore` in `src/persistence/types.ts`: `load`, `save`, `clear`,
all async. `LocalWorldStore` is the only implementation today; an HTTP one drops
in via `setWorldStore()` and nothing else changes. The document is designed for
it already:

- plain JSON, every room addressable by id
- `revision` and `updatedAt` per room, so a backend can reject a stale write
  rather than silently clobbering it
- ids from `crypto.randomUUID()` rather than `Date.now()`, so they are safe as
  primary keys and cannot collide when two pieces are placed in one millisecond
- `save()` returns the stored document, so a server that bumps a revision or
  resolves a conflict can hand back the truth

What is deliberately *not* stored: walls (derived from the floor, recomputed on
load), furniture definitions (generated by the Sprite Factory, looked up by
type), and anything session-scoped - players, tools, camera.

Appearance follows the same pattern through `ProfileStore`, but as a *separate*
document: a look belongs to a person and follows them between rooms, so folding
it into the world would mean duplicating it per room.

Still missing for a real backend: authentication, per-user scoping, and a
conflict policy for two people editing one room.

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
