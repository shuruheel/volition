import type { ToolModule, ToolContext } from '../types';
import { startResearchSessionStep } from '../../workflows/steps';

export const startResearchSession: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'startResearchSession',
      description: 'Start a new research session and initialize tracking',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title for the research session' },
        },
        required: ['title'],
        additionalProperties: false,
      },
    },
  },
  requires: ['firecrawl'],
  async handler(args: any, context: ToolContext) {
    const res = await startResearchSessionStep(context.agentId, args.title);
    context.state.currentSessionId = res.session_id;
    context.state.researchStarted = false;
    return { success: true, session_id: res.session_id };
  },
};
