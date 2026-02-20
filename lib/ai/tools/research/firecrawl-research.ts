import type { ToolModule, ToolContext } from '../types';
import { executeResearchStep, appendToSessionStep } from '../../workflows/steps';

export const firecrawlResearch: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'firecrawlResearch',
      description: 'Search and scrape the web using a focused query. For best results, first use planResearchQueries to get optimized queries based on existing research. Call multiple times with different queries to explore various angles.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 3, default: 3 },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  requires: ['firecrawl'],
  async handler(args: any, context: ToolContext) {
    if (!context.state.currentSessionId) {
      return { success: false, error: 'No active session' };
    }

    context.state.researchStarted = true;

    try {
      const res = await executeResearchStep(
        context.agentId,
        args.query,
        context.state.currentSessionId,
        context.userId
      );
      const links = res.leads.map((l: any) => l.url);
      const notes = res.leads.map((l: any) => `${l.title}: ${l.url}`);
      await appendToSessionStep(context.state.currentSessionId, args.query, links, notes);
      return {
        success: true,
        itemsScraped: res.itemsScraped,
        session_id: context.state.currentSessionId,
        leadsCount: res.leads.length,
      };
    } catch (error) {
      console.error(`[firecrawlResearch] Error:`, error instanceof Error ? error.message : String(error));
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
};
