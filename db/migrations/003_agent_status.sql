-- Migration 003: Add agent_status table for real-time agent activity tracking

CREATE TABLE IF NOT EXISTS agent_status (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('idle', 'active', 'error')),
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  current_activity TEXT,
  current_tool TEXT,
  last_update TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Only one status record per agent
  UNIQUE(agent_id)
);

-- Index for quick lookups
CREATE INDEX idx_agent_status_agent_id ON agent_status(agent_id);
CREATE INDEX idx_agent_status_status ON agent_status(status);
CREATE INDEX idx_agent_status_last_update ON agent_status(last_update DESC);

-- Function to automatically update last_update timestamp
CREATE OR REPLACE FUNCTION update_agent_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_update = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agent_status_last_update
BEFORE UPDATE ON agent_status
FOR EACH ROW
EXECUTE FUNCTION update_agent_status_timestamp();

-- Add comment
COMMENT ON TABLE agent_status IS 'Real-time agent execution status for UI display';
COMMENT ON COLUMN agent_status.current_activity IS 'Human-readable description of what the agent is currently doing';
COMMENT ON COLUMN agent_status.current_tool IS 'Name of the tool currently being executed';
COMMENT ON COLUMN agent_status.current_step IS 'Current step number in the agent loop';
COMMENT ON COLUMN agent_status.total_steps IS 'Total steps configured for this agent execution';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 003 completed: agent_status table created';
END $$;

