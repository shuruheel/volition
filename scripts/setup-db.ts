#!/usr/bin/env tsx
/**
 * Database setup script
 * Runs all pending migrations against Neon Postgres and seeds demo data
 *
 * Usage:
 *   pnpm db:setup
 */

import * as fs from 'fs';
import * as path from 'path';
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is required. Set it in .env.local');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function runMigrations() {
  console.log('📦 Running database migrations...');

  // Create tracking table
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Discover migration files
  const migrationDir = path.join(process.cwd(), 'db', 'migrations');
  if (!fs.existsSync(migrationDir)) {
    console.warn('[migrations] No db/migrations/ directory found, skipping');
    return;
  }

  const files = fs
    .readdirSync(migrationDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) return;

  // Check which migrations have already been applied
  const applied = await sql`SELECT version FROM schema_migrations`;
  const appliedSet = new Set((applied || []).map((m: any) => m.version));

  // Run pending migrations in order
  let ranCount = 0;
  for (const file of files) {
    const version = file.replace('.sql', '');
    if (appliedSet.has(version)) continue;

    const filePath = path.join(migrationDir, file);
    const sqlContent = fs.readFileSync(filePath, 'utf-8');

    // Execute raw SQL (neon http driver accepts raw strings)
    await sql(sqlContent);
    await sql`
      INSERT INTO schema_migrations (version) VALUES (${version})
    `;
    console.log(`  ✓ Applied migration: ${file}`);
    ranCount++;
  }

  if (ranCount === 0) {
    console.log('[migrations] Schema is up to date');
  } else {
    console.log(`[migrations] Applied ${ranCount} migration(s)`);
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

  const isHealthy = await checkHealth();
  if (!isHealthy) {
    console.error('\n❌ Database is not accessible. Check your DATABASE_URL.');
    process.exit(1);
  }

  console.log('');
  await runMigrations();

  console.log('\n🎉 Database setup complete!');
  console.log('\nNext steps:');
  console.log('  1. Start the dev server: pnpm dev');
  console.log('  2. Visit http://localhost:3000');
  console.log('  3. Sign in with Google');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  });
