import type { ToolModule, ToolContext } from '../types';
import { sql } from '@/lib/db';

export const checkSubAgent: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'checkSubAgent',
      description: 'Check the status of a previously spawned sub-agent. Returns its current status and recent activities.',
      parameters: {
        type: 'object',
        properties: {
          subAgentId: { type: 'string', description: 'ID of the sub-agent to check' },
        },
        required: ['subAgentId'],
        additionalProperties: false,
      },
    },
  },
  async handler(args: any, context: ToolContext) {
    try {
      // Verify this sub-agent belongs to the parent
      const agents = await sql`
        SELECT id, name, status, parent_agent_id FROM agents
        WHERE id = ${args.subAgentId} AND parent_agent_id = ${context.agentId}
      `;

      if (agents.length === 0) {
        return { success: false, error: 'Sub-agent not found or does not belong to this agent' };
      }

      const subAgent = agents[0];

      // Get recent activities
      const activities = await sql`
        SELECT type, status, payload, created_at FROM activities
        WHERE agent_id = ${args.subAgentId}
        ORDER BY created_at DESC
        LIMIT 5
      `;

      return {
        success: true,
        subAgentId: subAgent.id,
        name: subAgent.name,
        status: subAgent.status,
        recentActivities: activities.map((a: any) => ({
          type: a.type,
          status: a.status,
          summary: a.payload?.title || a.payload?.content?.slice(0, 200) || a.type,
          createdAt: a.created_at,
        })),
      };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to check sub-agent' };
    }
  },
};
