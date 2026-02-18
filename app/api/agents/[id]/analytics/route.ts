import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAgentOwnership } from '@/lib/auth';

/**
 * GET /api/agents/[id]/analytics
 * Get analytics stats for an agent (owned by authenticated user)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    await requireAgentOwnership(agentId);

    const [runsResult, emailsResult, memoriesResult, stepsResult] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM activities WHERE agent_id = ${agentId} AND type = 'task_completed'`,
      sql`SELECT COUNT(*) as count FROM activities WHERE agent_id = ${agentId} AND type = 'email_sent'`,
      sql`SELECT COUNT(*) as count FROM memories WHERE agent_id = ${agentId}`,
      sql`SELECT AVG((metadata->>'steps')::int) as avg_steps FROM activities WHERE agent_id = ${agentId} AND type = 'task_completed' AND metadata->>'steps' IS NOT NULL`,
    ]);

    return NextResponse.json({
      totalRuns: parseInt(runsResult[0]?.count || '0'),
      emailsSent: parseInt(emailsResult[0]?.count || '0'),
      memoriesStored: parseInt(memoriesResult[0]?.count || '0'),
      avgStepsPerRun: parseFloat(stepsResult[0]?.avg_steps || '0'),
    });
  } catch (error: any) {
    if (error?.message === 'Agent not found' || error?.message === 'Authentication required') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Authentication required' ? 401 : 404 });
    }
    console.error('Failed to fetch agent analytics:', error);
    return NextResponse.json({ totalRuns: 0, emailsSent: 0, memoriesStored: 0, avgStepsPerRun: 0 });
  }
}
