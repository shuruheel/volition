-- Migration 007: Fix tool_configs UNIQUE constraint
-- The original migration had UNIQUE on (tool) alone, but the settings API
-- uses ON CONFLICT (user_id, tool). Fix by replacing the single-column constraint
-- with a composite unique index.

ALTER TABLE tool_configs DROP CONSTRAINT IF EXISTS tool_configs_tool_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tool_configs_user_tool ON tool_configs(user_id, tool);

DO $$ BEGIN RAISE NOTICE 'Migration 007 completed: tool_configs unique constraint fixed'; END $$;
