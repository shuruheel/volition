-- Migration 008: Support Google OAuth + Telegram integrations
-- Expands CHECK constraints and adds telegram_users table

-- 1) Drop and recreate activities.type CHECK to include new types
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.activities'::regclass
    AND contype = 'c'
    AND conname = 'activities_type_check';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.activities DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

ALTER TABLE public.activities
  ADD CONSTRAINT activities_type_check
  CHECK (type IN (
    'research',
    'email_sent',
    'email_received',
    'phone_call',
    'post_call_summary',
    'phone_call_summary',
    'calendar_event_added',
    'calendar_event_modified',
    'webpage_viewed',
    'journal_read',
    'task_completed',
    'agent_stopped',
    'user_input',
    'user_message',
    'telegram_message_sent',
    'telegram_message_received'
  ));

-- 2) Drop old tool CHECK on tool_configs if it exists (the UNIQUE was fixed in 007)
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.tool_configs'::regclass
    AND contype = 'c'
    AND conname = 'tool_configs_tool_check';

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.tool_configs DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

ALTER TABLE public.tool_configs
  ADD CONSTRAINT tool_configs_tool_check
  CHECK (tool IN ('openai', 'neon', 'supermemory', 'browser_use', 'twilio', 'google_oauth', 'telegram'));

-- 3) Telegram users linkage table
CREATE TABLE IF NOT EXISTS telegram_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  telegram_user_id BIGINT NOT NULL UNIQUE,
  telegram_username TEXT,
  agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telegram_users_agent_id ON telegram_users(agent_id);

DO $$ BEGIN RAISE NOTICE 'Migration 008 completed: Google + Telegram support added'; END $$;
