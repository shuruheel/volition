import { tool } from 'ai'
import { z } from 'zod'

/**
 * Planner tool: The model must call this after each action to decide the next step.
 * It enforces a structured loop and clear stopping criteria.
 */
export const planNextStepTool = tool({
  description:
    'Plan the next step in an iterative research workflow. Always call this after each action. Choose among: "firecrawlSearch" to discover sources; "firecrawlScrape" to extract content; "browserTask" for interactive/complex web actions; "askUser" for clarification; or "stop" when finished.',
  inputSchema: z.object({
    nextAction: z.enum(['firecrawlSearch', 'firecrawlScrape', 'browserTask', 'askUser', 'stop']).describe('What to do next'),
    task: z
      .string()
      .optional()
      .describe('If nextAction is firecrawlSearch/firecrawlScrape/browserTask, describe the specific query, URL, or action'),
    reason: z.string().describe('Brief rationale for the selected nextAction'),
    exitReason: z
      .string()
      .optional()
      .describe('If nextAction is stop, provide the reason for stopping'),
  }),
  execute: async ({ nextAction, task, reason, exitReason }) => {
    // Echo back the plan; the agent loop uses it to decide the next tool call
    return { nextAction, task, reason, exitReason }
  },
})


