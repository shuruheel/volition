# Twilio + OpenAI Realtime API - Code Walkthrough

Complete walkthrough of the Node.js implementation for building a real-time AI voice assistant.

> **Source**: [GitHub Repository](https://github.com/twilio-samples/speech-assistant-openai-realtime-api-node)

## Overview

This document provides a detailed explanation of the `index.js` file that powers the Twilio + OpenAI Realtime API integration. The application creates a bridge between Twilio's phone system and OpenAI's Realtime API, enabling natural voice conversations with an AI assistant.

## Architecture Flow

```
Phone Call → Twilio → Your Server → WebSocket → OpenAI Realtime API
    ↓                      ↓                          ↓
 Audio In           Media Streams              Audio Processing
    ↑                      ↑                          ↑
Phone Call ← Twilio ← Your Server ← WebSocket ← OpenAI Response
```

## Dependencies

```javascript
import Fastify from 'fastify';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
```

### Package Breakdown

- **Fastify**: High-performance web framework for handling HTTP requests and WebSocket connections
- **ws**: WebSocket client for Node.js to connect to OpenAI
- **dotenv**: Load environment variables from `.env` file
- **@fastify/formbody**: Parse URL-encoded form data from Twilio webhooks
- **@fastify/websocket**: WebSocket support for Fastify

## Environment Setup

```javascript
dotenv.config();

const { OPENAI_API_KEY } = process.env;

if (!OPENAI_API_KEY) {
  console.error('Missing OpenAI API key. Please set it in the .env file.');
  process.exit(1);
}
```

**Required Environment Variables:**
- `OPENAI_API_KEY`: Your OpenAI API key with Realtime API access
- `PORT`: (Optional) Server port, defaults to 5050

## Configuration Constants

```javascript
const SYSTEM_MESSAGE = 'You are a helpful and bubbly AI assistant who loves to chat about anything the user is interested about and is prepared to offer them facts. You have a penchant for dad jokes, owl jokes, and rickrolling – subtly. Always stay positive, but work in a joke when appropriate.';

const VOICE = 'alloy';
const TEMPERATURE = 0.8;
const PORT = process.env.PORT || 5050;
```

### Configuration Options

| Constant | Purpose | Default Value |
|----------|---------|---------------|
| `SYSTEM_MESSAGE` | AI personality and instructions | Helpful, bubbly assistant |
| `VOICE` | OpenAI voice model | 'alloy' |
| `TEMPERATURE` | Response randomness (0.0-1.0) | 0.8 |
| `PORT` | Server port | 5050 |

**Available Voices**: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`

## Logging Configuration

```javascript
const LOG_EVENT_TYPES = [
  'error',
  'response.content.done',
  'rate_limits.updated',
  'response.done',
  'input_audio_buffer.committed',
  'input_audio_buffer.speech_stopped',
  'input_audio_buffer.speech_started',
  'session.created',
  'session.updated'
];

const SHOW_TIMING_MATH = false;
```

Enable `SHOW_TIMING_MATH` to see detailed timing calculations for audio synchronization and truncation events.

## Server Initialization

```javascript
const fastify = Fastify();
fastify.register(fastifyFormBody);
fastify.register(fastifyWs);
```

Registers plugins for:
1. Parsing form data from Twilio webhooks
2. WebSocket support for Media Streams

## Root Route

```javascript
fastify.get('/', async (request, reply) => {
  reply.send({ message: 'Twilio Media Stream Server is running!' });
});
```

Health check endpoint to verify server is running.

## Incoming Call Handler

```javascript
fastify.all('/incoming-call', async (request, reply) => {
  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
  <Response>
    <Say voice="Google.en-US-Chirp3-HD-Aoede">Please wait while we connect your call to the A. I. voice assistant, powered by Twilio and the Open A I Realtime API</Say>
    <Pause length="1"/>
    <Say voice="Google.en-US-Chirp3-HD-Aoede">O.K. you can start talking!</Say>
    <Connect>
      <Stream url="wss://${request.headers.host}/media-stream" />
    </Connect>
  </Response>`;
  
  reply.type('text/xml').send(twimlResponse);
});
```

### What This Does

1. **Receives incoming call** from Twilio
2. **Plays greeting** using Google's text-to-speech voice
3. **Initiates Media Stream** connection to `/media-stream` WebSocket endpoint
4. **Returns TwiML** (Twilio Markup Language) XML response

### TwiML Breakdown

- `<Say>`: Text-to-speech announcement
- `<Pause>`: Brief silence (1 second)
- `<Connect>`: Establish connection
- `<Stream>`: Start Media Stream to WebSocket URL

## Media Stream WebSocket Handler

This is the core of the application where all the magic happens.

### Connection Setup

```javascript
fastify.register(async (fastify) => {
  fastify.get('/media-stream', { websocket: true }, (connection, req) => {
    console.log('Client connected');
    
    // Connection-specific state
    let streamSid = null;
    let latestMediaTimestamp = 0;
    let lastAssistantItem = null;
    let markQueue = [];
    let responseStartTimestampTwilio = null;
```

### State Variables Explained

| Variable | Purpose |
|----------|---------|
| `streamSid` | Twilio Media Stream identifier |
| `latestMediaTimestamp` | Latest audio timestamp from Twilio |
| `lastAssistantItem` | Last AI response item ID for truncation |
| `markQueue` | Queue of mark events to track audio playback |
| `responseStartTimestampTwilio` | Timestamp when AI response started playing |

### OpenAI WebSocket Connection

```javascript
const openAiWs = new WebSocket(
  `wss://api.openai.com/v1/realtime?model=gpt-realtime&temperature=${TEMPERATURE}`,
  {
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    }
  }
);
```

Establishes WebSocket connection to OpenAI's Realtime API with:
- **Model**: `gpt-realtime` (GPT-4 Realtime)
- **Temperature**: Controls response randomness
- **Authorization**: Bearer token with API key

## Session Initialization

```javascript
const initializeSession = () => {
  const sessionUpdate = {
    type: 'session.update',
    session: {
      type: 'realtime',
      model: "gpt-realtime",
      output_modalities: ["audio"],
      audio: {
        input: {
          format: { type: 'audio/pcmu' },
          turn_detection: { type: "server_vad" }
        },
        output: {
          format: { type: 'audio/pcmu' },
          voice: VOICE
        }
      },
      instructions: SYSTEM_MESSAGE,
    },
  };
  
  console.log('Sending session update:', JSON.stringify(sessionUpdate));
  openAiWs.send(JSON.stringify(sessionUpdate));
};
```

### Session Configuration Breakdown

**Audio Format**: `audio/pcmu` (μ-law, 8kHz)
- This matches Twilio's audio format for optimal compatibility
- No transcoding required between Twilio and OpenAI

**Turn Detection**: `server_vad` (Voice Activity Detection)
- OpenAI detects when the user stops speaking
- Automatically triggers AI response generation
- No manual end-of-turn signal needed

**Output Modalities**: `["audio"]`
- AI responds with audio only (no text)
- Optimized for voice conversations

**Instructions**: System message defines AI personality

## Optional: AI Speaks First

```javascript
const sendInitialConversationItem = () => {
  const initialConversationItem = {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: 'Greet the user with "Hello there! I am an AI voice assistant powered by Twilio and the OpenAI Realtime API. You can ask me for facts, jokes, or anything you can imagine. How can I help you?"'
        }
      ]
    }
  };
  
  openAiWs.send(JSON.stringify(initialConversationItem));
  openAiWs.send(JSON.stringify({ type: 'response.create' }));
};
```

**To Enable**: Uncomment `// sendInitialConversationItem();` in `initializeSession()`

This creates a synthetic "user" message to prompt the AI to greet the caller first.

## Interrupt Handling (AI Preemption)

```javascript
const handleSpeechStartedEvent = () => {
  if (markQueue.length > 0 && responseStartTimestampTwilio != null) {
    const elapsedTime = latestMediaTimestamp - responseStartTimestampTwilio;
    
    if (SHOW_TIMING_MATH) {
      console.log(`Calculating elapsed time for truncation: ${latestMediaTimestamp} - ${responseStartTimestampTwilio} = ${elapsedTime}ms`);
    }
    
    if (lastAssistantItem) {
      const truncateEvent = {
        type: 'conversation.item.truncate',
        item_id: lastAssistantItem,
        content_index: 0,
        audio_end_ms: elapsedTime
      };
      
      if (SHOW_TIMING_MATH) {
        console.log('Sending truncation event:', JSON.stringify(truncateEvent));
      }
      
      openAiWs.send(JSON.stringify(truncateEvent));
    }
    
    connection.send(JSON.stringify({
      event: 'clear',
      streamSid: streamSid
    }));
    
    // Reset state
    markQueue = [];
    lastAssistantItem = null;
    responseStartTimestampTwilio = null;
  }
};
```

### How Interruption Works

1. **User starts speaking** while AI is talking
2. **OpenAI sends** `input_audio_buffer.speech_started` event
3. **Calculate elapsed time** since AI response started
4. **Send truncate event** to OpenAI with exact audio position
5. **Clear Twilio buffer** to stop AI audio playback
6. **Reset state** for next response

This provides natural conversation flow where users can interrupt the AI mid-sentence.

## Mark Queue System

```javascript
const sendMark = (connection, streamSid) => {
  if (streamSid) {
    const markEvent = {
      event: 'mark',
      streamSid: streamSid,
      mark: { name: 'responsePart' }
    };
    
    connection.send(JSON.stringify(markEvent));
    markQueue.push('responsePart');
  }
};
```

**Purpose**: Track audio playback state

- Send `mark` events to Twilio for each audio chunk
- Twilio echoes marks back when audio finishes playing
- Used to determine if AI is still speaking (for interruption handling)

## OpenAI WebSocket Event Handlers

### On Open

```javascript
openAiWs.on('open', () => {
  console.log('Connected to the OpenAI Realtime API');
  setTimeout(initializeSession, 100);
});
```

Wait 100ms after connection before initializing session.

### On Message (Receiving AI Responses)

```javascript
openAiWs.on('message', (data) => {
  try {
    const response = JSON.parse(data);
    
    if (LOG_EVENT_TYPES.includes(response.type)) {
      console.log(`Received event: ${response.type}`, response);
    }
    
    // Handle audio delta (AI speaking)
    if (response.type === 'response.output_audio.delta' && response.delta) {
      const audioDelta = {
        event: 'media',
        streamSid: streamSid,
        media: { payload: response.delta }
      };
      
      connection.send(JSON.stringify(audioDelta));
      
      // Track start timestamp for first delta
      if (!responseStartTimestampTwilio) {
        responseStartTimestampTwilio = latestMediaTimestamp;
        if (SHOW_TIMING_MATH) {
          console.log(`Setting start timestamp for new response: ${responseStartTimestampTwilio}ms`);
        }
      }
      
      if (response.item_id) {
        lastAssistantItem = response.item_id;
      }
      
      sendMark(connection, streamSid);
    }
    
    // Handle speech detection
    if (response.type === 'input_audio_buffer.speech_started') {
      handleSpeechStartedEvent();
    }
  } catch (error) {
    console.error('Error processing OpenAI message:', error, 'Raw message:', data);
  }
});
```

### Key Events Processed

| Event Type | Action |
|------------|--------|
| `response.output_audio.delta` | Stream audio chunk to Twilio |
| `input_audio_buffer.speech_started` | Handle user interruption |
| `response.done` | Response generation complete |
| `error` | Log error details |

## Twilio WebSocket Event Handlers

```javascript
connection.on('message', (message) => {
  try {
    const data = JSON.parse(message);
    
    switch (data.event) {
      case 'media':
        latestMediaTimestamp = data.media.timestamp;
        
        if (SHOW_TIMING_MATH) {
          console.log(`Received media message with timestamp: ${latestMediaTimestamp}ms`);
        }
        
        if (openAiWs.readyState === WebSocket.OPEN) {
          const audioAppend = {
            type: 'input_audio_buffer.append',
            audio: data.media.payload
          };
          openAiWs.send(JSON.stringify(audioAppend));
        }
        break;
        
      case 'start':
        streamSid = data.start.streamSid;
        console.log('Incoming stream has started', streamSid);
        
        // Reset state for new stream
        responseStartTimestampTwilio = null;
        latestMediaTimestamp = 0;
        break;
        
      case 'mark':
        if (markQueue.length > 0) {
          markQueue.shift();
        }
        break;
        
      default:
        console.log('Received non-media event:', data.event);
        break;
    }
  } catch (error) {
    console.error('Error parsing message:', error, 'Message:', message);
  }
});
```

### Twilio Event Types

| Event | Purpose | Action |
|-------|---------|--------|
| `media` | Audio chunk from caller | Forward to OpenAI |
| `start` | Stream initialization | Save stream ID, reset state |
| `mark` | Audio playback marker | Remove from mark queue |
| `stop` | Stream ended | Clean up connection |

## Connection Cleanup

```javascript
connection.on('close', () => {
  if (openAiWs.readyState === WebSocket.OPEN) openAiWs.close();
  console.log('Client disconnected.');
});

openAiWs.on('close', () => {
  console.log('Disconnected from the OpenAI Realtime API');
});

openAiWs.on('error', (error) => {
  console.error('Error in the OpenAI WebSocket:', error);
});
```

Proper cleanup ensures:
- No orphaned WebSocket connections
- Resources are freed
- Errors are logged

## Server Startup

```javascript
fastify.listen({ port: PORT }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server is listening on port ${PORT}`);
});
```

Starts the Fastify server on the configured port.

## Complete Flow Diagram

```
1. Phone Call Received
   ↓
2. Twilio hits /incoming-call webhook
   ↓
3. TwiML response initiates Media Stream
   ↓
4. WebSocket connection to /media-stream
   ↓
5. Server connects to OpenAI Realtime API
   ↓
6. Session initialized with configuration
   ↓
7. Bidirectional audio streaming begins:
   
   User Audio:
   Phone → Twilio → Server → OpenAI
   
   AI Audio:
   OpenAI → Server → Twilio → Phone
   ↓
8. Continuous loop until call ends
   ↓
9. Cleanup and disconnect
```

## Audio Format Details

### Twilio Side (μ-law)
- **Format**: `audio/pcmu` (G.711 μ-law)
- **Sample Rate**: 8 kHz
- **Channels**: Mono
- **Encoding**: Base64

### OpenAI Side
- **Input Format**: `audio/pcmu`
- **Output Format**: `audio/pcmu`
- **Sample Rate**: 8 kHz
- **Encoding**: Base64

**Perfect Match**: No transcoding required, minimizing latency!

## Timing and Synchronization

### Why Timing Matters

1. **Interrupt Handling**: Need exact position to truncate AI response
2. **Audio Sync**: Ensure audio chunks arrive in order
3. **Mark Tracking**: Know when AI finishes speaking

### Timestamp Tracking

```javascript
// When audio arrives from Twilio
latestMediaTimestamp = data.media.timestamp;

// When AI starts responding
responseStartTimestampTwilio = latestMediaTimestamp;

// Calculate elapsed time for truncation
const elapsedTime = latestMediaTimestamp - responseStartTimestampTwilio;
```

## Configuration Tips

### System Message Customization

Modify `SYSTEM_MESSAGE` to change AI behavior:

```javascript
// Professional assistant
const SYSTEM_MESSAGE = 'You are a professional business assistant. Be concise, accurate, and helpful.';

// Technical support
const SYSTEM_MESSAGE = 'You are a technical support specialist. Help users troubleshoot issues step by step.';

// Sales representative
const SYSTEM_MESSAGE = 'You are a friendly sales representative. Listen to customer needs and provide relevant product information.';
```

### Voice Selection

```javascript
const VOICE = 'alloy';  // Neutral, balanced
const VOICE = 'echo';   // Warm, friendly
const VOICE = 'fable';  // Expressive, enthusiastic
const VOICE = 'onyx';   // Deep, authoritative
const VOICE = 'nova';   // Upbeat, energetic
const VOICE = 'shimmer'; // Soft, gentle
```

### Temperature Adjustment

```javascript
const TEMPERATURE = 0.3;  // More focused, deterministic
const TEMPERATURE = 0.8;  // Balanced (default)
const TEMPERATURE = 1.2;  // More creative, varied
```

## Debugging

### Enable Detailed Logging

```javascript
const SHOW_TIMING_MATH = true;  // Show timing calculations
```

### Add Custom Event Logging

```javascript
const LOG_EVENT_TYPES = [
  'error',
  'response.content.done',
  'rate_limits.updated',
  'response.done',
  'input_audio_buffer.committed',
  'input_audio_buffer.speech_stopped',
  'input_audio_buffer.speech_started',
  'session.created',
  'session.updated',
  'response.audio_transcript.delta',  // Add transcript logging
  'conversation.item.created'          // Add conversation tracking
];
```

### Monitor WebSocket Messages

```javascript
// Log all OpenAI messages
openAiWs.on('message', (data) => {
  console.log('OpenAI message:', data.toString());
  // ... existing code
});

// Log all Twilio messages
connection.on('message', (message) => {
  console.log('Twilio message:', message.toString());
  // ... existing code
});
```

## Performance Optimization

### Connection Pooling

For production, consider reusing OpenAI connections:

```javascript
// Outside the WebSocket handler
const openAiConnectionPool = [];

// Inside the handler, reuse or create
const openAiWs = openAiConnectionPool.pop() || createNewConnection();
```

### Buffer Management

Tune buffer sizes for your use case:

```javascript
const sessionUpdate = {
  // ... other settings
  audio: {
    input: {
      format: { type: 'audio/pcmu' },
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,           // Adjust sensitivity
        prefix_padding_ms: 300,   // Audio before speech
        silence_duration_ms: 500  // Silence to end turn
      }
    }
  }
};
```

## Error Handling Best Practices

### Graceful Degradation

```javascript
openAiWs.on('error', (error) => {
  console.error('OpenAI WebSocket error:', error);
  
  // Notify caller
  connection.send(JSON.stringify({
    event: 'media',
    streamSid: streamSid,
    media: {
      payload: Buffer.from('Sorry, there was an error. Please try again.').toString('base64')
    }
  }));
  
  // Close connection gracefully
  connection.close();
});
```

### Retry Logic

```javascript
let retryCount = 0;
const MAX_RETRIES = 3;

function connectToOpenAI() {
  const openAiWs = new WebSocket(/* ... */);
  
  openAiWs.on('error', (error) => {
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      setTimeout(connectToOpenAI, 1000 * retryCount);
    }
  });
  
  return openAiWs;
}
```

## Security Considerations

### Validate Twilio Requests

```javascript
import twilio from 'twilio';

fastify.addHook('preHandler', async (request, reply) => {
  if (request.url === '/incoming-call') {
    const twilioSignature = request.headers['x-twilio-signature'];
    const url = `https://${request.headers.host}${request.url}`;
    
    const isValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      twilioSignature,
      url,
      request.body
    );
    
    if (!isValid) {
      reply.code(403).send('Forbidden');
    }
  }
});
```

### Rate Limiting

```javascript
import rateLimit from '@fastify/rate-limit';

fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});
```

## Testing

### Local Testing with ngrok

```bash
ngrok http 5050
```

### Test Scenarios

1. **Happy Path**: Normal conversation flow
2. **Interruption**: Speak while AI is talking
3. **Silence**: Long pauses between speech
4. **Rapid Speech**: Quick back-and-forth
5. **Background Noise**: Test VAD sensitivity

## Resources

- [Source Code](https://github.com/twilio-samples/speech-assistant-openai-realtime-api-node)
- [OpenAI Realtime API Docs](https://platform.openai.com/docs/api-reference/realtime)
- [Twilio Media Streams Docs](https://www.twilio.com/docs/voice/media-streams)
- [Fastify Documentation](https://www.fastify.io/)

---

**Last Updated:** October 28, 2025

This walkthrough is based on the official Twilio sample code available at [https://github.com/twilio-samples/speech-assistant-openai-realtime-api-node](https://github.com/twilio-samples/speech-assistant-openai-realtime-api-node).

