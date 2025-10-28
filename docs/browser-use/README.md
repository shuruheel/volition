# Browser Use Cloud Documentation

Complete guide to integrating Browser Use Cloud for AI-powered and direct browser automation.

## What is Browser Use Cloud?

Browser Use Cloud is a powerful platform that enables both AI-powered and direct browser automation. It provides:

- **AI-Powered Automation**: Natural language browser tasks powered by LLMs
- **Direct Browser Control**: Chrome DevTools Protocol (CDP) access for custom automation
- **State Management**: Persistent browser sessions and user profiles
- **Stealth Features**: Built-in anti-bot detection bypass
- **Production-Ready**: Scalable infrastructure with webhooks and monitoring

## Documentation Contents

### Get Started
- [Quickstart Guide](./quickstart.md) - Get up and running in minutes
- [Core Concepts](./concepts.md) - Understand the architecture

### Key Features
- [Result Schema](./result-schema.md) - Get structured data from tasks
- [Streaming](./streaming.md) - Monitor task progress in real-time
- [Stealth Mode](./stealth.md) - Bypass anti-bot detection
- [Safety](./safety.md) - Secure credentials and domain restrictions
- [Super Fast Mode](./super-fast-mode.md) - Maximum speed execution
- [Webhooks](./webhooks.md) - Real-time event notifications
- [MCP Server](./mcp-server.md) - Model Context Protocol integration

## Quick Start

### Installation

**TypeScript/JavaScript:**
```bash
npm install browser-use-sdk
```

**Python:**
```bash
pip install browser-use-sdk
```

### Get API Key

1. Sign up at [Browser Use Cloud](https://cloud.browser-use.com)
2. Get your API key from the dashboard
3. Add to your environment:

```bash
BROWSER_USE_API_KEY=bu_...
```

### Basic Usage

**Simple Task (Auto-Session):**
```typescript
import { BrowserUseClient } from "browser-use-sdk";

const client = new BrowserUseClient({
  apiKey: "bu_..." // or from BROWSER_USE_API_KEY env var
});

const task = await client.tasks.createTask({
  task: "Search for the top 10 Hacker News posts and return the title and url."
});

const result = await task.complete();
console.log(result.output);
```

**Advanced Multi-Step Workflow:**
```typescript
// Create session with profile
const session = await client.sessions.createSession({
  profileId: "user_profile_123"
});

// Login task
const loginTask = await client.tasks.createTask({
  sessionId: session.id,
  task: "Log into admin dashboard"
});
await loginTask.complete();

// Data extraction (login state preserved)
const dataTask = await client.tasks.createTask({
  sessionId: session.id,
  task: "Export user data as CSV"
});
const result = await dataTask.complete();
```

## Core Concepts

### 1. **Task**
A single automation instruction executed by an AI agent.

```typescript
const task = await client.tasks.createTask({
  task: "Extract product prices from Amazon",
  llm: "browser-use-llm",
  maxSteps: 10
});
```

### 2. **Session**
A stateful browser environment that preserves cookies, login state, and context.

```typescript
const session = await client.sessions.createSession({
  profileId: "my_profile"
});
```

### 3. **Profile**
User-specific browser configuration and state (cookies, localStorage, etc.).

```typescript
const profile = await client.profiles.createProfile({
  name: "Production User Profile"
});
```

### 4. **Browser**
Direct Chrome DevTools Protocol access for custom automation.

```typescript
const browser = await client.browsers.createBrowserSession({
  profileId: "my_profile"
});
```

### 5. **File**
Input data for tasks and output results from agents.

```typescript
const file = await client.files.upload("credentials.json");
```

## Architecture Flow

```
┌──────────────────────────────────────────────────────┐
│           Browser Use Cloud Platform                  │
│                                                       │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────┐│
│  │   Profile   │───►│   Session   │───►│   Task   ││
│  │  (Storage)  │    │  (Browser)  │    │  (Agent) ││
│  └─────────────┘    └─────────────┘    └──────────┘│
│         │                   │                  │     │
│         │                   │                  │     │
│  ┌─────▼───────────────────▼──────────────────▼───┐│
│  │         Managed Browser Infrastructure          ││
│  │  (Stealth, Proxies, Anti-Bot Detection)         ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

## Automation Approaches

### 1. AI-Powered (Simple)

**Best for**: Quick tasks, no login required, proof of concepts

```typescript
const task = await client.tasks.createTask({
  task: "Search for top 10 Hacker News posts"
});
```

✅ Natural language  
✅ Quick setup  
❌ Limited control

### 2. AI-Powered (Advanced)

**Best for**: Multi-step workflows, authentication required

```typescript
const session = await client.sessions.createSession({
  profileId: "profile_123"
});

const task = await client.tasks.createTask({
  sessionId: session.id,
  task: "Log into dashboard and export data"
});
```

✅ State preservation  
✅ Multi-step workflows  
❌ Limited control

### 3. Direct Control

**Best for**: Custom automation, integration testing

```typescript
import { chromium } from 'playwright';

const browser = await client.browsers.createBrowserSession({
  profileId: "profile_123"
});

const pwBrowser = await chromium.connectOverCDP(browser.cdpUrl);
```

✅ Full control  
✅ Custom scripts  
❌ Requires programming

## When to Use What

| Use Case | Approach | Why |
|----------|----------|-----|
| Quick data extraction | AI Simple | No login, fast setup |
| Multi-step workflow with login | AI Advanced | State preservation |
| Integration testing | Direct Control | Full control needed |
| User-specific automation | Profiles | Consistent state |
| Production apps | All of above | Combines flexibility |

## Key Features

### Result Schema

Get structured data with type safety:

```typescript
import { z } from "zod";

const TaskOutput = z.object({
  posts: z.array(z.object({
    title: z.string(),
    url: z.string()
  }))
});

const task = await client.tasks.createTask({
  task: "Get top 10 HN posts",
  schema: TaskOutput
});

const result = await task.complete();
// result.parsed is type-safe!
```

### Streaming

Monitor progress in real-time:

```typescript
for await (const step of task.stream()) {
  console.log(`Step: ${step.status}`);
}

const result = await task.complete();
```

### Stealth Mode

Bypass anti-bot detection automatically:

```typescript
const session = await client.sessions.createSession({
  proxyCountryCode: "us" // Built-in stealth + proxy
});
```

### Safety Features

Protect sensitive data:

```typescript
const task = await client.tasks.createTask({
  task: "Log in and check account",
  secrets: {
    "https://example.com": "password123"
  },
  allowedDomains: [
    "example.com",
    "*.example.com"
  ]
});
```

### Super Fast Mode

Maximum speed execution:

```typescript
const task = await client.tasks.createTask({
  task: "Quick data extraction",
  flashMode: true,
  thinking: false,
  llm: "gemini-flash-latest" // Fastest model
});
```

## Common Use Cases

### 1. Web Scraping

```typescript
const task = await client.tasks.createTask({
  task: "Extract all product names and prices from the first page of search results",
  schema: z.object({
    products: z.array(z.object({
      name: z.string(),
      price: z.number()
    }))
  })
});
```

### 2. Form Automation

```typescript
const task = await client.tasks.createTask({
  task: "Fill out the contact form with name: John Doe, email: john@example.com",
  secrets: {
    "https://example.com": "john@example.com"
  }
});
```

### 3. Data Monitoring

```typescript
const session = await client.sessions.createSession({
  profileId: "monitoring_profile"
});

const task = await client.tasks.createTask({
  sessionId: session.id,
  task: "Check dashboard for new notifications and return count",
  schema: z.object({ count: z.number() })
});
```

### 4. Integration Testing

```typescript
import { chromium } from 'playwright';

const browser = await client.browsers.createBrowserSession({
  profileId: "test_profile"
});

const pw = await chromium.connectOverCDP(browser.cdpUrl);
const context = pw.contexts()[0];
const page = context.pages()[0];

await page.goto('https://app.example.com');
// Custom Playwright automation...
```

## Best Practices

### Task Instructions

✅ **Be Specific**: "Extract product names and prices from first page" vs "get product info"  
✅ **Set Boundaries**: Specify pages to visit, items to process  
✅ **Include Context**: Mention login requirements, data format

### Performance

✅ Use auto-session for simple tasks  
✅ Reuse sessions for related tasks  
✅ Enable flash mode for speed  
✅ Use appropriate max_steps

### Security

✅ Use secrets for credentials  
✅ Set allowed domains  
✅ Clean up sessions with sensitive data  
✅ Don't share live URLs publicly

### State Management

✅ Use profiles for user-specific state  
✅ Stop sessions when done  
✅ Link sessions to profiles for persistence

## Environment Variables

```bash
# Required
BROWSER_USE_API_KEY=bu_...

# Optional (for specific use cases)
PROXY_COUNTRY_CODE=us
```

## API Models

### Available LLMs

- `browser-use-llm` (default) - Optimized for browser tasks
- `gemini-flash-latest` - Fastest, best for simple tasks
- `gpt-4.1` - High quality, slower
- `o3` - Latest OpenAI model
- `claude-sonnet-4` - Anthropic's latest
- `llama-4-maverick-17b-128e-instruct` - Fast, runs on Groq

## Monitoring & Debugging

### Live URL

Watch browser in real-time:

```typescript
const session = await client.sessions.createSession();
console.log(`Watch live: ${session.liveUrl}`);
```

### Task Streaming

Monitor progress:

```typescript
for await (const update of task.stream()) {
  console.log(update);
}
```

### Webhooks

Get notified of events:

```typescript
// Register at https://cloud.browser-use.com/webhooks
// Receive events for task completion, errors, etc.
```

## Pricing

Check the [Browser Use Cloud Pricing](https://cloud.browser-use.com/pricing) page for current rates.

## Resources

### Links
- [Browser Use Cloud Dashboard](https://cloud.browser-use.com)
- [Documentation](https://docs.cloud.browser-use.com)
- [Status Page](https://status.browser-use.com)
- [GitHub](https://github.com/browser-use/browser-use)

### API Reference
- [v2 API (Current)](https://docs.cloud.browser-use.com/api-reference/v2)
- [v1 API (Legacy)](https://docs.cloud.browser-use.com/api-reference/v1)

### SDKs
- [browser-use-sdk (npm)](https://www.npmjs.com/package/browser-use-sdk)
- [browser-use-sdk (PyPI)](https://pypi.org/project/browser-use-sdk/)

## Support

Need help? 
- Check the [documentation](https://docs.cloud.browser-use.com)
- Visit the [GitHub repository](https://github.com/browser-use/browser-use)
- Contact support through the dashboard

## Next Steps

Explore specific features:
- [Quickstart Guide](./quickstart.md) - Get started quickly
- [Core Concepts](./concepts.md) - Deep dive into architecture
- [Result Schema](./result-schema.md) - Structured data extraction
- [Stealth Mode](./stealth.md) - Bypass detection
- [MCP Server](./mcp-server.md) - AI model integration

---

**Last Updated:** October 28, 2025

This documentation is compiled from [Browser Use Cloud](https://docs.cloud.browser-use.com) official sources for use in this application.

