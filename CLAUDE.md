# CLAUDE.md

Architecture, conventions, and workflows for AI assistants and human contributors working in this template. **Read this before making changes** -- following the established patterns keeps the template coherent and reduces the chance of accidental breakage.

## Project Overview

A full-stack web application template:

- **React + Vite + MUI** frontend SPA
- **Ruby on Rails** API-only backend (Rails 8)
- **PostgreSQL** managed by ActiveRecord
- **Podman pods** for both dev and prod (Postgres + Rails + Vite/static + Cloudflare Tunnel)
- **fzf-based CLI** (`cmds`) for common dev workflows

The template is **single-tenant** and ships **without authentication or roles** --
add your own auth when a project needs it. The API currently exposes only a
`GET /health` endpoint and is a clean base for new resources.

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
| Backend tests | Minitest | bundled |
| Container orchestration | Podman (`play kube`) | — |
| Secrets | Podman secrets | — |
| Public ingress | Cloudflare Tunnel | — |

## Project Structure

```
.
├── api/                       Rails API-only app
│   ├── app/
│   │   └── controllers/
│   │       ├── application_controller.rb
│   │       └── health_controller.rb      GET /health
│   ├── config/
│   │   ├── routes.rb                      route table
│   │   ├── database.yml                   env-based DB config
│   │   └── environments/                  dev/test/prod
│   ├── db/
│   │   ├── migrate/                       ActiveRecord migrations (none yet)
│   │   └── seeds.rb
│   ├── test/                             Minitest (health_controller_test.rb)
│   └── Gemfile
├── frontend/                  React + Vite SPA
│   ├── src/
│   │   ├── api/client.ts      slim fetch wrapper (apiFetch/apiJson)
│   │   ├── components/AppLayout.tsx       top bar + sidebar shell; SECTIONS config
│   │   ├── hooks/useIsMobile.ts
│   │   ├── pages/             route-level page components
│   │   ├── theme/theme.ts     MUI theme + brand colors
│   │   ├── __tests__/         Vitest tests
│   │   ├── App.tsx            Router + provider tree
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts         dev proxy /api -> :5000, allowedHosts, polling
├── podman/
│   ├── project-dev.yaml       Pod: postgres + rails + vite + cloudflared
│   ├── project-prod.yaml      Pod: postgres + rails(puma) + built frontend + cloudflared
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

- **Single API client.** All requests go through `apiFetch` / `apiJson` from [frontend/src/api/client.ts](frontend/src/api/client.ts): they set `Content-Type: application/json` for JSON bodies and surface server `{ error }` messages. There is no auth/token handling.
- **No auth.** All routes are public. There is no `AuthContext`, `ProtectedRoute`, or login page. Add them per-project if a project needs auth.
- **App shell** is `AppLayout` -- a top AppBar with section buttons and a contextual left sidebar. Navigation is **data-driven** by the `SECTIONS` constant at the top of [frontend/src/components/AppLayout.tsx](frontend/src/components/AppLayout.tsx); editing that array is the way to add nav.
- **Routing** in [frontend/src/App.tsx](frontend/src/App.tsx): pages render inside `<AppLayout />` via `<Outlet />`.
- **Styling** uses MUI's `sx` prop and theme. **Do not** hardcode colors -- reference `theme.palette.primary.main`, `'secondary.main'`, `'text.secondary'`, etc., so projects can rebrand by editing `theme/theme.ts` alone.
- **Responsive** breakpoints via MUI: `useIsMobile()` (md down).

### Database

- **ActiveRecord migrations** under `api/db/migrate/`, applied with `rails db:migrate`. The dev/prod DB itself is created by the Postgres container (`POSTGRES_DB`); Rails owns the schema within it.
- There are **no migrations yet** -- the template starts with an empty schema.

## Common Commands

| Action | Command |
|--------|---------|
| Interactive command picker | `cmds` |
| Scope picker | `cmds pods`, `cmds database`, `cmds api`, `cmds secrets`, `cmds cf`, `cmds test` |
| Load dev secrets (before first start) | `podman play kube podman/secrets.dev.yaml` |
| Start dev pod | `podman play kube podman/project-dev.yaml` |
| Stop dev pod | `podman pod stop project-dev-pod` |
| Reset DB | `podman pod rm -f project-dev-pod && podman volume rm project-dev-db-data-claim` |
| API logs | `podman logs -f project-dev-pod-rails-api` |
| Rails console (in container) | `podman exec -w /app -it project-dev-pod-rails-api bundle exec rails console` |
| psql shell | `podman exec -it project-dev-pod-postgres-db psql -U postgres -d project-dev-db` |
| Run API tests | `cd api && bundle exec rails test` |
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

Add `api/test/controllers/api/widgets_controller_test.rb` (Minitest) and
`frontend/src/__tests__/api/widgets.test.ts` (Vitest).

## Environment Variables (API)

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `RAILS_ENV` | no | `development` | `production` in the prod pod |
| `SECRET_KEY_BASE` | yes (prod) | dev value | Rails secret; a podman secret in containers |
| `DB_HOST` | no | `localhost` | Postgres host |
| `DB_PORT` | no | `5432` | Postgres port |
| `DB_NAME` | no | `project-dev-db` | Database name |
| `DB_USER` | no | `postgres` | DB user |
| `DB_PASSWORD` | no | `postgres` | DB password; a podman secret in containers |
| `PORT` | no | `5000` | API listen port |

## Secrets

Secret values are stored as **podman secrets**, never committed:

- Templates `podman/secrets.{dev,prod}.example.yaml`; real `secrets.{dev,prod}.yaml` are gitignored.
- Each secret (`project-dev-secrets` / `project-prod-secrets`) has keys `db-password` and `secret-key-base`.
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

### API (Minitest)

- Tests live in `api/test/`. Run with `cd api && bundle exec rails test`.
- Controller/request tests subclass `ActionDispatch::IntegrationTest` (see `test/controllers/health_controller_test.rb`).
- Tests need a reachable Postgres (the dev pod's, or a local instance) for the test database.

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
- ❌ **Re-add auth blindly.** This template is intentionally auth-free; add auth deliberately when a project requires it.
