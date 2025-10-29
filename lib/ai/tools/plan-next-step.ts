import { tool } from 'ai'
import { z } from 'zod'

/**
 * Planner tool: The model must call this after each action to decide the next step.
 * It enforces a structured loop and clear stopping criteria.
 */
export const planNextStepTool = tool({
  description:
    'Plan the next step in an iterative research workflow. Always call this after each action. Choose among: "startResearchSession" to open a session; "firecrawlResearch" to search+scrape top 3; "completeResearchSession" to finalize; "browserTask" for interactive actions; "askUser" for clarification; or "stop" when finished.',
  inputSchema: z.object({
    nextAction: z.enum(['startResearchSession', 'firecrawlResearch', 'completeResearchSession', 'browserTask', 'askUser', 'stop']).describe('What to do next'),
    task: z
      .string()
      .optional()
      .describe('If nextAction is firecrawlResearch/browserTask, describe the specific query or action'),
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


