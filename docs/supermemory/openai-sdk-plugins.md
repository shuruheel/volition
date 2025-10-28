# OpenAI SDK Plugins

Supermemory provides plugins for the OpenAI SDK that enable memory capabilities for your OpenAI-powered applications.

## Overview

The Supermemory OpenAI SDK plugins allow you to add memory features to applications using the official OpenAI SDK. These plugins provide seamless integration without requiring changes to your existing OpenAI SDK code.

## Installation

```bash
npm install @supermemory/tools
```

## Usage with OpenAI SDK

### Basic Setup

```typescript
import OpenAI from 'openai'
import { withSupermemoryPlugin } from '@supermemory/tools/openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Add Supermemory plugin
const openaiWithMemory = withSupermemoryPlugin(openai, {
  apiKey: process.env.SUPERMEMORY_API_KEY,
  userId: 'user-123'
})

// Use as normal OpenAI client
const response = await openaiWithMemory.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'What do you know about my preferences?' }
  ]
})
```

### Memory Tools Plugin

Add memory tool capabilities to OpenAI function calling:

```typescript
import OpenAI from 'openai'
import { supermemoryFunctions } from '@supermemory/tools/openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'Remember that I prefer TypeScript' }
  ],
  functions: supermemoryFunctions(process.env.SUPERMEMORY_API_KEY),
  function_call: 'auto'
})
```

### Streaming Support

The plugins support streaming responses:

```typescript
const stream = await openaiWithMemory.chat.completions.create({
  model: 'gpt-4',
  messages: messages,
  stream: true
})

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '')
}
```

## Configuration Options

```typescript
interface PluginConfig {
  apiKey: string              // Supermemory API key
  userId?: string             // User identifier for profiles
  projectId?: string          // Project identifier
  mode?: 'profile' | 'query' | 'full'  // Memory mode
  verbose?: boolean           // Enable logging
}

const openaiWithMemory = withSupermemoryPlugin(openai, {
  apiKey: process.env.SUPERMEMORY_API_KEY,
  userId: 'user-123',
  mode: 'full',
  verbose: true
})
```

## Memory Functions

The plugin provides three main functions for OpenAI function calling:

### searchMemories

Search through user memories:

```typescript
{
  name: 'searchMemories',
  description: 'Search through user memories and context',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query'
      }
    },
    required: ['query']
  }
}
```

### addMemory

Store new information:

```typescript
{
  name: 'addMemory',
  description: 'Store new information in memory',
  parameters: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'The information to store'
      },
      metadata: {
        type: 'object',
        description: 'Optional metadata'
      }
    },
    required: ['content']
  }
}
```

### getMemory

Retrieve specific memory by ID:

```typescript
{
  name: 'getMemory',
  description: 'Retrieve a specific memory by ID',
  parameters: {
    type: 'object',
    properties: {
      memoryId: {
        type: 'string',
        description: 'The ID of the memory to retrieve'
      }
    },
    required: ['memoryId']
  }
}
```

## Examples

### Complete Chat Application

```typescript
import OpenAI from 'openai'
import { withSupermemoryPlugin } from '@supermemory/tools/openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const openaiWithMemory = withSupermemoryPlugin(openai, {
  apiKey: process.env.SUPERMEMORY_API_KEY,
  userId: 'user-123',
  mode: 'full'
})

async function chat(userMessage: string) {
  const response = await openaiWithMemory.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: userMessage }
    ]
  })

  return response.choices[0].message.content
}

// Usage
const reply = await chat('What are my current projects?')
console.log(reply)
```

### With Function Calling

```typescript
import OpenAI from 'openai'
import { supermemoryFunctions, handleFunction } from '@supermemory/tools/openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const messages = [
  { role: 'user', content: 'Remember that I work at Acme Corp' }
]

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: messages,
  functions: supermemoryFunctions(process.env.SUPERMEMORY_API_KEY)
})

// Handle function calls
if (response.choices[0].message.function_call) {
  const result = await handleFunction(
    response.choices[0].message.function_call,
    process.env.SUPERMEMORY_API_KEY
  )
  
  messages.push(response.choices[0].message)
  messages.push({
    role: 'function',
    name: response.choices[0].message.function_call.name,
    content: JSON.stringify(result)
  })
  
  // Get final response
  const finalResponse = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: messages
  })
}
```

## Migration from OpenAI SDK

The plugin is designed to be a drop-in replacement for the OpenAI SDK:

**Before:**
```typescript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: messages
})
```

**After:**
```typescript
import OpenAI from 'openai'
import { withSupermemoryPlugin } from '@supermemory/tools/openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const openaiWithMemory = withSupermemoryPlugin(openai, {
  apiKey: process.env.SUPERMEMORY_API_KEY,
  userId: 'user-123'
})

const response = await openaiWithMemory.chat.completions.create({
  model: 'gpt-4',
  messages: messages
})
```

## Best Practices

1. **Consistent User IDs**: Use the same user ID across sessions for proper memory tracking
2. **Error Handling**: Implement fallbacks in case memory operations fail
3. **Function Calling**: Use function calling for explicit memory operations
4. **Mode Selection**: Choose the appropriate mode (profile/query/full) for your use case
5. **Verbose Mode**: Enable verbose mode during development for debugging

## Comparison with AI SDK

| Feature | OpenAI SDK Plugin | AI SDK Integration |
|---------|------------------|-------------------|
| Setup | Plugin wrapper | Native integration |
| Streaming | Full support | Full support |
| Memory Tools | Function calling | Native tools |
| Best For | OpenAI SDK users | Vercel AI SDK users |

## Troubleshooting

### Plugin Not Working

Ensure you have the correct imports:
```typescript
import { withSupermemoryPlugin } from '@supermemory/tools/openai'
```

### Function Calls Not Executing

Make sure to handle function calls in your code:
```typescript
if (response.choices[0].message.function_call) {
  await handleFunction(response.choices[0].message.function_call, apiKey)
}
```

### Memory Not Persisting

Check that:
- API key is valid
- User ID is consistent across calls
- Network connectivity is stable

## Next Steps

- [AI SDK Integration](./ai-sdk-overview.md) - Consider using Vercel AI SDK
- [Memory Tools](./memory-tools.md) - Learn about memory operations
- [Native SDK](./native-sdks.md) - Direct API access

## Resources

- [NPM Package](https://www.npmjs.com/package/@supermemory/tools)
- [Documentation](https://supermemory.ai/docs/memory-api/sdks/openai-plugins)
- [API Reference](https://api.supermemory.ai/v3/reference)

---

Note: For new projects, consider using the [AI SDK Integration](./ai-sdk-overview.md) which provides more features and better TypeScript support.

