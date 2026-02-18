import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireUserId } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const userId = await requireUserId()
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')
  const intervalMs = Math.max(2000, Math.min(10000, Number(searchParams.get('intervalMs')) || 4000))

  const encoder = new TextEncoder()

  let closed = false

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`: connected\n\n`))
      } catch (e) {
        closed = true
        return
      }

      const timer = setInterval(async () => {
        if (closed) {
          clearInterval(timer)
          return
        }

        try {
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

          const [{ count: activeTasksStr }] = await sql<any[]>`
            SELECT COUNT(*) as count FROM agents WHERE status = 'active' AND user_id = ${userId}
          `
          const [{ count: pendingApprovalsStr }] = await sql<any[]>`
            SELECT COUNT(*) as count FROM activities a
            JOIN agents ag ON ag.id = a.agent_id
            WHERE a.status = 'pending' AND a.created_at > ${since} AND ag.user_id = ${userId}
          `
          const [{ count: memoriesAddedStr }] = await sql<any[]>`
            SELECT COUNT(*) as count FROM memories m
            JOIN agents ag ON ag.id = m.agent_id
            WHERE m.created_at > ${since} AND ag.user_id = ${userId}
          `
          const [{ count: actionsDoneStr }] = await sql<any[]>`
            SELECT COUNT(*) as count FROM activities a
            JOIN agents ag ON ag.id = a.agent_id
            WHERE a.status = 'completed' AND a.created_at > ${since} AND ag.user_id = ${userId}
          `
          const [{ count: callsMadeStr }] = await sql<any[]>`
            SELECT COUNT(*) as count FROM calls c
            JOIN agents ag ON ag.id = c.agent_id
            WHERE c.started_at > ${since} AND ag.user_id = ${userId}
          `

          const payload = {
            totalSpend: 0,
            activeTasks: parseInt(activeTasksStr, 10),
            pendingApprovals: parseInt(pendingApprovalsStr, 10),
            memoriesAdded: parseInt(memoriesAddedStr, 10),
            actionsDone: parseInt(actionsDoneStr, 10),
            emailsSent: 0,
            callsMade: parseInt(callsMadeStr, 10),
          }

          if (!closed) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
            } catch (e) {
              closed = true
              clearInterval(timer)
            }
          }
        } catch (e) {
          if (!closed) {
            try {
              controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'metrics_error' })}\n\n`))
            } catch {
              closed = true
              clearInterval(timer)
            }
          }
        }
      }, intervalMs)

      const cleanup = () => {
        closed = true
        clearInterval(timer)
      }

      request.signal?.addEventListener('abort', cleanup)
    },

    cancel() {
      closed = true
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
