# Web Template

A full-stack web application template featuring a React frontend, Flask API, PostgreSQL database, and Cloudflare Tunnel — all orchestrated via Podman pods. Designed to be cloned, renamed, and customized for new projects.

## What's Included

- **Frontend:** React 19 + Vite 8 + TypeScript + MUI 7 + React Router 7
  - JWT-based auth with single-flight token refresh
  - Permission-gated route guards (`ProtectedRoute`)
  - Configurable app shell with sidebar navigation (`AppLayout`)
  - Vitest + Testing Library
- **API:** Python 3.11 + Flask 3 + psycopg2
  - Application factory pattern with blueprint-per-domain
  - `@require_auth` / `@require_permission` decorator stack
  - Connection-pooled DB helpers (`query`, `execute`, `transaction`)
  - Auto-applied SQL migrations on startup
  - UTC-by-default datetime serialization
- **Database:** PostgreSQL with numbered SQL migrations and tracking table
- **Infra:** Podman pod definitions for dev and prod, Cloudflare Tunnel ingress
- **Tooling:** Interactive `cmds` CLI (fzf-driven) for pods, database, API, tunnel, and tests

## Quick Start

```bash
# 1. Clone or copy this template to your new project directory

# 2. Update placeholder paths in podman manifests (see SETUP.md)

# 3. Start the development pod
podman play kube infra/podman/project-dev.yaml

# 4. Install fzf and add the cmds alias to your shell
alias cmds='bash tools/cli/cmds.sh'

# 5. Use the developer commands
cmds
```

Frontend will be available on `http://localhost:3000`, API on `http://localhost:5000`.

## Project Structure

```
Web-Template/
├── frontend/                # React + Vite + TypeScript SPA
│   ├── src/
│   │   ├── api/             # Typed API client modules
│   │   ├── components/      # Shared components (AppLayout, ProtectedRoute)
│   │   ├── context/         # React Context (AuthContext)
│   │   ├── hooks/           # Custom hooks (useIsMobile)
│   │   ├── pages/           # Route-level page components
│   │   ├── theme/           # MUI theme
│   │   ├── utils/           # Helper utilities
│   │   ├── __tests__/       # Vitest unit tests
│   │   └── test/            # Vitest setup
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   └── tsconfig.json
├── infra/
│   ├── api/                 # Flask REST API
│   │   ├── app.py           # Application factory + entry point
│   │   ├── db.py            # Connection pool + migrations
│   │   ├── middleware.py    # Auth decorators
│   │   ├── auth.py          # Auth blueprint (login/refresh/logout/me)
│   │   ├── helpers.py       # Shared request helpers
│   │   ├── tests/           # Pytest suite
│   │   └── requirements.txt
│   ├── database/            # Numbered SQL migrations
│   ├── podman/              # Pod definitions (dev + prod)
│   └── cloudflared/         # Tunnel configs (creds gitignored)
├── tools/
│   └── cli/                 # fzf-based developer command runner
│       ├── cmds.sh
│       └── commands/        # *.fzf command lists
├── CLAUDE.md                # AI assistant / new dev guide
├── README.md                # This file
└── SETUP.md                 # Step-by-step setup guide
```

## Services

| Service | Dev Port | Prod Port | Purpose |
|---------|----------|-----------|---------|
| PostgreSQL | 5432 | 5432 | Database |
| Flask API | 5000 | 5000 | REST API |
| Vite (frontend) | 3000 | 80 | Web UI |
| Cloudflared | — | — | Public ingress tunnel |

## Default Credentials

> **Change these before any non-local use.** They are placeholders only.

**Database (dev):** `postgres` / `postgres` on `project-dev-db`

**Application admin (seeded):** see `infra/database/002-seed.sql`

## Developer Commands

The `cmds` tool provides an interactive (fzf) menu for common operations:

- `cmds pods` — start, stop, rebuild, logs, exec into pod containers
- `cmds database` — psql shell, migration status, backup/restore
- `cmds api` — API logs, health check, restart
- `cmds cf` — Cloudflare Tunnel setup, login, DNS routing
- `cmds test` — run pytest (API) and vitest (frontend) suites

## Documentation

- **[SETUP.md](SETUP.md)** — step-by-step guide for setting up the template for a new project
- **[CLAUDE.md](CLAUDE.md)** — architectural conventions, coding patterns, and common workflows (for AI assistants and new contributors)
- **[infra/database/README.md](infra/database/README.md)** — migration conventions
- **[infra/podman/README.md](infra/podman/README.md)** — pod orchestration details

## Prerequisites

- [Podman](https://podman.io/) (with `podman-compose` or `play kube` support)
- [fzf](https://github.com/junegunn/fzf) (for the `cmds` interactive runner)
- Bash shell (Git Bash on Windows, native on macOS/Linux)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) account (for the tunnel container)
