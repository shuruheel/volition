-- Migration 012: Sub-agent support

ALTER TABLE agents ADD COLUMN IF NOT EXISTS parent_agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS parent_activity_id TEXT REFERENCES activities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agents_parent ON agents(parent_agent_id);
CREATE INDEX IF NOT EXISTS idx_activities_parent ON activities(parent_activity_id);

DO $$ BEGIN RAISE NOTICE 'Migration 012 completed: Sub-agent columns added'; END $$;
