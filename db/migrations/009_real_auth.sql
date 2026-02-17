-- Migration 009: Real authentication support
-- Adds Google auth columns to users, scopes agents to users

-- 1) Add google_id and avatar_url to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- 2) Add user_id column to agents table (scope agents per user)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);

DO $$ BEGIN RAISE NOTICE 'Migration 009 completed: Real auth columns added'; END $$;
