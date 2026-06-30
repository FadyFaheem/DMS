# CLAUDE.md

Architecture, conventions, and workflows for AI assistants and human contributors working on Dino Park Manager. **Read this before making changes** -- following the established patterns keeps the codebase coherent and reduces the chance of accidental breakage.

## Project Overview

Dino Park Manager is an idle/simulation game: build a dinosaur park, breed and feed dinos, expand habitats, and keep the ecosystem healthy.

- **React + Vite + MUI** frontend SPA
- **Ruby on Rails** API-only backend (Rails 8)
- **PostgreSQL** managed by ActiveRecord
- **Podman pods** for both dev and prod (Postgres + Rails + Vite/static + Cloudflare Tunnel)
- **fzf-based CLI** (`cmds`) for common dev workflows

Identity is a low-security **portable player code** (a bearer token, no passwords). Game time is **compute-on-read**: a player's dinos and income are advanced from elapsed real time on each read (`GameClock`, scaled by `GAME_DAY_REAL_MINUTES`), so there are no background workers.

### Game domain (Phase 1)

- **Models** ([api/app/models](api/app/models)): `Player` (currency + food + code), `Habitat` (terrain + capacity), `Dinosaur` (stats, diet, lineage), `Breeding`; plus `Species` (catalog), `GameClock`, and `DinoReport` (a refactored legacy report powering the dashboard summary).
- **Services** ([api/app/services](api/app/services)): `Simulation::{HealthFormula,DinoTick,ParkTick}`, `Economy`, `Feeding` / `FoodPurchase`, and `Reproduction::{Compatibility,Genetics,Hatch}` (RNG/clock injected for deterministic specs).
- **Controllers** ([api/app/controllers/api](api/app/controllers/api)): players, dinosaurs (feed/move), habitats, food, breedings (start/claim). All but `players#create` require the player code via the `PlayerAuthentication` concern.

## Stack Summary

| Layer | Choice | Version |
|-------|--------|---------|
| Frontend framework | React | 19 |
| Build tool | Vite | 8 |
| Language | TypeScript (strict) | ~5.9 |
| UI library | MUI (Material) | 7 |
| Routing | React Router DOM | 7 |
| Frontend tests | Vitest + Testing Library + jsdom | 4 |
| Backend language | Ruby | 3.3 |
| Backend framework | Rails (API-only) | 8 |
| ORM | ActiveRecord | 8 |
| Database | PostgreSQL | latest |
| App/web server | Puma | bundled |
| Backend tests | RSpec (rspec-rails) | 8 |
| Container orchestration | Podman (`play kube`) | — |
| Secrets | Podman secrets | — |
| Public ingress | Cloudflare Tunnel | — |

## Project Structure

```
.
├── api/                       Rails API-only app
│   ├── app/
│   │   ├── controllers/api/              players, dinosaurs, habitats, food, breedings
│   │   ├── models/                       Player, Habitat, Dinosaur, Breeding, Species, GameClock, DinoReport
│   │   ├── services/                     simulation/, reproduction/, economy, feeding
│   │   └── serializers/                  game_serializer.rb
│   ├── config/                           routes.rb, database.yml, environments/
│   ├── db/migrate/                       ActiveRecord migrations
│   ├── spec/                             RSpec (models, services, requests)
│   └── Gemfile
├── frontend/                  React + Vite SPA
│   ├── src/
│   │   ├── api/               client (bearer code) + players/dinosaurs/habitats/food/breeding
│   │   ├── context/PlayerContext.tsx     identity + park state
│   │   ├── components/        AppLayout, DinoInspector, BreedingModal
│   │   ├── hooks/useIsMobile.ts
│   │   ├── pages/             ParkDashboard, Habitats, Profile
│   │   ├── theme/theme.ts     MUI theme + brand colors
│   │   ├── __tests__/         Vitest tests
│   │   ├── App.tsx            Router + provider tree
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts         dev proxy /api -> :5000, allowedHosts, polling
├── podman/
│   ├── dpm-dev.yaml       Pod: postgres + rails + vite + cloudflared
│   ├── dpm-prod.yaml      Pod: postgres + rails(puma) + built frontend + cloudflared
│   ├── secrets.dev.example.yaml    secret template (copy to secrets.dev.yaml)
│   └── secrets.prod.example.yaml
├── cloudflared/               Tunnel configs (creds gitignored)
├── tools/cli/                 fzf-based command runner
│   ├── cmds.sh
│   └── commands/              *.fzf: pods, database, api, secrets, cf, test
├── CLAUDE.md                  This file
├── README.md
└── SETUP.md
```

## Architecture Conventions

### Backend (Rails, API-only)

- **API-only app.** `config.api_only = true` in [api/config/application.rb](api/config/application.rb). Controllers inherit from `ActionController::API`.
- **Controller per resource.** Each resource gets a controller under `app/controllers/` (namespace under `app/controllers/api/` if you prefix routes with `/api`). Keep controllers thin: validate params, call the model, render JSON.
- **Routing.** Declare routes in [api/config/routes.rb](api/config/routes.rb). The health check lives at `get "health" => "health#show"`.
- **ActiveRecord.** Use models + migrations for all DB access. Generate migrations with `rails generate migration` (never hand-edit the DB). `db/schema.rb` is the source of truth once you add migrations.
- **JSON rendering.** `render json: ...`. For UTC timestamps that the frontend can parse, serialize datetimes with `.utc.iso8601` (yields a trailing `Z`).
- **Database config** is environment-driven in [api/config/database.yml](api/config/database.yml) (`DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD`) with dev defaults so `rails s` works locally against the dev pod's Postgres.
- **Secrets.** `secret_key_base` comes from the `SECRET_KEY_BASE` env var (a podman secret in containers). Encrypted credentials (`config/credentials.yml.enc` / `master.key`) are intentionally removed.

### Frontend (React)

- **Single API client.** All requests go through `apiFetch` / `apiJson` from [frontend/src/api/client.ts](frontend/src/api/client.ts): they set `Content-Type: application/json`, attach the stored player code as a bearer token, and surface server `{ error }` messages.
- **Identity.** `PlayerContext` ([frontend/src/context/PlayerContext.tsx](frontend/src/context/PlayerContext.tsx)) bootstraps a player (create-or-load) and supports login-by-code via `useGame()`. No passwords.
- **App shell** is `AppLayout` -- a top AppBar with section buttons and a contextual left sidebar. Navigation is **data-driven** by the `SECTIONS` constant at the top of [frontend/src/components/AppLayout.tsx](frontend/src/components/AppLayout.tsx); editing that array is the way to add nav.
- **Routing** in [frontend/src/App.tsx](frontend/src/App.tsx): pages render inside `<AppLayout />` via `<Outlet />`.
- **Styling** uses MUI's `sx` prop and theme. **Do not** hardcode colors -- reference `theme.palette.primary.main`, `'secondary.main'`, `'text.secondary'`, etc., so projects can rebrand by editing `theme/theme.ts` alone.
- **Responsive** breakpoints via MUI: `useIsMobile()` (md down).

### Database

- **ActiveRecord migrations** under `api/db/migrate/`, applied with `rails db:migrate`. The dev/prod DB itself is created by the Postgres container (`POSTGRES_DB`); Rails owns the schema within it.
- Phase 1 tables: `players`, `habitats`, `dinosaurs` (self-referential lineage), `breedings`.

## Common Commands

| Action | Command |
|--------|---------|
| Interactive command picker | `cmds` |
| Scope picker | `cmds pods`, `cmds database`, `cmds api`, `cmds secrets`, `cmds cf`, `cmds test` |
| Load dev secrets (before first start) | `podman play kube podman/secrets.dev.yaml` |
| Start dev pod | `podman play kube podman/dpm-dev.yaml` |
| Stop dev pod | `podman pod stop dpm-dev-pod` |
| Reset DB | `podman pod rm -f dpm-dev-pod && podman volume rm dpm-dev-db-data-claim` |
| API logs | `podman logs -f dpm-dev-pod-rails-api` |
| Rails console (in container) | `podman exec -w /app -it dpm-dev-pod-rails-api bundle exec rails console` |
| psql shell | `podman exec -it dpm-dev-pod-postgres-db psql -U postgres -d dpm-dev-db` |
| Run API specs | `cd api && bundle exec rspec` |
| Run frontend tests | `cd frontend && npx vitest run` |
| API dev (host-only) | `cd api && bundle install && rails s -p 5000` |
| Frontend dev (host-only) | `cd frontend && npm install && npm run dev` |

## Adding a New Feature (Step-by-Step)

Suppose you want a `widgets` resource.

### 1. Migration + model

```bash
cd api
bundle exec rails generate migration CreateWidgets name:string description:text is_active:boolean
bundle exec rails db:migrate
```

Add `app/models/widget.rb`:

```ruby
class Widget < ApplicationRecord
end
```

### 2. Controller

Create `app/controllers/api/widgets_controller.rb`:

```ruby
module Api
  class WidgetsController < ApplicationController
    def index
      widgets = Widget.where(is_active: true).order(id: :desc)
      render json: widgets.map { |w| widget_json(w) }
    end

    def create
      widget = Widget.new(widget_params)
      if widget.save
        render json: widget_json(widget), status: :created
      else
        render json: { error: widget.errors.full_messages.join(", ") }, status: :unprocessable_entity
      end
    end

    private

    def widget_params
      params.permit(:name, :description)
    end

    def widget_json(w)
      {
        id: w.id,
        name: w.name,
        description: w.description,
        is_active: w.is_active,
        created_at: w.created_at.utc.iso8601,
        updated_at: w.updated_at.utc.iso8601,
      }
    end
  end
end
```

### 3. Routes

In `api/config/routes.rb`:

```ruby
namespace :api do
  resources :widgets, only: [:index, :create]
end
```

### 4. Frontend API module

Create `frontend/src/api/widgets.ts`:

```ts
import { apiJson } from './client';

export interface Widget {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function listWidgets(): Promise<Widget[]> {
  return apiJson('/api/widgets');
}

export function createWidget(data: { name: string; description?: string }): Promise<Widget> {
  return apiJson('/api/widgets', { method: 'POST', body: JSON.stringify(data) });
}
```

### 5. Page + route + nav

Create `frontend/src/pages/WidgetsPage.tsx`, add a `<Route path="widgets" .../>` in
[frontend/src/App.tsx](frontend/src/App.tsx), and add an entry to the `SECTIONS`
array in [frontend/src/components/AppLayout.tsx](frontend/src/components/AppLayout.tsx).

### 6. Tests

Add `api/spec/requests/api/widgets_spec.rb` (RSpec) and
`frontend/src/__tests__/api/widgets.test.ts` (Vitest).

## Environment Variables (API)

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `RAILS_ENV` | no | `development` | `production` in the prod pod |
| `SECRET_KEY_BASE` | yes (prod) | dev value | Rails secret; a podman secret in containers |
| `DB_HOST` | no | `localhost` | Postgres host |
| `DB_PORT` | no | `5432` | Postgres port |
| `DB_NAME` | no | `dpm-dev-db` | Database name |
| `DB_USER` | no | `postgres` | DB user |
| `DB_PASSWORD` | no | `postgres` | DB password; a podman secret in containers |
| `PORT` | no | `5000` | API listen port |

## Secrets

Secret values are stored as **podman secrets**, never committed:

- Templates `podman/secrets.{dev,prod}.example.yaml`; real `secrets.{dev,prod}.yaml` are gitignored.
- Each secret (`dpm-dev-secrets` / `dpm-prod-secrets`) has keys `db-password` and `secret-key-base`.
- Pod YAMLs reference them via `env.valueFrom.secretKeyRef`.
- Load before first pod start: `podman play kube podman/secrets.dev.yaml` (or `cmds secrets`).
- podman secrets are immutable -- to rotate: `podman secret rm <name>`, re-load, restart the pod.

## Cloudflare Tunnels

- Configs in [cloudflared/config.yml](cloudflared/config.yml) (dev) and [cloudflared/config.prod.yml](cloudflared/config.prod.yml) (prod).
- Dev: `dms-dev` -> `dms-dev.faheemlabs.com`; Prod: `dms-prod` -> `dms.faheemlabs.com`.
- Ingress routes `/api` and `/health` to the Rails API (`:5000`) and everything else to the frontend (`:3000` dev, `:80` prod).
- Credentials live in `cloudflared/creds/<UUID>.json` (gitignored).
- Dev tunnel hostname must be allow-listed in `frontend/vite.config.ts` (`ALLOWED_HOSTS`) and `api/config/environments/development.rb` (`config.hosts`).
- `cmds cf` wraps tunnel login/create/route/info.

## Testing Conventions

### API (RSpec)

- Specs live in `api/spec/`. Run with `cd api && bundle exec rspec`.
- Model specs, service specs (inject a fixed clock / seeded RNG for determinism), and request specs (`type: :request`).
- Specs need a reachable Postgres (the dev pod's, or a local instance) for the test database.

### Frontend (Vitest + Testing Library)

- Tests in `frontend/src/__tests__/`, named `*.test.{ts,tsx}`. Run with `cd frontend && npx vitest run`.
- `src/test/setup.ts` stubs `fetch` and `localStorage` globally; jsdom environment, `globals: true`.

## Do NOT

- ❌ **Hand-edit the database.** Use ActiveRecord migrations (`rails generate migration`).
- ❌ **Hardcode colors in components.** Use MUI's theme: `sx={{ color: 'primary.main' }}`.
- ❌ **Skip UTC on datetimes.** Serialize with `.utc.iso8601` so the frontend parses the `Z` suffix.
- ❌ **Call `fetch` directly from components.** Go through `apiFetch` / `apiJson`.
- ❌ **Put business logic in controllers.** Keep them thin; push logic into models/services.
- ❌ **Commit secrets.** Never commit `podman/secrets.{dev,prod}.yaml`, `cloudflared/creds/*.json`, or a Rails `master.key`.
- ❌ **Edit an applied migration.** Add a new migration to change schema.
- ❌ **Add heavy auth.** Identity is intentionally a low-security player code (it's a game); don't add passwords/JWT without a real requirement.
- ❌ **Add background workers for game time.** Stats advance compute-on-read via `Simulation::DinoTick`/`ParkTick`; keep it that way unless the design changes.
