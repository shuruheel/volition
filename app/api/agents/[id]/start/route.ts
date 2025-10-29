import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Agent } from '@/lib/db';
import { updateAgentStatus } from '@/lib/agent-status';
import { start } from 'workflow/api';
import { agentTaskWorkflow } from '@/lib/ai/workflows/agent-workflow';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/agents/:id/start
 * Start an agent (changes status to 'active')
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { task } = body;
    
    // Atomically set status to active only if not already active
    const updated = await sql<Agent[]>`
      UPDATE agents
      SET status = 'active', updated_at = NOW()
      WHERE id = ${id} AND status <> 'active'
      RETURNING *
    `;

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Agent is already active' },
        { status: 400 }
      );
    }
    
    // Initialize agent status
    await updateAgentStatus(id, {
      status: 'active',
      currentStep: 0,
      totalSteps: 40,
      currentActivity: 'Starting workflow...',
    });
    
    const prompt = task || 'Continue with your assigned tasks based on your system prompt.';
    
    console.log(`[Agent Start] Invoking workflow for agent ${id}`);
    
    // CRITICAL: Use start() from workflow/api to properly invoke the workflow
    // This enqueues the workflow and returns a Run object
    const run = await start(agentTaskWorkflow, [id, prompt, 40]);
    
    console.log(`[Agent Start] Workflow started with runId: ${run.runId}`);
    
    return NextResponse.json({
      agent: updated[0],
      message: 'Agent workflow started successfully',
      runId: run.runId,
      workflowInvoked: true,
    });
  } catch (error) {
    console.error('Failed to start agent:', error);
    return NextResponse.json(
      { error: 'Failed to start agent' },
      { status: 500 }
    );
  }
}


