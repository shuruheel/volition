import { sql } from '@/lib/db';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

interface ActivityRow {
  id: string;
  agent_id: string;
  type: string;
  status: string;
  created_at: string | Date;
  payload: Record<string, any> | null;
}

/**
 * Build last N chat turns for an agent from DB activities.
 * Includes:
 * - user_message → user message
 * - user_input (approved) → assistant question + user answer
 * - research with payload.chatAck === true → assistant acknowledgement
 * Excludes generic research items.
 */
export async function getLastChatTurns(agentId: string, limit: number = 20): Promise<ChatMessage[]> {
  // Fetch a larger window, then trim to last N turns after expansion
  const rows = await sql<ActivityRow[]>`
    SELECT id, agent_id, type, status, created_at, payload
    FROM activities
    WHERE agent_id = ${agentId}
      AND (
        type = 'user_message'
        OR type = 'user_input'
        OR (type = 'research' AND (payload ->> 'chatAck')::boolean = true)
      )
    ORDER BY created_at DESC
    LIMIT 200
  `;

  const expanded: { ts: number; msg: ChatMessage }[] = [];

  for (const row of rows) {
    const createdAt = new Date(row.created_at).getTime();
    const payload = (row.payload ?? {}) as Record<string, any>;

    if (row.type === 'user_message') {
      const content = typeof payload.content === 'string' ? payload.content : '';
      if (content) expanded.push({ ts: createdAt, msg: { role: 'user', content } });
      continue;
    }

    if (row.type === 'user_input') {
      if (row.status !== 'approved') continue; // Only include resolved Q/A
      const question = typeof payload.question === 'string' ? payload.question : null;
      const answer = typeof payload.answer === 'string' ? payload.answer : null;
      if (question) expanded.push({ ts: createdAt, msg: { role: 'assistant', content: question } });
      if (answer) expanded.push({ ts: createdAt, msg: { role: 'user', content: answer } });
      continue;
    }

    if (row.type === 'research' && payload && payload.chatAck) {
      const content = typeof payload.content === 'string' ? payload.content : 'Okay, proceeding.';
      expanded.push({ ts: createdAt, msg: { role: 'assistant', content } });
      continue;
    }
  }

  // Sort oldest → newest
  expanded.sort((a, b) => a.ts - b.ts);

  // Keep only last N turns
  const last = expanded.slice(Math.max(0, expanded.length - limit));
  return last.map((e) => e.msg);
}

/**
 * Whether there is a pending user_input for this agent.
 */
export async function hasPendingUserInput(agentId: string): Promise<boolean> {
  const res = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count
    FROM activities
    WHERE agent_id = ${agentId}
      AND type = 'user_input'
      AND status = 'pending'
  `;
  const count = parseInt(res[0]?.count || '0', 10);
  return count > 0;
}


