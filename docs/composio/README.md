# Composio Integration Documentation

Documentation for integrating Composio tools and workflows into your AI agent dashboard.

## What is Composio?

Composio is a platform that provides pre-built integrations and tools for AI agents, allowing them to interact with external services and APIs. It offers a comprehensive toolkit for connecting AI agents to popular applications like Gmail, Google Sheets, Notion, GitHub, and many more.

## Available Integrations

This folder contains documentation for:

- **[Gmail Integration](./gmail-integration.md)** - Complete guide to integrating Gmail for email management, sending, reading, and automation

## Key Features

### 1. Pre-built Tools
- Ready-to-use actions for popular services
- Standardized API interfaces
- Automatic authentication handling

### 2. AI Agent Integration
- Native support for OpenAI, Anthropic, and other LLM providers
- Tool calling / function calling support
- Seamless agent workflow integration

### 3. Entity Management
- User-specific connections and permissions
- Multi-tenant support
- Secure credential management

### 4. Authentication
- OAuth 2.0 support
- API key management
- Bearer token authentication

## Quick Start

### Installation

```bash
npm install composio-core
```

### Basic Setup

```javascript
import { Composio } from "composio-core"

const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY
})

// Get tools for a specific app
const tools = await composio.getTools({
  apps: ["gmail"],
  entityId: "user-123"
})
```

### With OpenAI

```javascript
import { OpenAI } from "openai"
import { Composio } from "composio-core"

const openai = new OpenAI()
const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY
})

// Get tools
const tools = await composio.getTools({
  apps: ["gmail", "google_sheets"],
  entityId: "user-123"
})

// Use with OpenAI
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    {
      role: "user",
      content: "Send an email to john@example.com about the meeting"
    }
  ],
  tools: tools,
  tool_choice: "auto"
})

// Handle tool calls
if (response.choices[0].message.tool_calls) {
  const results = await composio.handleToolCalls(
    response.choices[0].message.tool_calls,
    { entityId: "user-123" }
  )
}
```

## Environment Variables

```bash
# Required
COMPOSIO_API_KEY=your_composio_api_key

# Optional for AI integrations
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Core Concepts

### 1. Apps
Applications or services that Composio provides integrations for (e.g., Gmail, Slack, Notion).

### 2. Actions
Specific operations you can perform with an app (e.g., GMAIL_SEND_EMAIL, SLACK_SEND_MESSAGE).

### 3. Entities
Represent individual users or accounts. Each entity has their own connections and permissions.

### 4. Connections
Authenticated links between an entity and an app. Each connection stores credentials securely.

### 5. Tools
Formatted actions ready for use with AI agents and LLMs.

## Common Patterns

### 1. Get Tools for Multiple Apps

```javascript
const tools = await composio.getTools({
  apps: ["gmail", "slack", "notion"],
  entityId: "user-123"
})
```

### 2. Execute a Specific Action

```javascript
const result = await composio.executeAction({
  action: "GMAIL_SEND_EMAIL",
  params: {
    recipient_email: "user@example.com",
    subject: "Hello",
    body: "This is a test email"
  },
  entityId: "user-123"
})
```

### 3. Handle Tool Calls from LLM

```javascript
// After LLM responds with tool calls
const results = await composio.handleToolCalls(
  toolCalls,
  { entityId: "user-123" }
)
```

### 4. List Available Actions

```javascript
const actions = await composio.getActions({
  apps: ["gmail"]
})

console.log(actions) // List all Gmail actions
```

### 5. Manage Connections

```javascript
// Get connection
const connection = await composio.getConnection({
  app: "gmail",
  entityId: "user-123"
})

// Check connection status
console.log(connection.status) // "active", "expired", etc.

// Refresh connection if needed
if (connection.status === "expired") {
  await composio.refreshConnection({
    app: "gmail",
    entityId: "user-123"
  })
}
```

## Available Toolkits

Composio provides toolkits for numerous categories:

### Important Tools
- Gmail
- Google Sheets
- Google Calendar
- Notion
- GitHub
- Slack
- Stripe

### CRM
- Salesforce
- HubSpot
- Pipedrive
- Zendesk

### Communication
- Slack
- Microsoft Teams
- Discord
- WhatsApp
- Zoom

### Productivity
- Asana
- Trello
- Jira
- Linear
- ClickUp

### Development
- GitHub
- GitLab
- Bitbucket
- Sentry

And many more! Check the [full toolkit list](https://docs.composio.dev/toolkits) for all available integrations.

## Authentication Flow

### 1. Create Entity
```javascript
const entity = await composio.createEntity({
  id: "user-123",
  name: "John Doe"
})
```

### 2. Initiate Connection
```javascript
const authUrl = await composio.initiateConnection({
  app: "gmail",
  entityId: "user-123",
  redirectUrl: "https://yourapp.com/callback"
})

// Redirect user to authUrl
```

### 3. Handle Callback
```javascript
// In your callback endpoint
const connection = await composio.completeConnection({
  app: "gmail",
  entityId: "user-123",
  code: req.query.code
})
```

## Best Practices

1. **Entity Management**
   - Use consistent entity IDs across your application
   - Map entities to your user accounts
   - Store entity IDs securely

2. **Error Handling**
   - Always check action responses for errors
   - Implement retry logic for transient failures
   - Handle authentication expiration gracefully

3. **Tool Selection**
   - Only request tools for apps you need
   - Filter actions when possible to reduce overhead
   - Cache tool definitions when appropriate

4. **Security**
   - Never expose Composio API keys in client-side code
   - Use entity-specific connections for multi-tenant apps
   - Regularly rotate API keys

5. **Performance**
   - Batch action executions when possible
   - Use async/await properly
   - Implement proper timeout handling

## Example: Complete Email Assistant

```javascript
import { OpenAI } from "openai"
import { Composio } from "composio-core"

class EmailAssistant {
  constructor(entityId) {
    this.entityId = entityId
    this.openai = new OpenAI()
    this.composio = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY
    })
  }

  async initialize() {
    this.tools = await this.composio.getTools({
      apps: ["gmail"],
      entityId: this.entityId
    })
  }

  async processCommand(userMessage) {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an email assistant. Help users manage their Gmail."
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      tools: this.tools,
      tool_choice: "auto"
    })

    if (response.choices[0].message.tool_calls) {
      const results = await this.composio.handleToolCalls(
        response.choices[0].message.tool_calls,
        { entityId: this.entityId }
      )

      // Get final response with results
      const finalResponse = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an email assistant."
          },
          {
            role: "user",
            content: userMessage
          },
          response.choices[0].message,
          {
            role: "tool",
            content: JSON.stringify(results),
            tool_call_id: response.choices[0].message.tool_calls[0].id
          }
        ]
      })

      return finalResponse.choices[0].message.content
    }

    return response.choices[0].message.content
  }
}

// Usage
const assistant = new EmailAssistant("user-123")
await assistant.initialize()

const response = await assistant.processCommand(
  "Send an email to team@company.com about tomorrow's standup"
)
console.log(response)
```

## Resources

### Links
- [Composio Website](https://composio.dev)
- [Documentation](https://docs.composio.dev)
- [Dashboard](https://app.composio.dev)
- [GitHub](https://github.com/ComposioHQ/composio)
- [Discord Community](https://discord.gg/composio)

### Packages
- [composio-core](https://www.npmjs.com/package/composio-core) - Core JavaScript SDK
- [composio](https://pypi.org/project/composio/) - Python SDK

### Support
- Email: support@composio.dev
- [Documentation](https://docs.composio.dev)
- [GitHub Issues](https://github.com/ComposioHQ/composio/issues)

## Next Steps

Explore specific integration guides:
- [Gmail Integration](./gmail-integration.md) - Detailed Gmail toolkit documentation

---

**Last Updated:** October 28, 2025

This documentation is compiled from official Composio sources for use in this application.

