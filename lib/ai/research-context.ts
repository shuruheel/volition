import { sql } from '@/lib/db'

interface ResearchRow {
  id: string
  created_at: string | Date
  payload: Record<string, any> | null
}

/**
 * Build a brief prior-research context from recent completed research activities.
 */
export async function getRecentResearchContext(agentId: string, limit: number = 5): Promise<string | null> {
  const rows = await sql<ResearchRow[]>`
    SELECT id, created_at, payload
    FROM activities
    WHERE agent_id = ${agentId}
      AND type = 'research'
      AND status = 'completed'
    ORDER BY created_at DESC
    LIMIT ${limit}
  `

  if (rows.length === 0) return null

  const lines: string[] = []
  for (const r of rows.reverse()) {
    const p = (r.payload ?? {}) as Record<string, any>
    const title = typeof p.title === 'string' ? p.title : 'Research result'
    const desc = typeof p.description === 'string' ? p.description : ''
    const task = typeof p.task === 'string' ? p.task : ''
    const liveUrl = typeof p.liveUrl === 'string' ? p.liveUrl : undefined
    lines.push(`- ${title}${task ? ` (task: ${task})` : ''}${liveUrl ? ` [live](${liveUrl})` : ''}: ${desc.slice(0, 500)}`)
  }

  return `Previous research you already completed (do not repeat):\n${lines.join('\n')}`
}


