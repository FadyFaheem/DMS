# Web Template

A full-stack web application template featuring a React frontend, Rails API, PostgreSQL database, and Cloudflare Tunnel — all orchestrated via Podman pods. Designed to be cloned, renamed, and customized for new projects.

> **No authentication.** This template ships without auth or roles. Add your own when a project needs it.

## What's Included

- **Frontend:** React 19 + Vite 8 + TypeScript + MUI 7 + React Router 7
  - Configurable app shell with sidebar navigation (`AppLayout`)
  - Slim `fetch` API client (`api/client.ts`)
  - Vitest + Testing Library
- **API:** Ruby 3.3 + Rails 8 (API-only)
  - `GET /health` skeleton, ready for your first resource
  - ActiveRecord + PostgreSQL (no models yet)
  - Puma web server
- **Database:** PostgreSQL, schema managed by ActiveRecord migrations
- **Infra:** Podman pod definitions for dev and prod, Cloudflare Tunnel ingress, podman-secret-based config
- **Tooling:** Interactive `cmds` CLI (fzf-driven) for pods, database, API, secrets, tunnel, and tests

## Quick Start

```bash
# 1. Clone or copy this template to your new project directory

# 2. Update placeholder paths in podman manifests (see SETUP.md)

# 3. Create + load the dev secrets, then start the development pod
cp podman/secrets.dev.example.yaml podman/secrets.dev.yaml   # then edit values
podman play kube podman/secrets.dev.yaml
podman play kube podman/project-dev.yaml

# 4. Install fzf and add the cmds alias to your shell
alias cmds='bash tools/cli/cmds.sh'

# 5. Use the developer commands
cmds
```

Frontend will be available on `http://localhost:3000`, API on `http://localhost:5000`.

## Project Structure

```
.
├── api/                     # Ruby on Rails API-only app
│   ├── app/controllers/     # health_controller.rb (+ your controllers)
│   ├── config/              # routes.rb, database.yml, environments/
│   ├── db/                  # ActiveRecord migrations + seeds (none yet)
│   ├── test/                # Minitest
│   └── Gemfile
├── frontend/                # React + Vite + TypeScript SPA
│   ├── src/
│   │   ├── api/             # Typed API client (client.ts)
│   │   ├── components/      # Shared components (AppLayout)
│   │   ├── hooks/           # Custom hooks (useIsMobile)
│   │   ├── pages/           # Route-level page components
│   │   ├── theme/           # MUI theme
│   │   ├── __tests__/       # Vitest unit tests
│   │   └── test/            # Vitest setup
│   ├── package.json
│   └── vite.config.ts
├── podman/                  # Pod definitions (dev + prod) + secret templates
├── cloudflared/             # Tunnel configs (creds gitignored)
├── tools/
│   └── cli/                 # fzf-based developer command runner
├── CLAUDE.md                # AI assistant / new dev guide
├── README.md               # This file
└── SETUP.md                # Step-by-step setup guide
```

## Services

| Service | Dev Port | Prod Port | Purpose |
|---------|----------|-----------|---------|
| PostgreSQL | 5432 | 5432 | Database |
| Rails API | 5000 | 5000 | REST API |
| Vite (frontend) | 3000 | 80 | Web UI |
| Cloudflared | — | — | Public ingress tunnel |

## Public URLs (Cloudflare Tunnel)

| Environment | Hostname | Tunnel |
|-------------|----------|--------|
| Dev | `dms-dev.faheemlabs.com` | `dms-dev` |
| Prod | `dms.faheemlabs.com` | `dms-prod` |

## Secrets

Secrets are managed as podman secrets and never committed:

- Copy `podman/secrets.{dev,prod}.example.yaml` to `secrets.{dev,prod}.yaml` (gitignored) and fill in values.
- Load them with `cmds secrets` (or `podman play kube podman/secrets.dev.yaml`) **before** starting a pod.
- Tunnel credentials live in `cloudflared/creds/` (gitignored).

## Default Credentials

> **Change these before any non-local use.** They are placeholders only.

**Database (dev):** `postgres` / `postgres` on `project-dev-db` (password supplied via the `project-dev-secrets` podman secret).

## Developer Commands

The `cmds` tool provides an interactive (fzf) menu for common operations:

- `cmds pods` — start, stop, rebuild, logs, exec into pod containers
- `cmds database` — psql shell, Rails migrations, backup/restore
- `cmds api` — API logs, health check, Rails console
- `cmds secrets` — create, load, list, and rotate podman secrets
- `cmds cf` — Cloudflare Tunnel setup, login, DNS routing
- `cmds test` — run Minitest (API) and vitest (frontend) suites

## Documentation

- **[SETUP.md](SETUP.md)** — step-by-step guide for setting up the template for a new project
- **[CLAUDE.md](CLAUDE.md)** — architectural conventions, coding patterns, and common workflows
- **[podman/README.md](podman/README.md)** — pod orchestration details

## Prerequisites

- [Podman](https://podman.io/) (with `play kube` support)
- [Ruby 3.3+](https://www.ruby-lang.org/) and [Rails 8](https://rubyonrails.org/) (for local API work)
- [Node 20+](https://nodejs.org/) (for the frontend)
- [fzf](https://github.com/junegunn/fzf) (for the `cmds` interactive runner)
- Bash shell (Git Bash on Windows, native on macOS/Linux)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) account (for the tunnel container)
