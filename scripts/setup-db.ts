#!/usr/bin/env tsx
/**
 * Database setup script
 * Runs all pending migrations and seeds minimal demo data
 *
 * Usage:
 *   pnpm tsx scripts/setup-db.ts
 */

import { sql } from '../lib/db';
import { ensureMigrations } from '../lib/db-migrate';

async function seedDemoData() {
  console.log('🌱 Seeding demo data...');

  try {
    // Create demo user
    const userResult = await sql`
      INSERT INTO users (email, name)
      VALUES ('demo@example.com', 'Demo User')
      ON CONFLICT (email) DO UPDATE SET name = 'Demo User'
      RETURNING id
    `;
    const userId = userResult[0].id;
    console.log('  ✓ Created demo user:', userId);

    // Create demo agent
    const agentResult = await sql`
      INSERT INTO agents (name, prompt, tools, status)
      VALUES (
        'Research Assistant',
        'You are a helpful research assistant that can search the web, store information in memory, and provide insights.',
        ARRAY['supermemory', 'browser'],
        'idle'
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    if (agentResult.length > 0) {
      const agentId = agentResult[0].id;
      console.log('  ✓ Created demo agent:', agentId);

      // Create demo activity
      await sql`
        INSERT INTO activities (agent_id, type, status, priority, payload)
        VALUES (
          ${agentId},
          'research',
          'completed',
          'medium',
          ${JSON.stringify({
            title: 'Analyzed market trends',
            description: 'Completed comprehensive analysis of Q4 market trends',
            timestamp: new Date().toISOString(),
          })}
        )
      `;
      console.log('  ✓ Created demo activity');

      // Create demo memory
      await sql`
        INSERT INTO memories (agent_id, provider_id, kind, metadata)
        VALUES (
          ${agentId},
          'demo-memory-id',
          'observation',
          ${JSON.stringify({
            content: 'User prefers detailed research reports with citations',
            timestamp: new Date().toISOString(),
          })}
        )
      `;
      console.log('  ✓ Created demo memory');
    } else {
      console.log('  ℹ Demo agent already exists');
    }

    console.log('✅ Demo data seeded successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

async function checkHealth() {
  console.log('🏥 Checking database health...');

  try {
    const result = await sql`SELECT 1 as health`;
    if (result.length > 0) {
      console.log('✅ Database connection is healthy');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting database setup...\n');

  // Check health first
  const isHealthy = await checkHealth();
  if (!isHealthy) {
    console.error('\n❌ Database is not accessible. Check your DATABASE_URL (or omit it for local PGlite).');
    process.exit(1);
  }

  console.log('');

  // Run all pending migrations
  console.log('📦 Running database migrations...');
  await ensureMigrations(sql);

  console.log('');

  // Seed demo data
  await seedDemoData();

  console.log('\n🎉 Database setup complete!');
  console.log('\nNext steps:');
  console.log('  1. Start the dev server: pnpm dev');
  console.log('  2. Visit http://localhost:3000');
  console.log('  3. Configure tools in Settings page');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  });
