import type { ToolModule, ToolContext } from '../types';
import { completeResearchSessionStep } from '../../workflows/steps';

export const completeResearchSession: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'completeResearchSession',
      description: `Finalize a research session with a comprehensive summary. After completing a session, you MUST analyze what you've learned, identify knowledge gaps in your system prompt, and plan your next research session. If unclear about priorities, use askUser to seek guidance before starting a new session. This is part of your continuous research process - do NOT stop after completing one session.`,
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: 'Comprehensive markdown summary synthesizing all findings from this research session. Include key insights, citations, and structured information.',
          },
        },
        required: ['summary'],
        additionalProperties: false,
      },
    },
  },
  requires: ['firecrawl'],
  async handler(args: any, context: ToolContext) {
    if (!context.state.currentSessionId) {
      return { success: false, error: 'No active session' };
    }

    await completeResearchSessionStep(context.state.currentSessionId, args.summary);
    const completedId = context.state.currentSessionId;
    context.state.currentSessionId = null;
    context.state.researchStarted = false;
    context.state.researchSessionCompleted = true;
    return { success: true, session_id: completedId };
  },
};
