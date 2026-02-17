import { neon, neonConfig } from '@neondatabase/serverless';
import { Pool } from '@neondatabase/serverless';

// Connection string from environment
const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_URL_POOLED = process.env.DATABASE_URL_POOLED || DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

/**
 * Lazy WebSocket initialization for Pool (only when needed)
 * This avoids bundling Node.js modules into workflow functions
 */
let wsInitialized = false;
async function ensureWebSocket() {
  if (typeof WebSocket === 'undefined' && !wsInitialized) {
    wsInitialized = true;
    try {
      const ws = await import('ws');
      neonConfig.webSocketConstructor = ws.default;
    } catch (e) {
      // ws not available, Pool will use HTTP fallback
      console.warn('WebSocket not available, Pool will use HTTP');
    }
  }
}

/**
 * Neon SQL client for simple queries (HTTP)
 * Use this for most operations - it's fast and works in edge environments
 * This uses HTTP by default and doesn't need WebSocket
 */
export const sql = neon(DATABASE_URL);

/**
 * Neon Pool client for transactions and connection pooling
 * Use this when you need transactions or multiple concurrent queries
 * Pool is created lazily to avoid bundling ws module
 */
let _pool: Pool | null = null;
export async function getPool(): Promise<Pool> {
  if (!_pool) {
    await ensureWebSocket(); // Only initialize ws when Pool is actually used
    _pool = new Pool({
      connectionString: DATABASE_URL_POOLED,
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return _pool;
}

// For backward compatibility, export pool as a getter that throws if used in workflow
// In workflow functions, Pool should be obtained via getPool() inside step functions
export const pool = new Proxy({} as Pool, {
  get: () => {
    throw new Error('Direct pool access not allowed. Use getPool() inside step functions instead.');
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
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer' | 'canceled';
  twilio_sid: string | null;
  started_at: Date | null;
  ended_at: Date | null;
  summary: Record<string, any>;
  created_at: Date;
}

export interface ToolConfig {
  id: string;
  user_id: string;
  tool: 'openai' | 'neon' | 'firecrawl' | 'supermemory' | 'browser_use' | 'twilio' | 'google_oauth' | 'telegram';
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
 * Helper to execute migrations
 */
export async function runMigrations() {
  try {
    const migrationPath = process.cwd() + '/db/migrations/001_init.sql';
    const fs = require('fs');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    await sql(migrationSQL);
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
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

