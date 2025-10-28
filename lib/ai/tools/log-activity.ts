import { tool } from 'ai';
import { z } from 'zod';

/**
 * Log activity tool for AI agents
 * Records agent activities to the database
 */
export const logActivityTool = tool({
  description: 'Log an activity or milestone completed by the agent',
  inputSchema: z.object({
    type: z.enum(['research', 'email_sent', 'webpage_viewed', 'journal_read']).describe('Type of activity'),
    payload: z.record(z.any()).describe('Activity details and metadata'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium').describe('Activity priority'),
  }),
  execute: async ({ type, payload }, { experimental_context }) => {
    try {
      // Extract agent_id from context
      const context = experimental_context as { agentId?: string };
      const agentId = context?.agentId;

      if (!agentId) {
        throw new Error('Agent ID not found in context');
      }

      // Call the activities API endpoint
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          type,
          status: 'completed',
          payload,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to log activity: ${error}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        activity_id: result.id,
        message: `Activity logged: ${type}`,
      };
    } catch (error) {
      console.error('Log activity error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to log activity',
      };
    }
  },
});

