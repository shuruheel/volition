import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUserId } from '@/lib/auth'

type ActivityRow = {
  id: string
  agent_id: string
  type: string
  status: string
  created_at: string
  payload: Record<string, any> | null
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const userId = await requireUserId()
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId') || undefined
  const typesParam = searchParams.get('types') || ''
  const types = typesParam.split(',').filter(Boolean)
  const intervalMs = Math.max(1500, Math.min(8000, Number(searchParams.get('intervalMs')) || 2000))
  let since = searchParams.get('since') || new Date(Date.now() - 60_000).toISOString()

  const encoder = new TextEncoder()

  async function fetchSince(sinceIso: string): Promise<ActivityRow[]> {
    let rows: ActivityRow[]
    if (agentId && types.length > 0) {
      rows = await sql<ActivityRow[]>`
        SELECT a.id, a.agent_id, a.type, a.status, a.created_at, a.payload
        FROM activities a
        JOIN agents ag ON ag.id = a.agent_id
        WHERE ag.user_id = ${userId}
          AND a.agent_id = ${agentId}
          AND a.type = ANY(${types})
          AND a.created_at > ${sinceIso}
        ORDER BY a.created_at ASC
        LIMIT 200
      `
    } else if (agentId) {
      rows = await sql<ActivityRow[]>`
        SELECT a.id, a.agent_id, a.type, a.status, a.created_at, a.payload
        FROM activities a
        JOIN agents ag ON ag.id = a.agent_id
        WHERE ag.user_id = ${userId}
          AND a.agent_id = ${agentId}
          AND a.created_at > ${sinceIso}
        ORDER BY a.created_at ASC
        LIMIT 200
      `
    } else if (types.length > 0) {
      rows = await sql<ActivityRow[]>`
        SELECT a.id, a.agent_id, a.type, a.status, a.created_at, a.payload
        FROM activities a
        JOIN agents ag ON ag.id = a.agent_id
        WHERE ag.user_id = ${userId}
          AND a.type = ANY(${types})
          AND a.created_at > ${sinceIso}
        ORDER BY a.created_at ASC
        LIMIT 200
      `
    } else {
      rows = await sql<ActivityRow[]>`
        SELECT a.id, a.agent_id, a.type, a.status, a.created_at, a.payload
        FROM activities a
        JOIN agents ag ON ag.id = a.agent_id
        WHERE ag.user_id = ${userId}
          AND a.created_at > ${sinceIso}
        ORDER BY a.created_at ASC
        LIMIT 200
      `
    }

    rows = rows.filter((r) => {
      if (r.type === 'research') {
        return !!(r.payload && (r.payload as any).chatAck) ||
               (r.status === 'completed' && r.payload && (r.payload as any).summary);
      }
      return true;
    });
    return rows
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(`: connected\n\n`))

      const first = await fetchSince(since)
      if (first.length > 0) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ items: first })}\n\n`))
        since = first[first.length - 1].created_at
      }

      const timer = setInterval(async () => {
        try {
          const updates = await fetchSince(since)
          if (updates.length > 0) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ items: updates })}\n\n`))
            since = updates[updates.length - 1].created_at
          } else {
            controller.enqueue(encoder.encode(`: keep-alive\n\n`))
          }
        } catch (e) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'poll_error' })}\n\n`))
        }
      }, intervalMs)

      const close = () => clearInterval(timer)
      // @ts-ignore
      request.signal?.addEventListener('abort', close)
    },
    cancel() {
      // noop
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
