import { tool } from 'ai';
import { z } from 'zod';
import { updateAgentStatus } from '@/lib/agent-status';

/**
 * Ask the user for clarification/input.
 * Creates a pending 'user_input' activity and updates agent status to waiting.
 */
export const askUserTool = tool({
  description:
    'Ask the human user a question when you need clarification. This creates a pending user_input activity and waits for a response.',
  inputSchema: z.object({
    question: z.string().describe('The question to ask the user'),
    context: z
      .record(z.any())
      .optional()
      .describe('Optional context to help the user answer'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  }),
  execute: async ({ question, context, priority }, { experimental_context }) => {
    try {
      const ctx = experimental_context as { agentId?: string } | undefined;
      const agentId = ctx?.agentId;
      if (!agentId) throw new Error('Agent ID not found in context');

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      // Create pending activity of type 'user_input'
      const resp = await fetch(`${baseUrl}/api/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          type: 'user_input',
          status: 'pending',
          priority,
          payload: {
            question,
            context: context ?? {},
          },
        }),
      });
      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Failed to create user_input activity: ${err}`);
      }
      const activity = await resp.json();

      // Update status to waiting for user input (keep status 'active')
      await updateAgentStatus(agentId, {
        status: 'active',
        currentActivity: 'Waiting for user input',
        currentTool: 'askUser',
      });

      return {
        success: true,
        activity_id: activity.id,
        status: 'pending' as const,
        message:
          'Asked the user a question. Wait for a response and poll status using checkApprovalStatus.',
      };
    } catch (error) {
      console.error('askUser error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to ask user for input',
      };
    }
  },
});


