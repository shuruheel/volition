import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Agent } from '@/lib/db';
import { requireAgentOwnership } from '@/lib/auth';
import { updateAgentStatus } from '@/lib/agent-status';
import { start } from 'workflow/api';
import { agentTaskWorkflow } from '@/lib/ai/workflows/agent-workflow';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/agents/:id/start
 * Enable an agent — sets enabled=true, ensures a schedule exists,
 * and launches a welcome workflow.
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

    // If already enabled and active, skip (idempotency)
    if (agent.enabled && agent.status === 'active') {
      return NextResponse.json(
        { message: 'Agent is already enabled and active', workflowInvoked: false, idempotent: true },
        { status: 202 }
      );
    }

    // Set enabled = true
    await sql`
      UPDATE agents SET enabled = true, updated_at = NOW() WHERE id = ${id}
    `;

    // Ensure a default heartbeat schedule exists (60-min interval)
    try {
      const existingSchedules = await sql<any[]>`
        SELECT id, enabled FROM agent_schedules WHERE agent_id = ${id} LIMIT 1
      `;

      if (existingSchedules.length === 0) {
        await sql`
          INSERT INTO agent_schedules (agent_id, schedule_type, interval_minutes, enabled, next_run_at)
          VALUES (${id}, 'heartbeat', 60, true, NOW() + INTERVAL '60 minutes')
        `;
      } else if (!existingSchedules[0].enabled) {
        await sql`
          UPDATE agent_schedules
          SET enabled = true, next_run_at = NOW() + INTERVAL '60 minutes'
          WHERE agent_id = ${id}
        `;
      }
    } catch (scheduleError) {
      console.error(`[Agent Enable] Schedule creation failed (non-blocking):`, scheduleError);
    }

    await updateAgentStatus(id, {
      status: 'active',
      currentStep: 0,
      totalSteps: 5,
      currentActivity: 'Starting welcome workflow...',
    });

    const welcomePrompt = `You have just been enabled by the user. Introduce yourself briefly based on your system prompt, then use the askUser tool to ask the user what they would like you to work on. Do NOT start any research or tasks until the user responds. Keep your introduction concise and friendly.`;

    console.log(`[Agent Enable] Launching welcome workflow for agent ${id}`);
    const run = await start(agentTaskWorkflow, [id, welcomePrompt, 2, 'welcome']);
    console.log(`[Agent Enable] Welcome workflow started with runId: ${run.runId}`);

    const updatedAgent = await sql<Agent[]>`SELECT * FROM agents WHERE id = ${id}`.then(r => r[0]);

    return NextResponse.json({
      agent: updatedAgent,
      message: 'Agent enabled successfully',
      runId: run.runId,
      workflowInvoked: true,
    });
  } catch (error: any) {
    if (error?.message === 'Agent not found' || error?.message === 'Authentication required') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Authentication required' ? 401 : 404 });
    }
    console.error('Failed to enable agent:', error);
    return NextResponse.json({ error: 'Failed to enable agent' }, { status: 500 });
  }
}
