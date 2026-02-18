import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAgentOwnership } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agents/:id/schedule
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireAgentOwnership(id);

    const schedules = await sql`
      SELECT * FROM agent_schedules
      WHERE agent_id = ${id}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    return NextResponse.json(schedules[0] || null);
  } catch (error: any) {
    if (error?.message === 'Agent not found' || error?.message === 'Authentication required') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Authentication required' ? 401 : 404 });
    }
    console.error('Failed to fetch schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}

/**
 * PUT /api/agents/:id/schedule
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireAgentOwnership(id);
    const body = await request.json();
    const { schedule_type, interval_minutes, cron_expression, checklist, enabled } = body;

    if (!schedule_type) {
      return NextResponse.json({ error: 'schedule_type is required' }, { status: 400 });
    }

    const nextRun = enabled !== false
      ? new Date(Date.now() + (interval_minutes || 60) * 60 * 1000).toISOString()
      : null;

    const result = await sql`
      INSERT INTO agent_schedules (agent_id, schedule_type, interval_minutes, cron_expression, checklist, enabled, next_run_at)
      VALUES (${id}, ${schedule_type}, ${interval_minutes || null}, ${cron_expression || null}, ${checklist || null}, ${enabled !== false}, ${nextRun})
      ON CONFLICT (agent_id) DO UPDATE SET
        schedule_type = EXCLUDED.schedule_type,
        interval_minutes = EXCLUDED.interval_minutes,
        cron_expression = EXCLUDED.cron_expression,
        checklist = EXCLUDED.checklist,
        enabled = EXCLUDED.enabled,
        next_run_at = EXCLUDED.next_run_at
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error: any) {
    if (error?.message === 'Agent not found' || error?.message === 'Authentication required') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Authentication required' ? 401 : 404 });
    }
    console.error('Failed to save schedule:', error);
    return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
  }
}

/**
 * DELETE /api/agents/:id/schedule
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireAgentOwnership(id);

    await sql`DELETE FROM agent_schedules WHERE agent_id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message === 'Agent not found' || error?.message === 'Authentication required') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Authentication required' ? 401 : 404 });
    }
    console.error('Failed to delete schedule:', error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
