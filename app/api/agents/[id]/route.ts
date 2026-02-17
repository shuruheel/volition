import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Agent } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agents/:id
 * Get a specific agent
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
    const agents = await sql<Agent[]>`
      SELECT * FROM agents WHERE id = ${id}
    `;
    
    if (agents.length === 0) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(agents[0]);
  } catch (error) {
    console.error('Failed to fetch agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agents/:id
 * Update an agent
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, prompt, status, tools } = body;
    
    if (name === undefined && prompt === undefined && status === undefined && tools === undefined) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Fetch current values to merge with provided fields
    const [current] = await sql<Agent[]>`SELECT * FROM agents WHERE id = ${id}`;
    if (!current) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

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
    
    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Failed to update agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agents/:id
 * Delete an agent
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
    const result = await sql`
      DELETE FROM agents WHERE id = ${id}
      RETURNING id
    `;
    
    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    );
  }
}

