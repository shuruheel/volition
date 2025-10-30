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
    
    // Idempotency window: if an active status update was recorded in the last 10s, do not enqueue again
    const recentStatuses = await sql<any[]>`
      SELECT status, last_update
      FROM agent_status
      WHERE agent_id = ${id}
        AND last_update > NOW() - INTERVAL '10 seconds'
      ORDER BY last_update DESC
      LIMIT 1
    `;

    if (recentStatuses.length > 0 && recentStatuses[0].status === 'active') {
      return NextResponse.json(
        {
          message: 'Agent start request accepted recently; skipping duplicate start',
          workflowInvoked: false,
          idempotent: true,
        },
        { status: 202 }
      );
    }

    // If already active outside the window, treat as already running
    if (agent.status === 'active') {
      return NextResponse.json(
        { error: 'Agent is already active' },
        { status: 400 }
      );
    }
    
    // Update status to active
    await sql`
      UPDATE agents
      SET status = 'active', updated_at = NOW()
      WHERE id = ${id}
    `;
    
    // Initialize agent status
    await updateAgentStatus(id, {
      status: 'active',
      currentStep: 0,
      totalSteps: 20,
      currentActivity: 'Starting workflow...',
    });
    
    // Default prompt should emphasize continuous research agent behavior
    const prompt = task || 'You are a CONTINUOUS RESEARCH AGENT. Your goal is to populate your memory with comprehensive, high-quality research based on your system prompt (the agent prompt defined by the user). Begin by starting your first research session on the topics specified in your system prompt. After completing each session, analyze findings, identify knowledge gaps, and plan your next research session. If unclear about priorities, ask the user for guidance using the askUser tool. Continue researching until you have comprehensive coverage of all topics in your system prompt.';
    
    console.log(`[Agent Start] Invoking workflow for agent ${id}`);
    
    // CRITICAL: Use start() from workflow/api to properly invoke the workflow
    // Reduced to 20 steps to avoid 300s timeout (each step can take ~15s with LLM calls)
    const run = await start(agentTaskWorkflow, [id, prompt, 20]);
    
    console.log(`[Agent Start] Workflow started with runId: ${run.runId}`);
    
    return NextResponse.json({
      agent: await sql<Agent[]>`SELECT * FROM agents WHERE id = ${id}`.then(r => r[0]),
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


