import { sql } from './db';

export interface AgentStatusUpdate {
  status: 'idle' | 'active' | 'error';
  currentStep?: number;
  totalSteps?: number;
  currentActivity?: string | null;
  currentTool?: string | null;
}

/**
 * Update agent status in database
 * Used by agent execution to provide real-time updates
 */
export async function updateAgentStatus(
  agentId: string,
  update: AgentStatusUpdate
) {
  try {
    await sql`
      INSERT INTO agent_status (agent_id, status, current_step, total_steps, current_activity, current_tool)
      VALUES (
        ${agentId},
        ${update.status},
        ${update.currentStep ?? 0},
        ${update.totalSteps ?? 0},
        ${update.currentActivity ?? null},
        ${update.currentTool ?? null}
      )
      ON CONFLICT (agent_id)
      DO UPDATE SET
        status = ${update.status},
        current_step = ${update.currentStep ?? 0},
        total_steps = ${update.totalSteps ?? 0},
        current_activity = ${update.currentActivity ?? null},
        current_tool = ${update.currentTool ?? null},
        last_update = NOW()
    `;
  } catch (error) {
    console.error('Failed to update agent status:', error);
  }
}

/**
 * Get current agent status
 */
export async function getAgentStatus(agentId: string) {
  try {
    const statusRows = await sql`
      SELECT 
        agent_id as "agentId",
        status,
        current_step as "currentStep",
        total_steps as "totalSteps",
        current_activity as "currentActivity",
        current_tool as "currentTool",
        last_update as "lastUpdate"
      FROM agent_status
      WHERE agent_id = ${agentId}
    `;
    
    return statusRows[0] || null;
  } catch (error) {
    console.error('Failed to get agent status:', error);
    return null;
  }
}

/**
 * Clear agent status (set to idle)
 */
export async function clearAgentStatus(agentId: string) {
  await updateAgentStatus(agentId, {
    status: 'idle',
    currentStep: 0,
    totalSteps: 0,
    currentActivity: null,
    currentTool: null,
  });
}

