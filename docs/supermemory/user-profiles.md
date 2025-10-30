# User Profiles with AI SDK

Automatically inject user profiles into LLM calls for instant personalization

## Overview

The `withSupermemory` middleware automatically injects user profiles into your LLM calls, providing instant personalization without manual prompt engineering or API calls.

> **New to User Profiles?** Read the [conceptual overview](https://supermemory.ai/docs/user-profiles) to understand what profiles are and why they're powerful for LLM personalization.

## Quick Start

```typescript
import { generateText } from "ai"
import { withSupermemory } from "@supermemory/tools/ai-sdk"
import { openai } from "@ai-sdk/openai"

// Wrap any model with Supermemory middleware
const modelWithMemory = withSupermemory(
  openai("gpt-4"), // Your base model
  "user-123" // Container tag (user ID)
)

// Use normally - profiles are automatically injected!
const result = await generateText({
  model: modelWithMemory,
  messages: [{ role: "user", content: "Help me with my current project" }]
})
// The model knows about the user's background, skills, and current work!
```

## How It Works

The `withSupermemory` middleware:

1. **Intercepts** your LLM calls before they reach the model
2. **Fetches** the user's profile based on the container tag
3. **Injects** profile data into the system prompt automatically
4. **Forwards** the enhanced prompt to your LLM

All of this happens transparently - you write code as if using a normal model, but get personalized responses.

## Memory Search Modes

Configure how the middleware retrieves and uses memory:

### Profile Mode (Default)

Retrieves the user's complete profile without query-specific search. Best for general personalization.

```typescript
// Default behavior - profile mode
const model = withSupermemory(openai("gpt-4"), "user-123")

// Or explicitly specify
const model = withSupermemory(openai("gpt-4"), "user-123", {
  mode: "profile"
})

const result = await generateText({
  model,
  messages: [{ role: "user", content: "What do you know about me?" }]
})
// Response uses full user profile for context
```

### Query Mode

Searches memories based on the user's specific message. Best for finding relevant information.

```typescript
const model = withSupermemory(openai("gpt-4"), "user-123", {
  mode: "query"
})

const result = await generateText({
  model,
  messages: [{
    role: "user",
    content: "What was that Python script I wrote last week?"
  }]
})
// Searches for memories about Python scripts from last week
```

### Full Mode

Combines profile AND query-based search for comprehensive context. Best for complex interactions.

```typescript
const model = withSupermemory(openai("gpt-4"), "user-123", {
  mode: "full"
})

const result = await generateText({
  model,
  messages: [{
    role: "user",
    content: "Help me debug this similar to what we did before"
  }]
})
// Uses both profile (user's expertise) AND search (previous debugging sessions)
```

## Verbose Logging

Enable detailed logging to see exactly what's happening:

```typescript
const model = withSupermemory(openai("gpt-4"), "user-123", {
  verbose: true // Enable detailed logging
})

const result = await generateText({
  model,
  messages: [{ role: "user", content: "Where do I live?" }]
})

// Console output:
// [supermemory] Searching memories for container: user-123
// [supermemory] User message: Where do I live?
// [supermemory] System prompt exists: false
// [supermemory] Found 3 memories
// [supermemory] Memory content: You live in San Francisco, California...
// [supermemory] Creating new system prompt with memories
```

## Comparison with Direct API

The AI SDK middleware abstracts away the complexity of manual profile management:

**With AI SDK (Simple)**
```typescript
// One line setup
const model = withSupermemory(openai("gpt-4"), "user-123")

// Use normally
const result = await generateText({
  model,
  messages: [{ role: "user", content: "Help me" }]
})
```

**Without AI SDK (Complex)**
- Manual API calls to fetch profiles
- Manual prompt construction
- Manual context management
- More code to maintain

## Limitations

- **Beta Feature**: The `withSupermemory` middleware is currently in beta
- **Container Tag Required**: You must provide a valid container tag
- **API Key Required**: Ensure `SUPERMEMORY_API_KEY` is set in your environment

## Next Steps

- [User Profiles Concepts](https://supermemory.ai/docs/user-profiles) - Understand how profiles work conceptually
- [Memory Tools](./memory-tools.md) - Add explicit memory operations to your agents
- [API Reference](https://api.supermemory.ai/v3/reference#tag/profile) - Explore the underlying profile API
- [NPM Package](https://www.npmjs.com/package/@supermemory/tools) - View the package on NPM

> **Pro Tip**: Start with profile mode for general personalization, then experiment with query and full modes as you understand your use case better.

