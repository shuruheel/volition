import type { ToolModule, ToolContext } from '../types';
import { executeBrowserStep } from '../../workflows/steps';

export const browserTask: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'browserTask',
      description: 'Execute browser automation tasks',
      parameters: {
        type: 'object',
        properties: {
          task: { type: 'string' },
          maxSteps: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
        },
        required: ['task'],
        additionalProperties: false,
      },
    },
  },
  requires: ['browser'],
  async handler(args: any, context: ToolContext) {
    return await executeBrowserStep(context.agentId, args.task, args.maxSteps || 10, context.userId);
  },
};
