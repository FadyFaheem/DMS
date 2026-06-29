# Podman Configuration

Pod definitions for the development and production environments.

## Quick Start

```bash
# Load secrets first (one-time, before the first start)
podman play kube podman/secrets.dev.yaml

# Start the dev pod
podman play kube podman/project-dev.yaml

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
| `rails-api` | `ruby:3.3` | 5000 | 5000 | REST API (Rails + Puma) |
| `react-frontend` | `node:20-alpine` | 3000 (vite dev) | 80 (built + `serve`) | Web UI |
| `cloudflared` | `cloudflare/cloudflared` | — | — | Public tunnel |

The dev pod uses normal port mappings; the prod pod uses `hostNetwork: true`
(common in single-host deployments behind a tunnel). The API container installs
gems on each start (`bundle install`), mirroring the previous pip-on-start flow.

## Secrets

Secret values (`POSTGRES_PASSWORD`, `DB_PASSWORD`, `SECRET_KEY_BASE`) are **not**
in the pod YAMLs — they are pulled from podman secrets via `secretKeyRef`:

- `project-dev-secrets` / `project-prod-secrets`, each with keys `db-password` and `secret-key-base`.
- Defined in `podman/secrets.{dev,prod}.yaml` (gitignored; copy from `*.example.yaml`).
- Load them before starting a pod: `podman play kube podman/secrets.dev.yaml` (or `cmds secrets`).
- podman secrets are immutable: to rotate, `podman secret rm <name>`, re-load, then restart the pod.

## Default Credentials

> Placeholders only -- change them before any non-local deployment.

### Database (dev)
- **Host:** localhost (`5432`)
- **User:** `postgres`
- **Password:** `postgres` (from the `project-dev-secrets` secret)
- **Database:** `project-dev-db`

## Required Configuration Before First Run

1. **Update host paths** in both pod YAMLs. Search for `PROJECT_NAME` and
   replace with your absolute path:
   - Windows WSL: `/mnt/c/MyProject/...`
   - Linux: `/home/me/MyProject/...`
   - macOS: `/Users/me/MyProject/...`
2. **Create and load secrets** (see Secrets above). For prod, generate strong
   values, e.g. `openssl rand -hex 64`.
3. **Configure Cloudflare Tunnel** -- see `cloudflared/`. Create the tunnel,
   drop credentials into `creds/`, and set the tunnel UUID + hostnames in
   `config.yml` and `config.prod.yml`.

## Adding a New Service

1. Add a container definition under `spec.containers` in the relevant pod YAML.
2. Add any new `volumes` entries it needs.
3. Update this README with the service info.
4. Optionally add commands to `tools/cli/commands/` for the new service.
