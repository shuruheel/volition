import type { ToolModule, ToolContext } from '../types';

export const searchEmails: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'searchEmails',
      description: 'Search Gmail for emails matching a query. Returns subject, from, date, and snippet.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Gmail search query (e.g., "from:user@example.com subject:invoice")' },
          maxResults: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
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
      const { listEmails } = await import('@/lib/integrations/google');
      if (!context.userId) throw new Error('User authentication required for this operation');
      const emails = await listEmails(context.userId, {
        query: args.query,
        maxResults: args.maxResults || 10,
      });
      return { success: true, emails, count: emails.length };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to search emails' };
    }
  },
};
