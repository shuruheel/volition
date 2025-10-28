import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')
  const intervalMs = Math.max(2000, Math.min(10000, Number(searchParams.get('intervalMs')) || 4000))

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(`: connected\n\n`))

      const timer = setInterval(async () => {
        try {
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

          const [{ count: activeTasksStr }] = await sql<any[]>`SELECT COUNT(*) as count FROM agents WHERE status = 'active'`
          const [{ count: pendingApprovalsStr }] = await sql<any[]>`
            SELECT COUNT(*) as count FROM activities 
            WHERE status = 'pending' AND created_at > ${since}
          `
          const [{ count: memoriesAddedStr }] = await sql<any[]>`
            SELECT COUNT(*) as count FROM memories 
            WHERE created_at > ${since}
          `
          const [{ count: actionsDoneStr }] = await sql<any[]>`
            SELECT COUNT(*) as count FROM activities 
            WHERE status = 'completed' AND created_at > ${since}
          `
          const [{ count: callsMadeStr }] = await sql<any[]>`
            SELECT COUNT(*) as count FROM calls 
            WHERE started_at > ${since}
          `

          const payload = {
            totalSpend: 15.42, // placeholder; same as key route
            activeTasks: parseInt(activeTasksStr, 10),
            pendingApprovals: parseInt(pendingApprovalsStr, 10),
            memoriesAdded: parseInt(memoriesAddedStr, 10),
            actionsDone: parseInt(actionsDoneStr, 10),
            emailsSent: 0,
            callsMade: parseInt(callsMadeStr, 10),
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        } catch (e) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'metrics_error' })}\n\n`))
        }
      }, intervalMs)

      // @ts-ignore
      request.signal?.addEventListener('abort', () => clearInterval(timer))
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


