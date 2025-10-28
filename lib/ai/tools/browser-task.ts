import { tool } from 'ai';
import { z } from 'zod';

/**
 * Browser task tool for AI agents
 * Uses Browser-Use Cloud for web automation
 */
export const browserTaskTool = tool({
  description: 'Execute a browser automation task like visiting websites, extracting data, filling forms, or clicking elements',
  inputSchema: z.object({
    task: z.string().describe('Natural language description of what to do in the browser, e.g., "Go to example.com and extract all product names"'),
    maxSteps: z.number().min(1).max(20).default(10).describe('Maximum number of steps the browser can take'),
  }),
  execute: async ({ task, maxSteps }) => {
    try {
      // Call the browser task API endpoint
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/browser/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, maxSteps }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Browser task failed: ${error}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        task_id: result.id,
        status: result.status,
        output: result.output,
        message: `Browser task completed: ${task}`,
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

