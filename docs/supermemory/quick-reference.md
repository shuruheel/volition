# Supermemory Quick Reference

Quick reference guide for common Supermemory operations and patterns.

## Installation

```bash
# AI SDK Integration
npm install @supermemory/tools

# Native SDK
npm install supermemory        # JavaScript/TypeScript
pip install --pre supermemory  # Python
```

## Environment Variables

```bash
SUPERMEMORY_API_KEY=your_supermemory_api_key
OPENAI_API_KEY=your_openai_api_key  # If using OpenAI
ANTHROPIC_API_KEY=your_anthropic_api_key  # If using Anthropic
```

## Common Patterns

### 1. User Profiles (Automatic Personalization)

```typescript
import { generateText } from "ai"
import { withSupermemory } from "@supermemory/tools/ai-sdk"
import { openai } from "@ai-sdk/openai"

const model = withSupermemory(openai("gpt-4"), "user-123")

const result = await generateText({
  model,
  messages: [{ role: "user", content: "Help me with my project" }]
})
```

**Options:**
```typescript
withSupermemory(model, userId, {
  mode: "profile",  // "profile" | "query" | "full"
  verbose: true     // Enable logging
})
```

### 2. Memory Tools (Explicit Control)

```typescript
import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { supermemoryTools } from "@supermemory/tools/ai-sdk"

const result = await streamText({
  model: openai("gpt-4"),
  prompt: "Remember that I prefer TypeScript",
  tools: supermemoryTools(process.env.SUPERMEMORY_API_KEY)
})
```

**Individual Tools:**
```typescript
import {
  searchMemoriesTool,
  addMemoryTool,
  fetchMemoryTool
} from "@supermemory/tools/ai-sdk"

tools: {
  searchMemories: searchMemoriesTool(API_KEY, { projectId: "main" }),
  addMemory: addMemoryTool(API_KEY),
  // ... your custom tools
}
```

### 3. Infinite Chat (Unlimited Context)

```typescript
import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

const infiniteChat = createOpenAI({
  baseUrl: 'https://api.supermemory.ai/v3/https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY,
  headers: {
    'x-supermemory-api-key': process.env.SUPERMEMORY_API_KEY,
    'x-sm-conversation-id': conversationId
  }
})

const result = await streamText({
  model: infiniteChat("gpt-4"),
  messages: [{ role: "user", content: "Continue our discussion" }]
})
```

### 4. Native SDK (Direct API)

**JavaScript:**
```javascript
import Supermemory from 'supermemory'

const client = new Supermemory({
  apiKey: process.env.SUPERMEMORY_API_KEY
})

// Search
const results = await client.search.documents({
  q: "project requirements"
})

// Add document
await client.documents.add({
  content: "Document content",
  metadata: { type: "note" }
})
```

**Python:**
```python
from supermemory import Supermemory

client = Supermemory(
    api_key=os.environ.get("SUPERMEMORY_API_KEY")
)

# Search
response = client.search.documents(
    q="project requirements"
)

# Add document
client.documents.add(
    content="Document content",
    metadata={"type": "note"}
)
```

## API Endpoints

### Base URLs
- Production: `https://api.supermemory.ai`
- Infinite Chat Proxy: `https://api.supermemory.ai/v3/{provider-url}`

### Common Headers
```
x-supermemory-api-key: your_api_key
x-sm-conversation-id: conversation_id  # For Infinite Chat
x-sm-user-id: user_id                  # Optional
x-sm-project-id: project_id            # Optional
```

## Comparison Table

| Feature | User Profiles | Memory Tools | Infinite Chat | Native SDK |
|---------|--------------|--------------|---------------|------------|
| Setup Complexity | Low | Medium | Low | Medium |
| Control | Automatic | Manual | Automatic | Full |
| Use Case | Personalization | AI Agents | Chat Apps | Direct API |
| Integration | Middleware | Tools | Proxy | Direct |

## Common Use Cases

### Chat Application
```typescript
import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

const conversationId = generateId() // Generate per conversation

const infiniteChat = createOpenAI({
  baseUrl: 'https://api.supermemory.ai/v3/https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY,
  headers: {
    'x-supermemory-api-key': process.env.SUPERMEMORY_API_KEY,
    'x-sm-conversation-id': conversationId,
    'x-sm-user-id': userId
  }
})
```

### AI Agent with Memory
```typescript
import { streamText } from "ai"
import { supermemoryTools } from "@supermemory/tools/ai-sdk"

const result = await streamText({
  model: anthropic("claude-3-sonnet"),
  prompt: userMessage,
  tools: {
    ...supermemoryTools(process.env.SUPERMEMORY_API_KEY),
    ...customTools
  }
})
```

### Personalized Assistant
```typescript
import { withSupermemory } from "@supermemory/tools/ai-sdk"

const personalizedModel = withSupermemory(
  openai("gpt-4"),
  userId,
  { mode: "full" }
)

const result = await generateText({
  model: personalizedModel,
  messages: messages
})
```

### Knowledge Base Search
```javascript
const client = new Supermemory({
  apiKey: process.env.SUPERMEMORY_API_KEY
})

const results = await client.search.documents({
  q: searchQuery,
  limit: 10,
  filter: { metadata: { type: "documentation" } }
})
```

## Error Handling

```typescript
try {
  const result = await streamText({
    model: infiniteChat("gpt-4"),
    messages: messages
  })
  return result.toAIStreamResponse()
} catch (error) {
  console.error("Supermemory error:", error)
  // Fallback to non-memory model
  return streamText({
    model: openai("gpt-4"),
    messages: messages
  })
}
```

## Best Practices

1. **Use unique conversation IDs** for each chat session
2. **Consistent user IDs** across your application
3. **Add meaningful metadata** to documents
4. **Implement error handling** with fallbacks
5. **Monitor API usage** in the dashboard
6. **Store API keys securely** in environment variables
7. **Use appropriate mode** for your use case (profile/query/full)

## Debugging

Enable verbose logging:
```typescript
const model = withSupermemory(openai("gpt-4"), userId, {
  verbose: true
})
```

Check console for:
- Memory search operations
- Context injection
- API calls and responses

## Resources

- [Full Documentation](./README.md)
- [API Reference](https://api.supermemory.ai/v3/reference)
- [Dashboard](https://console.supermemory.ai)
- [NPM Package](https://www.npmjs.com/package/@supermemory/tools)
- [Support](mailto:support@supermemory.com)

## Common Issues

### API Key Not Found
```bash
# Make sure to set your environment variable
export SUPERMEMORY_API_KEY=your_api_key
```

### TypeScript Errors
```bash
# Install type definitions
npm install --save-dev @types/node
```

### Rate Limiting
Implement exponential backoff and respect rate limits. Check your dashboard for current usage.

---

For detailed documentation, see the [README](./README.md) or visit [supermemory.ai/docs](https://supermemory.ai/docs).

