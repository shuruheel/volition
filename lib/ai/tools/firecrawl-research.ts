/**
 * LEGACY AGENT TOOL - For use with AI SDK generateText() only
 * 
 * This tool uses the AI SDK tool() helper and is compatible with generateText().
 * It also imports Node.js modules (firecrawl, supermemory) that cannot be used
 * in Vercel Workflow sandboxed environments.
 * 
 * DO NOT import into Vercel Workflows - workflows use inline tool definitions
 * with 'parameters' key and delegate logic to step functions.
 * 
 * Used by: lib/ai/agent.legacy.ts
 */

import { tool, generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { searchAndScrape } from '@/lib/integrations/firecrawl'
import { storeMarkdown } from '@/lib/integrations/supermemory'

export const firecrawlResearchTool = tool({
  description: `Search the web and scrape top results in one atomic operation. This is STEP 2+ of research workflow.
  
Use this tool to:
- Search and scrape 1-3 pages per query
- Store full content to Supermemory for long-term retrieval
- Generate concise summaries automatically
- Append findings to your active research session

Best practices:
- Call this 3-5 times per session with different angles/queries
- Use focused queries for better results (e.g., "Next.js caching strategies 2024" vs "Next.js")
- Vary your queries to cover different aspects of the topic
- Review results between calls to refine next query

Session linking:
- session_id is automatically detected from the active research session
- You can also provide session_id explicitly if needed
- If no session is active, research is still saved but not grouped`,
  inputSchema: z.object({
    query: z.string().min(2).max(400).describe('Focused search query'),
    limit: z.number().int().min(1).max(3).default(3).describe('Number of results to scrape (1-3)'),
    sources: z.array(z.enum(['web', 'news', 'images'])).optional().describe('Source types to search'),
    categories: z.array(z.enum(['github', 'research', 'pdf'])).optional().describe('Specific categories to prioritize'),
    session_id: z.string().optional().describe('Session ID from startResearchSession (auto-detected if not provided)'),
  }),
  execute: async ({ query, limit, sources, categories, session_id: providedSessionId }, { experimental_context }) => {
    const ctx = experimental_context as { 
      agentId?: string;
      currentSessionId?: string | (() => string | null);
    } | undefined
    const agentId = ctx?.agentId
    if (!agentId) {
      return { success: false as const, error: 'Missing agent id context' }
    }

    // Auto-detect session_id from context if not explicitly provided
    let sessionId = providedSessionId;
    if (!sessionId && ctx?.currentSessionId) {
      // Handle both direct value and getter function
      sessionId = typeof ctx.currentSessionId === 'function' 
        ? ctx.currentSessionId() 
        : ctx.currentSessionId;
    }

    try {
      const result = await searchAndScrape({ query, limit, sources, categories, scrapeOptions: { formats: ['markdown', 'links'] } })

      const leads: Array<{ url: string; title?: string; providerId?: string }> = []
      const notes: string[] = []
      const links: string[] = []

      for (const item of result.items) {
        if (!item.url) continue
        links.push(item.url)

        const md = (item.markdown ?? '').slice(0, 40000)
        if (md.length > 0) {
          const stored = await storeMarkdown({ agentId, url: item.url, title: item.title, markdown: md })
          leads.push({ url: item.url, title: item.title, providerId: stored.providerId })

          // Create compact per-page bullet summary
          let bullets = ''
          try {
            const { text } = await generateText({
              model: openai('gpt-4o-mini'),
              temperature: 0.2,
              prompt: `Summarize the following page into 4–8 concise bullets with 1 inline URL reference (${item.url}). Focus on concrete facts, methods, and metrics.\n\n${md.slice(0, 8000)}`,
            })
            bullets = text
          } catch {
            bullets = `- ${item.title ?? item.url}`
          }

          notes.push(bullets)
        }
      }

      // Append to session if available (either provided or auto-detected)
      if (sessionId) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        await fetch(`${baseUrl}/api/research/sessions/${sessionId}/append`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, links, notes }),
        })
        return { 
          success: true as const, 
          leads, 
          savedCount: notes.length,
          session_id: sessionId, // Return session_id so model knows it was linked
        }
      }

      // No session - research saved to Supermemory but not linked to a session
      return { 
        success: true as const, 
        leads, 
        savedCount: notes.length,
        warning: 'Research completed but not linked to a session (no active session found)',
      }
    } catch (error) {
      console.error('firecrawlResearch error:', error)
      return { success: false as const, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },
})


