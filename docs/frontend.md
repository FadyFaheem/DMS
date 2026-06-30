# Frontend

> A React app that renders the *entire* game — world and menus alike — inside one WebGL canvas.

[← API Reference](api-reference.md) &middot; [Handbook](README.md) &middot; Next: [Database →](database.md)

The client lives in [`frontend/`](../frontend). It's the unusual part of the stack: there is no DOM-based UI. The 3D park *and* every panel, button, and modal are drawn with WebGL.

- **React** 19 &middot; **TypeScript** 5.9 (strict) &middot; **Vite** 8
- **three.js** via **[@react-three/fiber](https://r3f.docs.pmnd.rs/)** — the 3D world
- **[@react-three/drei](https://github.com/pmndrs/drei)** — `OrbitControls`, `Billboard`, `Text`, `Edges`
- **[@react-three/uikit](https://github.com/pmndrs/uikit)** + `uikit-default` — all the in-canvas UI (cards, buttons, inputs, progress bars)
- **Vitest** + Testing Library + jsdom — tests

> MUI and React Router were **removed** in the WebGL migration. If you see them referenced anywhere, it's stale.

## The big idea

Everything you see is one `<canvas>`. The 3D park is a three.js scene; the HUD and screens are a `uikit` overlay rendered *in the same canvas* via `<Fullscreen>`. Navigation between "screens" doesn't change routes or mount DOM — it swaps which uikit subtree is drawn on top of the world.

## Provider tree

```
main.tsx
└─ App.tsx
   └─ PlayerProvider      ← identity + park state (the GET /api/players/me payload)
      └─ ScreenProvider   ← which screen is active ('park' | 'habitats' | …)
         └─ GameCanvas     ← the one <Canvas>
            └─ WebglStateProvider   ← re-provides the above INSIDE the canvas
               ├─ ParkWorld          (3D scene, when screen === 'park')
               └─ <Fullscreen> HUD
                  └─ TutorialProvider
                     ├─ TopBar + active screen
                     └─ TutorialOverlay
```

### The canvas boundary problem

React Context does **not** cross the react-three-fiber `<Canvas>` boundary (the renderer runs in its own reconciler). So [`GameCanvas`](../frontend/src/webgl/GameCanvas.tsx) reads the outer contexts *outside* the canvas, bundles them into a `WebglState`, and re-provides them *inside* with [`WebglStateProvider`](../frontend/src/webgl/WebglState.tsx):

```ts
interface WebglState {
  game: GameState;                       // from PlayerContext
  screen: ScreenId;                      // from ScreenContext
  setScreen: (s: ScreenId) => void;
}
```

In-canvas components call `useWebgl()` (never `useGame()`/`useScreen()` directly).

## State & identity — `PlayerContext`

[`PlayerContext`](../frontend/src/context/PlayerContext.tsx) owns the player and the park. `useGame()` exposes:

| Field | Purpose |
|-------|---------|
| `player` | The full park payload, or `null`. |
| `loading` | True during the one-time bootstrap. |
| `needsOnboarding` | True on first launch (no stored code). |
| `error` | Login failure message. |
| `refresh()` | Re-fetch `GET /api/players/me`. |
| `login(code)` | Store a code and load that park. |
| `createNamedPark(name)` | Create a player and store its code. |

**Bootstrap (once, on mount):** if `localStorage` has a `player_code`, call `refresh()`; otherwise show onboarding. A failed fetch clears the code and falls back to onboarding.

**No polling.** There is no interval refresh. After any mutation a screen calls `game.refresh()`, which re-runs `ParkTick` server-side and returns a current park. The on-screen "Day N" label is computed locally from `player.created_at` ([`utils/gameClock.ts`](../frontend/src/utils/gameClock.ts)) purely for display — the server is the authority on game time.

## Navigation — `ScreenContext`

[`ScreenContext`](../frontend/src/webgl/ScreenContext.tsx) holds the active `ScreenId`; the type and nav labels live in [`screensConfig.ts`](../frontend/src/webgl/screensConfig.ts):

```ts
type ScreenId = 'park' | 'habitats' | 'species' | 'research' | 'production' | 'goals' | 'profile';
```

`TopBar` and the tutorial call `setScreen(...)`. The `'park'` screen renders the 3D world; the rest are uikit panels over it.

## The 3D world — `webgl/world/`

Mounted by [`GameCanvas`](../frontend/src/webgl/GameCanvas.tsx), which sets the camera (`position [0, 16, 22]`, `fov 50`) and scene background, then layers the world under the HUD.

| Component | What it draws |
|-----------|---------------|
| [`ParkWorld`](../frontend/src/webgl/world/ParkWorld.tsx) | Lights, ground plane, `OrbitControls`, and one tile + its dinos per habitat. Habitats are placed on a grid by [`parkLayout.ts`](../frontend/src/components/park3d/parkLayout.ts). |
| [`HabitatTileMesh`](../frontend/src/webgl/world/HabitatTileMesh.tsx) | A terrain-coloured tile with a floating name + `living/capacity`. Outlined when selected, crowded, or hazard-struck. |
| [`DinoActor`](../frontend/src/webgl/world/DinoActor.tsx) | A low-poly procedural dino that wanders (`useFrame`) with a floating health bar. Click to select. |
| [`HazardMarker`](../frontend/src/components/park3d/HazardMarker.tsx) | An animated marker over a habitat with an active event. |

Shape, colour, and motion are **seeded** by dino id ([`dinoShape.ts`](../frontend/src/components/park3d/dinoShape.ts), [`wander.ts`](../frontend/src/components/park3d/wander.ts), [`seededRandom.ts`](../frontend/src/utils/seededRandom.ts)) so a given dinosaur always looks and moves the same. Selecting a dino or habitat in the world opens its panel in the Park HUD.

> The `components/park3d/` folder is shared 3D math/meshes used by the `webgl/` layer — it's current, not legacy. (One helper, `dinoPlacements()`, is now superseded by runtime wandering but is still unit-tested.)

## The screens — `webgl/screens/`

Each screen reads `game.player` via `useWebgl()` and calls `game.refresh()` after mutations.

| Screen | Does | Calls |
|--------|------|-------|
| [`ParkHud`](../frontend/src/webgl/screens/ParkHud.tsx) | Park overlay: stat readout, Buy Food + Breed modals, recent activity, and selection panels for the clicked dino/habitat | feed, move, treat, quarantine, buy food, stock, breeding start/claim |
| [`HabitatsScreen`](../frontend/src/webgl/screens/HabitatsScreen.tsx) | Build (terrain picker) and upgrade habitats | build, upgrade |
| [`SpeciesScreen`](../frontend/src/webgl/screens/SpeciesScreen.tsx) | Period-filtered catalog; acquire species | acquire |
| [`ResearchScreen`](../frontend/src/webgl/screens/ResearchScreen.tsx) | Tech cards + progress; unlock | unlock |
| [`ProductionScreen`](../frontend/src/webgl/screens/ProductionScreen.tsx) | Farms, structures, attractions; build/upgrade | build/upgrade × 3 |
| [`GoalsScreen`](../frontend/src/webgl/screens/GoalsScreen.tsx) | Goal progress + the prestige flow | prestige |
| [`ProfileScreen`](../frontend/src/webgl/screens/ProfileScreen.tsx) | Show/copy park code, load another park, replay the tutorial | login |

Shared in-canvas widgets live in [`webgl/ui/`](../frontend/src/webgl/ui): `TopBar`, `InfoPanel`, `Modal`, `ScreenScaffold`, `OnboardingPanel`, `TutorialOverlay`. A common trick: the HUD root sets `pointerEvents="none"` and interactive panels set `pointerEvents="auto"`, so clicks fall through to the 3D world everywhere there isn't a panel.

## The API client — `src/api/`

One thin client plus a typed module per resource.

[`client.ts`](../frontend/src/api/client.ts) is the only place that touches `fetch`:

- `apiFetch(url, opts)` attaches `Authorization: Bearer <code>` (from `localStorage`) and the JSON content-type.
- `apiJson<T>()` wraps it, throwing the server's `{ error }` message on a non-2xx.
- `getPlayerCode` / `setPlayerCode` / `clearPlayerCode` manage the stored code.

Resource modules mirror the [API](api-reference.md) and export typed functions: [`players`](../frontend/src/api/players.ts) (and **all** the shared TypeScript interfaces), [`dinosaurs`](../frontend/src/api/dinosaurs.ts), [`habitats`](../frontend/src/api/habitats.ts), [`breeding`](../frontend/src/api/breeding.ts), [`species`](../frontend/src/api/species.ts), [`research`](../frontend/src/api/research.ts), [`production`](../frontend/src/api/production.ts), [`structures`](../frontend/src/api/structures.ts), [`attractions`](../frontend/src/api/attractions.ts), [`food`](../frontend/src/api/food.ts), [`prestige`](../frontend/src/api/prestige.ts).

> Never call `fetch` from a component — always go through a resource module. URLs are relative; Vite proxies `/api` to the Rails server in dev (see [Development](development.md)).

## Theming

Colours are centralized, not hard-coded in components:

| File | Role |
|------|------|
| [`theme/theme.ts`](../frontend/src/theme/theme.ts) | `BRAND_COLORS` — the single source of brand colour. |
| [`webgl/uikitTheme.ts`](../frontend/src/webgl/uikitTheme.ts) | Maps `BRAND_COLORS` into `uikit-default`'s theme tokens (`setTheme`). Runs on import. |
| [`webgl/palette.ts`](../frontend/src/webgl/palette.ts) | 3D scene colours: terrain palette, hazard/crowded tints, ground, background. |

To rebrand, edit `BRAND_COLORS` and the palette — don't sprinkle hex values through components.

## Tutorial

A guided first run. [`tutorialSteps.ts`](../frontend/src/webgl/tutorialSteps.ts) defines the ordered steps (each pointing at a screen); [`TutorialContext`](../frontend/src/webgl/TutorialContext.tsx) auto-starts it once for a new player (tracked by a `localStorage` flag), drives `setScreen` as you advance, and renders [`TutorialOverlay`](../frontend/src/webgl/ui/TutorialOverlay.tsx) above everything. It can be replayed from the Profile screen.

## Tests

Vitest + Testing Library (jsdom). [`src/test/setup.ts`](../frontend/src/test/setup.ts) stubs `fetch` and `localStorage` globally. Suites in [`src/__tests__/`](../frontend/src/__tests__) cover the API client, `PlayerContext` bootstrap/login, the game-clock util, the park-layout and wander math, and tutorial-step integrity. Run with `npx vitest run` — see [Development → Testing](development.md#testing).

## Adding a screen

1. Add the id to `ScreenId` in [`screensConfig.ts`](../frontend/src/webgl/screensConfig.ts) and a nav entry for `TopBar`.
2. Create `webgl/screens/YourScreen.tsx` using `ScreenScaffold`, read state via `useWebgl()`.
3. Render it in `GameCanvas`'s screen switch.
4. If it mutates server state, add/extend a module in `src/api/` and call `game.refresh()` afterward.
