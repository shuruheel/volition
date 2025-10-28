import { tool } from 'ai';
import { z } from 'zod';

/**
 * Create a pending activity that requires human approval before proceeding.
 * The agent MUST wait for approval and poll using checkApprovalStatus.
 */
export const createPendingActivityTool = tool({
  description:
    'Create a pending activity requiring human approval. Use before phone calls, sending emails, calendar changes, or financial actions.',
  inputSchema: z.object({
    type: z.enum([
      'phone_call',
      'email_sent',
      'calendar_event_added',
      'calendar_event_modified',
      'financial',
    ]),
    payload: z.record(z.any()),
    reasoning: z
      .string()
      .describe('Explain why this action is needed and expected outcome'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  }),
  execute: async (
    { type, payload, reasoning, priority },
    { experimental_context }
  ) => {
    try {
      const context = experimental_context as { agentId?: string } | undefined;
      const agentId = context?.agentId;

      if (!agentId) {
        throw new Error('Agent ID not found in context');
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          type,
          status: 'pending',
          priority,
          payload: {
            ...payload,
            reasoning,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create pending activity: ${error}`);
      }

      const result = await response.json();

      return {
        success: true,
        activity_id: result.id,
        status: 'pending' as const,
        message:
          'Pending activity created. Wait for approval and poll using checkApprovalStatus.'
      };
    } catch (error) {
      console.error('Create pending activity error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to create pending activity',
      };
    }
  },
});


