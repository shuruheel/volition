import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Agent } from '@/lib/db';
import { updateAgentStatus } from '@/lib/agent-status';

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
    
    // Check if already active
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
      totalSteps: 40,
      currentActivity: 'Starting workflow...',
    });
    
    // Start workflow (Vercel Workflow handles background execution)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const prompt = task || 'Continue with your assigned tasks based on your system prompt.';
    
    console.log(`[Agent Start] Invoking workflow for agent ${id}`);
    
    // Invoke workflow endpoint (async, returns immediately)
    fetch(`${baseUrl}/api/workflows/agent/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        maxSteps: 40,
      }),
    }).catch(error => {
      console.error('[Agent Start] Failed to start workflow:', error);
      // Update status to error
      sql`
        UPDATE agents
        SET status = 'error', updated_at = NOW()
        WHERE id = ${id}
      `.catch(err => console.error('Failed to update agent status:', err));
    });
    
    return NextResponse.json({
      agent: await sql<Agent[]>`SELECT * FROM agents WHERE id = ${id}`.then(r => r[0]),
      message: 'Agent workflow started successfully',
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


