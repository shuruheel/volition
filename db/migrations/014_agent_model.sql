-- Migration 014: Model provider columns on agents

ALTER TABLE agents ADD COLUMN IF NOT EXISTS model_provider TEXT DEFAULT 'openai';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS model_id TEXT;

DO $$ BEGIN RAISE NOTICE 'Migration 014 completed: Model provider columns added to agents'; END $$;
