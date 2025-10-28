import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Activity } from '@/lib/db';

/**
 * GET /api/activities
 * List activities with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not configured, returning empty array');
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const types = searchParams.get('types')?.split(',');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let query = 'SELECT * FROM activities WHERE 1=1';
    const params: any[] = [];
    
    if (agentId) {
      params.push(agentId);
      query += ` AND agent_id = $${params.length}`;
    }
    
    if (types && types.length > 0) {
      params.push(types);
      query += ` AND type = ANY($${params.length})`;
    }
    
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    
    params.push(limit);
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    
    const activities = await sql<Activity[]>(query, params);
    
    return NextResponse.json(activities);
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    // Return empty array instead of error to prevent UI crash
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

