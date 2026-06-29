# Podman Configuration

Pod definitions for the development and production environments.

## Quick Start

```bash
# Start the dev pod
podman play kube infra/podman/project-dev.yaml

# Stop
podman pod stop project-dev-pod

# Delete (containers + pod, keep DB volume)
podman pod rm -f project-dev-pod

# Delete pod and wipe database (full reset)
podman pod rm -f project-dev-pod && podman volume rm project-dev-db-data-claim
```

## Containers in each pod

| Container | Image | Dev port | Prod port | Purpose |
|-----------|-------|----------|-----------|---------|
| `postgres-db` | `postgres:latest` | 5432 | 5432 | Database |
| `flask-api` | `python:3.11-slim` | 5000 | 5000 (gunicorn) | REST API |
| `react-frontend` | `node:20-alpine` | 3000 (vite dev) | 80 (built + `serve`) | Web UI |
| `cloudflared` | `cloudflare/cloudflared` | — | — | Public tunnel |

The dev pod uses normal port mappings; the prod pod uses `hostNetwork: true`
(common in single-host deployments behind a tunnel).

## Default Credentials

> Placeholders only -- change them before any non-local deployment.

### Database (dev)
- **Host:** localhost (`5432`)
- **User:** `postgres`
- **Password:** `postgres`
- **Database:** `project-dev-db`

### Application admin (seeded by `002-seed.sql`)
- **Username:** `admin`
- **Password:** `admin`

## Required Configuration Before First Run

1. **Update host paths** in both pod YAMLs. Search for `PROJECT_NAME` and
   replace with your absolute path:
   - Windows WSL: `/mnt/c/MyProject/...`
   - Linux: `/home/me/MyProject/...`
   - macOS: `/Users/me/MyProject/...`
2. **Set strong secrets** in `project-prod.yaml` (search for `CHANGE-ME`):
   - `POSTGRES_PASSWORD` (and matching `DB_PASSWORD`)
   - `SECRET_KEY` (Flask session secret)
   - `JWT_SECRET_KEY` (JWT signing secret)

   Generate strong values with:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
3. **Configure Cloudflare Tunnel** -- see `infra/cloudflared/`. Create the
   tunnel, drop credentials into `creds/`, and set the `<TUNNEL_UUID>`
   placeholder in `config.yml` and `config.prod.yml`.

## Adding a New Service

1. Add a container definition under `spec.containers` in the relevant pod YAML.
2. Add any new `volumes` entries it needs.
3. Update this README with the service info.
4. Optionally add commands to `tools/cli/commands/` for the new service.
