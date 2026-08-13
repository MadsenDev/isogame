# IsoGame

**A browser-based isometric social sandbox and room-building prototype inspired by classic virtual-world games.**

IsoGame explores the mechanics behind a Habbo-style social space: isometric rooms, click-to-move characters, furniture placement, room customization, chat, multiple rooms, and a desktop-like interface built from draggable tool windows.

The project is a prototype rather than a finished online game. There is no production backend, account system, persistent multiplayer world, or live service hiding behind the curtain. What is here is a fairly substantial client-side playground for experimenting with isometric rendering and social-room interactions.

## Features

### Isometric room engine

- canvas-based isometric rendering at 1:1 pixel scale
- generated floor tiles and wall panels, sharing one light and palette
- grid/world-to-screen coordinate conversion
- click-to-move player controls
- scaled pointer handling for accurate canvas interaction
- floor and wall rendering
- movement and placement collision checks

### Sprite pipeline

Furniture *and* character art is generated rather than drawn. Simple 3D models go through one
fixed isometric camera to produce sprites, anchors and game object definitions in
a single pass, so a piece's artwork, footprint, collision box and interaction
spots cannot drift apart. Characters run through the same camera and lighting
from posed primitives, in 8 directions with idle, walk and sit animations, so
guests and furniture are consistent in scale, palette and light by construction.
See [`tools/sprite-factory`](tools/sprite-factory).

```bash
npm run sprites   # rebuild every furniture sprite and definition
```

### Room building

- add and remove floor tiles
- room styling and customization tools
- furniture catalog with category filtering
- furniture placement previews with per-orientation rotation
- multi-tile furniture footprints and collision
- collision checks against furniture and players
- furniture sprite loading with visual fallbacks

### Social sandbox

- multiple player characters
- player selection
- chat interface
- player actions such as sitting, dancing, and waving
- walking onto a seat sits the character on it, at the seat height the sprite
  pipeline measured from the 3D model
- context-menu interactions

### Persistence

Rooms, furniture, glazing and floor paint are saved locally and restored on
load, behind a `WorldStore` interface so the backend can become a server without
changing the game. See [`docs/ROADMAP.md`](docs/ROADMAP.md).

### Room management

- create rooms
- rename rooms
- switch between rooms
- delete rooms
- per-room furniture and layout state
- minimap view

### Desktop-style UI

The current interface uses a dock and draggable floating windows for tools such as:

- build tools
- furniture catalog
- room styling
- room navigator
- minimap
- guide/player controls
- chat

This grew out of an earlier Habbo-inspired layout and gives the project more of a virtual-world-client feel than a conventional game HUD.

## Controls

The current UI exposes the main controls in-app, including:

| Input | Action |
| --- | --- |
| Click | Move the active character / interact with the room |
| Furniture tool | Select and place room furniture |
| `Esc` | Cancel the current action |
| `R` | Rotate the furniture piece being placed |
| `1`-`4` | Switch active player |
| `Enter` | Open/use chat |

Exact behaviour may vary as the prototype evolves.

## Getting started

### Requirements

- Node.js
- npm

Clone the repository and install dependencies:

```bash
git clone https://github.com/MadsenDev/isogame.git
cd isogame
npm install
npm run dev
```

Vite will start the development server and print the local URL in the terminal.

## Development

```bash
npm run dev       # start the Vite development server
npm run build     # type-check and create a production build
npm run preview   # preview the production build locally
npm run lint      # run ESLint
npm run sprites   # regenerate furniture sprites and definitions
```

With the dev server running, the interactive Sprite Factory lives at
`/tools/sprite-factory/`.

## Tech stack

- React 18
- TypeScript
- Vite
- HTML Canvas
- Tailwind CSS tooling
- custom isometric coordinate and rendering utilities
- Three.js, confined to the offline sprite pipeline (the game itself stays canvas 2D)

There is deliberately no full game engine dependency. Much of the interesting part of the project is the home-grown rendering, coordinate, room, player, and furniture logic.

## Architecture

The codebase broadly separates the React interface from the canvas/game systems:

```text
src/
├── components/     # UI, room controls, chat, furniture and player views
├── context/        # shared game state and actions
├── data/           # furniture definitions (generated) and game data
├── utils/          # game engine, coordinates and rendering helpers
└── assets/         # visual assets

tools/
└── sprite-factory/ # 3D → isometric pixel-art asset pipeline

public/
└── furniture/      # generated sprites, sheets and per-asset metadata
```

The React layer controls application state and tooling, while the canvas engine handles room rendering and pointer/game interactions.

## Roadmap

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for what is planned next and a list of
known rough edges.

## Project status

IsoGame is an **experimental prototype**.

The current repository demonstrates a surprisingly broad slice of an isometric social-room game, but it should not be mistaken for a complete Habbo-style platform. Major production systems such as networking, authentication, persistent server-side rooms, moderation, asset pipelines, and scalable multiplayer infrastructure are outside the current implementation.

That distinction matters. A chat box and four locally simulated people do not, despite the optimism of software demos everywhere, constitute an MMO.

## Inspiration

The project is inspired by the interaction model and visual language of classic isometric social games such as Habbo Hotel. It is an independent experiment and is not affiliated with or endorsed by Habbo or Sulake.

## License

MIT. See the repository license for details.