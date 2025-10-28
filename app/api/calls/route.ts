import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * POST /api/calls
 * Initiate an outbound call (after user approval)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_id, to_number, context } = body;
    
    if (!agent_id || !to_number) {
      return NextResponse.json(
        { error: 'agent_id and to_number are required' },
        { status: 400 }
      );
    }
    
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 503 }
      );
    }
    
    // Create call record in database
    const callResult = await sql`
      INSERT INTO calls (agent_id, to_number, status)
      VALUES (${agent_id}, ${to_number}, 'queued')
      RETURNING *
    `;
    
    const call = callResult[0];
    
    // Get base URL for webhooks
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.com';
    
    try {
      // Initiate Twilio call
      const twilioCall = await twilioClient.calls.create({
        to: to_number,
        from: process.env.TWILIO_PHONE_NUMBER,
        url: `${baseUrl}/api/twilio/voice?callId=${call.id}&context=${encodeURIComponent(JSON.stringify(context))}`,
        statusCallback: `${baseUrl}/api/twilio/status?callId=${call.id}`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      });
      
      // Update call with Twilio SID
      await sql`
        UPDATE calls
        SET twilio_sid = ${twilioCall.sid}, status = 'initiated'
        WHERE id = ${call.id}
      `;
      
      return NextResponse.json({
        id: call.id,
        twilio_sid: twilioCall.sid,
        status: 'initiated',
      }, { status: 201 });
    } catch (twilioError) {
      // Update call status to failed
      await sql`
        UPDATE calls
        SET status = 'failed'
        WHERE id = ${call.id}
      `;
      
      throw twilioError;
    }
  } catch (error) {
    console.error('Failed to initiate call:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate call' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calls
 * List calls
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let query = 'SELECT * FROM calls WHERE 1=1';
    const params: any[] = [];
    
    if (agentId) {
      params.push(agentId);
      query += ` AND agent_id = $${params.length}`;
    }
    
    params.push(limit);
    query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    
    const calls = await sql(query, params);
    
    return NextResponse.json(calls);
  } catch (error) {
    console.error('Failed to fetch calls:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calls' },
      { status: 500 }
    );
  }
}

