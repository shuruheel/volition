import type { ToolModule, ToolContext } from '../types';

export const searchMemory: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'searchMemory',
      description: 'Semantically search across all your memory files. Use this to recall information from your persistent storage without knowing which specific file contains it.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language search query',
          },
          limit: {
            type: 'number',
            description: 'Max results (default 5)',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  requires: ['google'],
  requiresAuth: true,
  async handler(args: any, context: ToolContext) {
    try {
      const { searchAgentMemory } = await import('@/lib/integrations/supermemory');
      const results = await searchAgentMemory(context.agentId, args.query, args.limit || 5, context.userId);
      return {
        success: true,
        results: results.map((r: any) => ({
          filename: r.filename,
          content: r.content.slice(0, 2000),
          score: r.score,
        })),
        count: results.length,
      };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to search memory' };
    }
  },
};
