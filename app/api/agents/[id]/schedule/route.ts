import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agents/:id/schedule
 * Get the agent's schedule configuration
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireUserId();
    const { id } = await context.params;

    const schedules = await sql`
      SELECT * FROM agent_schedules
      WHERE agent_id = ${id}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    return NextResponse.json(schedules[0] || null);
  } catch (error) {
    console.error('Failed to fetch schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}

/**
 * PUT /api/agents/:id/schedule
 * Create or update the agent's schedule
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireUserId();
    const { id } = await context.params;
    const body = await request.json();
    const { schedule_type, interval_minutes, cron_expression, checklist, enabled } = body;

    if (!schedule_type) {
      return NextResponse.json({ error: 'schedule_type is required' }, { status: 400 });
    }

    // Calculate next_run_at
    const nextRun = enabled !== false
      ? new Date(Date.now() + (interval_minutes || 60) * 60 * 1000).toISOString()
      : null;

    const result = await sql`
      INSERT INTO agent_schedules (agent_id, schedule_type, interval_minutes, cron_expression, checklist, enabled, next_run_at)
      VALUES (${id}, ${schedule_type}, ${interval_minutes || null}, ${cron_expression || null}, ${checklist || null}, ${enabled !== false}, ${nextRun})
      ON CONFLICT (agent_id) DO NOTHING
      RETURNING *
    `;

    // If conflict (schedule already exists), update instead
    if (result.length === 0) {
      const updated = await sql`
        UPDATE agent_schedules
        SET schedule_type = ${schedule_type},
            interval_minutes = ${interval_minutes || null},
            cron_expression = ${cron_expression || null},
            checklist = ${checklist || null},
            enabled = ${enabled !== false},
            next_run_at = ${nextRun}
        WHERE agent_id = ${id}
        RETURNING *
      `;
      return NextResponse.json(updated[0]);
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Failed to save schedule:', error);
    return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
  }
}

/**
 * DELETE /api/agents/:id/schedule
 * Delete the agent's schedule
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireUserId();
    const { id } = await context.params;

    await sql`DELETE FROM agent_schedules WHERE agent_id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete schedule:', error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
