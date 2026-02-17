-- Migration 010: Agent scheduling / heartbeat support

CREATE TABLE IF NOT EXISTS agent_schedules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('heartbeat', 'cron', 'interval')),
  cron_expression TEXT,
  interval_minutes INTEGER,
  checklist TEXT,
  enabled BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_schedules_agent_id ON agent_schedules(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_schedules_next_run ON agent_schedules(next_run_at) WHERE enabled = true;

DO $$ BEGIN RAISE NOTICE 'Migration 010 completed: Agent schedules table created'; END $$;
