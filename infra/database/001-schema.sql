-- 001-schema.sql
-- Core authentication tables: roles + users.
-- Permissions are stored as JSONB on both roles (templates) and users (overrides).

INSERT INTO schema_migrations (version) VALUES ('001-schema') ON CONFLICT (version) DO NOTHING;

-- Roles table (permission templates)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (name, description, permissions, is_system) VALUES
    ('super_admin', 'Reserved super administrator role', '{"full_access": true}', TRUE),
    ('admin', 'Full system access', '{"full_access": true}', TRUE),
    ('user', 'Default role with no permissions', '{}', TRUE),
    ('no_access', 'No access (lock-out role)', '{}', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    permissions JSONB NOT NULL DEFAULT '{}',
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Only one super_admin is allowed, and its username must be "admin".
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_super_admin_reserved_username'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT users_super_admin_reserved_username
            CHECK (role <> 'super_admin' OR username = 'admin');
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_single_super_admin
ON users ((role))
WHERE role = 'super_admin';

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

\echo '001-schema completed'
