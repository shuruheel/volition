import { tool } from 'ai'
import { z } from 'zod'

export const startResearchSessionTool = tool({
  description: `Start a new research session. This is STEP 1 of a multi-step research workflow.
  
CRITICAL: After calling this tool, you MUST:
1. Call firecrawlResearch at least 3-5 times with different focused queries
2. Review findings and call firecrawlResearch again if you need more information
3. Call completeResearchSession to finalize with a summary

Research is ITERATIVE. Do NOT stop after creating the session. The session is just a container - you must populate it with actual research.

Returns session_id for use in subsequent firecrawlResearch calls.`,
  parameters: z.object({
    title: z.string().optional().describe('Brief title for this research session'),
  }),
  execute: async ({ title }, { experimental_context }) => {
    const ctx = experimental_context as { agentId?: string } | undefined
    const agentId = ctx?.agentId
    if (!agentId) return { success: false as const, error: 'Missing agent id context' }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resp = await fetch(`${baseUrl}/api/research/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agentId, title }),
    })
    if (!resp.ok) {
      const err = await resp.text().catch(() => '')
      return { success: false as const, error: err }
    }
    const json = await resp.json()
    return { success: true as const, session_id: json.session_id as string }
  },
})


