import { tool } from 'ai'
import { z } from 'zod'

export const completeResearchSessionTool = tool({
  description: `Complete a research session. This is the FINAL STEP of research workflow.

Call this when:
- You have gathered sufficient information (3-5+ firecrawlResearch calls)
- You have explored different angles of the topic
- You are ready to synthesize findings into a coherent summary

The summary should:
- Synthesize key findings from all research steps
- Include inline citations/links to sources
- Be structured with headers and bullet points
- Answer the original research question comprehensively

Do NOT call this immediately after startResearchSession - you must do actual research first!`,
  parameters: z.object({
    session_id: z.string().describe('Session ID from startResearchSession'),
    summary: z.string().optional().describe('Final markdown summary synthesizing all findings'),
  }),
  execute: async ({ session_id, summary }) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resp = await fetch(`${baseUrl}/api/research/sessions/${session_id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary }),
    })
    if (!resp.ok) {
      const err = await resp.text().catch(() => '')
      return { success: false as const, error: err }
    }
    const json = await resp.json()
    return { success: true as const, id: json.id, summary: json.summary }
  },
})


