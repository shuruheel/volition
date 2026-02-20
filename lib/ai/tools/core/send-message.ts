import type { ToolModule, ToolContext } from '../types';
import { logActivityStep } from '../../workflows/steps';

export const sendMessage: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'sendMessage',
      description: 'Send a message to the user. Unlike askUser (which pauses the workflow and waits for a reply), this just posts a message and continues execution. Use this for greetings, status updates, confirmations, and any time you want to communicate without blocking.',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'The message content to send to the user (supports markdown)',
          },
        },
        required: ['content'],
        additionalProperties: false,
      },
    },
  },
  async handler(args: any, context: ToolContext) {
    await logActivityStep(context.agentId, 'agent_message', { content: args.content });
    context.state.usedSendMessage = true;
    return { success: true };
  },
};
