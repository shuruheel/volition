-- Migration 013: Skills column on agents

ALTER TABLE agents ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

DO $$ BEGIN RAISE NOTICE 'Migration 013 completed: Skills column added to agents'; END $$;
