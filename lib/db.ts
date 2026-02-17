/**
 * Database client — Neon Postgres only.
 * Requires DATABASE_URL environment variable.
 */

import { neon, neonConfig, Pool } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_URL_POOLED = process.env.DATABASE_URL_POOLED || DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('[db] DATABASE_URL is not set. Database operations will fail.');
}

/**
 * Neon SQL client for simple queries (HTTP).
 * Use this for most operations.
 */
export const sql = DATABASE_URL ? neon(DATABASE_URL) : (() => {
  throw new Error('DATABASE_URL is required. Set it in .env.local');
}) as any;

let wsInitialized = false;
let _pool: Pool | null = null;

/**
 * Pool client for transactions and connection pooling.
 * In workflow steps, always use getPool() not the direct pool export.
 */
export async function getPool(): Promise<Pool> {
  if (!DATABASE_URL_POOLED) {
    throw new Error('DATABASE_URL is required');
  }
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
  google_id?: string;
  avatar_url?: string;
  created_at: Date;
}

export interface Agent {
  id: string;
  name: string;
  prompt: string;
  status: 'active' | 'idle' | 'paused' | 'error';
  enabled: boolean;
  tools: string[];
  skills: string[];
  user_id?: string;
  model_provider?: string;
  model_id?: string;
  drive_folder_id?: string;
  parent_agent_id?: string;
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
