# Introduction to Supermemory

Meet the memory API for the AI era — scalable, powerful, affordable, and production-ready.

## Overview

Supermemory provides intelligent memory and context management for AI applications. It enables developers to build AI systems that can remember, learn, and provide personalized experiences across conversations and sessions.

## Core Concepts

### Memory APIs
Use hyper-fast, scalable, and composable APIs for memory and RAG (Retrieval-Augmented Generation). Supermemory's Memory APIs provide:

- **Semantic Search**: Find relevant information using natural language queries
- **Document Management**: Store, organize, and retrieve documents efficiently
- **User Profiles**: Maintain user-specific information for personalization
- **Vector Storage**: Automatic embedding and vector database management

### Model Enhancer (Infinite Chat)
One line to add memory to your app. Supercharge your LLM with supermemory's intelligent context management:

- **Unlimited Context**: Break through token limits with automatic context compression
- **Conversation History**: Maintain context across multiple sessions
- **Smart Retrieval**: Automatically fetch relevant past conversations
- **Zero Configuration**: Works as a transparent proxy to your existing LLM calls

### SDKs
Use supermemory with your favorite tools and platforms seamlessly:

- **Native SDKs**: Python and JavaScript/TypeScript with full type support
- **AI SDK Integration**: First-class support for Vercel AI SDK
- **OpenAI SDK Plugins**: Drop-in compatibility with OpenAI SDK
- **Framework Agnostic**: Works with any AI framework or library

## Use Cases

### Personalized AI Assistants
Build AI assistants that remember user preferences, past interactions, and context:

```typescript
import { withSupermemory } from "@supermemory/tools/ai-sdk"
import { openai } from "@ai-sdk/openai"

const personalizedModel = withSupermemory(openai("gpt-4"), "user-123")
// Model now has access to all of user-123's profile and history
```

### Long-Running Conversations
Enable conversations that span multiple sessions without losing context:

```typescript
const infiniteChat = createOpenAI({
  baseUrl: 'https://api.supermemory.ai/v3/https://api.openai.com/v1',
  headers: {
    'x-supermemory-api-key': process.env.SUPERMEMORY_API_KEY,
    'x-sm-conversation-id': conversationId
  }
})
```

### Knowledge Management
Store and retrieve organizational knowledge for RAG applications:

```typescript
const client = new Supermemory({
  apiKey: process.env.SUPERMEMORY_API_KEY
})

await client.documents.add({
  content: "Company policy document...",
  metadata: { type: "policy", department: "HR" }
})
```

### AI Agents with Memory
Build agents that can remember past actions and learnings:

```typescript
import { supermemoryTools } from "@supermemory/tools/ai-sdk"

const result = await streamText({
  model: openai("gpt-4"),
  prompt: "What tasks did we complete yesterday?",
  tools: supermemoryTools(process.env.SUPERMEMORY_API_KEY)
})
```

## Key Features

### 🚀 Scalable
- Built to handle millions of documents and queries
- High-performance vector search
- Distributed architecture for reliability

### 💡 Intelligent
- Semantic understanding of queries
- Automatic context compression
- Smart relevance ranking

### 💰 Affordable
- Pay only for what you use
- Efficient storage and retrieval
- No hidden costs

### 🔧 Production-Ready
- 99.9% uptime SLA
- Comprehensive monitoring
- Enterprise-grade security

### 🎯 Easy to Use
- Simple, intuitive APIs
- Extensive documentation
- Multiple SDK options

## Getting Started

### 1. Create an Account
Visit [Supermemory Console](https://console.supermemory.ai) to create an account and get your API key.

### 2. Choose Your Integration Method

**For Vercel AI SDK users:**
```bash
npm install @supermemory/tools
```

**For direct API access:**
```bash
# JavaScript/TypeScript
npm install supermemory

# Python
pip install --pre supermemory
```

### 3. Start Building

Check out the detailed guides:
- [Native SDKs](./native-sdks.md) - Python and JavaScript SDK documentation
- [AI SDK Integration](./ai-sdk-overview.md) - Vercel AI SDK integration
- [User Profiles](./user-profiles.md) - Automatic personalization
- [Memory Tools](./memory-tools.md) - Explicit memory control
- [Infinite Chat](./infinite-chat.md) - Unlimited context

## Architecture Overview

Supermemory consists of several components working together:

```
┌─────────────────────────────────────────────────┐
│                Your Application                 │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐      ┌────────▼─────────┐
│   AI SDK Tools │      │  Native SDK      │
│   /Middleware  │      │  (Direct API)    │
└───────┬────────┘      └────────┬─────────┘
        │                         │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │  Supermemory API        │
        │  - Memory Storage       │
        │  - Vector Search        │
        │  - Profile Management   │
        └─────────────────────────┘
```

## Core Capabilities

### Document Management
- Add, update, and delete documents
- Organize with metadata and tags
- Batch operations for efficiency

### Semantic Search
- Natural language queries
- Relevance ranking
- Filtered search with metadata

### User Profiles
- Automatic profile building
- Preference learning
- Context injection

### Memory Tools
- Search memories
- Add new memories
- Fetch specific memories
- Integration with AI agents

### Context Management
- Automatic summarization
- Smart context window management
- Conversation threading

## Best Practices

1. **Use Meaningful Metadata**: Add descriptive metadata to documents for better organization and filtering
2. **Tag Users Consistently**: Use consistent user identifiers across your application
3. **Handle Errors Gracefully**: Implement proper error handling and fallbacks
4. **Monitor Usage**: Keep track of your API usage in the dashboard
5. **Start Simple**: Begin with one integration approach and expand as needed

## Next Steps

Explore the documentation:
- [Native SDKs Guide](./native-sdks.md)
- [AI SDK Overview](./ai-sdk-overview.md)
- [API Reference](https://api.supermemory.ai/v3/reference)
- [Cookbook Examples](https://supermemory.ai/docs/cookbook/overview)

## Support

Need help? Reach out to:
- Email: support@supermemory.com
- Documentation: https://supermemory.ai/docs
- Dashboard: https://console.supermemory.ai

---

Ready to add memory to your AI application? Start with the [Native SDKs](./native-sdks.md) or jump straight to [AI SDK Integration](./ai-sdk-overview.md)!

