import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Activity } from '@/lib/db';

/**
 * GET /api/activities
 * List activities with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const types = searchParams.get('types')?.split(',');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Build dynamic query using tagged template
    let activities: Activity[];
    
    if (agentId && types && types.length > 0 && status) {
      activities = await sql<Activity[]>`
        SELECT * FROM activities 
        WHERE agent_id = ${agentId} 
        AND type = ANY(${types})
        AND status = ${status}
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `;
    } else if (agentId && types && types.length > 0) {
      activities = await sql<Activity[]>`
        SELECT * FROM activities 
        WHERE agent_id = ${agentId} 
        AND type = ANY(${types})
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `;
    } else if (types && types.length > 0 && status) {
      activities = await sql<Activity[]>`
        SELECT * FROM activities 
        WHERE type = ANY(${types})
        AND status = ${status}
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `;
    } else if (types && types.length > 0) {
      activities = await sql<Activity[]>`
        SELECT * FROM activities 
        WHERE type = ANY(${types})
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `;
    } else if (agentId && status) {
      activities = await sql<Activity[]>`
        SELECT * FROM activities 
        WHERE agent_id = ${agentId} 
        AND status = ${status}
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `;
    } else if (agentId) {
      activities = await sql<Activity[]>`
        SELECT * FROM activities 
        WHERE agent_id = ${agentId}
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `;
    } else if (status) {
      activities = await sql<Activity[]>`
        SELECT * FROM activities 
        WHERE status = ${status}
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `;
    } else {
      activities = await sql<Activity[]>`
        SELECT * FROM activities 
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `;
    }
    
    // Hide in-progress research session scaffolding (no chat acknowledgment)
    const filtered = (activities || []).filter((a: any) => {
      // Show research activities if they have chatAck OR if they're completed with a summary
      if (a.type === 'research') {
        return !!(a.payload && a.payload.chatAck) || 
               (a.status === 'completed' && a.payload && a.payload.summary);
      }
      return true;
    });
    return NextResponse.json(filtered);
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

