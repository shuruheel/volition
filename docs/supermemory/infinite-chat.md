# Infinite Chat

Unlimited context for chat applications with automatic memory management

Infinite Chat provides unlimited context for chat applications with automatic memory management.

## Setup

```typescript
import { streamText } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"

const infiniteChat = createAnthropic({
  baseUrl: 'https://api.supermemory.ai/v3/https://api.anthropic.com/v1',
  apiKey: 'your-provider-api-key',
  headers: {
    'x-supermemory-api-key': 'supermemory-api-key',
    'x-sm-conversation-id': 'conversation-id'
  }
})

const result = await streamText({
  model: infiniteChat("claude-3-sonnet"),
  messages: [
    { role: "user", content: "Hello! Remember that I love TypeScript." }
  ]
})
```

## Provider Configuration

### Named Providers

**OpenAI**
```typescript
import { createOpenAI } from "@ai-sdk/openai"

const infiniteChat = createOpenAI({
  baseUrl: 'https://api.supermemory.ai/v3/https://api.openai.com/v1',
  apiKey: 'your-provider-api-key',
  headers: {
    'x-supermemory-api-key': 'supermemory-api-key',
    'x-sm-conversation-id': 'conversation-id'
  }
})

const result = await streamText({
  model: infiniteChat("gpt-4"),
  messages: [...]
})
```

**Anthropic**
```typescript
import { createAnthropic } from "@ai-sdk/anthropic"

const infiniteChat = createAnthropic({
  baseUrl: 'https://api.supermemory.ai/v3/https://api.anthropic.com/v1',
  apiKey: 'your-provider-api-key',
  headers: {
    'x-supermemory-api-key': 'supermemory-api-key',
    'x-sm-conversation-id': 'conversation-id'
  }
})
```

**Google**
```typescript
import { createGoogleGenerativeAI } from "@ai-sdk/google"

const infiniteChat = createGoogleGenerativeAI({
  baseUrl: 'https://api.supermemory.ai/v3/https://generativelanguage.googleapis.com',
  apiKey: 'your-provider-api-key',
  headers: {
    'x-supermemory-api-key': 'supermemory-api-key',
    'x-sm-conversation-id': 'conversation-id'
  }
})
```

**Groq**
```typescript
import { createGroq } from "@ai-sdk/groq"

const infiniteChat = createGroq({
  baseUrl: 'https://api.supermemory.ai/v3/https://api.groq.com/openai/v1',
  apiKey: 'your-provider-api-key',
  headers: {
    'x-supermemory-api-key': 'supermemory-api-key',
    'x-sm-conversation-id': 'conversation-id'
  }
})
```

### Custom Provider URL

```typescript
const infiniteChat = createOpenAI({
  baseUrl: 'https://api.supermemory.ai/v3/https://api.openai.com/v1',
  apiKey: 'your-provider-api-key',
  headers: {
    'x-supermemory-api-key': 'supermemory-api-key',
    'x-sm-conversation-id': 'conversation-id'
  }
})
```

## Example Usage

```typescript
import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

const infiniteChat = createOpenAI({
  baseUrl: 'https://api.supermemory.ai/v3/https://api.openai.com/v1',
  apiKey: 'your-provider-api-key',
  headers: {
    'x-supermemory-api-key': 'supermemory-api-key',
    'x-sm-conversation-id': 'conversation-id'
  }
})

const result = await streamText({
  model: infiniteChat("gpt-4"),
  messages: [
    { role: "user", content: "What did we discuss yesterday?" }
  ]
})

return result.toAIStreamResponse()
```

## Configuration Options

```typescript
interface ConfigWithProviderName {
  providerName: 'openai' | 'anthropic' | 'openrouter' |
                'deepinfra' | 'groq' | 'google' | 'cloudflare'
  providerApiKey: string
  headers?: Record<string, string>
}

interface ConfigWithProviderUrl {
  providerUrl: string
  providerApiKey: string
  headers?: Record<string, string>
}
```

### Custom Headers

Add user IDs, conversation IDs, or other metadata:

```typescript
const infiniteChat = createOpenAI({
  baseUrl: 'https://api.supermemory.ai/v3/https://api.openai.com/v1',
  apiKey: 'your-provider-api-key',
  headers: {
    'x-supermemory-api-key': 'supermemory-api-key',
    'x-sm-conversation-id': 'conversation-id',
    'x-sm-user-id': 'user-123',  // Optional: user identifier
    'x-sm-project-id': 'project-abc'  // Optional: project identifier
  }
})
```

## Comparison with Memory Tools

| Feature           | Infinite Chat | Memory Tools                           |
| ----------------- | ------------- | -------------------------------------- |
| Memory Management | Automatic     | Manual                                 |
| Context Handling  | Automatic     | Manual                                 |
| Tool Calls        | None          | searchMemories, addMemory, fetchMemory |
| Best For          | Chat apps     | AI agents                              |
| Setup Complexity  | Simple        | Moderate                               |

## How It Works

Infinite Chat works by:

1. **Intercepting** API calls to your LLM provider through the proxy URL
2. **Automatically storing** conversation context in Supermemory
3. **Retrieving relevant context** from past conversations
4. **Injecting context** into the current conversation seamlessly
5. **Forwarding** the enhanced request to your actual LLM provider

This approach means:
- No code changes to your existing chat logic
- Automatic context management across sessions
- No token limit worries - context is managed intelligently
- Works with any provider supported by Vercel AI SDK

## Best Practices

1. **Use Unique Conversation IDs**: Generate a unique conversation ID for each chat session
2. **Consistent User IDs**: Use the same user ID across sessions to maintain user-specific memory
3. **Monitor Token Usage**: While context is unlimited, be mindful of actual token usage
4. **Test Thoroughly**: Test with your specific use case to ensure proper context retrieval

## Example: Chat Application

```typescript
import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { v4 as uuidv4 } from 'uuid'

// Initialize once per conversation
const conversationId = uuidv4()

const infiniteChat = createOpenAI({
  baseUrl: 'https://api.supermemory.ai/v3/https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY!,
  headers: {
    'x-supermemory-api-key': process.env.SUPERMEMORY_API_KEY!,
    'x-sm-conversation-id': conversationId,
    'x-sm-user-id': 'user-123'
  }
})

// Use in your chat handler
async function handleChat(userMessage: string) {
  const result = await streamText({
    model: infiniteChat("gpt-4"),
    messages: [
      { role: "user", content: userMessage }
    ]
  })

  return result.toAIStreamResponse()
}
```

## Next Steps

- [Memory Tools](./memory-tools.md) - Explore explicit memory control
- [Examples](https://supermemory.ai/docs/cookbook/ai-sdk-integration) - See complete implementations
- [API Reference](https://api.supermemory.ai/v3/reference) - Explore the full API

## Links

- [Documentation](https://supermemory.ai/docs/ai-sdk/infinite-chat)
- [NPM Package](https://www.npmjs.com/package/@supermemory/tools)

