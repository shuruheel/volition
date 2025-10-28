import { tool, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

/**
 * Browser task tool for AI agents
 * Uses Browser-Use Cloud for web automation.
 * Prefer Firecrawl tools (firecrawlSearch/firecrawlScrape) for research and content extraction.
 * Use this tool for interactive flows (logins, forms, bookings) or when Firecrawl cannot access content.
 */
export const browserTaskTool = tool({
  description: 'Execute a browser automation task like visiting websites, extracting data, filling forms, or clicking elements',
  inputSchema: z.object({
    task: z
      .string()
      .describe('Natural language description of what to do in the browser, e.g., "Go to example.com and extract all product names"'),
    maxSteps: z.number().min(1).max(20).default(10).describe('Maximum number of steps the browser can take'),
    allowedDomains: z.array(z.string()).optional().describe('Optional domain allowlist to speed up navigation and avoid detours'),
  }),
  execute: async ({ task, maxSteps, allowedDomains }, { experimental_context }) => {
    try {
      // Call the browser task API endpoint
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/browser/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, maxSteps, wait: true, timeoutMs: 120000, allowedDomains }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Browser task failed: ${error}`);
      }

      const result = await response.json();

      // Persist research output if present
      const ctx = experimental_context as { agentId?: string } | undefined;
      const agentId = ctx?.agentId;
      if (agentId && result?.output) {
        const raw = typeof result.output === 'string' ? result.output : JSON.stringify(result.output)

        // Extract URLs (best-effort)
        const urlRegex = /https?:\/\/[^\s)\]]+/g
        const urls = Array.from(raw.matchAll(urlRegex)).map(m => m[0]).slice(0, 20)

        // Create a concise content summary from the actual browser output
        let contentSummary: string | null = null;
        try {
          const { text } = await generateText({
            model: openai('gpt-4o-mini'),
            temperature: 0.3,
            prompt: `Extract concrete findings from the following web content.\n- Identify article titles and include their URLs.\n- Prefer technical details (methods, datasets, results).\n- 8–12 concise bullet points.\n\nCONTENT:\n${raw.slice(0, 8000)}\n\nIf you reference an item, include its URL inline in parentheses.`,
          });
          contentSummary = text;
        } catch (e) {
          // Fallback to a trimmed slice of output
          contentSummary = typeof result.output === 'string' ? result.output.slice(0, 500) : 'Browser task completed.';
        }
        // Store memory reference
        try {
          await fetch(`${baseUrl}/api/memories/store`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agent_id: agentId,
              provider_id: `browser-task:${result.id}`,
              kind: 'document',
              metadata: { task, output: result.output },
            }),
          });
        } catch (e) {
          console.error('Failed to store memory:', e);
        }
        // Log research activity summary
        // Only create a research activity if actual content was found
        const hasMeaningfulContent = (contentSummary && contentSummary.trim().length > 120) || urls.length > 0
        if (hasMeaningfulContent) {
          try {
            await fetch(`${baseUrl}/api/activities`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                agent_id: agentId,
                type: 'research',
                status: 'completed',
                payload: {
                  title: 'Research result',
                  description: contentSummary,
                  task,
                  liveUrl: result.liveUrl,
                  links: urls,
                },
              }),
            });
          } catch (e) {
            console.error('Failed to log research activity:', e);
          }
        }
      }

      const message = result.status === 'pending' ? 'Browser task queued' : `Browser task completed: ${task}`;
      return {
        success: true,
        task_id: result.id,
        status: result.status,
        output: result.output,
        message,
        liveUrl: result.liveUrl,
      };
    } catch (error) {
      console.error('Browser task error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Browser task failed',
      };
    }
  },
});

