import { NextRequest } from 'next/server';
import { WebSocket } from 'ws';
import { sql } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

// Set runtime to nodejs for WebSocket support
export const runtime = 'nodejs';

/**
 * WebSocket proxy between Twilio Media Streams and OpenAI Realtime API
 * 
 * Flow:
 * 1. Twilio connects to this endpoint via WebSocket
 * 2. This proxy connects to OpenAI Realtime API
 * 3. Audio is bidirectionally streamed between Twilio and OpenAI
 * 4. OpenAI transcription and responses are handled
 */

// Store active connections (in production, use Redis or similar)
const activeConnections = new Map<string, {
  twilioWs: WebSocket;
  openaiWs: WebSocket;
  callId: string;
  transcript: string[];
}>();

export async function GET(request: NextRequest) {
  const upgradeHeader = request.headers.get('upgrade');
  
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket', { status: 426 });
  }
  
  const { searchParams } = new URL(request.url);
  const callId = searchParams.get('callId');
  const context = searchParams.get('context');
  
  if (!callId) {
    return new Response('callId required', { status: 400 });
  }
  
  console.log('WebSocket upgrade requested for call:', callId);
  
  // In Next.js Route Handlers, WebSocket upgrade is not directly supported
  // You'll need to use a custom server or Vercel Edge functions with WebSocket support
  // For now, return a placeholder response
  
  return new Response(
    'WebSocket endpoint. Deploy with custom server for full functionality.',
    { status: 200 }
  );
}

/**
 * Helper function to handle Twilio Media Stream events
 */
function handleTwilioMessage(
  message: string,
  openaiWs: WebSocket,
  connection: any
) {
  try {
    const data = JSON.parse(message);
    
    switch (data.event) {
      case 'start':
        console.log('Twilio stream started:', data.start);
        connection.streamSid = data.start.streamSid;
        break;
        
      case 'media':
        // Forward audio to OpenAI (convert from Twilio's g711 μ-law base64)
        if (openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: data.media.payload, // Base64 encoded audio
          }));
        }
        break;
        
      case 'stop':
        console.log('Twilio stream stopped');
        if (openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.close();
        }
        break;
    }
  } catch (error) {
    console.error('Error handling Twilio message:', error);
  }
}

/**
 * Helper function to handle OpenAI Realtime API events
 */
function handleOpenAIMessage(
  message: string,
  twilioWs: WebSocket,
  connection: any
) {
  try {
    const data = JSON.parse(message);
    
    switch (data.type) {
      case 'response.audio.delta':
        // Forward audio to Twilio (OpenAI sends base64 encoded audio)
        if (twilioWs.readyState === WebSocket.OPEN) {
          twilioWs.send(JSON.stringify({
            event: 'media',
            streamSid: connection.streamSid,
            media: {
              payload: data.delta, // Base64 audio chunk
            },
          }));
        }
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        // User speech transcription
        console.log('User said:', data.transcript);
        connection.transcript.push(`User: ${data.transcript}`);
        break;
        
      case 'response.text.delta':
        // AI response text (for logging)
        console.log('AI response:', data.delta);
        break;
        
      case 'response.done':
        // Response completed
        if (data.response?.output?.[0]?.content?.[0]?.transcript) {
          const aiText = data.response.output[0].content[0].transcript;
          console.log('AI said:', aiText);
          connection.transcript.push(`AI: ${aiText}`);
        }
        break;
        
      case 'error':
        console.error('OpenAI error:', data.error);
        break;
    }
  } catch (error) {
    console.error('Error handling OpenAI message:', error);
  }
}

/**
 * Initialize OpenAI Realtime WebSocket connection
 */
async function resolveOpenAIKeyForCall(callId: string): Promise<string> {
  // Look up the call's agent owner to resolve their OpenAI key
  const calls = await sql`
    SELECT a.user_id FROM calls c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.id = ${callId}
  `;
  if (calls.length > 0) {
    const userId = calls[0].user_id;
    const configs = await sql`
      SELECT data_encrypted FROM tool_configs
      WHERE user_id = ${userId} AND tool = 'openai'
    `;
    if (configs.length > 0) {
      const data = JSON.parse(await decrypt(configs[0].data_encrypted));
      if (data.apiKey) return data.apiKey;
    }
  }
  // Fallback to env var for platform-level key
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  throw new Error('No OpenAI API key available for this call');
}

async function connectToOpenAI(callId: string, context: string): Promise<WebSocket> {
  const apiKey = await resolveOpenAIKeyForCall(callId);
  const openaiWs = new WebSocket(
    'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01',
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    }
  );
  
  return new Promise((resolve, reject) => {
    openaiWs.on('open', () => {
      console.log('OpenAI WebSocket connected');
      
      // Configure session
      openaiWs.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: context || 'You are a helpful AI assistant on a phone call.',
          voice: 'alloy',
          input_audio_format: 'g711_ulaw',
          output_audio_format: 'g711_ulaw',
          input_audio_transcription: {
            model: 'whisper-1',
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
        },
      }));
      
      resolve(openaiWs);
    });
    
    openaiWs.on('error', (error) => {
      console.error('OpenAI WebSocket error:', error);
      reject(error);
    });
  });
}

/**
 * Save transcript when call ends
 */
async function saveTranscript(callId: string, transcript: string[]) {
  try {
    const transcriptText = transcript.join('\n');
    
    // Trigger summary generation
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/calls/${callId}/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript: transcriptText }),
    });
  } catch (error) {
    console.error('Failed to save transcript:', error);
  }
}

