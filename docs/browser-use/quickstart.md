# Browser Use Cloud - Quickstart Guide

Get started with Browser Use Cloud in minutes.

> **Source:** [Browser Use Cloud Documentation](https://docs.cloud.browser-use.com/get-started/quickstart)

## Installation

**TypeScript/Node.js:**
```bash
npm install browser-use-sdk
```

**Python:**
```bash
pip install browser-use-sdk
```

## Get Your API Key

1. Sign up at [Browser Use Cloud](https://cloud.browser-use.com)
2. Navigate to your dashboard
3. Copy your API key (starts with `bu_...`)

Add it to your `.env` file:

```bash
BROWSER_USE_API_KEY=bu_...
```

## Your First Task

**TypeScript:**
```typescript
import { BrowserUseClient } from "browser-use-sdk";

const client = new BrowserUseClient({
  apiKey: "bu_...", // Optional if BROWSER_USE_API_KEY is set
});

const task = await client.tasks.createTask({
  task: "Search for the top 10 Hacker News posts and return the title and url.",
});

const result = await task.complete();

console.log(result.output);
```

**Python:**
```python
from browser_use import BrowserUseClient

client = BrowserUseClient(api_key="bu_...")

task = client.tasks.create_task(
    task="Search for the top 10 Hacker News posts and return the title and url."
)

result = task.complete()

print(result.output)
```

> **Note:** The `apiKey` parameter is optional if you set the `BROWSER_USE_API_KEY` environment variable.

## Understanding Core Concepts

Before diving into advanced features, understand the key concepts:

### 1. Overview

Learn how all concepts work together - [Concepts Overview](./concepts.md)

### 2. Task

Understand automation jobs and execution - Single instructions given to AI agents

### 3. Session

Master stateful browser environments - Persistent browser instances that maintain state

### 4. Profile

Preserve user state across automations - Browser configurations that persist cookies and data

## Next Steps

### Get Structured Data

Use schemas to enforce specific output formats:

```typescript
import { z } from "zod";

const TaskOutput = z.object({
  posts: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
    })
  ),
});

const task = await client.tasks.createTask({
  task: "Search for the top 10 Hacker News posts",
  schema: TaskOutput,
});

const result = await task.complete();

for (const post of result.parsed.posts) {
  console.log(`${post.title} - ${post.url}`);
}
```

### Monitor Progress

Stream task updates in real-time:

```typescript
for await (const step of task.stream()) {
  console.log(`Step ${step.index}: ${step.action}`);
}

const result = await task.complete();
```

### Enable Stealth

Bypass anti-bot detection:

```typescript
const session = await client.sessions.createSession({
  proxyCountryCode: "us"
});

const task = await client.tasks.createTask({
  sessionId: session.id,
  task: "Navigate to protected site"
});
```

### Add Safety

Protect sensitive data with secrets and domain restrictions:

```typescript
const task = await client.tasks.createTask({
  task: "Log into admin panel",
  secrets: {
    "https://example.com": "mypassword"
  },
  allowedDomains: ["example.com"]
});
```

## Common Patterns

### Simple One-Off Task

```typescript
const task = await client.tasks.createTask({
  task: "Get the current price of Bitcoin from CoinMarketCap"
});

const result = await task.complete();
```

### Multi-Step Workflow

```typescript
// Create session
const session = await client.sessions.createSession({
  profileId: "my_profile"
});

// Login
const loginTask = await client.tasks.createTask({
  sessionId: session.id,
  task: "Log into dashboard"
});
await loginTask.complete();

// Extract data (login state preserved)
const dataTask = await client.tasks.createTask({
  sessionId: session.id,
  task: "Export user list as CSV"
});
const result = await dataTask.complete();

// Cleanup
await client.sessions.stopSession(session.id);
```

### With File Upload

```typescript
// Upload file
const file = await client.files.upload("data.csv");

// Use in task
const task = await client.tasks.createTask({
  task: "Process the uploaded CSV file",
  inputFiles: [file.id]
});

const result = await task.complete();

// Download output files
for (const outputFile of result.outputFiles) {
  const data = await client.files.download(outputFile.id);
  // Process downloaded data
}
```

## Debugging Tips

### Watch Live

See what the browser is doing in real-time:

```typescript
const session = await client.sessions.createSession();
console.log(`Watch live: ${session.liveUrl}`);
// Open this URL in your browser to see the automation
```

### Stream Updates

Monitor task progress step-by-step:

```typescript
for await (const update of task.watch()) {
  console.log(JSON.stringify(update, null, 2));
  
  if (update.data.status === "finished") {
    console.log("Task completed!");
  }
}
```

### Enable Verbose Logging

```typescript
const task = await client.tasks.createTask({
  task: "Navigate to example.com",
  thinking: true // Enable AI reasoning visibility
});
```

## Error Handling

```typescript
try {
  const task = await client.tasks.createTask({
    task: "Perform automation"
  });
  
  const result = await task.complete();
  
  if (result.status === "finished") {
    console.log("Success:", result.output);
  } else {
    console.error("Task did not complete:", result.status);
  }
} catch (error) {
  console.error("Error:", error.message);
}
```

## Best Practices

1. **Be Specific**: "Extract product names and prices from first page" vs "get products"
2. **Use Sessions**: For related tasks that need state preservation
3. **Clean Up**: Stop sessions when done to avoid unnecessary costs
4. **Monitor Progress**: Use streaming for long-running tasks
5. **Set Boundaries**: Use `maxSteps` to prevent runaway tasks
6. **Secure Credentials**: Always use `secrets` for passwords

## Next Steps

- [Core Concepts](./concepts.md) - Deep dive into architecture
- [Result Schema](./result-schema.md) - Structured data extraction
- [Streaming](./streaming.md) - Real-time progress monitoring
- [Stealth Mode](./stealth.md) - Bypass detection
- [Safety](./safety.md) - Secure your automations

## Resources

- [Browser Use Cloud Dashboard](https://cloud.browser-use.com)
- [Full Documentation](https://docs.cloud.browser-use.com)
- [API Reference](https://docs.cloud.browser-use.com/api-reference/v2)
- [GitHub](https://github.com/browser-use/browser-use)

---

**Last Updated:** October 28, 2025

For more details, visit the [official documentation](https://docs.cloud.browser-use.com/get-started/quickstart).

