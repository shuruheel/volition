import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Memory } from '@/lib/db';
import Supermemory from 'supermemory'

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
    const q = searchParams.get('q') || ''
    
    // Prefer Supermemory search for documents
    if (process.env.SUPERMEMORY_API_KEY && agentId && (!kind || kind === 'document')) {
      const sm = new Supermemory({ apiKey: process.env.SUPERMEMORY_API_KEY! })
      const results = await sm.search.documents({
        q: q || 'recent research documents',
        // Use boolean group with key/value matcher
        filters: { AND: [{ key: 'metadata.agentId', value: agentId }] },
        limit,
      })
      return NextResponse.json(
        (results.items ?? []).map((it: any) => ({
          provider_id: it.id,
          created_at: it.createdAt,
          kind: 'document',
          metadata: it.metadata,
        }))
      )
    }

    // Fallback: Neon references
    let query = sql`SELECT * FROM memories WHERE 1=1`;
    if (agentId) {
      query = sql`${query} AND agent_id = ${agentId}`;
    }
    if (kind) {
      query = sql`${query} AND kind = ${kind}`;
    }
    query = sql`${query} ORDER BY created_at DESC LIMIT ${limit}`;
    const memories = await query as unknown as Memory[];
    
    return NextResponse.json(memories);
  } catch (error) {
    console.error('Failed to search memories:', error);
    return NextResponse.json(
      { error: 'Failed to search memories' },
      { status: 500 }
    );
  }
}

