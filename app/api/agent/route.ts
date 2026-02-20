import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { getOrCreateUserAgent } from '@/lib/agent-helpers';

/**
 * GET /api/agent
 * Get (or auto-create) the user's single primary agent.
 */
export async function GET() {
  try {
    const userId = await requireUserId();

    // Get user name for auto-creation
    const users = await sql`SELECT name FROM users WHERE id = ${userId}`;
    const userName = users[0]?.name || undefined;

    const agent = await getOrCreateUserAgent(userId, userName);
    return NextResponse.json(agent);
  } catch (error) {
    console.error('Failed to get agent:', error);
    return NextResponse.json(
      { error: 'Failed to get agent' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agent
 * Update the user's single primary agent.
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { name, prompt, tools, skills, model_provider, model_id } = body;

    // Get the user's primary agent
    const agents = await sql`
      SELECT id FROM agents
      WHERE user_id = ${userId} AND parent_agent_id IS NULL
      ORDER BY created_at ASC
      LIMIT 1
    `;

    if (agents.length === 0) {
      return NextResponse.json({ error: 'No agent found' }, { status: 404 });
    }

    const agentId = agents[0].id;

    // Build dynamic update
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name');
      values.push(name);
    }
    if (prompt !== undefined) {
      updates.push('prompt');
      values.push(prompt);
    }
    if (tools !== undefined) {
      updates.push('tools');
      values.push(tools);
    }
    if (skills !== undefined) {
      updates.push('skills');
      values.push(skills);
    }
    if (model_provider !== undefined) {
      updates.push('model_provider');
      values.push(model_provider);
    }
    if (model_id !== undefined) {
      updates.push('model_id');
      values.push(model_id);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Use individual updates since neon sql tagged template doesn't support dynamic column names easily
    if (name !== undefined) await sql`UPDATE agents SET name = ${name} WHERE id = ${agentId}`;
    if (prompt !== undefined) await sql`UPDATE agents SET prompt = ${prompt} WHERE id = ${agentId}`;
    if (tools !== undefined) await sql`UPDATE agents SET tools = ${tools} WHERE id = ${agentId}`;
    if (skills !== undefined) await sql`UPDATE agents SET skills = ${skills} WHERE id = ${agentId}`;
    if (model_provider !== undefined) await sql`UPDATE agents SET model_provider = ${model_provider} WHERE id = ${agentId}`;
    if (model_id !== undefined) await sql`UPDATE agents SET model_id = ${model_id} WHERE id = ${agentId}`;

    await sql`UPDATE agents SET updated_at = NOW() WHERE id = ${agentId}`;

    const result = await sql`SELECT * FROM agents WHERE id = ${agentId}`;
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Failed to update agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}
