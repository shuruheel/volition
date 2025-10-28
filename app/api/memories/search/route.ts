import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Memory } from '@/lib/db';

/**
 * GET /api/memories/search
 * Search memories for an agent
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const kind = searchParams.get('kind');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    let query = 'SELECT * FROM memories WHERE 1=1';
    const params: any[] = [];
    
    if (agentId) {
      params.push(agentId);
      query += ` AND agent_id = $${params.length}`;
    }
    
    if (kind) {
      params.push(kind);
      query += ` AND kind = $${params.length}`;
    }
    
    params.push(limit);
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    
    const memories = await sql<Memory[]>(query, params);
    
    return NextResponse.json(memories);
  } catch (error) {
    console.error('Failed to search memories:', error);
    return NextResponse.json(
      { error: 'Failed to search memories' },
      { status: 500 }
    );
  }
}

