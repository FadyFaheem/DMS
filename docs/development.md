# Development

> Get a stack running, drive it with `cmds`, test it, and fix it when it sulks.

[← Deployment](deployment.md) &middot; [Handbook](README.md)

## Prerequisites

| Tool | For |
|------|-----|
| [Podman](https://podman.io/) (with `play kube`) | Running the whole stack |
| [fzf](https://github.com/junegunn/fzf) | The `cmds` command runner |
| Bash | `cmds` (Git Bash on Windows, native elsewhere) |
| [Ruby 3.3](https://www.ruby-lang.org/) + Bundler | Running the API on the host (optional) |
| [Node 20+](https://nodejs.org/) | Running the frontend on the host (optional) |

With Podman you don't strictly need Ruby/Node locally — the containers carry them. They're listed for the host-only workflow below.

## Quick start (the pod way)

```bash
# 1. Secrets — copy the template, set values, load into Podman (once)
cp podman/secrets.dev.example.yaml podman/secrets.dev.yaml
podman play kube podman/secrets.dev.yaml

# 2. Start the whole stack
podman play kube podman/dpm-dev.yaml
```

Open **http://localhost:3000**. The first boot installs gems and npm packages and runs `db:prepare`, so give it a minute; watch progress with `podman logs -f dpm-dev-pod-rails-api`. Full pod details: [Deployment](deployment.md).

## The `cmds` CLI

A tiny fzf menu over every routine task, defined in [`tools/cli/`](../tools/cli). Add the alias once:

```bash
alias cmds='bash tools/cli/cmds.sh'   # add to ~/.bashrc
```

Run `cmds` for an interactive picker, or jump straight to a scope:

| Scope | What's in it |
|-------|--------------|
| `cmds pods` | start / stop / rebuild / reset-with-DB, logs, container shells, pre-pull images, fix TLS |
| `cmds database` | `psql` shell, migrate / prepare / seed, generate migration, backup / restore |
| `cmds api` | API logs, health curl, restart, Rails console |
| `cmds secrets` | copy templates, generate key, load / list / rotate secrets |
| `cmds cf` | Cloudflare tunnel login / create / route / info / logs |
| `cmds test` | run RSpec / Vitest (all, watch, coverage, single file), install deps |
| `cmds lint` | RuboCop, ESLint, Prettier (check & fix) |

Each menu entry is just a labelled shell command in a `*.fzf` file, so it's easy to read or extend. A few high-value ones:

```bash
# Rails console inside the running pod
podman exec -w /app -it dpm-dev-pod-rails-api bundle exec rails console

# psql into the dev database
podman exec -it dpm-dev-pod-postgres-db psql -U postgres -d dpm-dev-db

# Full reset (drops the database volume)
podman pod rm -f dpm-dev-pod && podman volume rm dpm-dev-db-data-claim
```

## Running on the host (without Podman)

You can run either half directly against a Postgres you provide (e.g. the dev pod's, on `localhost:5432`):

```bash
# API on :5000
cd api && bundle install && bundle exec rails db:prepare && bundle exec rails s -p 5000

# Frontend on :3000 (proxies /api → :5000)
cd frontend && npm install && npm run dev
```

The API reads its database connection from `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD` (defaults suit the dev pod). To speed up the simulation while testing, set `GAME_DAY_REAL_MINUTES=1`. See the env table below.

## Testing

| Suite | Command | Notes |
|-------|---------|-------|
| API (RSpec) | `cd api && bundle exec rspec` | Models, services, requests. Needs a reachable Postgres for the test DB. |
| Frontend (Vitest) | `cd frontend && npx vitest run` | jsdom; `fetch` and `localStorage` are stubbed globally. |

Or via the menu: `cmds test`. Service specs inject a **fixed clock and seeded RNG** so the simulation is fully deterministic — when you add simulation logic, follow that pattern (accept `now:`/`rng:` arguments) so it stays testable. Conventions: [Backend → Testing](backend.md#testing) and [Frontend → Tests](frontend.md#tests).

## Linting & formatting

```bash
cd api && bundle exec rubocop          # Ruby (omakase); -A to autofix
cd frontend && npm run lint            # ESLint
cd frontend && npm run format          # Prettier (format:check to verify)
```

`cmds lint` runs them together. Commit style follows [Conventional Commits](../.cursor/rules/conventional-commits.mdc); the broader contributor rules are in [`CLAUDE.md`](../CLAUDE.md).

## Environment variables (API)

| Variable | Default | Purpose |
|----------|---------|---------|
| `GAME_DAY_REAL_MINUTES` | `60` | Real minutes per game-day (set low to accelerate). |
| `RAILS_ENV` | `development` | `production` in the prod pod. |
| `SECRET_KEY_BASE` | dev value | Required in production (a Podman secret). |
| `DB_HOST` / `DB_PORT` | `localhost` / `5432` | Postgres location. |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `dpm-dev-db` / `postgres` / `postgres` | Postgres credentials. |
| `PORT` | `5000` | API listen port. |
| `RAILS_MAX_THREADS` | `5` (dev) / `3` (puma default) | Puma threads / DB pool. |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Pod won't start | `podman --version`; confirm secrets are loaded (`podman secret ls`); check `podman logs dpm-dev-pod-postgres-db`. |
| TLS errors pulling images | `cmds pods` → "Fix TLS certificate issues", then pre-pull. |
| `cmds: command not found` | `source ~/.bashrc` after adding the alias; run from the repo root. |
| DB connection refused | `podman ps`; `podman exec -it dpm-dev-pod-postgres-db pg_isready -U postgres`. |
| Frontend missing `node_modules` | The container runs `npm install` each start; check `podman logs dpm-dev-pod-react-frontend`. |
| API keeps restarting | It runs `bundle install` on start; check `podman logs dpm-dev-pod-rails-api` and that `dpm-dev-secrets` is loaded. |
| Stuck/corrupt database | Full reset: `podman pod rm -f dpm-dev-pod && podman volume rm dpm-dev-db-data-claim`, then start again. |

---

That's the whole tour. Back to the [handbook](README.md), or out to the [game](../README.md).
