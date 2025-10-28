-- Migration 005: Add 'user_input' to activities.type CHECK

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'type'
  ) THEN
    RAISE EXCEPTION 'activities.type column not found. Run 001_init.sql first.';
  END IF;
END $$;

-- Drop existing CHECK constraint if present
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

-- Recreate with user_input included (and keep previous set)
ALTER TABLE public.activities
  ADD CONSTRAINT activities_type_check
  CHECK (type IN (
    'research',
    'email_sent',
    'phone_call',
    'post_call_summary',
    'phone_call_summary',
    'calendar_event_added',
    'calendar_event_modified',
    'webpage_viewed',
    'journal_read',
    'task_completed',
    'agent_stopped',
    'user_input'
  ));

DO $$ BEGIN RAISE NOTICE 'Migration 005 completed: user_input type added to CHECK'; END $$;


