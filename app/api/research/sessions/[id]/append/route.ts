import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/research/sessions/:id/append
 * body: { query?: string, links?: string[], notes?: string[] }
 * Appends information to the in-progress research activity payload.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json()

    const { query, links = [], notes = [] } = body as {
      query?: string
      links?: string[]
      notes?: string[]
    }

    const [row] = await sql<any[]>`
      SELECT payload FROM activities WHERE id = ${id}
    `
    if (!row) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const payload = (row.payload ?? {}) as Record<string, any>
    const existingQueries: string[] = Array.isArray(payload.queries) ? payload.queries : []
    const existingLinks: string[] = Array.isArray(payload.links) ? payload.links : []
    const existingNotes: string[] = Array.isArray(payload.notes) ? payload.notes : []

    const nextPayload = {
      ...payload,
      queries: query ? [...existingQueries, query] : existingQueries,
      links: Array.from(new Set([...existingLinks, ...links])).slice(0, 1000),
      notes: [...existingNotes, ...notes].slice(0, 500),
    }

    const [updated] = await sql<any[]>`
      UPDATE activities SET payload = ${JSON.stringify(nextPayload)} WHERE id = ${id} RETURNING id
    `

    return NextResponse.json({ id: updated.id, appended: { query, links: links.length, notes: notes.length } })
  } catch (error) {
    console.error('append session error:', error)
    return NextResponse.json({ error: 'Failed to append session' }, { status: 500 })
  }
}


