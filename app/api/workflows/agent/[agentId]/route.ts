import { NextRequest, NextResponse } from 'next/server';
import { agentTaskWorkflow } from '@/lib/ai/workflows/agent-workflow';

interface RouteContext {
  params: Promise<{ agentId: string }>;
}

/**
 * POST /api/workflows/agent/:agentId
 * Start an agent workflow (durable, resumable execution)
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { agentId } = await context.params;
    const body = await request.json();
    const { prompt, maxSteps = 40 } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      );
    }

    console.log(`[Workflow API] Starting workflow for agent ${agentId}`);

    // Start the workflow (Vercel handles background execution via Queues)
    const result = await agentTaskWorkflow(agentId, prompt, maxSteps);

    return NextResponse.json({
      success: true,
      workflowId: agentId,
      result,
    });
  } catch (error) {
    console.error('[Workflow API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to start workflow',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

