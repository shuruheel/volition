import type { ToolModule, ToolContext } from '../types';
import { createPendingActivityStep, updateAgentStatusStep } from '../../workflows/steps';

export const askUser: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'askUser',
      description: 'Ask the user a question when you need clarification, especially about research priorities or directions. Use this when: (1) you\'ve completed a research session and need guidance on what to research next, (2) you\'re unsure which research direction to pursue, (3) multiple valid research paths exist and you need user preference. The workflow will pause until answered. DO NOT ask questions only in text - use this tool.',
      parameters: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'Your question to the user. Be specific about what you need clarification on, especially regarding research priorities or next steps.',
          },
          priority: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
        },
        required: ['question'],
        additionalProperties: false,
      },
    },
  },
  async handler(args: any, context: ToolContext) {
    await createPendingActivityStep(
      context.agentId,
      'user_input',
      args.priority || 'medium',
      { question: args.question }
    );

    await updateAgentStatusStep(context.agentId, {
      status: 'active',
      currentActivity: 'Waiting for user input',
      currentTool: 'askUser',
    });

    context.state.awaitingHumanInput = true;
    return { success: true, message: 'Question posted, workflow pausing.' };
  },
};
