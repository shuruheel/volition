import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Agent } from '@/lib/db';
import { executeAgentTask } from '@/lib/ai/agent';
import { withHITLGuidelines } from '@/lib/ai/prompts';
import { updateAgentStatus, clearAgentStatus } from '@/lib/agent-status';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/agents/:id/start
 * Start an agent (changes status to 'active')
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { task } = body;
    
    // Fetch agent
    const agents = await sql<Agent[]>`
      SELECT * FROM agents WHERE id = ${id}
    `;
    
    if (agents.length === 0) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }
    
    const agent = agents[0];
    
    // Check if already active
    if (agent.status === 'active') {
      return NextResponse.json(
        { error: 'Agent is already active' },
        { status: 400 }
      );
    }
    
    // Update status to active
    const [updatedAgent] = await sql<Agent[]>`
      UPDATE agents
      SET status = 'active', updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    
    // Start agent execution in the background
    // In production, this should use a job queue like BullMQ or Inngest
    executeAgentInBackground(updatedAgent, task).catch(error => {
      console.error('Background agent execution failed:', error);
      // Update status to error
      sql`
        UPDATE agents
        SET status = 'error', updated_at = NOW()
        WHERE id = ${id}
      `.catch(err => console.error('Failed to update agent status:', err));
    });
    
    return NextResponse.json({
      agent: updatedAgent,
      message: 'Agent started successfully',
    });
  } catch (error) {
    console.error('Failed to start agent:', error);
    return NextResponse.json(
      { error: 'Failed to start agent' },
      { status: 500 }
    );
  }
}

/**
 * Execute agent in background
 * In production, this should be moved to a job queue
 */
async function executeAgentInBackground(agent: Agent, task?: string) {
  const maxSteps = 40;
  
  try {
    console.log(`Starting agent ${agent.id} (${agent.name})`);
    
    // Initialize status
    await updateAgentStatus(agent.id, {
      status: 'active',
      currentStep: 0,
      totalSteps: maxSteps,
      currentActivity: 'Starting...',
    });
    
    // Use the agent's prompt or the provided task, with HITL guidance applied at system level in executeAgentTask
    const prompt = task || 'Continue with your assigned tasks based on your system prompt and follow HITL guidelines.';
    
    // Execute the agent task with status updates
    const result = await executeAgentTask(
      { agent, maxSteps },
      prompt,
      (update) => {
        // Update status in real-time with more informative activity text
        let activity = 'Processing';
        if (update.type === 'tool_call') {
          if (update.toolName === 'browserTask' && update.toolInput?.task) {
            activity = String(update.toolInput.task);
          } else {
            activity = `Calling ${update.toolName}`;
          }
        } else if (update.type === 'step') {
          activity = `Step ${update.stepNumber}/${maxSteps}`;
        } else if (update.type === 'text') {
          activity = 'Thinking...';
        } else if (update.type === 'error') {
          activity = 'Error occurred';
        }

        updateAgentStatus(agent.id, {
          status: 'active',
          currentStep: update.stepNumber || 0,
          totalSteps: maxSteps,
          currentActivity: activity,
          currentTool: update.toolName || null,
        }).catch(err => console.error('Failed to update status:', err));

        console.log(`Agent ${agent.id} progress:`, activity);
      }
    );
    
    // Get the result text
    const fullText = result.text;
    
    console.log(`Agent ${agent.id} completed:`, fullText);
    
    // Update agent status to idle
    await clearAgentStatus(agent.id);
    await sql`
      UPDATE agents
      SET status = 'idle', updated_at = NOW()
      WHERE id = ${agent.id}
    `;
    
    // Log completion activity
    try {
      await sql`
        INSERT INTO activities (agent_id, type, status, payload)
        VALUES (
          ${agent.id},
          'task_completed',
          'completed',
          ${JSON.stringify({
            task: prompt,
            result: fullText.substring(0, 500), // Truncate for storage
            completedAt: new Date().toISOString(),
          })}
        )
      `;
    } catch (e: any) {
      // Temporary fallback if migration 002 not applied and type not allowed
      if (e && e.code === '23514') {
        await sql`
          INSERT INTO activities (agent_id, type, status, payload)
          VALUES (
            ${agent.id},
            'research',
            'completed',
            ${JSON.stringify({
              task: prompt,
              result: fullText.substring(0, 500),
              completedAt: new Date().toISOString(),
              note: 'Fallback type used due to missing migration for task_completed',
            })}
          )
        `;
      } else {
        throw e;
      }
    }
  } catch (error) {
    console.error(`Agent ${agent.id} execution failed:`, error);
    
    // Update agent status to error
    await updateAgentStatus(agent.id, {
      status: 'error',
      currentActivity: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    await sql`
      UPDATE agents
      SET status = 'error', updated_at = NOW()
      WHERE id = ${agent.id}
    `.catch(err => console.error('Failed to update agent status:', err));
    
    throw error;
  }
}

