import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Agent } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

/**
 * GET /api/agents
 * List all agents
 */
export async function GET() {
  try {
    const userId = await requireUserId();
    const agents = await sql<Agent[]>`
      SELECT * FROM agents
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    
    return NextResponse.json(agents);
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    // Return empty array instead of error to prevent UI crash
    return NextResponse.json([]);
  }
}

/**
 * POST /api/agents
 * Create a new agent
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, prompt, tools = [], model_provider, model_id } = body;

    if (!name || !prompt) {
      return NextResponse.json(
        { error: 'Name and prompt are required' },
        { status: 400 }
      );
    }

    const userId = await requireUserId();
    const result = await sql<Agent[]>`
      INSERT INTO agents (name, prompt, tools, status, user_id, model_provider, model_id)
      VALUES (${name}, ${prompt}, ${tools}, 'idle', ${userId}, ${model_provider || 'openai'}, ${model_id || null})
      RETURNING *
    `;
    
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create agent:', error);
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}

