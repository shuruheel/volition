-- Migration 019: Single agent model support + active hours for schedules

-- Add active hours to agent_schedules for heartbeat time windows
ALTER TABLE agent_schedules
  ADD COLUMN IF NOT EXISTS active_hours_start TIME DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS active_hours_end TIME DEFAULT '23:00';

DO $$ BEGIN RAISE NOTICE 'Migration 019 completed: Active hours columns added to agent_schedules'; END $$;
