# CLAUDE.md

Architecture, conventions, and workflows for AI assistants and human contributors working in this template. **Read this before making changes** -- following the established patterns keeps the template coherent and reduces the chance of accidental breakage.

## Project Overview

A full-stack web application template:

- **React + Vite + MUI** frontend SPA with JWT auth
- **Flask** REST API with JWT, role + permission gating, and auto-applied SQL migrations
- **PostgreSQL** with numbered, idempotent migration files
- **Podman pods** for both dev and prod (Postgres + Flask + Vite/static + Cloudflare Tunnel)
- **fzf-based CLI** (`cmds`) for common dev workflows

The template is **single-tenant** by design. Multi-tenant (per-tenant schema)
patterns exist in MWMS and can be added per-project if needed.

## Stack Summary

| Layer | Choice | Version |
|-------|--------|---------|
| Frontend framework | React | 19 |
| Build tool | Vite | 8 |
| Language | TypeScript (strict) | ~5.9 |
| UI library | MUI (Material) | 7 |
| Routing | React Router DOM | 7 |
| Frontend state | React Context + `localStorage` | — |
| Frontend tests | Vitest + Testing Library + jsdom | 4 |
| Backend language | Python | 3.11 |
| Backend framework | Flask | 3 |
| DB driver | psycopg2 (threaded pool) | 2.9 |
| Database | PostgreSQL | latest |
| Password hashing | argon2-cffi | 25 |
| JWT | PyJWT (HS256) | 2.10 |
| Backend tests | pytest | 8 |
| Container orchestration | Podman (`play kube`) | — |
| Public ingress | Cloudflare Tunnel | — |
| Prod WSGI | gunicorn | 21 |

## Project Structure

```
.
├── frontend/                        React + Vite SPA
│   ├── src/
│   │   ├── api/                     Typed API client modules (one per domain)
│   │   │   ├── client.ts            apiFetch / apiJson with auth + 401 refresh
│   │   │   └── auth.ts              Login, logout, me, change-password
│   │   ├── components/
│   │   │   ├── AppLayout.tsx        Top bar + sidebar shell; SECTIONS config
│   │   │   └── ProtectedRoute.tsx   Route guard: auth, admin, permission
│   │   ├── context/
│   │   │   └── AuthContext.tsx      User state, login/logout, hasPerm()
│   │   ├── hooks/
│   │   │   └── useIsMobile.ts       MUI breakpoint hook
│   │   ├── pages/                   Route-level page components
│   │   ├── theme/theme.ts           MUI theme + brand colors
│   │   ├── utils/dateFormat.ts      UTC-aware date formatters
│   │   ├── __tests__/               Vitest tests (mirrors src/ layout)
│   │   ├── test/setup.ts            Vitest globals (mocks fetch + localStorage)
│   │   ├── App.tsx                  Router + provider tree
│   │   ├── main.tsx                 React entry
│   │   └── index.css                Box-sizing + viewport reset only
│   ├── package.json
│   ├── vite.config.ts               Dev proxy /api -> :5000, file polling
│   ├── vitest.config.ts
│   ├── tsconfig.{json,app,node}.json
│   └── eslint.config.js
├── infra/
│   ├── api/                         Flask REST API
│   │   ├── app.py                   App factory, UTCJSONProvider, blueprint registry
│   │   ├── db.py                    Pool, query/execute/transaction, run_migrations()
│   │   ├── middleware.py            @require_auth, @require_admin, @require_permission
│   │   ├── auth.py                  /api/auth/login, /refresh, /me, etc.
│   │   ├── helpers.py               parse_pagination()
│   │   ├── tests/                   Pytest with mocked DB (no live Postgres needed)
│   │   └── requirements.txt
│   ├── database/                    Numbered SQL migrations (NNN-name.sql)
│   │   ├── 000-init.sql             DB init mount; creates schema_migrations
│   │   ├── 001-schema.sql           users + roles tables
│   │   └── 002-seed.sql             Default admin user
│   ├── podman/
│   │   ├── project-dev.yaml         Pod: postgres + flask + vite + cloudflared
│   │   └── project-prod.yaml        Pod: postgres + gunicorn + built frontend + cloudflared
│   └── cloudflared/                 Tunnel configs (creds gitignored)
├── tools/cli/                       fzf-based command runner
│   ├── cmds.sh                      Entry: invoke as `cmds`
│   └── commands/                    *.fzf files: pods, database, api, cf, test
├── CLAUDE.md                        This file
├── README.md                        High-level docs
└── SETUP.md                         New-project bring-up guide
```

## Architecture Conventions

### Backend (Flask)

- **App factory.** `create_app()` in [infra/api/app.py](infra/api/app.py) builds the Flask app, registers `UTCJSONProvider`, registers blueprints, runs migrations. The module-level `app = create_app()` is what Gunicorn imports.
- **Blueprint per domain.** Each feature lives in its own module (`auth.py`, eventually `items.py`, `orders.py`, etc.). Each module declares a `*_bp = Blueprint('<name>', __name__, url_prefix='/api/<name>')` and is registered in `app.py`.
- **Decorator stack.** Standard order:
  ```python
  @bp.route('/endpoint', methods=['GET'])
  @require_auth                      # populates g.current_user
  @require_permission('feature.view')  # OR @require_admin
  def handler():
      ...
  ```
- **DB access via helpers**, not raw connections:
  - `query(sql, params)` -- SELECT, returns `list[RealDictRow]`
  - `query(sql, params, fetch_one=True)` -- returns single row or `None`
  - `execute(sql, params)` -- INSERT/UPDATE/DELETE without returning
  - `execute(sql, params, returning=True)` -- returns the row from `RETURNING ...`
  - `with transaction() as conn:` -- multi-statement transactions
- **UTC everywhere.** Datetimes are serialized with a `Z` suffix via `UTCJSONProvider`. When manually formatting, use `db.iso_utc(dt)`. The frontend's `dateFormat.ts` expects the `Z` suffix.
- **JWT payloads** include `sub` (user id as string), `username`, `role`, `is_admin`, `permissions`, `exp`, `iat`, `session_exp`.
- **Migrations** auto-apply on API startup. `db.run_migrations()` reads `MIGRATIONS_DIR` (default `/migrations` in containers), skips `000-*` files, and tracks applied versions in `schema_migrations`.

### Frontend (React)

- **Single API client.** All requests go through `apiFetch` / `apiJson` from [src/api/client.ts](frontend/src/api/client.ts). These:
  - attach `Authorization: Bearer <token>` from `localStorage`
  - automatically set `Content-Type: application/json` (unless body is `FormData`)
  - on a `401`, perform a single-flight refresh against `/api/auth/refresh` and retry the original request
  - redirect to `/login` if refresh fails
- **Auth state** lives in `AuthContext` -- not Redux, not Zustand. Tokens in `localStorage`. Use the `useAuth()` hook anywhere inside `<AuthProvider>`.
- **Route guards** use `<ProtectedRoute>`:
  ```tsx
  <Route path="admin" element={
    <ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>
  } />
  <Route path="items" element={
    <ProtectedRoute requirePerm="items.view"><ItemsPage /></ProtectedRoute>
  } />
  ```
- **App shell** is `AppLayout` -- top AppBar with section buttons, a contextual left sidebar with tabs from the current section. Navigation is **data-driven** by the `SECTIONS` constant at the top of [AppLayout.tsx](frontend/src/components/AppLayout.tsx); editing that array is the only way to add nav.
- **Styling** uses MUI's `sx` prop and theme. **Do not** hardcode colors -- reference `theme.palette.primary.main`, `'secondary.main'`, `'text.secondary'`, etc., so projects can rebrand by editing `theme/theme.ts` alone.
- **Responsive** breakpoints via MUI: `useIsMobile()` (md down). The theme automatically applies full-screen dialogs and compact table cells below `sm`.
- **Page components** can be large; the project tolerates long files in `pages/` (consistent with MWMS conventions) -- prefer clarity over premature splitting.

### Database

- **Numbered SQL files.** `NNN-short-name.sql`. Every migration writes itself to `schema_migrations` with `ON CONFLICT DO NOTHING`. Use `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... IF NOT EXISTS`, and `DO $$ ... $$` guards so migrations are re-runnable.
- **`000-init.sql`** runs only on first DB container startup (Postgres init mount). It is **skipped** by `db.run_migrations()`.
- **All other migrations** are applied by the API on each startup, in numeric order.

## Common Commands

| Action | Command |
|--------|---------|
| Interactive command picker | `cmds` |
| Scope picker (pods/database/api/cf/test) | `cmds pods`, `cmds test`, etc. |
| Start dev pod | `podman play kube infra/podman/project-dev.yaml` |
| Stop dev pod | `podman pod stop project-dev-pod` |
| Reset DB | `podman pod rm -f project-dev-pod && podman volume rm project-dev-db-data-claim` |
| API logs | `podman logs -f project-dev-pod-flask-api` |
| psql shell | `podman exec -it project-dev-pod-postgres-db psql -U postgres -d project-dev-db` |
| Run API tests | `cd infra/api && python -m pytest tests/ -v` |
| Run frontend tests | `cd frontend && npx vitest run` |
| Frontend dev (host-only, no pod) | `cd frontend && npm install && npm run dev` |
| API dev (host-only, no pod) | `cd infra/api && pip install -r requirements.txt && python app.py` |

## Adding a New Feature (Step-by-Step)

Suppose you want a `widgets` resource with view + edit permissions.

### 1. Database

Create [infra/database/003-widgets.sql](infra/database/) (next number):

```sql
INSERT INTO schema_migrations (version) VALUES ('003-widgets') ON CONFLICT (version) DO NOTHING;

CREATE TABLE IF NOT EXISTS widgets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_widgets_active ON widgets(is_active);

\echo '003-widgets completed'
```

Restart the API container -- migration runs automatically.

### 2. API blueprint

Create [infra/api/widgets.py](infra/api/):

```python
from flask import Blueprint, request, jsonify, g
from db import query, execute, iso_utc
from middleware import require_auth, require_permission
from helpers import parse_pagination

widgets_bp = Blueprint('widgets', __name__, url_prefix='/api/widgets')


def _widget_dto(row):
    return {
        'id': row['id'],
        'name': row['name'],
        'description': row['description'],
        'is_active': row['is_active'],
        'created_at': iso_utc(row['created_at']),
        'updated_at': iso_utc(row['updated_at']),
    }


@widgets_bp.route('', methods=['GET'])
@require_auth
@require_permission('widgets.view')
def list_widgets():
    page, per_page, offset = parse_pagination()
    rows = query(
        "SELECT * FROM widgets WHERE is_active = TRUE "
        "ORDER BY id DESC LIMIT %s OFFSET %s",
        (per_page, offset),
    )
    total = query(
        "SELECT COUNT(*) AS cnt FROM widgets WHERE is_active = TRUE",
        fetch_one=True,
    )['cnt']
    return jsonify(
        items=[_widget_dto(r) for r in rows],
        total=total, page=page, per_page=per_page,
    )


@widgets_bp.route('', methods=['POST'])
@require_auth
@require_permission('widgets.create')
def create_widget():
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Name is required'}), 400
    row = execute(
        "INSERT INTO widgets (name, description) VALUES (%s, %s) RETURNING *",
        (name, data.get('description')),
        returning=True,
    )
    return jsonify(_widget_dto(row)), 201
```

Register it in `app.py`:

```python
from widgets import widgets_bp
app.register_blueprint(widgets_bp)
```

### 3. Frontend API module

Create [frontend/src/api/widgets.ts](frontend/src/api/):

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

export interface ListWidgetsResponse {
  items: Widget[];
  total: number;
  page: number;
  per_page: number;
}

export function listWidgets(page = 1, per_page = 50): Promise<ListWidgetsResponse> {
  return apiJson(`/api/widgets?page=${page}&per_page=${per_page}`);
}

export function createWidget(data: { name: string; description?: string }): Promise<Widget> {
  return apiJson('/api/widgets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

### 4. Page component

Create [frontend/src/pages/WidgetsPage.tsx](frontend/src/pages/) using MUI components and the API module.

### 5. Register route

In `App.tsx`:

```tsx
<Route path="widgets" element={
  <ProtectedRoute requirePerm="widgets.view">
    <WidgetsPage />
  </ProtectedRoute>
} />
```

### 6. Add to navigation

In [AppLayout.tsx](frontend/src/components/AppLayout.tsx), edit `SECTIONS`:

```tsx
const SECTIONS: SectionDef[] = [
  // ...
  {
    label: 'Widgets',
    basePath: '/widgets',
    perm: 'widgets.view',
    tabs: [
      { label: 'List', path: '/widgets', perm: 'widgets.view' },
      { label: 'Create', path: '/widgets/create', perm: 'widgets.create' },
    ],
  },
];
```

### 7. Grant the permission

The seeded `admin` user gets `is_admin = TRUE` and bypasses all checks. To grant
`widgets.view` to a regular user, update their `permissions` JSONB:

```sql
UPDATE users SET permissions = permissions || '{"widgets.view": true}'::jsonb
WHERE username = 'alice';
```

### 8. Tests

Add `infra/api/tests/test_widgets.py` mirroring `test_auth.py` patterns. Add
`frontend/src/__tests__/api/widgets.test.ts` mirroring `client.test.ts`.

## Environment Variables

Required by the API at runtime:

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `SECRET_KEY` | yes (prod) | dev default in `app.py` | Flask session secret |
| `JWT_SECRET_KEY` | yes (prod) | dev default in `app.py` | JWT signing secret |
| `DB_HOST` | yes | — | Postgres host |
| `DB_PORT` | no | `5432` | Postgres port |
| `DB_NAME` | yes | — | Database name |
| `DB_USER` | yes | — | DB user |
| `DB_PASSWORD` | yes | — | DB password |
| `PORT` | no | `5000` | API listen port |
| `FLASK_ENV` | no | `development` | `production` disables debug + secure cookies |
| `MIGRATIONS_DIR` | no | `/migrations` | Where `run_migrations()` looks for `*.sql` |
| `JWT_ACCESS_EXPIRY` | no | `15` (minutes) | Access token lifetime |
| `JWT_REFRESH_EXPIRY` | no | `7` (days) | Refresh token lifetime |
| `SESSION_MAX_DAYS` | no | `30` | Hard cap on total session length |

The API loads `.env` from its working directory via `python-dotenv`, so you can
drop a `.env` file in `infra/api/` for local non-Podman dev.

## Testing Conventions

### API (pytest)

- All tests live in `infra/api/tests/`
- `conftest.py` provides:
  - `client` -- Flask test client
  - `auth_headers` -- admin JWT
  - `user_auth_headers` -- non-admin JWT with no permissions
  - `mock_db` -- patches `db.query`, `db.execute`, `db.get_db_connection`
  - `_make_jwt({...})` helper to build custom JWTs
- DB calls are **always mocked** -- no live Postgres needed for unit tests
- Tests run with `cd infra/api && python -m pytest tests/ -v`
- Use `with patch('module.query')` to control what data the route sees:
  ```python
  with patch('auth.query') as mq:
      mq.return_value = SAMPLE_USER
      resp = client.get('/api/auth/me', headers=auth_headers)
  ```

### Frontend (Vitest + Testing Library)

- All tests in `frontend/src/__tests__/`, named `*.test.{ts,tsx}`
- `src/test/setup.ts` mocks `fetch` and `localStorage` globally
- jsdom environment; `globals: true` (no need to import `describe`, `it`, `expect`)
- Mock fetch with `vi.mocked(fetch).mockResolvedValue(new Response(...))`
- For component tests, render with `render(<Component />)`, query with Testing Library's `screen.getByRole`, `findByText`, etc.
- Tests run with `cd frontend && npx vitest run`

## Do NOT

- ❌ **Hardcode SQL with string concatenation.** Always use parameterized queries: `query("SELECT * FROM x WHERE id = %s", (some_id,))`. Never `f"... WHERE id = {some_id}"`.
- ❌ **Hardcode colors in components.** Use MUI's theme: `sx={{ color: 'primary.main' }}`, not `sx={{ color: '#1976d2' }}`.
- ❌ **Skip the `Z` suffix on UTC datetimes.** Use `iso_utc()` on the backend; serve datetimes as `2026-01-15T10:30:00Z`. The frontend depends on this.
- ❌ **Call `fetch` directly from components.** Always go through `apiFetch` / `apiJson` so auth headers and 401 refresh work.
- ❌ **Put business logic in route handlers.** Extract to helper functions or domain modules. Routes should be thin: validate input, call helper, format response.
- ❌ **Import `db.g` at module level in non-Flask modules.** Wrap with `try: from flask import g` / `except ImportError: g = None` if needed in shared utilities.
- ❌ **Bypass `ProtectedRoute`.** Even admin-only pages should use `<ProtectedRoute requireAdmin>` -- never check `useAuth().isAdmin` inline as the only gate.
- ❌ **Edit migrations that have already been applied.** Add a new numbered migration to alter / drop / re-add things.
- ❌ **Commit secrets.** Never check in real `SECRET_KEY`, `JWT_SECRET_KEY`, database passwords, or `infra/cloudflared/creds/*.json` files. All these have placeholder values + gitignore rules.
- ❌ **Add MWMS-specific features blindly.** Multi-tenancy (`X-Contract-Id`, `contract_schema.py`), 2FA, audit logs, and document generation live in MWMS but are intentionally excluded from this template. Add them per-project only when needed.

## Optional Add-Ons (Patterns from MWMS, Not Yet in Template)

If a project needs any of these, they are well-tested in MWMS and can be ported:

- **2FA / TOTP** -- `pyotp`, `/2fa/setup`, `/2fa/verify`, backup codes
- **Account lockout** -- track `failed_login_attempts`, `locked_until` columns
- **Rate limiting** -- in-memory or Redis-backed bucket per IP
- **Audit logging** -- a global `log_audit('user', user_id, 'action', before={...}, after={...})` helper
- **CSV/XLSX import** -- generic `CsvImportPanel<T>` component + backend `file_utils.parse_upload`
- **Multi-tenancy** -- schema-per-tenant, `X-Contract-Id` header middleware
- **PDF generation** -- ReportLab + barcode/QR generation
- **Reports / dashboards** -- visibility model (global/shared/private), widget renderer
