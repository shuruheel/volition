import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Activity } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

/**
 * GET /api/activities
 * List activities with optional filtering, scoped to the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const types = searchParams.get('types')?.split(',');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    // All queries join through agents to scope by user_id
    let activities: Activity[];

    if (agentId && types && types.length > 0 && status) {
      activities = await sql<Activity[]>`
        SELECT a.* FROM activities a
        JOIN agents ag ON ag.id = a.agent_id
        WHERE ag.user_id = ${userId}
        AND a.agent_id = ${agentId}
        AND a.type = ANY(${types})
        AND a.status = ${status}
        ORDER BY a.created_at DESC
        LIMIT ${limit}
      `;
    } else if (agentId && types && types.length > 0) {
      activities = await sql<Activity[]>`
        SELECT a.* FROM activities a
        JOIN agents ag ON ag.id = a.agent_id
        WHERE ag.user_id = ${userId}
        AND a.agent_id = ${agentId}
        AND a.type = ANY(${types})
        ORDER BY a.created_at DESC
        LIMIT ${limit}
      `;
    } else if (types && types.length > 0 && status) {
      activities = await sql<Activity[]>`
        SELECT a.* FROM activities a
        JOIN agents ag ON ag.id = a.agent_id
        WHERE ag.user_id = ${userId}
        AND a.type = ANY(${types})
        AND a.status = ${status}
        ORDER BY a.created_at DESC
        LIMIT ${limit}
      `;
    } else if (types && types.length > 0) {
      activities = await sql<Activity[]>`
        SELECT a.* FROM activities a
        JOIN agents ag ON ag.id = a.agent_id
        WHERE ag.user_id = ${userId}
        AND a.type = ANY(${types})
        ORDER BY a.created_at DESC
        LIMIT ${limit}
      `;
    } else if (agentId && status) {
      activities = await sql<Activity[]>`
        SELECT a.* FROM activities a
        JOIN agents ag ON ag.id = a.agent_id
        WHERE ag.user_id = ${userId}
        AND a.agent_id = ${agentId}
        AND a.status = ${status}
        ORDER BY a.created_at DESC
        LIMIT ${limit}
      `;
    } else if (agentId) {
      activities = await sql<Activity[]>`
        SELECT a.* FROM activities a
        JOIN agents ag ON ag.id = a.agent_id
        WHERE ag.user_id = ${userId}
        AND a.agent_id = ${agentId}
        ORDER BY a.created_at DESC
        LIMIT ${limit}
      `;
    } else if (status) {
      activities = await sql<Activity[]>`
        SELECT a.* FROM activities a
        JOIN agents ag ON ag.id = a.agent_id
        WHERE ag.user_id = ${userId}
        AND a.status = ${status}
        ORDER BY a.created_at DESC
        LIMIT ${limit}
      `;
    } else {
      activities = await sql<Activity[]>`
        SELECT a.* FROM activities a
        JOIN agents ag ON ag.id = a.agent_id
        WHERE ag.user_id = ${userId}
        ORDER BY a.created_at DESC
        LIMIT ${limit}
      `;
    }

    // Hide in-progress research session scaffolding (no chat acknowledgment)
    const filtered = (activities || []).filter((a: any) => {
      if (a.type === 'research') {
        return !!(a.payload && a.payload.chatAck) ||
               (a.status === 'completed' && a.payload && a.payload.summary);
      }
      return true;
    });
    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    return NextResponse.json([]);
  }
}

/**
 * POST /api/activities
 * Create a new activity
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_id, type, status = 'completed', priority = 'medium', payload = {} } = body;

    if (!agent_id || !type) {
      return NextResponse.json(
        { error: 'agent_id and type are required' },
        { status: 400 }
      );
    }

    const result = await sql<Activity[]>`
      INSERT INTO activities (agent_id, type, status, priority, payload)
      VALUES (${agent_id}, ${type}, ${status}, ${priority}, ${JSON.stringify(payload)})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Failed to create activity:', error);
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}
