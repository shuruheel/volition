import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Agent } from '@/lib/db';
import { clearAgentStatus } from '@/lib/agent-status';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/agents/:id/stop
 * Stop an agent (changes status to 'idle')
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
    // Fetch agent
    const agents = await sql<Agent[]>`
      SELECT * FROM agents WHERE id = ${id}
    `;
    
    if (agents.length === 0) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    const agent = agents[0];
    
    // If already idle, just return success (idempotent)
    if (agent.status === 'idle') {
      return NextResponse.json({
        agent,
        message: 'Agent is already idle',
      });
    }
    
    // Update status to idle
    const updatedAgents = await sql<Agent[]>`
      UPDATE agents
      SET status = 'idle', updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    
    const updatedAgent = updatedAgents[0];
    
    // Clear agent status
    await clearAgentStatus(id);
    
    // Log stop activity (only if it wasn't already idle)
    if (agent.status !== 'idle') {
      try {
        await sql`
          INSERT INTO activities (agent_id, type, status, payload)
          VALUES (
            ${id},
            'agent_stopped',
            'completed',
            ${JSON.stringify({
              stoppedAt: new Date().toISOString(),
              previousStatus: agent.status,
            })}
          )
        `;
      } catch (e: any) {
        // If type not allowed due to outdated CHECK, fall back to 'research'
        if (e && e.code === '23514') {
          await sql`
            INSERT INTO activities (agent_id, type, status, payload)
            VALUES (
              ${id},
              'research',
              'completed',
              ${JSON.stringify({
                stoppedAt: new Date().toISOString(),
                previousStatus: agent.status,
                note: 'Fallback type used due to missing CHECK update for agent_stopped',
              })}
            )
          `;
        } else {
          throw e;
        }
      }
    }
    
    return NextResponse.json({
      agent: updatedAgent,
      message: 'Agent stopped successfully',
    });
  } catch (error) {
    console.error('Failed to stop agent:', error);
    return NextResponse.json(
      { error: 'Failed to stop agent' },
      { status: 500 }
    );
  }
}

