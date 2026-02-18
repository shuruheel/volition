import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAgentOwnership } from '@/lib/auth';

/**
 * POST /api/memories/store
 * Store a memory reference (owned by authenticated user's agent)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_id, provider_id, kind, metadata = {} } = body;

    if (!agent_id || !provider_id || !kind) {
      return NextResponse.json(
        { error: 'agent_id, provider_id, and kind are required' },
        { status: 400 }
      );
    }

    await requireAgentOwnership(agent_id);

    const result = await sql`
      INSERT INTO memories (agent_id, provider_id, kind, metadata)
      VALUES (${agent_id}, ${provider_id}, ${kind}, ${JSON.stringify(metadata)})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    if (error?.message === 'Agent not found' || error?.message === 'Authentication required') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Authentication required' ? 401 : 404 });
    }
    console.error('Failed to store memory:', error);
    return NextResponse.json({ error: 'Failed to store memory' }, { status: 500 });
  }
}
