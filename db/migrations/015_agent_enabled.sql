-- Migration 015: Add enabled column to agents for enable/disable lifecycle
-- enabled = user's intent (should this agent participate?)
-- status = execution state (active/idle/error) — orthogonal to enabled

ALTER TABLE agents ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_agents_enabled ON agents(enabled) WHERE enabled = true;

DO $$ BEGIN RAISE NOTICE 'Migration 015 completed: Added enabled column to agents'; END $$;
