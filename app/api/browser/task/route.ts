import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { BrowserUseClient } from 'browser-use-sdk';
import { resolveBrowserUseKey } from '@/lib/integrations/browser-use';

/**
 * POST /api/browser/task
 * Create and execute a browser automation task
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { task, maxSteps = 10, wait = false, timeoutMs = 120000, allowedDomains } = body;

    if (!task) {
      return NextResponse.json(
        { error: 'task is required' },
        { status: 400 }
      );
    }

    const apiKey = await resolveBrowserUseKey(userId);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'BROWSER_USE_API_KEY not configured' },
        { status: 503 }
      );
    }

    const browserClient = new BrowserUseClient({ apiKey });
    console.log('Creating browser task:', { task, maxSteps });

    // Create the task
    const browserTask = await browserClient.tasks.createTask({
      task,
      maxSteps,
      allowedDomains: Array.isArray(allowedDomains) && allowedDomains.length > 0 ? allowedDomains : undefined,
    });
    
    // If wait is true, wait up to timeoutMs but do not throw on timeout
    if (wait) {
      const outcome = await Promise.race([
        (async () => ({ ok: true as const, r: await browserTask.complete() }))(),
        new Promise<{ ok: false; timeout: true }>((resolve) =>
          setTimeout(() => resolve({ ok: false, timeout: true }), timeoutMs)
        ),
      ]);

      if ((outcome as any).ok) {
        const r = (outcome as any).r as any;
        return NextResponse.json({ id: r.id, status: r.status, output: r.output, liveUrl: r.liveUrl });
      }

      // Timed out → return pending (202) with task id so caller can poll
      return NextResponse.json(
        {
          id: (browserTask as any).id,
          status: 'pending',
          liveUrl: (browserTask as any).liveUrl,
          message: 'Task not finished within timeout; still processing',
        },
        { status: 202 }
      );
    }
    
    // Otherwise return task ID immediately
    return NextResponse.json({
      id: browserTask.id,
      status: 'pending',
      message: 'Task created, use GET /api/browser/task/:id to check status',
    });
  } catch (error) {
    console.error('Browser task error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Browser task failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/browser/task/:id
 * Get status of a browser task
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id parameter is required' },
        { status: 400 }
      );
    }

    const apiKey = await resolveBrowserUseKey(userId);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'BROWSER_USE_API_KEY not configured' },
        { status: 503 }
      );
    }
    
    // TODO: Implement task status retrieval when SDK supports it
    // For now, return a placeholder response
    return NextResponse.json({
      id,
      status: 'completed',
      message: 'Task status retrieval not yet implemented',
    });
  } catch (error) {
    console.error('Failed to get browser task status:', error);
    return NextResponse.json(
      { error: 'Failed to get task status' },
      { status: 500 }
    );
  }
}

