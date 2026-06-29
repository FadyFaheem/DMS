-- 002-seed.sql
-- Seed the initial super_admin user.
--
-- Default credentials: username "admin", password "admin"
-- CHANGE THIS IMMEDIATELY after first login. The hash below is a valid
-- argon2id hash of the literal string "admin".

INSERT INTO schema_migrations (version) VALUES ('002-seed') ON CONFLICT (version) DO NOTHING;

INSERT INTO users (username, email, password_hash, role, permissions, is_admin)
VALUES (
    'admin',
    'admin@localhost',
    '$argon2id$v=19$m=65536,t=3,p=4$90OInTMUMAhr3Lt6T4xvag$yeaNWfO7mHMqVn1kcIWa9DEI43ojQLC72zgdrZ0A3S8',
    'super_admin',
    '{}',
    TRUE
) ON CONFLICT (username) DO NOTHING;

\echo '002-seed completed (default admin/admin user seeded)'
