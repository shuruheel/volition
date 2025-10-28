import { NextRequest, NextResponse } from 'next/server';
import { BrowserUseClient } from 'browser-use-sdk';

// Initialize Browser-Use client
const browserClient = new BrowserUseClient({
  apiKey: process.env.BROWSER_USE_API_KEY,
});

/**
 * POST /api/browser/task
 * Create and execute a browser automation task
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task, maxSteps = 10, wait = true } = body;
    
    if (!task) {
      return NextResponse.json(
        { error: 'task is required' },
        { status: 400 }
      );
    }
    
    if (!process.env.BROWSER_USE_API_KEY) {
      return NextResponse.json(
        { error: 'BROWSER_USE_API_KEY not configured' },
        { status: 503 }
      );
    }
    
    console.log('Creating browser task:', { task, maxSteps });
    
    // Create the task
    const browserTask = await browserClient.tasks.createTask({
      task,
      maxSteps,
    });
    
    // If wait is true, poll for completion
    if (wait) {
      const result = await browserTask.complete();
      
      return NextResponse.json({
        id: result.id,
        status: result.status,
        output: result.output,
        liveUrl: result.liveUrl,
      });
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'id parameter is required' },
        { status: 400 }
      );
    }
    
    if (!process.env.BROWSER_USE_API_KEY) {
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

