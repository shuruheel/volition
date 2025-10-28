import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Activity, Agent } from '@/lib/db';
import { executeAgentTask } from '@/lib/ai/agent';
import { updateAgentStatus, clearAgentStatus } from '@/lib/agent-status';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/activities/:id/approve
 * Approve a pending activity
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
    const result = await sql<Activity[]>`
      UPDATE activities
      SET status = 'approved'
      WHERE id = ${id} AND status = 'pending'
      RETURNING *
    `;
    
    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Activity not found or not pending' },
        { status: 404 }
      );
    }
    
    const activity = result[0];

    // If approving a user_input, acknowledge and resume the agent
    if (activity.type === 'user_input') {
      const answer = (activity.payload as any)?.answer;
      if (typeof answer === 'string' && answer.length > 0) {
        // Create a chat acknowledgement activity (rendered in chat)
        await sql`
          INSERT INTO activities (agent_id, type, status, payload)
          VALUES (
            ${activity.agent_id},
            'research',
            'completed',
            ${JSON.stringify({ content: `Thanks, received: "${answer}". Continuing now.`, chatAck: true })}
          )
        `;

        // Fetch agent
        const agents = await sql<Agent[]>`SELECT * FROM agents WHERE id = ${activity.agent_id}`;
        const agent = agents[0];
        if (agent) {
          // Mark active
          await sql`UPDATE agents SET status = 'active', updated_at = NOW() WHERE id = ${agent.id}`;
          await updateAgentStatus(agent.id, {
            status: 'active',
            currentActivity: 'Resuming after user answer',
            currentTool: null,
            currentStep: 0,
            totalSteps: 20,
          });

          // Resume in background
          (async () => {
            try {
              const prompt = `The user answered your question: "${answer}". Acknowledge briefly and continue with your assigned tasks.`;
              const result = await executeAgentTask({ agent, maxSteps: 20 }, prompt, (update) => {
                updateAgentStatus(agent.id, {
                  status: 'active',
                  currentActivity: update.type === 'tool_call' ? `Calling ${update.toolName}` : update.type === 'step' ? `Step ${update.stepNumber}/20` : update.type === 'text' ? 'Thinking...' : 'Processing',
                  currentTool: update.toolName || null,
                  currentStep: update.stepNumber || 0,
                  totalSteps: 20,
                }).catch(() => {});
              });

              // On completion
              await clearAgentStatus(agent.id);
              await sql`UPDATE agents SET status = 'idle', updated_at = NOW() WHERE id = ${agent.id}`;
              await sql`
                INSERT INTO activities (agent_id, type, status, payload)
                VALUES (
                  ${agent.id},
                  'task_completed',
                  'completed',
                  ${JSON.stringify({ result: result.text?.slice(0, 500) || '' })}
                )
              `;
            } catch (e) {
              await updateAgentStatus(agent.id, { status: 'error', currentActivity: 'Error after resume' });
              await sql`UPDATE agents SET status = 'error', updated_at = NOW() WHERE id = ${agent.id}`;
            }
          })();
        }
      }
    }

    return NextResponse.json(activity);
  } catch (error) {
    console.error('Failed to approve activity:', error);
    return NextResponse.json(
      { error: 'Failed to approve activity' },
      { status: 500 }
    );
  }
}

