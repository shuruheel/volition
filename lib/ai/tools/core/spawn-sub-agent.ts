import type { ToolModule, ToolContext } from '../types';
import { sql } from '@/lib/db';
import { logActivityStep } from '../../workflows/steps';

export const spawnSubAgent: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'spawnSubAgent',
      description: 'Spawn a sub-agent to handle a specific subtask asynchronously. The sub-agent runs in the background and results appear as activities. Use checkSubAgent to monitor progress.',
      parameters: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'The specific task for the sub-agent to complete' },
          tools: {
            type: 'array',
            items: { type: 'string' },
            description: 'Tools the sub-agent needs (e.g., ["firecrawl", "supermemory"]). Defaults to parent agent tools.',
          },
          maxSteps: { type: 'number', description: 'Max steps for the sub-agent (default 10)' },
        },
        required: ['task'],
        additionalProperties: false,
      },
    },
  },
  async handler(args: any, context: ToolContext) {
    try {
      // Check depth limit (max 3)
      let depth = 0;
      let currentId: string | null = context.agentId;
      while (currentId) {
        const rows = await sql`SELECT parent_agent_id FROM agents WHERE id = ${currentId}`;
        currentId = rows[0]?.parent_agent_id || null;
        if (currentId) depth++;
      }

      if (depth >= 3) {
        return { success: false, error: 'Maximum sub-agent depth (3) reached. Cannot spawn more sub-agents.' };
      }

      // Determine tools for sub-agent (restrict at depth 2+)
      let subTools = args.tools || context.enabledTools || [];
      if (depth >= 2) {
        // Restrict to read-only tools at depth 2+
        const readOnlyTools = ['firecrawl', 'supermemory'];
        subTools = subTools.filter((t: string) => readOnlyTools.includes(t));
      }

      const subMaxSteps = args.maxSteps || 10;

      // Create sub-agent record
      const subAgentRows = await sql`
        INSERT INTO agents (name, prompt, tools, status, user_id, parent_agent_id)
        VALUES (
          ${'Sub-agent: ' + args.task.slice(0, 50)},
          ${args.task},
          ${subTools},
          'active',
          ${context.userId || null},
          ${context.agentId}
        )
        RETURNING id
      `;
      const subAgentId = subAgentRows[0].id;

      // Log spawn activity
      await logActivityStep(context.agentId, 'task_completed', {
        title: 'Spawned sub-agent',
        subAgentId,
        task: args.task,
      });

      // Launch sub-agent asynchronously (fire-and-forget)
      const { runAgentInBackground } = await import('@/lib/agent-runner');
      runAgentInBackground(subAgentId, args.task, subMaxSteps, 'task');

      return {
        success: true,
        subAgentId,
        status: 'spawned',
        message: `Sub-agent spawned and running in background. Use checkSubAgent to monitor progress.`,
      };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Sub-agent spawn failed' };
    }
  },
};
