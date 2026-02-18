import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Agent } from '@/lib/db';
import { requireAgentOwnership } from '@/lib/auth';
import { clearAgentStatus } from '@/lib/agent-status';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/agents/:id/stop
 * Disable an agent — sets enabled=false, status=idle,
 * disables schedules, clears agent_status, and logs activity.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    await requireAgentOwnership(id);

    const agents = await sql<Agent[]>`SELECT * FROM agents WHERE id = ${id}`;
    const agent = agents[0];

    if (!agent.enabled && agent.status === 'idle') {
      return NextResponse.json({ agent, message: 'Agent is already disabled' });
    }

    const updatedAgents = await sql<Agent[]>`
      UPDATE agents
      SET enabled = false, status = 'idle', updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    const updatedAgent = updatedAgents[0];

    await sql`UPDATE agent_schedules SET enabled = false WHERE agent_id = ${id}`;
    await clearAgentStatus(id);

    try {
      await sql`
        INSERT INTO activities (agent_id, type, status, payload)
        VALUES (${id}, 'agent_stopped', 'completed', ${JSON.stringify({
          disabledAt: new Date().toISOString(),
          previousStatus: agent.status,
          previousEnabled: agent.enabled,
        })})
      `;
    } catch (e: any) {
      if (e && e.code === '23514') {
        await sql`
          INSERT INTO activities (agent_id, type, status, payload)
          VALUES (${id}, 'research', 'completed', ${JSON.stringify({
            disabledAt: new Date().toISOString(),
            previousStatus: agent.status,
            note: 'Agent disabled by user',
          })})
        `;
      } else {
        throw e;
      }
    }

    return NextResponse.json({ agent: updatedAgent, message: 'Agent disabled successfully' });
  } catch (error: any) {
    if (error?.message === 'Agent not found' || error?.message === 'Authentication required') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Authentication required' ? 401 : 404 });
    }
    console.error('Failed to disable agent:', error);
    return NextResponse.json({ error: 'Failed to disable agent' }, { status: 500 });
  }
}
