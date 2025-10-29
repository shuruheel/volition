import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { generateSummary } from '@/lib/ai/agent'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/research/sessions/:id/complete
 * body: { summary?: string }
 * Completes an in-progress research activity, generating a markdown summary if not provided.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = await request.json().catch(() => ({}))
    const providedSummary = typeof body.summary === 'string' ? body.summary : undefined

    const [row] = await sql<any[]>`
      SELECT payload FROM activities WHERE id = ${id}
    `
    if (!row) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const payload = (row.payload ?? {}) as Record<string, any>
    const notes: string[] = Array.isArray(payload.notes) ? payload.notes : []
    const queries: string[] = Array.isArray(payload.queries) ? payload.queries : []

    const summary = providedSummary || (await generateSummary(notes.join('\n\n'), `Queries: ${queries.join('; ')}`))

    const nextPayload = { ...payload, summary }

    await sql`
      UPDATE activities
      SET status = 'completed', payload = ${JSON.stringify(nextPayload)}
      WHERE id = ${id}
    `

    return NextResponse.json({ id, summary })
  } catch (error) {
    console.error('complete session error:', error)
    return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 })
  }
}


