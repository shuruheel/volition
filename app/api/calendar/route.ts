import { NextRequest, NextResponse } from 'next/server';
import { listCalendarEvents, createCalendarEvent } from '@/lib/integrations/google';

/**
 * GET /api/calendar
 * List upcoming calendar events
 */
export async function GET(request: NextRequest) {
  try {
    const userId = 'mock-user-id';
    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get('timeMin') || undefined;
    const timeMax = searchParams.get('timeMax') || undefined;
    const maxResults = parseInt(searchParams.get('maxResults') || '20', 10);

    const events = await listCalendarEvents(userId, { timeMin, timeMax, maxResults });
    return NextResponse.json(events);
  } catch (error) {
    console.error('Failed to list calendar events:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list calendar events' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar
 * Create a calendar event (requires HITL approval in workflow context)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = 'mock-user-id';
    const body = await request.json();
    const { summary, start, end, description, location, attendees } = body;

    if (!summary || !start || !end) {
      return NextResponse.json(
        { error: 'summary, start, and end are required' },
        { status: 400 }
      );
    }

    const event = await createCalendarEvent(userId, {
      summary,
      start,
      end,
      description,
      location,
      attendees,
    });
    return NextResponse.json(event);
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}
