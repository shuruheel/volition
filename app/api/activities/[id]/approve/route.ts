import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Activity } from '@/lib/db';
import { userInputHook, phoneCallHook, emailApprovalHook, activityApprovalHook } from '@/lib/ai/workflows/hooks';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/activities/:id/approve
 * Approve a pending activity and resume workflow via hooks
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

    // Resume workflow based on activity type using hooks
    const token = `agent-${activity.agent_id}-activity-${id}`;
    
    console.log(`[Approve] Resuming workflow for ${activity.type} with token: ${token}`);

    try {
      switch (activity.type) {
        case 'user_input': {
          const answer = (activity.payload as any)?.answer || '';
          console.log(`[Approve] Resuming user input with answer: ${answer}`);
          await userInputHook.resume(token, {
            answer,
            activityId: id,
          });
          break;
        }
        
        case 'phone_call': {
          console.log('[Approve] Resuming phone call approval');
          await phoneCallHook.resume(token, {
            approved: true,
            activityId: id,
          });
          break;
        }
        
        case 'email_sent': {
          console.log('[Approve] Resuming email approval');
          await emailApprovalHook.resume(token, {
            approved: true,
            activityId: id,
          });
          break;
        }
        
        default: {
          console.log(`[Approve] Resuming generic activity: ${activity.type}`);
          await activityApprovalHook.resume(token, {
            approved: true,
            activityId: id,
          });
        }
      }
      
      console.log('[Approve] Workflow resumed successfully');
    } catch (error) {
      console.error('[Approve] Failed to resume workflow:', error);
      // Don't fail the approval if hook.resume fails - workflow might not be waiting
    }

    return NextResponse.json({
      success: true,
      activity,
      resumed: true,
    });
  } catch (error) {
    console.error('Failed to approve activity:', error);
    return NextResponse.json(
      { error: 'Failed to approve activity' },
      { status: 500 }
    );
  }
}

