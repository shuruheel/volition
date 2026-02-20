import type { ToolModule, ToolContext } from '../types';
import { sql } from '@/lib/db';

export const updateMemory: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'updateMemory',
      description: 'Write or update a memory file in your persistent storage (replaces the full file content). Suggested files: soul.md, preferences.md, knowledge.md, journal.md. You can also create any custom .md file (e.g., project-notes.md, meeting-notes.md).',
      parameters: {
        type: 'object',
        properties: {
          filename: {
            type: 'string',
            description: 'Memory file to update (e.g., soul.md, preferences.md, knowledge.md, journal.md, or any custom .md filename)',
          },
          content: {
            type: 'string',
            description: 'Full markdown content for the file (replaces existing content)',
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
      const { writeMemoryFile } = await import('@/lib/integrations/google-drive');
      const { storeMemoryInSupermemory } = await import('@/lib/integrations/supermemory');
      const agentRows = await sql`SELECT name FROM agents WHERE id = ${context.agentId}`;
      const agentName = agentRows[0]?.name || 'Agent';
      const fileId = await writeMemoryFile(context.userId, context.agentId, agentName, args.filename, args.content);
      await storeMemoryInSupermemory(context.agentId, args.filename, args.content, context.userId);
      return { success: true, filename: args.filename, fileId };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to update memory file' };
    }
  },
};
