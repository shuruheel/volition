import { sql } from '../lib/db';

/**
 * Run migration 003: agent_status table
 */
async function runMigration() {
  try {
    console.log('🚀 Running migration 003: agent_status table...\n');

    // Check if table already exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'agent_status'
      );
    `;
    
    if (tableCheck[0].exists) {
      console.log('✅ agent_status table already exists, skipping migration');
      process.exit(0);
    }

    // Create agent_status table
    await sql`
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
    `;
    console.log('✅ Created agent_status table');

    // Create indexes
    await sql`CREATE INDEX idx_agent_status_agent_id ON agent_status(agent_id);`;
    await sql`CREATE INDEX idx_agent_status_status ON agent_status(status);`;
    await sql`CREATE INDEX idx_agent_status_last_update ON agent_status(last_update DESC);`;
    console.log('✅ Created indexes');

    // Create trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_agent_status_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.last_update = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `;
    console.log('✅ Created trigger function');

    // Create trigger
    await sql`
      CREATE TRIGGER update_agent_status_last_update
      BEFORE UPDATE ON agent_status
      FOR EACH ROW
      EXECUTE FUNCTION update_agent_status_timestamp();
    `;
    console.log('✅ Created trigger');

    // Add comments
    await sql`
      COMMENT ON TABLE agent_status IS 'Real-time agent execution status for UI display';
    `;
    await sql`
      COMMENT ON COLUMN agent_status.current_activity IS 'Human-readable description of what the agent is currently doing';
    `;
    await sql`
      COMMENT ON COLUMN agent_status.current_tool IS 'Name of the tool currently being executed';
    `;

    console.log('\n🎉 Migration 003 completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Restart your dev server if it\'s running');
    console.log('2. Create an agent and click Play');
    console.log('3. Watch the real-time status updates!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

