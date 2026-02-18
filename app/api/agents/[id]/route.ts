import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Agent } from '@/lib/db';
import { requireAgentOwnership } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agents/:id
 * Get a specific agent (owned by the authenticated user)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    await requireAgentOwnership(id);

    const agents = await sql<Agent[]>`
      SELECT * FROM agents WHERE id = ${id}
    `;

    return NextResponse.json(agents[0]);
  } catch (error: any) {
    if (error?.message === 'Agent not found' || error?.message === 'Authentication required') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Authentication required' ? 401 : 404 });
    }
    console.error('Failed to fetch agent:', error);
    return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 });
  }
}

/**
 * PATCH /api/agents/:id
 * Update an agent (owned by the authenticated user)
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    await requireAgentOwnership(id);
    const body = await request.json();
    const { name, prompt, status, tools } = body;

    if (name === undefined && prompt === undefined && status === undefined && tools === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const [current] = await sql<Agent[]>`SELECT * FROM agents WHERE id = ${id}`;

    const result = await sql<Agent[]>`
      UPDATE agents SET
        name = ${name ?? current.name},
        prompt = ${prompt ?? current.prompt},
        status = ${status ?? current.status},
        tools = ${tools ?? current.tools},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error: any) {
    if (error?.message === 'Agent not found' || error?.message === 'Authentication required') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Authentication required' ? 401 : 404 });
    }
    console.error('Failed to update agent:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

/**
 * DELETE /api/agents/:id
 * Delete an agent (owned by the authenticated user)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    await requireAgentOwnership(id);

    await sql`DELETE FROM agents WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message === 'Agent not found' || error?.message === 'Authentication required') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Authentication required' ? 401 : 404 });
    }
    console.error('Failed to delete agent:', error);
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}
