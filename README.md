# Dino Park Manager

A browser-based idle/simulation game where you build and manage a dinosaur park: acquire dinos, breed them, feed them the right diet, expand habitats, and keep your ecosystem healthy. Built as a React SPA on a Ruby on Rails API with PostgreSQL, orchestrated via Podman and exposed through a Cloudflare Tunnel.

> **Identity, not accounts.** No passwords. Each player gets a portable "park code" stored on the device; enter it on another machine to load the same park (low-security by design — it's a game).

## Core loop

Acquire → Feed → Breed → Expand → Optimize:

- **Acquire** — start with two herbivores and a small carnivore; grow your roster by breeding.
- **Feed** — buy food and feed each dino its preferred diet; the wrong diet degrades health.
- **Breed** — pair compatible dinos (opposite gender, healthy, related species); offspring inherit traits with rare shiny / giant / dwarf mutations.
- **Expand** — build habitats (forest, grassland, wetland, volcanic, aquatic), each with its own capacity.
- **Optimize** — watch health, hunger, happiness, and crowding; a neglected dino can die.

Game time advances on read ("compute-on-read"): stats are recomputed from elapsed real time on each request, scaled by `GAME_DAY_REAL_MINUTES` (default 60 = one game-day per real hour). No background workers.

## Stack

- **Frontend:** React 19 + Vite 8 + TypeScript + MUI 7 + React Router 7 (Vitest + Testing Library)
- **API:** Ruby 3.3 + Rails 8 (API-only) + ActiveRecord, tested with RSpec
- **Database:** PostgreSQL (ActiveRecord migrations)
- **Infra:** Podman pods (dev + prod), Cloudflare Tunnel, podman-secret config
- **Tooling:** `cmds` fzf CLI for pods, database, API, secrets, tunnel, lint, and tests

## API endpoints

- `POST /api/players` — create a player + starter park (returns the park code)
- `GET  /api/players/me` — current park (ticks all dinos + income) with a dashboard summary
- `POST /api/dinosaurs/:id/feed`, `POST /api/dinosaurs/:id/move`
- `POST /api/food` — buy food
- `GET /api/habitats`, `POST /api/habitats` — list / build habitats
- `GET /api/breedings`, `POST /api/breedings`, `POST /api/breedings/:id/claim`
- `GET /health` — liveness

Authenticated routes take the park code as a bearer token: `Authorization: Bearer <code>`.

## Quick Start

```bash
# 1. Create + load the dev secrets, then start the development pod
cp podman/secrets.dev.example.yaml podman/secrets.dev.yaml   # then edit values
podman play kube podman/secrets.dev.yaml
podman play kube podman/dpm-dev.yaml

# 2. Add the cmds alias and use the developer commands
alias cmds='bash tools/cli/cmds.sh'
cmds
```

Frontend runs on `http://localhost:3000`, API on `http://localhost:5000`. Open the frontend and a park is created automatically.

## Project Structure

```
.
├── api/                       # Ruby on Rails API-only app
│   ├── app/
│   │   ├── controllers/api/   # players, dinosaurs, habitats, food, breedings
│   │   ├── models/            # Player, Habitat, Dinosaur, Breeding, Species, GameClock, DinoReport
│   │   ├── services/          # simulation (HealthFormula/DinoTick/ParkTick), reproduction, feeding, economy
│   │   └── serializers/       # GameSerializer
│   ├── db/migrate/            # ActiveRecord migrations
│   ├── spec/                  # RSpec (models, services, requests)
│   └── Gemfile
├── frontend/                  # React + Vite + TypeScript SPA
│   ├── src/
│   │   ├── api/               # typed API modules + client (bearer code)
│   │   ├── context/           # PlayerContext (identity + park state)
│   │   ├── components/        # AppLayout, DinoInspector, BreedingModal
│   │   ├── pages/             # ParkDashboard, Habitats, Profile
│   │   └── __tests__/         # Vitest
│   └── vite.config.ts
├── podman/                    # Pod definitions (dev + prod) + secret templates
├── cloudflared/               # Tunnel configs (creds gitignored)
├── tools/cli/                 # fzf-based developer command runner
├── CLAUDE.md
├── README.md
└── SETUP.md
```

## Services

| Service | Dev Port | Prod Port | Purpose |
|---------|----------|-----------|---------|
| PostgreSQL | 5432 | 5432 | Database |
| Rails API | 5000 | 5000 | Game REST API |
| Vite (frontend) | 3000 | 80 | Web UI |
| Cloudflared | — | — | Public ingress tunnel |

## Public URLs (Cloudflare Tunnel)

| Environment | Hostname | Tunnel |
|-------------|----------|--------|
| Dev | `dms-dev.faheemlabs.com` | `dms-dev` |
| Prod | `dms.faheemlabs.com` | `dms-prod` |

## Secrets

Managed as podman secrets, never committed:

- Copy `podman/secrets.{dev,prod}.example.yaml` to `secrets.{dev,prod}.yaml` (gitignored) and fill in values.
- Load them with `cmds secrets` (or `podman play kube podman/secrets.dev.yaml`) **before** starting a pod.
- Tunnel credentials live in `cloudflared/creds/` (gitignored).

## Developer Commands

- `cmds pods` — start, stop, rebuild, logs, exec into pod containers
- `cmds database` — psql shell, Rails migrations, backup/restore
- `cmds api` — API logs, health check, Rails console
- `cmds secrets` — create, load, list, rotate podman secrets
- `cmds cf` — Cloudflare Tunnel setup, login, DNS routing
- `cmds lint` — RuboCop + ESLint + Prettier
- `cmds test` — RSpec (API) and Vitest (frontend)

## Prerequisites

- [Podman](https://podman.io/) (with `play kube` support)
- [Ruby 3.3+](https://www.ruby-lang.org/) and [Rails 8](https://rubyonrails.org/) (for local API work)
- [Node 20+](https://nodejs.org/) (for the frontend)
- [fzf](https://github.com/junegunn/fzf) (for the `cmds` runner)
- Bash shell (Git Bash on Windows, native on macOS/Linux)
