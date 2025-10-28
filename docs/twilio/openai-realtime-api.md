# Twilio + OpenAI Realtime API Integration

Real-time AI Voice Assistant with OpenAI's Realtime API using Twilio Voice and Media Streams.

## Overview

This integration demonstrates how to build a real-time voice assistant that connects Twilio Voice with OpenAI's Realtime API using WebSocket connections. The application proxies WebSocket connections between OpenAI and Twilio, allowing callers to have natural, real-time conversations with an AI agent.

## Key Features

- **Real-time Voice Interaction**: Natural conversation flow with low latency
- **WebSocket Proxy**: Seamless connection between Twilio and OpenAI
- **Media Streams**: Real-time audio streaming using Twilio Media Streams
- **Multi-language Support**: Available in JavaScript (Node.js) and Python
- **Production-Ready**: Scalable architecture for production deployments

## Prerequisites

### Required Accounts
- [Twilio Account](https://www.twilio.com/try-twilio) with Account SID and Auth Token
- [OpenAI Account](https://platform.openai.com) with API key and access to Realtime API
- Node.js 18+ or Python 3.8+

### Required Services
- Twilio Phone Number with Voice capabilities
- Public HTTPS endpoint (for webhooks and WebSocket connections)

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Caller    │◄───────►│   Twilio     │◄───────►│  Your App   │
│   (Phone)   │  Voice  │    Voice     │  Media  │  (Proxy)    │
└─────────────┘         └──────────────┘  Streams└──────┬──────┘
                                                          │
                                                    WebSocket
                                                          │
                                                   ┌──────▼──────┐
                                                   │   OpenAI    │
                                                   │ Realtime API│
                                                   └─────────────┘
```

## Setup Instructions

### JavaScript/Node.js Version

#### 1. Clone the Repository

```bash
git clone https://github.com/twilio-samples/speech-assistant-openai-realtime-api-node.git
cd speech-assistant-openai-realtime-api-node
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Application Configuration
PORT=5050
```

#### 4. Run the Application

```bash
npm start
```

The server will start on `http://localhost:5050`.

#### 5. Expose Your Local Server

Use ngrok or a similar tool to expose your local server:

```bash
ngrok http 5050
```

Copy the HTTPS URL provided by ngrok (e.g., `https://abc123.ngrok.io`).

#### 6. Configure Twilio Webhook

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to Phone Numbers → Manage → Active Numbers
3. Select your phone number
4. Under "Voice & Fax" → "A CALL COMES IN"
5. Set the webhook URL to: `https://your-ngrok-url.ngrok.io/incoming-call`
6. Set HTTP method to `POST`
7. Save configuration

### Python Version

#### 1. Clone the Repository

```bash
git clone https://github.com/twilio-samples/speech-assistant-openai-realtime-api-python.git
cd speech-assistant-openai-realtime-api-python
```

#### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

#### 3. Configure Environment Variables

Create a `.env` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Application Configuration
PORT=5050
```

#### 4. Run the Application

```bash
python app.py
```

#### 5. Configure ngrok and Twilio Webhook

Follow the same steps as the JavaScript version to expose your server and configure Twilio webhooks.

## Implementation Details

### Core Components

#### 1. Incoming Call Handler

Handles incoming Twilio calls and initiates Media Streams:

**JavaScript:**
```javascript
app.post('/incoming-call', (req, res) => {
  const twiml = new VoiceResponse();
  
  // Start Media Stream
  const connect = twiml.connect();
  connect.stream({
    url: `wss://${req.headers.host}/media-stream`,
  });

  res.type('text/xml');
  res.send(twiml.toString());
});
```

**Python:**
```python
@app.route('/incoming-call', methods=['POST'])
def incoming_call():
    response = VoiceResponse()
    
    # Start Media Stream
    connect = response.connect()
    connect.stream(url=f'wss://{request.host}/media-stream')
    
    return Response(str(response), mimetype='text/xml')
```

#### 2. WebSocket Proxy

Proxies audio between Twilio and OpenAI:

**JavaScript:**
```javascript
wss.on('connection', async (ws) => {
  console.log('Client connected to Twilio');
  
  // Connect to OpenAI Realtime API
  const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime', {
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1'
    }
  });

  // Handle Twilio audio
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      
      if (msg.event === 'media') {
        // Forward audio to OpenAI
        openaiWs.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: msg.media.payload
        }));
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  // Handle OpenAI responses
  openaiWs.on('message', (message) => {
    const response = JSON.parse(message);
    
    if (response.type === 'response.audio.delta') {
      // Send audio back to Twilio
      ws.send(JSON.stringify({
        event: 'media',
        media: {
          payload: response.delta
        }
      }));
    }
  });
});
```

#### 3. OpenAI Session Configuration

Configure the AI assistant's behavior:

```javascript
// Send session configuration to OpenAI
openaiWs.send(JSON.stringify({
  type: 'session.update',
  session: {
    turn_detection: {
      type: 'server_vad' // Voice Activity Detection
    },
    input_audio_format: 'g711_ulaw',
    output_audio_format: 'g711_ulaw',
    voice: 'alloy',
    instructions: 'You are a helpful AI assistant. Be concise and natural in your responses.',
    modalities: ['text', 'audio'],
    temperature: 0.8,
  }
}));
```

## Configuration Options

### OpenAI Realtime API Settings

```javascript
{
  // Voice Activity Detection
  turn_detection: {
    type: 'server_vad',
    threshold: 0.5,           // Sensitivity (0.0-1.0)
    prefix_padding_ms: 300,   // Audio before speech
    silence_duration_ms: 500  // Silence to end turn
  },

  // Audio Format (must match Twilio)
  input_audio_format: 'g711_ulaw',
  output_audio_format: 'g711_ulaw',

  // AI Voice
  voice: 'alloy', // Options: alloy, echo, fable, onyx, nova, shimmer

  // Model Instructions
  instructions: 'Your system prompt here',

  // Model Settings
  temperature: 0.8,
  max_response_output_tokens: 4096,

  // Modalities
  modalities: ['text', 'audio']
}
```

### Twilio Media Streams Settings

```javascript
// In TwiML
connect.stream({
  url: 'wss://your-server.com/media-stream',
  track: 'both_tracks',        // Options: inbound_track, outbound_track, both_tracks
  statusCallback: '/stream-status',
  statusCallbackMethod: 'POST'
});
```

## Advanced Features

### 1. Function Calling

Enable the AI to call functions during conversation:

```javascript
openaiWs.send(JSON.stringify({
  type: 'session.update',
  session: {
    tools: [
      {
        type: 'function',
        name: 'get_weather',
        description: 'Get current weather for a location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'City name'
            }
          },
          required: ['location']
        }
      }
    ],
    tool_choice: 'auto'
  }
}));

// Handle function calls
openaiWs.on('message', async (message) => {
  const response = JSON.parse(message);
  
  if (response.type === 'response.function_call_arguments.done') {
    const result = await handleFunctionCall(
      response.name,
      JSON.parse(response.arguments)
    );
    
    // Send result back
    openaiWs.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: response.call_id,
        output: JSON.stringify(result)
      }
    }));
  }
});
```

### 2. Conversation History

Maintain conversation context:

```javascript
const conversationHistory = [];

// Add to history
function addToHistory(role, content) {
  conversationHistory.push({
    type: 'message',
    role: role,
    content: [{ type: 'input_text', text: content }]
  });
}

// Load history into session
openaiWs.send(JSON.stringify({
  type: 'conversation.item.create',
  item: conversationHistory[0]
}));
```

### 3. Call Recording and Transcription

```javascript
// Start recording in TwiML
const twiml = new VoiceResponse();
twiml.record({
  transcribe: true,
  transcribeCallback: '/transcription',
  recordingStatusCallback: '/recording-status'
});

// Handle transcription
app.post('/transcription', (req, res) => {
  console.log('Transcription:', req.body.TranscriptionText);
  // Store or process transcription
  res.sendStatus(200);
});
```

### 4. Error Handling and Reconnection

```javascript
function setupWebSocket() {
  const openaiWs = new WebSocket(/* ... */);
  
  openaiWs.on('error', (error) => {
    console.error('OpenAI WebSocket error:', error);
    // Implement reconnection logic
    setTimeout(() => setupWebSocket(), 5000);
  });

  openaiWs.on('close', () => {
    console.log('OpenAI connection closed');
    // Notify caller or reconnect
  });

  return openaiWs;
}
```

## Testing

### 1. Test the Integration

Call your Twilio phone number and speak to the AI assistant.

### 2. Monitor Logs

Check console output for:
- Incoming call events
- WebSocket connection status
- Audio stream metrics
- OpenAI API responses

### 3. Debug WebSocket Messages

```javascript
// Log all Twilio messages
ws.on('message', (message) => {
  console.log('Twilio message:', message);
});

// Log all OpenAI messages
openaiWs.on('message', (message) => {
  console.log('OpenAI message:', message);
});
```

## Production Considerations

### 1. Security

- **API Keys**: Store in environment variables or secret management service
- **Webhook Authentication**: Validate Twilio requests using signature validation
- **HTTPS**: Always use HTTPS for webhooks and WebSocket connections
- **Rate Limiting**: Implement rate limiting to prevent abuse

```javascript
const twilio = require('twilio');

app.post('/incoming-call', twilio.webhook({validate: true}), (req, res) => {
  // Validated webhook handler
});
```

### 2. Scalability

- **Load Balancing**: Use multiple server instances behind a load balancer
- **WebSocket Clustering**: Use Redis or similar for WebSocket session management
- **Connection Pooling**: Reuse OpenAI connections when possible
- **Monitoring**: Implement comprehensive logging and monitoring

### 3. Cost Optimization

- **Session Timeouts**: Implement automatic call ending after inactivity
- **Audio Quality**: Balance quality vs. bandwidth costs
- **OpenAI Token Limits**: Set max_response_output_tokens appropriately
- **Call Routing**: Route calls efficiently to minimize costs

```javascript
// Set call timeout
const timeout = setTimeout(() => {
  // End call after 5 minutes
  twiml.say('Thank you for calling. Goodbye!');
  twiml.hangup();
}, 5 * 60 * 1000);
```

### 4. Error Handling

```javascript
// Global error handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Notify monitoring service
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason);
  // Notify monitoring service
});
```

## Common Use Cases

### 1. Customer Support Bot
Configure the AI to handle common support queries with function calling for ticket creation.

### 2. Appointment Booking
Integrate with calendar APIs to book appointments via voice.

### 3. Survey Collection
Conduct voice surveys with natural conversation flow.

### 4. Voice-based Authentication
Implement voice verification and identity confirmation.

## Troubleshooting

### Issue: No Audio Received from AI

**Solution:**
- Verify OpenAI API key has Realtime API access
- Check audio format matches (g711_ulaw)
- Ensure WebSocket connection is established

### Issue: High Latency

**Solution:**
- Use server close to Twilio edge locations
- Optimize audio buffer sizes
- Check network connectivity

### Issue: Call Drops Unexpectedly

**Solution:**
- Implement proper error handling
- Add reconnection logic
- Monitor WebSocket connection status

## Resources

### Documentation
- **[Code Walkthrough](./twilio-code-walkthrough.md)** - Detailed line-by-line explanation of the implementation
- [Twilio Media Streams](https://www.twilio.com/docs/voice/media-streams)
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime)
- [Twilio Voice](https://www.twilio.com/docs/voice)

### Code Repositories
- [JavaScript Version](https://github.com/twilio-samples/speech-assistant-openai-realtime-api-node)
- [Python Version](https://github.com/twilio-samples/speech-assistant-openai-realtime-api-python)
- [Additional Documentation](https://www.twilio.com/en-us/voice-ai-assistant-openai-realtime-api-node)

### Support
- [Twilio Support](https://help.twilio.com)
- [Stack Overflow - Twilio Tag](https://stackoverflow.com/questions/tagged/twilio)
- [OpenAI Community](https://community.openai.com)

### Related Projects
- [Twilio Voice Code Exchange](https://www.twilio.com/code-exchange)
- [OpenAI Examples](https://github.com/openai/openai-cookbook)

## License

These code samples are provided by Twilio under the MIT License.

---

**Last Updated:** October 28, 2025

Documentation compiled from [Twilio Code Exchange](https://www.twilio.com/code-exchange/ai-voice-assistant-openai-realtime-api) and official GitHub repositories.

