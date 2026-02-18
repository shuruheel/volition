import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Activity } from '@/lib/db';
import { requireActivityOwnership } from '@/lib/auth';
import { updateAgentStatus } from '@/lib/agent-status';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/activities/:id/reject
 * Reject a pending activity. Sets agent to idle — no continuation workflow.
 * User can re-engage via chat.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    await requireActivityOwnership(id);

    const result = await sql<Activity[]>`
      UPDATE activities
      SET status = 'rejected'
      WHERE id = ${id} AND status = 'pending'
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Activity not found or not pending' },
        { status: 404 }
      );
    }

    const activity = result[0];
    const agentId = activity.agent_id;

    // Set agent to idle and clear status — no continuation on rejection
    await sql`UPDATE agents SET status = 'idle', updated_at = NOW() WHERE id = ${agentId}`;
    await updateAgentStatus(agentId, {
      status: 'idle',
      currentActivity: null,
      currentTool: null,
    });

    console.log(`[Reject] Activity ${id} rejected, agent ${agentId} set to idle`);

    return NextResponse.json({
      success: true,
      activity,
    });
  } catch (error) {
    console.error('Failed to reject activity:', error);
    return NextResponse.json(
      { error: 'Failed to reject activity' },
      { status: 500 }
    );
  }
}
