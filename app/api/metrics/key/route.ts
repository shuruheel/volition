import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

/**
 * GET /api/metrics/key
 * Get key metrics for dashboard, scoped to the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const totalSpend = 0; // TODO: Implement usage tracking

    // Active Tasks (user's agents with status='active')
    const activeTasksResult = agentId
      ? await sql`SELECT COUNT(*) as count FROM agents WHERE status = 'active' AND user_id = ${userId} AND id = ${agentId}`
      : await sql`SELECT COUNT(*) as count FROM agents WHERE status = 'active' AND user_id = ${userId}`;
    const activeTasks = parseInt(activeTasksResult[0].count as string);

    // Pending Approvals (scoped through agents)
    const pendingApprovalsResult = agentId
      ? await sql`
          SELECT COUNT(*) as count FROM activities a
          JOIN agents ag ON ag.id = a.agent_id
          WHERE a.status = 'pending' AND ag.user_id = ${userId} AND a.agent_id = ${agentId}
        `
      : await sql`
          SELECT COUNT(*) as count FROM activities a
          JOIN agents ag ON ag.id = a.agent_id
          WHERE a.status = 'pending' AND ag.user_id = ${userId}
        `;
    const pendingApprovals = parseInt(pendingApprovalsResult[0].count as string);

    // Memories Added (last 24h, scoped through agents)
    const memoriesResult = agentId
      ? await sql`
          SELECT COUNT(*) as count FROM memories m
          JOIN agents ag ON ag.id = m.agent_id
          WHERE m.created_at >= ${oneDayAgo.toISOString()} AND ag.user_id = ${userId} AND m.agent_id = ${agentId}
        `
      : await sql`
          SELECT COUNT(*) as count FROM memories m
          JOIN agents ag ON ag.id = m.agent_id
          WHERE m.created_at >= ${oneDayAgo.toISOString()} AND ag.user_id = ${userId}
        `;
    const memoriesAdded = parseInt(memoriesResult[0].count as string);

    // Actions Done (completed activities in last 24h)
    const actionsResult = agentId
      ? await sql`
          SELECT COUNT(*) as count FROM activities a
          JOIN agents ag ON ag.id = a.agent_id
          WHERE a.status = 'completed' AND a.created_at >= ${oneDayAgo.toISOString()} AND ag.user_id = ${userId} AND a.agent_id = ${agentId}
        `
      : await sql`
          SELECT COUNT(*) as count FROM activities a
          JOIN agents ag ON ag.id = a.agent_id
          WHERE a.status = 'completed' AND a.created_at >= ${oneDayAgo.toISOString()} AND ag.user_id = ${userId}
        `;
    const actionsDone = parseInt(actionsResult[0].count as string);

    // Emails Sent (last 24h)
    const emailsResult = agentId
      ? await sql`
          SELECT COUNT(*) as count FROM activities a
          JOIN agents ag ON ag.id = a.agent_id
          WHERE a.type = 'email_sent' AND a.created_at >= ${oneDayAgo.toISOString()} AND ag.user_id = ${userId} AND a.agent_id = ${agentId}
        `
      : await sql`
          SELECT COUNT(*) as count FROM activities a
          JOIN agents ag ON ag.id = a.agent_id
          WHERE a.type = 'email_sent' AND a.created_at >= ${oneDayAgo.toISOString()} AND ag.user_id = ${userId}
        `;
    const emailsSent = parseInt(emailsResult[0].count as string);

    // Calls Made (last 24h, scoped through agents)
    const callsResult = agentId
      ? await sql`
          SELECT COUNT(*) as count FROM calls c
          JOIN agents ag ON ag.id = c.agent_id
          WHERE c.created_at >= ${oneDayAgo.toISOString()} AND ag.user_id = ${userId} AND c.agent_id = ${agentId}
        `
      : await sql`
          SELECT COUNT(*) as count FROM calls c
          JOIN agents ag ON ag.id = c.agent_id
          WHERE c.created_at >= ${oneDayAgo.toISOString()} AND ag.user_id = ${userId}
        `;
    const callsMade = parseInt(callsResult[0].count as string);

    return NextResponse.json({
      totalSpend,
      activeTasks,
      pendingApprovals,
      memoriesAdded,
      actionsDone,
      emailsSent,
      callsMade,
    });
  } catch (error) {
    console.error('Failed to fetch key metrics:', error);
    return NextResponse.json({
      totalSpend: 0,
      activeTasks: 0,
      pendingApprovals: 0,
      memoriesAdded: 0,
      actionsDone: 0,
      emailsSent: 0,
      callsMade: 0,
    });
  }
}
