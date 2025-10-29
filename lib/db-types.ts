/**
 * Database types - separate from lib/db.ts to avoid pulling in Node.js modules
 * when importing types in workflow files
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
  status: 'idle' | 'active' | 'error';
  tools: string[];
  created_at: Date;
  updated_at: Date;
}

export interface Activity {
  id: string;
  agent_id: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  priority: string;
  created_at: Date;
  payload: Record<string, any>;
}

export interface Memory {
  id: string;
  agent_id: string;
  provider_id: string;
  kind: string;
  created_at: Date;
  metadata: Record<string, any>;
}

export interface Call {
  id: string;
  agent_id: string;
  to_number: string;
  status: string;
  twilio_sid: string | null;
  started_at: Date | null;
  ended_at: Date | null;
  summary: string | null;
}

export interface ToolConfig {
  id: string;
  user_id: string;
  tool: string;
  data_encrypted: string;
  created_at: Date;
  updated_at: Date;
}

export type QueryResult<T> = T[];

