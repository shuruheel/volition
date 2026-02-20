import type { ToolModule, ToolContext } from '../types';
import { logActivityStep } from '../../workflows/steps';

export const logActivity: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'logActivity',
      description: 'Log a completed activity to the database. Use this to record important events like completed research, viewed webpages, tasks done, etc.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              'research', 'email_sent', 'phone_call', 'webpage_viewed',
              'journal_read', 'task_completed', 'agent_stopped', 'agent_message',
            ],
            description: 'Type of activity being logged',
          },
          payload: {
            type: 'object',
            additionalProperties: true,
            description: 'Activity details (title, description, url, etc.)',
          },
        },
        required: ['type', 'payload'],
        additionalProperties: false,
      },
    },
  },
  async handler(args: any, context: ToolContext) {
    const validTypes = [
      'research', 'email_sent', 'phone_call', 'webpage_viewed',
      'journal_read', 'task_completed', 'agent_stopped', 'agent_message',
    ];

    if (!validTypes.includes(args.type)) {
      return {
        success: false,
        error: `Invalid activity type: ${args.type}. Must be one of: ${validTypes.join(', ')}`,
      };
    }

    const payload = args.payload || {};
    await logActivityStep(context.agentId, args.type, payload);
    return { success: true };
  },
};
