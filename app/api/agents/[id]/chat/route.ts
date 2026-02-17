import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Agent } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/agents/:id/chat
 * Send a chat message to an agent. Stores the message and triggers
 * a chat workflow if the agent is enabled and idle.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

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

    // Store the user message as an activity
    await sql`
      INSERT INTO activities (agent_id, type, status, payload)
      VALUES (${id}, 'user_message', 'completed', ${JSON.stringify({ content: content.trim() })})
    `;

    // If agent is not enabled, message is stored but no workflow triggered
    if (!agent.enabled) {
      return NextResponse.json({
        message: 'Message stored. Agent is disabled — enable it to get responses.',
        workflowTriggered: false,
      });
    }

    // If agent is already active, message is stored for context (the running workflow will see it)
    if (agent.status === 'active') {
      return NextResponse.json({
        message: 'Message stored. Agent is currently running and will see your message.',
        workflowTriggered: false,
      });
    }

    // Atomically claim the agent for a chat workflow (prevents race conditions)
    const claimed = await sql<Agent[]>`
      UPDATE agents
      SET status = 'active', updated_at = NOW()
      WHERE id = ${id} AND status = 'idle'
      RETURNING *
    `;

    if (claimed.length === 0) {
      // Another process claimed it between our check and update
      return NextResponse.json({
        message: 'Message stored. Agent is busy and will see your message.',
        workflowTriggered: false,
      });
    }

    // Launch a chat workflow (10 steps max)
    const chatPrompt = `The user just sent you a message: "${content.trim()}"\n\nRespond to their message and take any requested actions.`;

    const { start } = await import('workflow/api');
    const { agentTaskWorkflow } = await import('@/lib/ai/workflows/agent-workflow');
    const run = await start(agentTaskWorkflow, [id, chatPrompt, 10, 'chat']);

    console.log(`[Chat] Triggered chat workflow for agent ${id}, runId: ${run.runId}`);

    return NextResponse.json({
      message: 'Message sent. Agent is responding...',
      workflowTriggered: true,
      runId: run.runId,
    });
  } catch (error) {
    console.error('Failed to process chat message:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
