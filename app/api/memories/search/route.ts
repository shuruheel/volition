import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Memory } from '@/lib/db';
import { requireAgentOwnership } from '@/lib/auth';
import Supermemory from 'supermemory';
import { resolveSupermemoryKey } from '@/lib/integrations/supermemory';

/**
 * GET /api/memories/search
 * Search memories for an agent (owned by authenticated user)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const kind = searchParams.get('kind');
    const limit = parseInt(searchParams.get('limit') || '20');
    const q = searchParams.get('q') || ''

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }

    const userId = await requireAgentOwnership(agentId);

    // Prefer Supermemory search for documents
    const smApiKey = await resolveSupermemoryKey(userId);
    if (smApiKey && (!kind || kind === 'document')) {
      const sm = new Supermemory({ apiKey: smApiKey })
      const results = await sm.search.documents({
        q: q || 'recent research documents',
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
    let query = sql`SELECT * FROM memories WHERE agent_id = ${agentId}`;
    if (kind) {
      query = sql`${query} AND kind = ${kind}`;
    }
    query = sql`${query} ORDER BY created_at DESC LIMIT ${limit}`;
    const memories = await query as unknown as Memory[];

    return NextResponse.json(memories);
  } catch (error: any) {
    if (error?.message === 'Agent not found' || error?.message === 'Authentication required') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Authentication required' ? 401 : 404 });
    }
    console.error('Failed to search memories:', error);
    return NextResponse.json({ error: 'Failed to search memories' }, { status: 500 });
  }
}
