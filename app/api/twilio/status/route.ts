import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import twilio from 'twilio';

// Set runtime to nodejs for Twilio webhooks
export const runtime = 'nodejs';

/**
 * POST /api/twilio/status
 * Twilio status callback webhook
 * Updates call status in database
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');
    
    if (!callId) {
      return NextResponse.json(
        { error: 'callId is required' },
        { status: 400 }
      );
    }
    
    // Validate webhook signature (optional but recommended)
    // const signature = request.headers.get('x-twilio-signature');
    // const url = request.url;
    // const params = await request.formData();
    // const valid = twilio.validateRequest(
    //   process.env.TWILIO_AUTH_TOKEN!,
    //   signature!,
    //   url,
    //   Object.fromEntries(params)
    // );
    // if (!valid) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    // }
    
    const formData = await request.formData();
    const callStatus = formData.get('CallStatus') as string;
    const duration = formData.get('CallDuration') as string;
    
    console.log('Twilio status callback:', { callId, callStatus, duration });
    
    // Map Twilio status to our status enum
    const statusMap: Record<string, string> = {
      'queued': 'initiated',
      'initiated': 'initiated',
      'ringing': 'ringing',
      'in-progress': 'in_progress',
      'answered': 'answered',
      'completed': 'completed',
      'busy': 'failed',
      'failed': 'failed',
      'no-answer': 'no_answer',
      'canceled': 'failed',
    };
    
    const mappedStatus = statusMap[callStatus] || 'failed';
    
    // Update call status
    if (mappedStatus === 'completed') {
      await sql`
        UPDATE calls
        SET status = ${mappedStatus}, ended_at = CURRENT_TIMESTAMP
        WHERE id = ${callId}
      `;
    } else {
      await sql`
        UPDATE calls
        SET status = ${mappedStatus}
        WHERE id = ${callId}
      `;
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Status callback error:', error);
    return NextResponse.json(
      { error: 'Failed to process status callback' },
      { status: 500 }
    );
  }
}

