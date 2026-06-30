# Template Setup Guide

Step-by-step guide for adapting this template for a new project.

## Step 1: Copy or clone the template

```bash
git clone <this-repo-url> my-new-project
cd my-new-project
rm -rf .git && git init   # start fresh history
```

Or just copy the folder.

## Step 2: Search and replace project name (optional but recommended)

Replace `project` with your project name in:

- `podman/dpm-dev.yaml` → `myproject-dev-pod`, `myproject-dev-db`, etc.
- `podman/dpm-prod.yaml` → `myproject-prod-pod`, `myproject-prod-db`, etc.
- `podman/secrets.*.example.yaml` → the secret `metadata.name` (`myproject-dev-secrets`)
- `tools/cli/commands/*.fzf` → references to `dpm-dev-pod`, `dpm-dev-db`
- `api/app/controllers/health_controller.rb` → the `service` field in `/health`
- `frontend/src/components/AppLayout.tsx` → `APP_NAME` constant
- `frontend/index.html` → `<title>`

## Step 3: Update Podman host paths

Both pod YAMLs use `PROJECT_NAME` placeholders in `hostPath` volumes. Replace
with the absolute path to your project:

**`podman/dpm-dev.yaml`** — 3 occurrences (api, frontend, cloudflared):

```yaml
# Windows WSL
path: /mnt/c/Users/you/path/to/MyProject/api
# Linux
path: /home/you/MyProject/api
# macOS
path: /Users/you/MyProject/api
```

**`podman/dpm-prod.yaml`** — 3 occurrences (production host paths).

## Step 4: Create and load secrets

Secrets are podman secrets, kept out of git. For each environment:

```bash
cp podman/secrets.dev.example.yaml podman/secrets.dev.yaml
# edit secrets.dev.yaml: set db-password and secret-key-base
# generate a strong key:
openssl rand -hex 64
# load it into podman (run BEFORE starting the pod):
podman play kube podman/secrets.dev.yaml
```

Repeat with `secrets.prod.example.yaml` for production (use strong values).
`cmds secrets` wraps all of this (init / generate / load / list / rotate).

## Step 5: Set up Cloudflare Tunnel (optional)

Skip this if you don't need a public URL. This template is pre-wired to
`dms-dev.faheemlabs.com` (tunnel `dms-dev`) and `dms.faheemlabs.com`
(tunnel `dms-prod`); change the names/hostnames for your own project.

```bash
# Authenticate (opens a browser)
cloudflared tunnel login

# Create tunnels
cloudflared tunnel create myproject-dev
cloudflared tunnel create myproject-prod

# Copy each tunnel's <UUID>.json from ~/.cloudflared into cloudflared/creds/ (gitignored)
```

Then set the real `tunnel:` UUID and `credentials-file` plus your hostnames in
`cloudflared/config.yml` (dev) and `cloudflared/config.prod.yml` (prod), and
point DNS:

```bash
cloudflared tunnel route dns myproject-dev dev-myproject.example.com
cloudflared tunnel route dns myproject-prod myproject.example.com
```

Add any dev tunnel hostname to `ALLOWED_HOSTS` in `frontend/vite.config.ts` and
to `config.hosts` in `api/config/environments/development.rb`, so Vite and Rails
accept requests forwarded by the tunnel.

## Step 6: Set up the developer CLI

Add to your `~/.bashrc`:

```bash
alias cmds='bash tools/cli/cmds.sh'
```

Reload: `source ~/.bashrc`. Make sure `fzf` is installed (see your package manager).

## Step 7: Start the dev environment

```bash
# Pre-pull images (one-time, fixes intermittent TLS issues)
cmds pods      # pick "Pre-pull required images"

# Load dev secrets (one-time, before first start)
cmds secrets   # pick "Load dev secrets into podman"

# Start the pod
cmds pods      # pick "Start dpm-dev pod"
```

Or directly:

```bash
podman play kube podman/secrets.dev.yaml
podman play kube podman/dpm-dev.yaml
```

Open <http://localhost:3000> in your browser. The app loads straight to the
dashboard (there is no login).

## Step 8: Customize

- **Database schema:** generate migrations in `api/` (`rails generate migration ...`) — see [CLAUDE.md](CLAUDE.md)
- **API endpoints:** add controllers + routes in `api/` — see [CLAUDE.md](CLAUDE.md)
- **Frontend routes:** add pages in `frontend/src/pages/`, register in `frontend/src/App.tsx`
- **Navigation:** edit the `SECTIONS` constant in `frontend/src/components/AppLayout.tsx`
- **Theme:** edit `frontend/src/theme/theme.ts` (brand colors at the top)

## Troubleshooting

### Pod won't start
- Check Podman is installed: `podman --version`
- Ensure secrets are loaded: `podman secret ls` (the pod references them via `secretKeyRef`)
- Verify all host paths in `dpm-dev.yaml` exist
- Check logs: `podman logs dpm-dev-pod-postgres-db`
- TLS issues pulling images: `cmds pods` → "Fix TLS certificate issues"

### "cmds: command not found"
- Run `source ~/.bashrc` after adding the alias
- Ensure `cmds.sh` is executable: `chmod +x tools/cli/cmds.sh`
- Run from the repo root, or use the full path

### Database connection issues
- Verify container is running: `podman ps`
- Check status: `podman exec -it dpm-dev-pod-postgres-db pg_isready -U postgres`
- Reset the DB volume: `cmds pods` → "Rebuild dev pod with database reset"

### Frontend errors about missing `node_modules`
- The `react-frontend` container runs `npm install` on every start
- Check its logs: `podman logs dpm-dev-pod-react-frontend`

### Rails API container keeps restarting
- It runs `bundle install` on each start; check logs: `podman logs dpm-dev-pod-rails-api`
- Ensure the `dpm-dev-secrets` podman secret is loaded (it provides `SECRET_KEY_BASE`)
