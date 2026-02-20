import type { ToolModule, ToolContext } from '../types';
import { planResearchQueriesStep } from '../../workflows/steps';

export const planResearchQueries: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'planResearchQueries',
      description: 'Decompose a research topic into focused search queries. This tool checks Supermemory for existing research to avoid duplication and generates 3-5 high-quality search queries that explore different angles. Use this BEFORE calling firecrawlResearch to ensure better query quality and avoid redundant research.',
      parameters: {
        type: 'object',
        properties: {
          researchTopic: {
            type: 'string',
            description: 'The research topic or title to decompose into focused search queries',
          },
        },
        required: ['researchTopic'],
        additionalProperties: false,
      },
    },
  },
  requires: ['firecrawl'],
  async handler(args: any, context: ToolContext) {
    const planResult = await planResearchQueriesStep(
      context.agentId,
      args.researchTopic,
      context.systemPrompt,
      context.userId,
      context.modelProvider,
      context.modelId
    );
    return {
      success: true,
      queries: planResult.queries,
      existingResearch: planResult.existingResearch,
      message: `Planned ${planResult.queries.length} focused queries. ${planResult.existingResearch ? 'Found existing research - queries are designed to avoid duplication and explore new angles.' : 'No existing research found - queries explore the topic broadly.'}`,
    };
  },
};
