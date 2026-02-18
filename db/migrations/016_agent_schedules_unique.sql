-- Migration 016: Add UNIQUE constraint on agent_schedules.agent_id
-- The schedule PUT route uses ON CONFLICT (agent_id) which requires uniqueness.

-- Deduplicate: keep the newest schedule per agent
DELETE FROM agent_schedules a
USING agent_schedules b
WHERE a.agent_id = b.agent_id AND a.created_at < b.created_at;

-- Now add the UNIQUE constraint
ALTER TABLE agent_schedules
  ADD CONSTRAINT agent_schedules_agent_id_unique UNIQUE (agent_id);

DO $$ BEGIN RAISE NOTICE 'Migration 016 completed: UNIQUE constraint on agent_schedules.agent_id'; END $$;
