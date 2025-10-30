import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

/**
 * POST /api/research/sessions/start
 * body: { agent_id: string, title?: string }
 * Creates an in-progress research activity used as the session container.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const agentId = body.agent_id as string
    const title = (body.title as string) || 'Research session'

    if (!agentId) {
      return NextResponse.json({ error: 'agent_id is required' }, { status: 400 })
    }

    const payload = {
      title,
      queries: [] as string[],
      links: [] as string[],
      notes: [] as string[],
      source: 'firecrawl',
    }

    const rows = await sql<any[]>`
      INSERT INTO activities (agent_id, type, status, priority, payload)
      VALUES (${agentId}, 'research', 'approved', 'medium', ${JSON.stringify(payload)})
      RETURNING id
    `

    const id = rows[0]?.id as string
    return NextResponse.json({ session_id: id })
  } catch (error) {
    console.error('start session error:', error)
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 })
  }
}


