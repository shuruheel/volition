import { NextRequest, NextResponse } from 'next/server';
import { agentTaskWorkflow } from '@/lib/ai/workflows/agent-workflow';
import { start } from 'workflow/api';

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

    console.log(`[Workflow API] Enqueueing workflow for agent ${agentId}`);

    // IMPORTANT: Always enqueue workflows via start(); do not call directly
    const run = await start(agentTaskWorkflow, [agentId, prompt, maxSteps]);

    return NextResponse.json({
      success: true,
      runId: run.runId,
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

