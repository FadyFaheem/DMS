# Database Migrations

PostgreSQL migration files for the project. Migrations are applied in two ways:

1. **`000-init.sql`** is executed by Postgres itself on the first DB container
   startup (mounted into `/docker-entrypoint-initdb.d`). It creates the
   `schema_migrations` tracking table.
2. **`001+` migrations** are applied by the Flask API on every startup via
   `db.run_migrations()`. Pending migrations (not in `schema_migrations`)
   are applied in numeric order.

## Naming Convention

`NNN-short-description.sql`, where `NNN` is a zero-padded sequential number:

- `000-init.sql` -- Postgres init only, never re-applied
- `001-schema.sql` -- core schema (users, roles)
- `002-seed.sql` -- seed data (default admin)
- `003-...`, `004-...` -- your feature migrations

## Required Migration Header

Each migration **must** record itself in `schema_migrations`:

```sql
INSERT INTO schema_migrations (version) VALUES ('NNN-name')
ON CONFLICT (version) DO NOTHING;
```

The version string must match the filename without the `.sql` extension.

## Creating a New Migration

1. Create `NNN-feature.sql` with the next sequential number.
2. Add the `INSERT INTO schema_migrations` line at the top.
3. Use `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... IF NOT EXISTS`, and
   `DO $$ ... $$` blocks so the migration is safe to re-run.
4. Optionally add a status line at the end:
   ```sql
   \echo 'NNN-feature completed'
   ```
5. Restart the API container -- the migration runs automatically.

## Default Seed

`002-seed.sql` creates a `super_admin` user:

- **Username:** `admin`
- **Password:** `admin`

**Change this immediately after first login.** The hash is published in this
repo and provides no security.
