import type { ToolModule, ToolContext } from '../types';
import { createPendingActivityStep, updateAgentStatusStep } from '../../workflows/steps';

export const createCalendarEvent: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'createCalendarEvent',
      description: 'Create a Google Calendar event. Requires HITL approval — the workflow will pause until the user approves.',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Event title' },
          start: { type: 'string', description: 'Start time in ISO 8601 format (e.g., "2026-03-01T10:00:00-05:00")' },
          end: { type: 'string', description: 'End time in ISO 8601 format' },
          description: { type: 'string', description: 'Event description (optional)' },
          location: { type: 'string', description: 'Event location (optional)' },
          attendees: { type: 'array', items: { type: 'string' }, description: 'Attendee email addresses (optional)' },
        },
        required: ['summary', 'start', 'end'],
        additionalProperties: false,
      },
    },
  },
  requires: ['google'],
  async handler(args: any, context: ToolContext) {
    await createPendingActivityStep(
      context.agentId,
      'calendar_event_added',
      'high',
      { summary: args.summary, start: args.start, end: args.end, description: args.description, location: args.location, attendees: args.attendees }
    );

    await updateAgentStatusStep(context.agentId, {
      status: 'active',
      currentActivity: `Waiting for approval to create event: ${args.summary}`,
      currentTool: 'createCalendarEvent',
    });

    context.state.awaitingHumanInput = true;
    return { success: true, message: 'Calendar event queued for approval.' };
  },
};
