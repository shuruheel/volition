import { NextRequest, NextResponse } from 'next/server';
import { listEmails, sendEmail } from '@/lib/integrations/google';

/**
 * GET /api/email
 * List emails matching a query
 */
export async function GET(request: NextRequest) {
  try {
    const userId = 'mock-user-id';
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const maxResults = parseInt(searchParams.get('maxResults') || '10', 10);

    const emails = await listEmails(userId, { query, maxResults });
    return NextResponse.json(emails);
  } catch (error) {
    console.error('Failed to list emails:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list emails' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/email
 * Send an email (requires HITL approval in workflow context)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = 'mock-user-id';
    const body = await request.json();
    const { to, subject, body: emailBody, cc, bcc } = body;

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'to, subject, and body are required' },
        { status: 400 }
      );
    }

    const result = await sendEmail(userId, { to, subject, body: emailBody, cc, bcc });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to send email:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}
