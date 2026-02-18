import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Activity } from '@/lib/db';
import { requireActivityOwnership } from '@/lib/auth';

export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/activities/:id/approve
 * Approve a pending activity, execute the action if needed,
 * and trigger a continuation workflow run.
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    await requireActivityOwnership(id);

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
    const agentId = activity.agent_id;
    const payload = (activity.payload || {}) as Record<string, any>;

    // Get agent's user_id for integration calls
    const [agentRow] = await sql<any[]>`SELECT user_id FROM agents WHERE id = ${agentId}`;
    const userId = agentRow?.user_id as string | null;

    // Claim agent as active (atomic — only if not already active)
    const claimed = await sql<any[]>`
      UPDATE agents SET status = 'active', updated_at = NOW()
      WHERE id = ${agentId} AND status != 'active'
      RETURNING id
    `;

    if (claimed.length === 0) {
      console.log(`[Approve] Agent ${agentId} already active, skipping continuation`);
      return NextResponse.json({ success: true, activity, continued: false });
    }

    console.log(`[Approve] Processing ${activity.type} for agent ${agentId}`);

    try {
      switch (activity.type) {
        case 'user_input': {
          // User answered the question — trigger continuation
          const { runAgentInBackground } = await import('@/lib/agent-runner');
          runAgentInBackground(
            agentId,
            'The user answered your question. Check the most recent chat history for their response and continue accordingly.',
            10,
            'chat'
          );
          break;
        }

        case 'email_sent': {
          // Actually send the email, then trigger continuation
          if (!userId) {
            throw new Error('User authentication required for email');
          }
          const { sendEmail } = await import('@/lib/integrations/google');
          await sendEmail(userId, {
            to: payload.to,
            subject: payload.subject,
            body: payload.body,
            cc: payload.cc,
            bcc: payload.bcc,
          });
          console.log(`[Approve] Email sent to ${payload.to}`);

          const { runAgentInBackground } = await import('@/lib/agent-runner');
          runAgentInBackground(
            agentId,
            `The email to ${payload.to} (subject: "${payload.subject}") was approved and sent successfully. Continue with your task.`,
            10,
            'chat'
          );
          break;
        }

        case 'calendar_event_added': {
          // Actually create the calendar event, then trigger continuation
          if (!userId) {
            throw new Error('User authentication required for calendar');
          }
          const { createCalendarEvent } = await import('@/lib/integrations/google');
          await createCalendarEvent(userId, {
            summary: payload.summary,
            start: payload.start,
            end: payload.end,
            description: payload.description,
            location: payload.location,
            attendees: payload.attendees,
          });
          console.log(`[Approve] Calendar event created: ${payload.summary}`);

          const { runAgentInBackground } = await import('@/lib/agent-runner');
          runAgentInBackground(
            agentId,
            `The calendar event "${payload.summary}" was approved and created successfully. Continue with your task.`,
            10,
            'chat'
          );
          break;
        }

        case 'phone_call': {
          // Trigger continuation
          const { runAgentInBackground } = await import('@/lib/agent-runner');
          runAgentInBackground(
            agentId,
            'The phone call was approved. Continue with your task.',
            10,
            'chat'
          );
          break;
        }

        default: {
          // Generic approval — trigger continuation
          const { runAgentInBackground } = await import('@/lib/agent-runner');
          runAgentInBackground(
            agentId,
            `Activity "${activity.type}" was approved. Continue with your task.`,
            10,
            'chat'
          );
        }
      }

      console.log('[Approve] Continuation triggered successfully');
    } catch (error) {
      console.error('[Approve] Failed to execute action or trigger continuation:', error);
      // Reset agent to idle on failure
      await sql`UPDATE agents SET status = 'idle', updated_at = NOW() WHERE id = ${agentId}`;
    }

    return NextResponse.json({
      success: true,
      activity,
      continued: true,
    });
  } catch (error) {
    console.error('Failed to approve activity:', error);
    return NextResponse.json(
      { error: 'Failed to approve activity' },
      { status: 500 }
    );
  }
}
