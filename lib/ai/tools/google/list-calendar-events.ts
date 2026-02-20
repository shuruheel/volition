import type { ToolModule, ToolContext } from '../types';

export const listCalendarEvents: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'listCalendarEvents',
      description: 'List upcoming Google Calendar events.',
      parameters: {
        type: 'object',
        properties: {
          timeMin: { type: 'string', description: 'Start of time range in ISO 8601 (defaults to now)' },
          timeMax: { type: 'string', description: 'End of time range in ISO 8601 (optional)' },
          maxResults: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
        additionalProperties: false,
      },
    },
  },
  requires: ['google'],
  requiresAuth: true,
  async handler(args: any, context: ToolContext) {
    try {
      const { listCalendarEvents: gcalList } = await import('@/lib/integrations/google');
      if (!context.userId) throw new Error('User authentication required for this operation');
      const events = await gcalList(context.userId, {
        timeMin: args.timeMin,
        timeMax: args.timeMax,
        maxResults: args.maxResults || 20,
      });
      return { success: true, events, count: events.length };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to list calendar events' };
    }
  },
};
