import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAgentOwnership, requireUserId } from '@/lib/auth';
import { decrypt } from '@/lib/crypto';
import twilio from 'twilio';

/**
 * Resolve Twilio config: per-user tool_configs first, env var fallback.
 */
async function resolveTwilioConfig(userId?: string | null): Promise<{
  accountSid?: string;
  authToken?: string;
  phoneNumber?: string;
}> {
  if (userId) {
    try {
      const configs = await sql`
        SELECT data_encrypted FROM tool_configs
        WHERE user_id = ${userId} AND tool = 'twilio'
      `;
      if (configs.length > 0 && configs[0].data_encrypted) {
        const data = JSON.parse(decrypt(configs[0].data_encrypted));
        if (data.accountSid && data.authToken) {
          return {
            accountSid: data.accountSid,
            authToken: data.authToken,
            phoneNumber: data.phoneNumber,
          };
        }
      }
    } catch {
      // Fall through to env vars
    }
  }
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  };
}

/**
 * POST /api/calls
 * Initiate an outbound call (after user approval, scoped to authenticated user's agents)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_id, to_number, context } = body;

    if (!agent_id || !to_number) {
      return NextResponse.json({ error: 'agent_id and to_number are required' }, { status: 400 });
    }

    const userId = await requireAgentOwnership(agent_id);

    const twilioConfig = await resolveTwilioConfig(userId);
    if (!twilioConfig.accountSid || !twilioConfig.authToken || !twilioConfig.phoneNumber) {
      return NextResponse.json({ error: 'Twilio credentials not configured' }, { status: 503 });
    }

    const twilioClient = twilio(twilioConfig.accountSid, twilioConfig.authToken);

    const callResult = await sql`
      INSERT INTO calls (agent_id, to_number, status)
      VALUES (${agent_id}, ${to_number}, 'queued')
      RETURNING *
    `;
    const call = callResult[0];

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.com';

    try {
      const twilioCall = await twilioClient.calls.create({
        to: to_number,
        from: twilioConfig.phoneNumber,
        url: `${baseUrl}/api/twilio/voice?callId=${call.id}&context=${encodeURIComponent(JSON.stringify(context))}`,
        statusCallback: `${baseUrl}/api/twilio/status?callId=${call.id}`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      });

      await sql`
        UPDATE calls SET twilio_sid = ${twilioCall.sid}, status = 'initiated' WHERE id = ${call.id}
      `;

      return NextResponse.json({ id: call.id, twilio_sid: twilioCall.sid, status: 'initiated' }, { status: 201 });
    } catch (twilioError) {
      await sql`UPDATE calls SET status = 'failed' WHERE id = ${call.id}`;
      throw twilioError;
    }
  } catch (error: any) {
    if (error?.message === 'Agent not found' || error?.message === 'Authentication required') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Authentication required' ? 401 : 404 });
    }
    console.error('Failed to initiate call:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to initiate call' }, { status: 500 });
  }
}

/**
 * GET /api/calls
 * List calls (scoped to authenticated user's agents)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const calls = agentId
      ? await sql`
          SELECT c.* FROM calls c
          JOIN agents ag ON ag.id = c.agent_id
          WHERE ag.user_id = ${userId} AND c.agent_id = ${agentId}
          ORDER BY c.created_at DESC LIMIT ${limit}
        `
      : await sql`
          SELECT c.* FROM calls c
          JOIN agents ag ON ag.id = c.agent_id
          WHERE ag.user_id = ${userId}
          ORDER BY c.created_at DESC LIMIT ${limit}
        `;

    return NextResponse.json(calls);
  } catch (error) {
    console.error('Failed to fetch calls:', error);
    return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
  }
}
