# Browser Use Cloud - Core Concepts

Understanding the architecture and key concepts of Browser Use Cloud.

> **Source:** [Browser Use Cloud Concepts](https://docs.cloud.browser-use.com/concepts/overview)

## Overview

Browser Use Cloud enables both AI-powered and direct browser automation through five core concepts:

```
Profile → Sessions → Tasks + Files
```

**Plus standalone**: Browser Sessions (direct CDP access)

## Core Concepts

### Profile
Preserves login state and browser settings across automations

### Session  
AI agent environment for natural language task execution

### Browser
Direct Chrome DevTools Protocol access for custom automation

### Task
Single automation instruction given to an AI agent

### Files
Input data for tasks and output results from agents

## Automation Approaches

### 1. AI-Powered (Simple)

**Use Case:** Quick tasks, no login, proof of concepts

```typescript
const task = await client.tasks.createTask({
  task: "Search for top 10 Hacker News posts"
});
```

✅ Natural language  
✅ Quick setup  
❌ Limited control

### 2. AI-Powered (Advanced)

**Use Case:** Multi-step workflows, login required

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

**Use Case:** Custom automation, integration testing

```typescript
const browser = await client.browsers.createBrowserSession({
  profileId: "profile_123"
});

const pwBrowser = await chromium.connectOverCDP(
  browser.cdpUrl
);
```

✅ Full control  
✅ Custom scripts  
❌ Requires programming

## When to Use What

| Use Case | Approach | Why |
|----------|----------|-----|
| AI-Powered Simple | Quick tasks, no login, proof of concepts | Fast, easy |
| AI-Powered Advanced | Multi-step workflows, login required | State preservation |
| Direct Control | Custom automation, integration testing | Full control |
| Profiles | User-specific state, production apps | Persistence |

## Detailed Concept Breakdown

### Task

A **Task** is a single automation job executed by an AI agent in a browser environment.

**Key Properties:**
- `task`: Your instruction (max 20,000 characters)
- `llm`: AI model (`browser-use-llm`, `gemini-flash-latest`, `gpt-4.1`, etc.)
- `sessionId`: Session where task runs (auto-created if not provided)
- `status`: `started`, `paused`, `finished`, or `stopped`
- `output`: Final result from the agent
- `inputFiles` / `outputFiles`: Files for input/output

**Example Tasks:**
- "Log into Gmail and count unread emails"
- "Search for top 10 Hacker News posts and return titles and URLs"
- "Extract product prices from an e-commerce site"

**Execution Models:**

**Auto-Session (Simple):**
```typescript
const task = await client.tasks.createTask({
  task: "Search for top 10 Hacker News posts",
  llm: "browser-use-llm"
});

const result = await task.complete();
console.log(result.output);
```

**Custom Session (Advanced):**
```typescript
// Create session
const session = await client.sessions.createSession({
  profileId: "profile_123"
});

// Upload credentials
const credFile = await client.files.upload("credentials.json");

// Run login task
const loginTask = await client.tasks.createTask({
  sessionId: session.id,
  task: "Log into admin dashboard using uploaded credentials",
  inputFiles: [credFile.id]
});
await loginTask.complete();

// Run data task (login state preserved)
const dataTask = await client.tasks.createTask({
  sessionId: session.id,
  task: "Export user data as CSV"
});

const result = await dataTask.complete();
```

**Task Control:**
```typescript
// Stream progress
for await (const update of task.stream()) {
  console.log(`Status: ${update.status}`);
}

// Control tasks
await task.pause();
await task.resume();
await task.stop();
```

### Session

A **Session** is a stateful browser environment where AI agents execute tasks.

**What it does:**
- Executes multiple tasks sequentially
- Maintains login state between tasks
- Preserves cookies and browser state
- Provides real-time viewing via live URL

**Key Properties:**
- `id`: Unique session identifier
- `status`: `"active"` or `"stopped"`
- `liveUrl`: Real-time browser viewing URL
- `tasks`: All tasks executed in this session
- `profileId`: Profile for browser configuration (optional)

**Creating Sessions:**
```typescript
// Simple session
const session = await client.sessions.createSession();

// Session with profile
const profileSession = await client.sessions.createSession({
  profileId: "profile_123"
});

// Manage sessions
const sessions = await client.sessions.listSessions();
await client.sessions.stopSession(session.id);
console.log(`Watch live: ${session.liveUrl}`);
```

**Usage Patterns:**

**Auto-Session (Implicit):**
```typescript
// Automatically creates and cleans up session
const task = await client.tasks.createTask({
  task: "Search for laptop prices on Amazon"
});
```
✅ Simple  
❌ No state preservation

**Custom Session (Explicit):**
```typescript
const session = await client.sessions.createSession({
  profileId: "user_profile_123"
});

// Run multiple related tasks
const loginTask = await client.tasks.createTask({
  sessionId: session.id,
  task: "Log into admin.example.com"
});

const dataTask = await client.tasks.createTask({
  sessionId: session.id,
  task: "Export user data"
});

// Cleanup
await client.sessions.stopSession(session.id);
```
✅ State preservation  
✅ Multi-step workflows  
❌ Manual cleanup

**State Management:**

**What's Preserved:**
- Authentication cookies and tokens
- Local storage and session data
- Browser history and form data
- Downloaded resources and cache

**Profile Inheritance:**
```typescript
// Session inherits login state from profile
const session = await client.sessions.createSession({
  profileId: "logged_in_profile"
});

// Already logged in from profile
const task = await client.tasks.createTask({
  sessionId: session.id,
  task: "Check dashboard notifications"
});
```

**Real-Time Monitoring:**
```typescript
// Live viewing
console.log(`Watch live: ${session.liveUrl}`);

// Public sharing
const share = await client.sessions.createShare(session.id);
console.log(`Public URL: ${share.url}`);
```

### Profile

Profiles preserve browser state, cookies, and configuration across multiple sessions and automations.

**What's Preserved:**
- Cookies and authentication tokens
- LocalStorage and SessionStorage
- Browser history
- Form autofill data
- Site permissions

**Creating Profiles:**
```typescript
const profile = await client.profiles.createProfile({
  name: "Production User",
  description: "Logged-in user profile for production tasks"
});
```

**Using Profiles:**
```typescript
const session = await client.sessions.createSession({
  profileId: profile.id
});
```

### Browser (Direct CDP Access)

Direct Chrome DevTools Protocol access for custom automation with Playwright, Puppeteer, or Selenium.

**Creating Browser Sessions:**
```typescript
const browser = await client.browsers.createBrowserSession({
  profileId: "my_profile",
  proxyCountryCode: "us"
});

console.log(`CDP URL: ${browser.cdpUrl}`);
```

**With Playwright:**
```typescript
import { chromium } from 'playwright';

const browser = await client.browsers.createBrowserSession();
const pwBrowser = await chromium.connectOverCDP(browser.cdpUrl);

const context = pwBrowser.contexts()[0];
const page = context.pages()[0];

await page.goto('https://example.com');
// Full Playwright API available
```

### File

Files provide input data for tasks and receive output results.

**Uploading Files:**
```typescript
// Upload input file
const file = await client.files.upload("data.csv");

const task = await client.tasks.createTask({
  task: "Analyze the uploaded CSV file",
  inputFiles: [file.id]
});
```

**Downloading Output:**
```typescript
const result = await task.complete();

for (const file of result.outputFiles) {
  const data = await client.files.download(file.id);
  // Process downloaded data
}
```

## Agent Session vs Browser Session

**Browser Session (Standalone):**
- Direct Chrome DevTools Protocol access
- For custom automation scripts
- Full programmatic control

**Agent Session (AI-Powered):**
- AI agent environment
- For natural language tasks
- Automatic execution

These are separate products serving different use cases.

## Best Practices

### Task Instructions

✅ **Be specific**: "Extract product names and prices from first page" vs "get product info"  
✅ **Set boundaries**: Specify pages to visit, items to process  
✅ **Include context**: Mention login requirements, data format

### Performance

✅ Use auto-session for simple tasks  
✅ Reuse sessions for related tasks  
✅ Enable flash mode for speed

### Session Management

✅ Always stop sessions when done  
✅ Use profiles to reduce setup time  
✅ Don't share live URLs publicly  
✅ Clean up sessions with sensitive data

## Next Steps

- [Task Documentation](./README.md#1-task) - Learn about automation jobs
- [Session Documentation](./README.md#2-session) - Master state management
- [Profile Documentation](./README.md#3-profile) - User state preservation
- [Browser Documentation](./README.md#4-browser) - Direct CDP access
- [File Documentation](./README.md#5-file) - Input/output handling

## Resources

- [Browser Use Cloud Dashboard](https://cloud.browser-use.com)
- [Full Documentation](https://docs.cloud.browser-use.com/concepts/overview)
- [API Reference](https://docs.cloud.browser-use.com/api-reference/v2)

---

**Last Updated:** October 28, 2025

For more details, visit the [official concepts documentation](https://docs.cloud.browser-use.com/concepts/overview).

