/**
 * Auto-migration runner for Volition.
 * Tracks applied migrations in a schema_migrations table.
 * Works with both Neon sql and PGlite sql functions.
 *
 * Fixes the bug where the old setup script only ran migration 001.
 */

import * as fs from 'fs';
import * as path from 'path';

export async function ensureMigrations(sql: any): Promise<void> {
  // Create tracking table
  await sql(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

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

  // Reconciliation for existing databases:
  // If tables exist but schema_migrations is empty, mark all as applied
  // (avoids duplicate index/constraint errors for users who ran the old setup script)
  if (appliedSet.size === 0) {
    const tables = await sql`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    const tableNames = new Set(
      (tables || []).map((t: any) => t.tablename),
    );

    if (tableNames.has('agents')) {
      console.log('[migrations] Existing database detected, reconciling...');
      for (const file of files) {
        const version = file.replace('.sql', '');
        await sql`
          INSERT INTO schema_migrations (version) VALUES (${version})
          ON CONFLICT DO NOTHING
        `;
      }
      console.log('[migrations] All migrations marked as applied');
      return;
    }
  }

  // Run pending migrations in order
  let ranCount = 0;
  for (const file of files) {
    const version = file.replace('.sql', '');
    if (appliedSet.has(version)) continue;

    const filePath = path.join(migrationDir, file);
    const sqlContent = fs.readFileSync(filePath, 'utf-8');

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
