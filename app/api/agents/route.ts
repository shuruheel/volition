import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Agent } from '@/lib/db';

/**
 * GET /api/agents
 * List all agents
 */
export async function GET() {
  try {
    const agents = await sql<Agent[]>`
      SELECT * FROM agents
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
    const { name, prompt, tools = [] } = body;
    
    if (!name || !prompt) {
      return NextResponse.json(
        { error: 'Name and prompt are required' },
        { status: 400 }
      );
    }
    
    const result = await sql<Agent[]>`
      INSERT INTO agents (name, prompt, tools, status)
      VALUES (${name}, ${prompt}, ${tools}, 'idle')
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

