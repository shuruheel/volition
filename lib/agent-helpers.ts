/**
 * Agent helpers — single-agent model utilities.
 * Ensures every user has exactly one primary agent (parent_agent_id IS NULL).
 */

import { sql } from '@/lib/db';

/**
 * Get or create the user's single primary agent.
 * Sub-agents (parent_agent_id IS NOT NULL) are not affected.
 */
export async function getOrCreateUserAgent(userId: string, userName?: string): Promise<any> {
  // Check for existing primary agent
  const existing = await sql`
    SELECT * FROM agents
    WHERE user_id = ${userId} AND parent_agent_id IS NULL
    ORDER BY created_at ASC
    LIMIT 1
  `;

  if (existing.length > 0) {
    return existing[0];
  }

  // Create default agent
  const agentName = userName ? `${userName}'s Assistant` : 'My Assistant';
  const defaultPrompt = `You are a helpful AI assistant. You can research topics, manage emails and calendar, and help with various tasks. Ask the user what they need help with.`;

  const result = await sql`
    INSERT INTO agents (name, prompt, tools, skills, status, enabled, user_id)
    VALUES (
      ${agentName},
      ${defaultPrompt},
      ${'{"google","firecrawl","supermemory"}'},
      ${'{}'},
      'idle',
      true,
      ${userId}
    )
    RETURNING *
  `;

  const agent = result[0];

  // Create default heartbeat schedule (60min interval)
  await sql`
    INSERT INTO agent_schedules (agent_id, schedule_type, interval_minutes, enabled, next_run_at)
    VALUES (${agent.id}, 'interval', 60, false, NOW() + INTERVAL '60 minutes')
  `;

  return agent;
}
