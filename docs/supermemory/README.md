# Supermemory.ai Documentation

This folder contains comprehensive documentation for integrating Supermemory.ai into your application. Supermemory is the memory API for the AI era — scalable, powerful, affordable, and production-ready.

## What is Supermemory?

Supermemory provides intelligent memory and context management for AI applications, allowing you to:

- **Store and retrieve** information with semantic search
- **Build user profiles** for personalized AI interactions
- **Manage unlimited chat context** automatically
- **Integrate seamlessly** with popular AI frameworks

## Documentation Contents

### Getting Started

- [Introduction](./introduction.md) - Overview of Supermemory and its capabilities
- [Native SDKs](./native-sdks.md) - Python and JavaScript SDK documentation

### AI SDK Integration (Vercel AI SDK)

- [AI SDK Overview](./ai-sdk-overview.md) - Integration with Vercel AI SDK
- [User Profiles](./user-profiles.md) - Automatic personalization with user profiles
- [Memory Tools](./memory-tools.md) - Explicit memory control for AI agents
- [Infinite Chat](./infinite-chat.md) - Unlimited context for chat applications

## Quick Start

### Installation

**For AI SDK Integration:**
```bash
npm install @supermemory/tools
```

**For Native SDK:**
```bash
# JavaScript/TypeScript
npm install supermemory

# Python
pip install --pre supermemory
```

### Basic Usage

**AI SDK with Memory Tools:**
```typescript
import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { supermemoryTools } from "@supermemory/tools/ai-sdk"

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const result = await streamText({
  model: openai("gpt-4"),
  prompt: "Remember that my name is Alice",
  tools: supermemoryTools(process.env.SUPERMEMORY_API_KEY!)
})
```

**Native SDK:**
```javascript
import Supermemory from 'supermemory';

const client = new Supermemory({
  apiKey: process.env.SUPERMEMORY_API_KEY
});

const response = await client.search.documents({
  q: 'documents related to my project'
});
```

## Integration Approaches

Supermemory offers three main approaches for AI integration:

| Approach      | Best For                          | Complexity | Management |
| ------------- | --------------------------------- | ---------- | ---------- |
| User Profiles | Personalized responses            | Low        | Automatic  |
| Memory Tools  | AI agents with explicit control   | Medium     | Manual     |
| Infinite Chat | Chat apps with unlimited context  | Low        | Automatic  |

### When to Use Each Approach

**User Profiles (`withSupermemory`)**
- You want automatic personalization based on user data
- You need consistent user context across all interactions
- You prefer a simple, one-line integration

**Memory Tools (`supermemoryTools`)**
- You're building AI agents that need explicit memory control
- You want fine-grained control over what's stored and retrieved
- You need to combine memory with other custom tools

**Infinite Chat (Proxy Mode)**
- You're building a chat application
- You want unlimited conversation context automatically
- You need minimal code changes to existing chat logic

## Environment Variables

Make sure to set up your environment variables:

```bash
# Required for all integrations
SUPERMEMORY_API_KEY=your_supermemory_api_key

# Required for AI SDK integrations
OPENAI_API_KEY=your_openai_api_key
# or
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Key Features

### Semantic Search
Search through memories using natural language queries with advanced semantic understanding.

### User Profiles
Automatically maintain and inject user-specific context into AI interactions for personalized responses.

### Unlimited Context
Break through token limits with intelligent context management for long-running conversations.

### Multi-Provider Support
Works with OpenAI, Anthropic, Google, Groq, and other major AI providers.

### Flexible Integration
Choose between automatic middleware, explicit tools, or proxy-based integration based on your needs.

## Architecture

Supermemory provides three layers of integration:

1. **Memory API** (Native SDKs) - Direct API access for maximum control
2. **AI SDK Tools** - Vercel AI SDK integration with tools and middleware
3. **Infinite Chat Proxy** - Transparent proxy for automatic memory management

## Resources

### Links
- [Official Website](https://supermemory.ai)
- [Documentation](https://supermemory.ai/docs)
- [API Reference](https://api.supermemory.ai/v3/reference)
- [Dashboard](https://console.supermemory.ai)
- [GitHub](https://github.com/supermemoryai)

### Packages
- [@supermemory/tools](https://www.npmjs.com/package/@supermemory/tools) - AI SDK integration
- [supermemory](https://www.npmjs.com/package/supermemory) - JavaScript SDK
- [supermemory](https://pypi.org/project/supermemory/) - Python SDK

### Support
- Email: support@supermemory.com
- [LinkedIn](https://linkedin.com/company/supermemoryai)
- [Twitter/X](https://x.com/supermemoryai)

## Examples

See the [Cookbook](https://supermemory.ai/docs/cookbook/overview) section on the official documentation for complete examples and tutorials.

## Contributing

For issues, feature requests, or contributions, please visit the [GitHub repository](https://github.com/supermemoryai).

## License

Refer to the official Supermemory documentation for licensing information.

---

**Last Updated:** October 28, 2025

This documentation is compiled from official Supermemory.ai sources for use in this application.

