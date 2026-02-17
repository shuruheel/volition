import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * GET /api/metrics/key
 * Get key metrics for dashboard
 * Metrics: Total Spend, Active Tasks, Pending Approvals, Memories Added, Actions Done, Emails Sent, Calls Made
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    
    // Define 24 hours ago
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Build agent filter
    const agentFilter = agentId ? sql`AND agent_id = ${agentId}` : sql``;
    
    // Total Spend (sum of API costs from activities or usage table)
    // For now, mock this as we don't have usage tracking yet
    const totalSpend = 0; // TODO: Implement usage tracking
    
    // Active Tasks (agents with status='active')
    const activeTasksResult = await sql`
      SELECT COUNT(*) as count
      FROM agents
      WHERE status = 'active'
      ${agentId ? sql`AND id = ${agentId}` : sql``}
    `;
    const activeTasks = parseInt(activeTasksResult[0].count as string);
    
    // Pending Approvals
    const pendingApprovalsResult = await sql`
      SELECT COUNT(*) as count
      FROM activities
      WHERE status = 'pending'
      ${agentFilter}
    `;
    const pendingApprovals = parseInt(pendingApprovalsResult[0].count as string);
    
    // Memories Added (last 24h)
    const memoriesResult = await sql`
      SELECT COUNT(*) as count
      FROM memories
      WHERE created_at >= ${oneDayAgo.toISOString()}
      ${agentFilter}
    `;
    const memoriesAdded = parseInt(memoriesResult[0].count as string);
    
    // Debug logging for memory metrics
    if (agentId) {
      const debugMemories = await sql`
        SELECT id, agent_id, kind, created_at, provider_id
        FROM memories
        WHERE agent_id = ${agentId}
        ORDER BY created_at DESC
        LIMIT 5
      `;
      console.log(`[Metrics] Debug - Found ${memoriesAdded} memories in last 24h for agent ${agentId}`);
      console.log(`[Metrics] Debug - Recent memories:`, debugMemories.map((m: any) => ({ 
        id: m.id, 
        agent_id: m.agent_id, 
        created_at: m.created_at,
        kind: m.kind 
      })));
    }
    
    // Actions Done (completed activities in last 24h)
    const actionsResult = await sql`
      SELECT COUNT(*) as count
      FROM activities
      WHERE status = 'completed'
        AND created_at >= ${oneDayAgo.toISOString()}
      ${agentFilter}
    `;
    const actionsDone = parseInt(actionsResult[0].count as string);
    
    // Emails Sent (last 24h)
    const emailsResult = await sql`
      SELECT COUNT(*) as count
      FROM activities
      WHERE type = 'email_sent'
        AND created_at >= ${oneDayAgo.toISOString()}
      ${agentFilter}
    `;
    const emailsSent = parseInt(emailsResult[0].count as string);
    
    // Calls Made (last 24h)
    const callsResult = await sql`
      SELECT COUNT(*) as count
      FROM calls
      WHERE created_at >= ${oneDayAgo.toISOString()}
      ${agentFilter}
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
    // Return zero metrics instead of error to prevent UI crash
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

