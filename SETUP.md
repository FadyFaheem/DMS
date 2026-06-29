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

- `infra/podman/project-dev.yaml` → `myproject-dev-pod`, `myproject-dev-db`, etc.
- `infra/podman/project-prod.yaml` → `myproject-prod-pod`, `myproject-prod-db`, etc.
- `tools/cli/commands/*.fzf` → references to `project-dev-pod`, `project-dev-db`
- `infra/api/app.py` → the `service` field in `/health`
- `frontend/src/components/AppLayout.tsx` → `APP_NAME` constant
- `frontend/src/pages/LoginPage.tsx` → "Web Template" subtitle
- `frontend/index.html` → `<title>`

## Step 3: Update Podman host paths

Both pod YAMLs use `PROJECT_NAME` placeholders in `hostPath` volumes. Replace
with the absolute path to your project:

**`infra/podman/project-dev.yaml`** -- 4 occurrences:

```yaml
# Windows WSL
path: /mnt/c/Users/you/path/to/MyProject/infra/database
# Linux
path: /home/you/MyProject/infra/database
# macOS
path: /Users/you/MyProject/infra/database
```

**`infra/podman/project-prod.yaml`** -- 4 occurrences (production host paths).

## Step 4: Generate strong secrets (required for prod)

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

In `infra/podman/project-prod.yaml`, replace these placeholders:

- `CHANGE-ME-postgres-password` (in TWO places: `POSTGRES_PASSWORD` and `DB_PASSWORD`)
- `CHANGE-ME-flask-secret` (`SECRET_KEY`)
- `CHANGE-ME-jwt-secret` (`JWT_SECRET_KEY`)

Dev pod values can stay as defaults for local-only development.

## Step 5: Set up Cloudflare Tunnel (optional)

Skip this if you don't need a public URL.

```bash
# Authenticate (opens a browser)
cloudflared tunnel login

# Create tunnels
cloudflared tunnel create project-dev
cloudflared tunnel create project-prod

# Place credentials in infra/cloudflared/creds/ (already gitignored)
```

Then update the `<TUNNEL_UUID>` placeholders in
`infra/cloudflared/config.yml` and `infra/cloudflared/config.prod.yml`,
and point your DNS:

```bash
cloudflared tunnel route dns project-dev dev-myproject.example.com
cloudflared tunnel route dns project-prod myproject.example.com
```

## Step 6: Set up the developer CLI

Add to your `~/.bashrc`:

```bash
alias cmds='bash tools/cli/cmds.sh'
```

Reload: `source ~/.bashrc`

Make sure `fzf` is installed:

```bash
# macOS
brew install fzf
# Ubuntu/Debian
sudo apt install fzf
# Windows (Git Bash) -- see https://github.com/junegunn/fzf
```

## Step 7: Start the dev environment

```bash
# Pre-pull images (one-time, fixes intermittent TLS issues)
cmds pods    # pick "Pre-pull required images"

# Start the pod
cmds pods    # pick "Start project-dev pod"
```

Or directly:

```bash
podman play kube infra/podman/project-dev.yaml
```

Open <http://localhost:3000> in your browser. Log in with the seeded
super-admin: **admin** / **admin**, then immediately change the password
(top-right user menu → Change Password).

## Step 8: Customize

- **Database schema:** add migrations to `infra/database/` -- see [infra/database/README.md](infra/database/README.md)
- **API endpoints:** add a new blueprint in `infra/api/`, register it in `app.py` -- see [CLAUDE.md](CLAUDE.md)
- **Frontend routes:** add pages in `frontend/src/pages/`, register in `frontend/src/App.tsx` -- see [CLAUDE.md](CLAUDE.md)
- **Navigation:** edit the `SECTIONS` constant in `frontend/src/components/AppLayout.tsx`
- **Theme:** edit `frontend/src/theme/theme.ts` (brand colors at the top)

## Troubleshooting

### Pod won't start
- Check Podman is installed: `podman --version`
- Verify all host paths in `project-dev.yaml` exist
- Check logs: `podman logs project-dev-pod-postgres-db`
- TLS issues pulling images: `cmds pods` → "Fix TLS certificate issues"

### "cmds: command not found"
- Run `source ~/.bashrc` after adding the alias
- Ensure `cmds.sh` is executable: `chmod +x tools/cli/cmds.sh`
- Run from the repo root, or use the full path

### Database connection issues
- Verify container is running: `podman ps`
- Check status: `podman exec -it project-dev-pod-postgres-db pg_isready -U postgres`
- Reset the DB volume: `cmds pods` → "Rebuild dev pod with database reset"

### Frontend errors about missing `node_modules`
- The `react-frontend` container runs `npm install` on every start
- Check its logs: `podman logs project-dev-pod-react-frontend`
- If install hangs, exec in and run manually: `podman exec -it project-dev-pod-react-frontend sh`

### "Invalid credentials" on login
- The seeded password is literally `admin`. If you've already changed it, use the new one
- To reset, wipe the DB volume and restart: `cmds pods` → "Rebuild dev pod with database reset"

### Migrations not applying
- The Flask API container runs `run_migrations()` on every startup
- Check API logs: `podman logs project-dev-pod-flask-api`
- Files starting with `000` are intentionally skipped (those run as DB init)
