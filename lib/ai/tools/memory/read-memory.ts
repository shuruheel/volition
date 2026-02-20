import type { ToolModule, ToolContext } from '../types';

export const readMemory: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'readMemory',
      description: 'Read a memory file from your persistent storage. Suggested files: soul.md (personality/style), preferences.md (learned user preferences), knowledge.md (accumulated research), journal.md (activity summaries). You can also read any custom .md file you previously created.',
      parameters: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: 'Memory file to read (e.g., soul.md, preferences.md, knowledge.md, journal.md, or any custom .md file)',
          },
        },
        required: ['filename'],
        additionalProperties: false,
      },
    },
  },
  requires: ['google'],
  requiresAuth: true,
  async handler(args: any, context: ToolContext) {
    if (!context.userId) {
      return { success: false, error: 'No user context for memory access' };
    }
    try {
      const { readMemoryFile } = await import('@/lib/integrations/google-drive');
      const content = await readMemoryFile(context.userId, context.agentId, args.filename);
      return { success: true, filename: args.filename, content: content || '' };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to read memory file' };
    }
  },
};
