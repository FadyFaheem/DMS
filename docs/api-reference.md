# API Reference

> Every endpoint: method, path, auth, parameters, and what comes back.

[← Backend](backend.md) &middot; [Handbook](README.md) &middot; Next: [Frontend →](frontend.md)

Routes are defined in [`api/config/routes.rb`](../api/config/routes.rb); the JSON shapes come from [`GameSerializer`](../api/app/serializers/game_serializer.rb). For the *meaning* of the numbers, see [Game Design](game-design.md).

## Conventions

| | |
|---|---|
| **Base URL (dev)** | `http://localhost:5000` (proxied from the SPA at `/api`) |
| **Auth** | `Authorization: Bearer <park code>` on every endpoint except `POST /api/players` and the health checks |
| **Request body** | JSON, `Content-Type: application/json` |
| **Datetimes** | UTC ISO-8601 with a trailing `Z` |
| **Errors** | `{ "error": "message" }` with a `4xx` status |
| **Success** | `200 OK` for reads/mutations of existing state, `201 Created` for creates |

### Status codes

| Code | When |
|------|------|
| `200` | Read or in-place update succeeded |
| `201` | A resource was created (player, habitat, breeding, offspring, food purchase, prestige) |
| `401` | Missing/invalid park code |
| `404` | A referenced record doesn't exist or isn't yours |
| `422` | A game rule was violated (not enough currency, wrong diet, missing research, …) |

Most reads also **advance the simulation first** ([compute-on-read](architecture.md#compute-on-read)), so responses are always current.

---

## Health

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `GET` | `/health` | no | `{ "status": "healthy", "service": "project-api" }` — used by the frontend and tunnel. |
| `GET` | `/up` | no | Rails' built-in liveness check (200 if booted, else 500). |

## Players

### `POST /api/players`
Create a player and seed a starter park (one habitat + the three starter dinos). **No auth.**

```jsonc
// body (optional)
{ "display_name": "Ada" }
// → 201, the full player payload (see below). Save player_code — it's the login.
```

### `GET /api/players/me`
The whole park, fully ticked. **This is the endpoint the client lives on.** Returns the [player payload](#the-player-payload).

## Dinosaurs

| Method | Path | Body | Success | Errors |
|--------|------|------|:-------:|--------|
| `GET` | `/api/dinosaurs/:id` | — | `200` dinosaur | `404` |
| `POST` | `/api/dinosaurs/:id/feed` | `{ "diet": "plants" }` | `200` dinosaur | `404`; `422` not enough food / invalid or allergic diet |
| `POST` | `/api/dinosaurs/:id/move` | `{ "habitat_id": 12 }` | `200` dinosaur | `404` dino or habitat |
| `POST` | `/api/dinosaurs/:id/treat` | — | `200` dinosaur | `422` no vet lab / nothing to treat / not enough currency |
| `POST` | `/api/dinosaurs/:id/quarantine` | — | `200` dinosaur (toggled) | `404` |

`feed` operates on living dinos only and ticks the dino first. `treat` cures all active (non-malnutrition) diseases at once and requires a Veterinary Lab.

## Habitats

| Method | Path | Body | Success | Errors |
|--------|------|------|:-------:|--------|
| `GET` | `/api/habitats` | — | `200` habitat[] | — |
| `POST` | `/api/habitats` | `{ "terrain": "forest", "name": "..." }` | `201` habitat | `422` unknown terrain / not enough currency |
| `POST` | `/api/habitats/:id/upgrade` | — | `200` habitat | `404`; `422` requires `habitat_expansion` / not enough currency |
| `POST` | `/api/habitats/:id/stock` | `{ "amount": 50 }` | `200` habitat | `404`; `422` amount not positive / not enough plant food |

`terrain` is one of `forest`, `grassland`, `wetland`, `volcanic`, `aquatic`. `stock` moves plant food from your global store into the habitat's grazing stockpile.

## Breedings

| Method | Path | Body / Query | Success | Errors |
|--------|------|------|:-------:|--------|
| `GET` | `/api/breedings` | — | `200` breeding[] | — |
| `GET` | `/api/breedings/preview` | `?parent_a_id=&parent_b_id=` | `200` prediction | `404` parent |
| `POST` | `/api/breedings` | `{ "parent_a_id", "parent_b_id", "requested_trait"? }` | `201` breeding | `404`; `422` incompatible / not enough currency / trait gated |
| `POST` | `/api/breedings/:id/claim` | — | `201` dinosaur (offspring) | `404`; `422` already claimed / still incubating |

`preview` is side-effect-free: it returns the probabilistic outcome (species odds, mutation chance, genetic-quality range, cost). `requested_trait` (`shiny`/`giant`/`dwarf`) requires the Genetic Engineering Lab.

## Species

| Method | Path | Body | Success | Errors |
|--------|------|------|:-------:|--------|
| `GET` | `/api/species` | — | `200` species state | — |
| `POST` | `/api/species` | `{ "species_key": "allosaurus" }` | `201` species state | `422` locked / population gate / not enough currency |

## Research

| Method | Path | Body | Success | Errors |
|--------|------|------|:-------:|--------|
| `GET` | `/api/researches` | — | `200` research state | — |
| `POST` | `/api/researches` | `{ "tech_key": "veterinary" }` | `201` research state | `422` unknown / missing prereqs / population gate / already owned / not enough currency |

## Food production

| Method | Path | Body | Success | Errors |
|--------|------|------|:-------:|--------|
| `GET` | `/api/food_productions` | — | `200` state | — |
| `POST` | `/api/food_productions` | `{ "kind": "plant_farm" }` | `201` state | `422` unknown / requires tech / not enough currency |
| `POST` | `/api/food_productions/:id/upgrade` | — | `200` state | `404`; `422` requires `advanced_farming` / not enough currency |

## Structures

| Method | Path | Body | Success | Errors |
|--------|------|------|:-------:|--------|
| `GET` | `/api/structures` | — | `200` state | — |
| `POST` | `/api/structures` | `{ "kind": "vet_lab" }` | `201` state | `422` unknown / requires tech / already built / not enough currency |

## Attractions

| Method | Path | Body | Success | Errors |
|--------|------|------|:-------:|--------|
| `GET` | `/api/attractions` | — | `200` state | — |
| `POST` | `/api/attractions` | `{ "kind": "carousel" }` | `201` state | `422` unknown / requires tech / already built / not enough currency |
| `POST` | `/api/attractions/:id/upgrade` | — | `200` state | `404`; `422` not enough currency |

## Food

### `POST /api/food`
Buy food. Returns the full player payload (your currency and stores changed).

```jsonc
{ "type": "meat", "quantity": 100 }   // type: plants | meat | fish
// → 201 player payload, or 422 (not enough currency / invalid type)
```

## Prestige

### `POST /api/prestige`
Reset the park for New Game+ (requires the win condition to be met). Ticks the park first, so a just-earned win counts. Returns the freshly-seeded player payload.

```jsonc
// → 201 player payload (prestige_level incremented), or 422 if not yet won
```

---

## The player payload

`GET /api/players/me` (and every create/buy/prestige response) returns one object that contains the **entire park**. The frontend reads everything from here; most `GET` collection endpoints above exist for completeness but the client rarely needs them.

```jsonc
{
  "id": 1,
  "player_code": "AB3K-7QPX-MN24-RT9F",
  "display_name": "Ada",
  "currency": 10000,
  "food": { "plants": 100, "meat": 100, "fish": 50 },

  "dinosaurs": [{
    "id": 1, "name": "Stegosaurus #214", "species": "stegosaurus", "period": "Jurassic",
    "gender": "female", "color": "emerald", "size_lbs": 11000, "generation": 1,
    "habitat_id": 1, "diet_primary": "plants", "diet_secondary": null,
    "preferred_terrain": "forest", "social_structure": "herd",
    "health": 100.0, "hunger": 20.0, "happiness": 70.0, "reproduction_readiness": 0.0,
    "status": "Thriving", "alive": true,
    "mutations": [], "genetics_quality": 50,
    "temperature_min": 10, "temperature_max": 26, "diet_restrictions": [],
    "diseases": [], "quarantined": false, "health_history": [],
    "parent_a_id": null, "parent_b_id": null,
    "born_at": "2026-06-30T12:00:00Z", "created_at": "…", "updated_at": "…"
  }],

  "habitats": [{
    "id": 1, "name": "Whispering Forest", "terrain": "forest",
    "capacity": 6, "level": 1, "happiness_modifier": 10, "living_count": 3,
    "temperature": 18, "humidity": 60, "food_stockpile": 0,
    "feature": "shade", "feature_label": "Shaded canopy keeps residents cool"
  }],

  "summary": { "population": 3, "by_category": { … }, "avg_health": 100.0, "critical": 0, "sick": 0 },

  "research":        { "unlocked": ["plant_farming"], "catalog": [ … ] },
  "species":         { "periods": ["Triassic","Jurassic","Cretaceous"], "catalog": [ … ] },
  "food_productions":{ "buildings": [ … ], "catalog": [ … ] },
  "structures":      { "built": [ … ], "catalog": [ … ] },
  "attractions":     { "built": [ … ], "catalog": [ … ] },
  "active_effects":  [ { "kind": "drought", "multiplier": 0.4, "expires_at": "…", … } ],
  "goals":           { "completed": 1, "total": 6, "catalog": [ … ] },
  "prestige":        { "level": 0, "multiplier": 1.0, "won": false, "can_prestige": false },
  "events":          [ { "kind": "birth", "message": "… hatched", "created_at": "…" } ],

  "created_at": "2026-06-30T12:00:00Z",
  "updated_at": "2026-06-30T12:34:00Z"
}
```

Each `catalog` array carries per-player flags (`unlocked`, `owned_count`, `built`, …) so the client can render lock states without a second request. The TypeScript interfaces that mirror this payload live in [`frontend/src/api/players.ts`](../frontend/src/api/players.ts) — see [Frontend](frontend.md).
