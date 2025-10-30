-- Migration 002: Add new activity types
-- Run this to support new activity types: task_completed, agent_stopped

-- The activities table uses TEXT for type (not enum), so no ALTER TYPE needed
-- This migration is for documentation purposes and to verify the schema supports these types

-- Verify activities table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities') THEN
    RAISE EXCEPTION 'activities table does not exist. Run 001_init.sql first.';
  END IF;
END $$;

-- Add comment documenting supported activity types
COMMENT ON COLUMN activities.type IS 
'Activity type. Supported types: 
  - research: Research tasks completed
  - email_sent: Emails sent (future Composio)
  - email_read: Emails read (excluded from feed)
  - phone_call: Phone calls made via Twilio
  - post_call_summary: Call summary after completion
  - calendar_event_added: Calendar events added (future Composio)
  - calendar_event_modified: Calendar events modified (future Composio)
  - calendar_event_deleted: Calendar events deleted (future Composio)
  - webpage_viewed: Web pages visited
  - journal_read: Journal entries read
  - video_watched: Videos watched (excluded from feed)
  - image_seen: Images viewed (excluded from feed)
  - financial: Financial transactions (deferred to v2)
  - task_completed: Agent task completion
  - agent_stopped: Agent manually stopped';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 002 completed: Activity types documented';
END $$;

