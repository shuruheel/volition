# Memory Tools

Add memory capabilities to your AI agents with Vercel AI SDK tools

Memory tools allow AI agents to search, add, and fetch memories.

## Setup

```typescript
import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { supermemoryTools } from "@supermemory/tools/ai-sdk"

const openai = createOpenAI({
  apiKey: "YOUR_OPENAI_KEY"
})

const result = await streamText({
  model: openai("gpt-5"),
  prompt: "Remember that my name is Alice",
  tools: supermemoryTools("YOUR_SUPERMEMORY_KEY")
})
```

## Available Tools

### Search Memories

Semantic search through user memories:

```typescript
const result = await streamText({
  model: openai("gpt-5"),
  prompt: "What are my dietary preferences?",
  tools: supermemoryTools("API_KEY")
})

// The AI will automatically call searchMemories tool
// Example tool call:
// searchMemories({ informationToGet: "dietary preferences and restrictions" })
```

### Add Memory

Store new information:

```typescript
const result = await streamText({
  model: anthropic("claude-3-sonnet"),
  prompt: "Remember that I'm allergic to peanuts",
  tools: supermemoryTools("API_KEY")
})

// The AI will automatically call addMemory tool
// Example tool call:
// addMemory({ memory: "User is allergic to peanuts" })
```

### Fetch Memory

Retrieve specific memory by ID:

```typescript
const result = await streamText({
  model: openai("gpt-5"),
  prompt: "Get the details of memory abc123",
  tools: supermemoryTools("API_KEY")
})

// The AI will automatically call fetchMemory tool
// Example tool call:
// fetchMemory({ memoryId: "abc123" })
```

## Using Individual Tools

For more control, import tools separately:

```typescript
import {
  searchMemoriesTool,
  addMemoryTool,
  fetchMemoryTool
} from "@supermemory/tools/ai-sdk"

// Use only search tool
const result = await streamText({
  model: openai("gpt-5"),
  prompt: "What do you know about me?",
  tools: {
    searchMemories: searchMemoriesTool("API_KEY", {
      projectId: "personal"
    })
  }
})

// Combine with custom tools
const result = await streamText({
  model: anthropic("claude-3"),
  prompt: "Help me with my calendar",
  tools: {
    searchMemories: searchMemoriesTool("API_KEY"),
    // Your custom tools
    createEvent: yourCustomTool,
    sendEmail: anotherCustomTool
  }
})
```

## Tool Results

Each tool returns a result object:

```typescript
// searchMemories result
{
  success: true,
  results: [...],  // Array of memories
  count: 5
}

// addMemory result
{
  success: true,
  memory: { id: "mem_123", ... }
}

// fetchMemory result
{
  success: true,
  memory: { id: "mem_123", content: "...", ... }
}
```

## Example: Custom Integration

Here's a complete example of integrating memory tools with custom agent tools:

```typescript
import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { supermemoryTools } from "@supermemory/tools/ai-sdk"

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function chatWithMemory(userMessage: string, userId: string) {
  const result = await streamText({
    model: openai("gpt-4"),
    prompt: userMessage,
    tools: {
      ...supermemoryTools(process.env.SUPERMEMORY_API_KEY!, {
        userId: userId
      }),
      // Add your custom tools here
    }
  })

  return result
}
```

## Best Practices

1. **Use Semantic Search**: The searchMemories tool uses semantic search, so use natural language descriptions
2. **Store Meaningful Information**: When using addMemory, store information that will be useful later
3. **Tag Properly**: Use consistent user IDs or tags to organize memories
4. **Combine Tools**: Memory tools work well alongside your custom tools for comprehensive agent capabilities

## Next Steps

- [Infinite Chat](./infinite-chat.md) - Try automatic memory management
- [Examples](https://supermemory.ai/docs/cookbook/ai-sdk-integration) - See more complete examples
- [API Reference](https://api.supermemory.ai/v3/reference) - Explore the full API

## Links

- [Documentation](https://supermemory.ai/docs/ai-sdk/memory-tools)
- [NPM Package](https://www.npmjs.com/package/@supermemory/tools)

