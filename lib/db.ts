/**
 * Database client — dual-mode: Neon (remote) or PGlite (local embedded Postgres).
 *
 * If DATABASE_URL is set → Neon (production / remote database)
 * If DATABASE_URL is NOT set → PGlite (zero-config local development)
 */

import { neon, neonConfig, Pool } from '@neondatabase/serverless';
import { createLocalSql, getLocalPool } from './db-local';

const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_URL_POOLED = process.env.DATABASE_URL_POOLED || DATABASE_URL;

let _sql: any;
let _getPool: () => Promise<any>;

if (DATABASE_URL) {
  // ── Neon mode ────────────────────────────────────────────────────────
  _sql = neon(DATABASE_URL);

  let wsInitialized = false;
  let _pool: Pool | null = null;

  _getPool = async () => {
    if (!_pool) {
      if (typeof WebSocket === 'undefined' && !wsInitialized) {
        wsInitialized = true;
        try {
          const ws = await import('ws');
          neonConfig.webSocketConstructor = (ws as any).default || ws;
        } catch {
          console.warn('WebSocket not available, Pool will use HTTP');
        }
      }
      _pool = new Pool({
        connectionString: DATABASE_URL_POOLED,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    }
    return _pool;
  };
} else {
  // ── PGlite local mode ───────────────────────────────────────────────
  _sql = createLocalSql();
  _getPool = getLocalPool;
  console.log('[db] Using PGlite (local embedded Postgres)');
}

/**
 * Neon / PGlite SQL client for simple queries (HTTP / embedded)
 * Use this for most operations.
 */
export const sql = _sql;

/**
 * Pool client for transactions and connection pooling.
 * In workflow steps, always use getPool() not the direct pool export.
 */
export async function getPool(): Promise<any> {
  return _getPool();
}

// For backward compatibility, export pool as a getter that throws if used directly
export const pool = new Proxy({} as any, {
  get: () => {
    throw new Error(
      'Direct pool access not allowed. Use getPool() inside step functions instead.',
    );
  },
});

/**
 * Type-safe query helper
 */
export type QueryResult<T> = T[];

/**
 * Database types
 */
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: Date;
}

export interface Agent {
  id: string;
  name: string;
  prompt: string;
  status: 'active' | 'idle' | 'paused' | 'error';
  tools: string[];
  created_at: Date;
  updated_at: Date;
}

export interface Activity {
  id: string;
  agent_id: string;
  type:
    | 'research'
    | 'email_sent'
    | 'email_received'
    | 'phone_call'
    | 'post_call_summary'
    | 'calendar_event_added'
    | 'calendar_event_modified'
    | 'webpage_viewed'
    | 'journal_read'
    | 'task_completed'
    | 'agent_stopped'
    | 'user_input'
    | 'user_message'
    | 'telegram_message_sent'
    | 'telegram_message_received';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  payload: Record<string, any>;
  created_at: Date;
}

export interface Memory {
  id: string;
  agent_id: string;
  provider_id: string;
  kind: string;
  metadata: Record<string, any>;
  created_at: Date;
}

export interface Call {
  id: string;
  agent_id: string;
  to_number: string;
  status:
    | 'queued'
    | 'ringing'
    | 'in-progress'
    | 'completed'
    | 'failed'
    | 'busy'
    | 'no-answer'
    | 'canceled';
  twilio_sid: string | null;
  started_at: Date | null;
  ended_at: Date | null;
  summary: Record<string, any>;
  created_at: Date;
}

export interface ToolConfig {
  id: string;
  user_id: string;
  tool:
    | 'openai'
    | 'neon'
    | 'firecrawl'
    | 'supermemory'
    | 'browser_use'
    | 'twilio'
    | 'google_oauth'
    | 'telegram';
  data_encrypted: string;
  created_at: Date;
  updated_at: Date;
}

export interface TelegramUser {
  id: string;
  telegram_user_id: number;
  telegram_username: string | null;
  agent_id: string | null;
  created_at: Date;
}

/**
 * Helper to execute migrations (uses new auto-migration runner)
 */
export async function runMigrations() {
  const { ensureMigrations } = await import('./db-migrate');
  await ensureMigrations(sql);
}

/**
 * Health check
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT 1 as health`;
    return result.length > 0;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
