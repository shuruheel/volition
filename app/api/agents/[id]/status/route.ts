import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export interface AgentStatus {
  agentId: string;
  status: 'idle' | 'active' | 'error';
  currentStep: number;
  totalSteps: number;
  currentActivity: string | null;
  currentTool: string | null;
  lastUpdate: string;
}

/**
 * GET /api/agents/:id/status
 * Get current agent status for real-time UI updates
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
    // Get agent status from database
    const statusRows = await sql<AgentStatus[]>`
      SELECT 
        agent_id as "agentId",
        status,
        current_step as "currentStep",
        total_steps as "totalSteps",
        current_activity as "currentActivity",
        current_tool as "currentTool",
        last_update as "lastUpdate"
      FROM agent_status
      WHERE agent_id = ${id}
    `;
    
    if (statusRows.length === 0) {
      // No status record yet, return idle status
      return NextResponse.json({
        agentId: id,
        status: 'idle',
        currentStep: 0,
        totalSteps: 0,
        currentActivity: null,
        currentTool: null,
        lastUpdate: new Date().toISOString(),
      });
    }
    
    return NextResponse.json(statusRows[0]);
  } catch (error) {
    console.error('Failed to fetch agent status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/:id/status
 * Update agent status (internal use by agent execution)
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    const {
      status,
      currentStep = 0,
      totalSteps = 0,
      currentActivity = null,
      currentTool = null,
    } = body;
    
    // Upsert status
    const statusRows = await sql<AgentStatus[]>`
      INSERT INTO agent_status (agent_id, status, current_step, total_steps, current_activity, current_tool)
      VALUES (${id}, ${status}, ${currentStep}, ${totalSteps}, ${currentActivity}, ${currentTool})
      ON CONFLICT (agent_id)
      DO UPDATE SET
        status = ${status},
        current_step = ${currentStep},
        total_steps = ${totalSteps},
        current_activity = ${currentActivity},
        current_tool = ${currentTool},
        last_update = NOW()
      RETURNING 
        agent_id as "agentId",
        status,
        current_step as "currentStep",
        total_steps as "totalSteps",
        current_activity as "currentActivity",
        current_tool as "currentTool",
        last_update as "lastUpdate"
    `;
    
    return NextResponse.json(statusRows[0]);
  } catch (error) {
    console.error('Failed to update agent status:', error);
    return NextResponse.json(
      { error: 'Failed to update agent status' },
      { status: 500 }
    );
  }
}

