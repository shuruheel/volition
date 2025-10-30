import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Activity } from '@/lib/db';
import { userInputHook, phoneCallHook, emailApprovalHook, activityApprovalHook } from '@/lib/ai/workflows/hooks';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/activities/:id/reject
 * Reject a pending activity and resume workflow with rejection
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
    const result = await sql<Activity[]>`
      UPDATE activities
      SET status = 'rejected'
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

    // Resume workflow with rejection based on activity type
    const token = `agent-${activity.agent_id}-activity-${id}`;
    
    console.log(`[Reject] Resuming workflow for ${activity.type} with rejection, token: ${token}`);

    try {
      switch (activity.type) {
        case 'user_input': {
          // For user_input, we can send a rejection message
          console.log('[Reject] Resuming user input with rejection');
          await userInputHook.resume(token, {
            answer: '[USER_REJECTED]', // Special marker for rejection
            activityId: id,
          });
          break;
        }
        
        case 'phone_call': {
          console.log('[Reject] Resuming phone call with rejection');
          await phoneCallHook.resume(token, {
            approved: false,
            activityId: id,
          });
          break;
        }
        
        case 'email_sent': {
          console.log('[Reject] Resuming email with rejection');
          await emailApprovalHook.resume(token, {
            approved: false,
            activityId: id,
          });
          break;
        }
        
        default: {
          console.log(`[Reject] Resuming generic activity with rejection: ${activity.type}`);
          await activityApprovalHook.resume(token, {
            approved: false,
            activityId: id,
          });
        }
      }
      
      console.log('[Reject] Workflow resumed with rejection');
    } catch (error) {
      console.error('[Reject] Failed to resume workflow:', error);
      // Don't fail the rejection if hook.resume fails - workflow might not be waiting
    }

    return NextResponse.json({
      success: true,
      activity,
      resumed: true,
    });
  } catch (error) {
    console.error('Failed to reject activity:', error);
    return NextResponse.json(
      { error: 'Failed to reject activity' },
      { status: 500 }
    );
  }
}

