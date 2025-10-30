# Twilio Integration Documentation

Documentation for integrating Twilio services into your AI agent dashboard, with focus on voice and communication features.

## What is Twilio?

Twilio is a cloud communications platform that provides APIs for voice, SMS, video, and other communication channels. It enables developers to build powerful communication features into their applications programmatically.

## Available Integrations

This folder contains documentation for:

- **[OpenAI Realtime API Integration](./openai-realtime-api.md)** - Complete guide to building real-time AI voice assistants with Twilio Voice and OpenAI's Realtime API
- **[Code Walkthrough](./twilio-code-walkthrough.md)** - Line-by-line explanation of the Node.js implementation with detailed technical commentary

## Key Features

### 1. Programmable Voice
- Make and receive phone calls
- Real-time audio streaming with Media Streams
- Call recording and transcription
- Interactive Voice Response (IVR)

### 2. Programmable SMS & Messaging
- Send and receive SMS messages
- WhatsApp integration
- MMS support
- Message scheduling

### 3. Real-time Communication
- WebSocket-based Media Streams
- Low-latency audio streaming
- Bidirectional audio
- Custom audio processing

### 4. Serverless Functions
- Twilio Functions for backend logic
- Quick deployment
- No infrastructure management

## Quick Start

### Installation

```bash
npm install twilio
```

### Basic Setup

```javascript
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
```

### Make a Phone Call

```javascript
const call = await client.calls.create({
  url: 'http://demo.twilio.com/docs/voice.xml',
  to: '+15558675310',
  from: process.env.TWILIO_PHONE_NUMBER
});

console.log(call.sid);
```

### Send an SMS

```javascript
const message = await client.messages.create({
  body: 'Hello from Twilio!',
  from: process.env.TWILIO_PHONE_NUMBER,
  to: '+15558675310'
});

console.log(message.sid);
```

## Environment Variables

```bash
# Required
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Optional for AI integrations
OPENAI_API_KEY=your_openai_api_key
```

## Core Concepts

### 1. TwiML (Twilio Markup Language)
XML-based language for controlling voice calls and SMS.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Welcome to my application!</Say>
    <Gather input="speech dtmf" timeout="3">
        <Say>Please tell me how I can help you.</Say>
    </Gather>
</Response>
```

### 2. Webhooks
HTTP callbacks that Twilio sends to your server when events occur.

```javascript
app.post('/voice-webhook', (req, res) => {
  const twiml = new VoiceResponse();
  twiml.say('Hello! Thanks for calling.');
  
  res.type('text/xml');
  res.send(twiml.toString());
});
```

### 3. Media Streams
Real-time audio streaming over WebSockets for custom audio processing.

```javascript
const twiml = new VoiceResponse();
const connect = twiml.connect();
connect.stream({
  url: 'wss://your-server.com/audio-stream'
});
```

### 4. Status Callbacks
Webhooks for tracking call/message status changes.

```javascript
const call = await client.calls.create({
  url: 'http://your-app.com/voice',
  to: '+15558675310',
  from: process.env.TWILIO_PHONE_NUMBER,
  statusCallback: 'http://your-app.com/call-status',
  statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
});
```

## Common Use Cases

### 1. AI Voice Assistant

Build conversational AI agents that can handle phone calls. See [OpenAI Realtime API Integration](./openai-realtime-api.md) for a complete guide.

```javascript
app.post('/incoming-call', (req, res) => {
  const twiml = new VoiceResponse();
  const connect = twiml.connect();
  
  // Stream audio to AI processor
  connect.stream({
    url: 'wss://your-server.com/ai-assistant'
  });
  
  res.type('text/xml');
  res.send(twiml.toString());
});
```

### 2. Call Forwarding

```javascript
app.post('/forward-call', (req, res) => {
  const twiml = new VoiceResponse();
  
  twiml.say('Please wait while we connect you.');
  twiml.dial({
    callerId: process.env.TWILIO_PHONE_NUMBER
  }, '+15558675310');
  
  res.type('text/xml');
  res.send(twiml.toString());
});
```

### 3. SMS Auto-Reply

```javascript
app.post('/sms-reply', (req, res) => {
  const twiml = new MessagingResponse();
  
  const incomingMessage = req.body.Body;
  
  if (incomingMessage.toLowerCase().includes('help')) {
    twiml.message('Here are the available commands: STATUS, HELP, INFO');
  } else {
    twiml.message('Thanks for your message! We\'ll get back to you soon.');
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
});
```

### 4. Call Recording and Transcription

```javascript
const twiml = new VoiceResponse();

twiml.say('Your call will be recorded.');

twiml.record({
  action: '/handle-recording',
  transcribe: true,
  transcribeCallback: '/handle-transcription',
  maxLength: 120,
  playBeep: true
});

// Handle transcription
app.post('/handle-transcription', (req, res) => {
  const transcription = req.body.TranscriptionText;
  console.log('Transcription:', transcription);
  
  // Process transcription with AI
  // Store in database
  // Send notification
  
  res.sendStatus(200);
});
```

### 5. Conference Calls

```javascript
app.post('/join-conference', (req, res) => {
  const twiml = new VoiceResponse();
  
  const dial = twiml.dial();
  dial.conference({
    startConferenceOnEnter: true,
    endConferenceOnExit: false,
    statusCallback: '/conference-status',
    statusCallbackEvent: ['start', 'end', 'join', 'leave']
  }, 'MyConferenceRoom');
  
  res.type('text/xml');
  res.send(twiml.toString());
});
```

## Twilio Studio

Visual workflow builder for creating communication workflows without code.

### Features:
- Drag-and-drop interface
- Pre-built templates
- Integration with Functions and APIs
- Call routing and IVR

### Use Cases:
- Customer support workflows
- Appointment reminders
- Survey collection
- Multi-step authentication

## Twilio Functions

Serverless Node.js functions that run on Twilio's infrastructure.

```javascript
// Example Twilio Function
exports.handler = function(context, event, callback) {
  const twiml = new Twilio.twiml.VoiceResponse();
  
  twiml.say({
    voice: 'alice'
  }, 'Hello from a Twilio Function!');
  
  callback(null, twiml);
};
```

## Media Streams

Real-time audio streaming with 8kHz μ-law audio format.

### Key Features:
- Bidirectional audio streaming
- WebSocket-based
- Real-time processing
- 8kHz μ-law or 16kHz linear PCM

### Example Use Cases:
- Real-time transcription
- Voice AI assistants
- Sentiment analysis
- Call analytics

## Authentication

### Webhook Validation

Always validate webhook requests from Twilio:

```javascript
const twilio = require('twilio');

app.post('/webhook', twilio.webhook({validate: true}), (req, res) => {
  // This handler only runs if the request is validated
  const twiml = new VoiceResponse();
  twiml.say('Validated webhook request');
  res.type('text/xml');
  res.send(twiml.toString());
});
```

### Custom Validation

```javascript
const twilio = require('twilio');

app.post('/webhook', (req, res) => {
  const twilioSignature = req.headers['x-twilio-signature'];
  const url = 'https://your-app.com/webhook';
  const params = req.body;
  
  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    twilioSignature,
    url,
    params
  );
  
  if (!isValid) {
    return res.status(403).send('Forbidden');
  }
  
  // Handle validated request
});
```

## Best Practices

### 1. Security
- Always validate webhook signatures
- Use HTTPS for all webhooks
- Store credentials in environment variables
- Implement rate limiting

### 2. Error Handling
- Always respond to webhooks
- Implement retry logic for API calls
- Log errors for debugging
- Use status callbacks to track call/message status

### 3. Performance
- Use async/await for API calls
- Implement connection pooling
- Cache TwiML responses when appropriate
- Use Content-Type headers correctly

### 4. Cost Optimization
- Set appropriate timeouts
- Use `<Gather>` timeout efficiently
- Implement call screening
- Monitor usage in the Twilio Console

### 5. Testing
- Use Twilio test credentials for development
- Test webhooks with ngrok
- Use Twilio's request inspector
- Implement comprehensive error handling

## Example: Complete Voice Bot

```javascript
const express = require('express');
const twilio = require('twilio');
const WebSocket = require('ws');

const app = express();
const VoiceResponse = twilio.twiml.VoiceResponse;

// Incoming call handler
app.post('/incoming-call', (req, res) => {
  const twiml = new VoiceResponse();
  
  twiml.say('Welcome! Please tell me how I can help you.');
  
  const gather = twiml.gather({
    input: 'speech',
    timeout: 3,
    action: '/process-speech'
  });
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// Process speech input
app.post('/process-speech', async (req, res) => {
  const twiml = new VoiceResponse();
  const speechResult = req.body.SpeechResult;
  
  // Process with AI
  const aiResponse = await processWithAI(speechResult);
  
  twiml.say(aiResponse);
  
  // Continue conversation
  const gather = twiml.gather({
    input: 'speech',
    timeout: 3,
    action: '/process-speech'
  });
  
  res.type('text/xml');
  res.send(twiml.toString());
});

async function processWithAI(text) {
  // Your AI processing logic
  return `You said: ${text}. How else can I help?`;
}

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Monitoring and Analytics

### Twilio Console
- Real-time call monitoring
- Usage statistics
- Error logs and debugging
- Cost tracking

### Programmable Insights
```javascript
const calls = await client.calls.list({
  startTime: new Date('2024-10-01'),
  endTime: new Date('2024-10-31')
});

console.log(`Total calls: ${calls.length}`);
```

## Resources

### Official Documentation
- [Twilio Documentation](https://www.twilio.com/docs)
- [Voice API Reference](https://www.twilio.com/docs/voice/api)
- [Media Streams](https://www.twilio.com/docs/voice/media-streams)
- [TwiML Reference](https://www.twilio.com/docs/voice/twiml)

### Tools
- [Twilio Console](https://console.twilio.com)
- [Twilio CLI](https://www.twilio.com/docs/twilio-cli)
- [Request Inspector](https://www.twilio.com/console/debugger)
- [Code Exchange](https://www.twilio.com/code-exchange)

### SDKs
- [Node.js](https://www.npmjs.com/package/twilio)
- [Python](https://pypi.org/project/twilio/)
- [PHP](https://packagist.org/packages/twilio/sdk)
- [Java](https://github.com/twilio/twilio-java)

### Support
- [Help Center](https://help.twilio.com)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/twilio)
- [Community Forum](https://www.twilio.com/community)

## Next Steps

Explore specific integration guides:
- [OpenAI Realtime API Integration](./openai-realtime-api.md) - Build real-time AI voice assistants
- [Code Walkthrough](./twilio-code-walkthrough.md) - Deep dive into the implementation

---

**Last Updated:** October 28, 2025

This documentation is compiled from official Twilio sources for use in this application.

