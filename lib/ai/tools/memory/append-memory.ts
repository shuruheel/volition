import type { ToolModule, ToolContext } from '../types';
import { sql } from '@/lib/db';

export const appendMemory: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'appendMemory',
      description: 'Append content to a memory file without replacing existing content. Great for journal entries, meeting notes, and incremental knowledge building.',
      parameters: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: 'Memory file to append to (e.g., journal.md, meeting-notes.md)',
          },
          content: {
            type: 'string',
            description: 'Markdown content to append',
          },
        },
        required: ['filename', 'content'],
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
      const { appendMemoryFile } = await import('@/lib/integrations/google-drive');
      const { storeMemoryInSupermemory } = await import('@/lib/integrations/supermemory');
      const agentRows = await sql`SELECT name FROM agents WHERE id = ${context.agentId}`;
      const agentName = agentRows[0]?.name || 'Agent';
      const { fileId, fullContent } = await appendMemoryFile(context.userId, context.agentId, agentName, args.filename, args.content);
      await storeMemoryInSupermemory(context.agentId, args.filename, fullContent, context.userId);
      return { success: true, filename: args.filename, fileId };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to append to memory file' };
    }
  },
};
