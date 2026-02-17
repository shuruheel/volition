import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { listMemoryFiles, readMemoryFile, writeMemoryFile } from '@/lib/integrations/google-drive';
import { sql } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agents/:id/memory
 * List memory files or read a specific file
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const userId = await requireUserId();
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('file') as any;

    if (filename) {
      const content = await readMemoryFile(userId, id, filename);
      return NextResponse.json({ filename, content });
    }

    const files = await listMemoryFiles(userId, id);
    return NextResponse.json(files);
  } catch (error) {
    console.error('Failed to read memory:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read memory' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agents/:id/memory
 * Write/update a memory file
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const userId = await requireUserId();
    const { id } = await context.params;
    const body = await request.json();
    const { filename, content } = body;

    if (!filename || content === undefined) {
      return NextResponse.json({ error: 'filename and content are required' }, { status: 400 });
    }

    // Get agent name for folder
    const agents = await sql`SELECT name FROM agents WHERE id = ${id}`;
    if (agents.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const fileId = await writeMemoryFile(userId, id, agents[0].name, filename, content);
    return NextResponse.json({ success: true, fileId });
  } catch (error) {
    console.error('Failed to write memory:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to write memory' },
      { status: 500 }
    );
  }
}
