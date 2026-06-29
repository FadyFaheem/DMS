-- 000-init.sql - Auto-executed by PostgreSQL on startup
-- This file runs FIRST due to the 000 prefix

\echo '========================================='
\echo 'Starting Project Database Setup'
\echo '========================================='

-- Set some useful defaults for all migrations
SET client_min_messages TO WARNING;
SET timezone TO 'UTC';

-- Create a migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

\echo 'Migration tracking table ready'
\echo 'Running numbered migration files...'

