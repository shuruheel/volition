import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

// Set runtime to nodejs for Twilio webhooks
export const runtime = 'nodejs';

/**
 * POST /api/twilio/voice
 * TwiML response for outbound calls
 * Connects to WebSocket stream for OpenAI Realtime API
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get('callId');
    const context = searchParams.get('context');
    
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    
    // Get base URL for WebSocket
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.com';
    const wsUrl = baseUrl.replace(/^https/, 'wss').replace(/^http/, 'ws');
    
    // Say greeting
    twiml.say({
      voice: 'Polly.Joanna',
    }, 'Hello, connecting you now.');
    
    // Connect to WebSocket stream
    const connect = twiml.connect();
    connect.stream({
      url: `${wsUrl}/api/twilio/stream?callId=${callId}&context=${encodeURIComponent(context || '')}`,
    });
    
    // Return TwiML as XML
    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('TwiML generation error:', error);
    
    // Return error TwiML
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say('An error occurred. Please try again later.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      status: 500,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}

