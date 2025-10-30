# Available Tools for AI Agents

## Overview

Your AI agents have access to tools based on which ones you enable when creating the agent. Tools are dynamically loaded based on the `agent.tools` array in the database.

---

## 🛠️ Tool Access Logic

```typescript
// lib/ai/agent.ts - createAgentTools()
export function createAgentTools(agent: Agent) {
  const tools: Record<string, any> = {};
  
  // 1. Supermemory (if 'supermemory' or 'neo4j' in agent.tools)
  if (agent.tools.includes('supermemory') || agent.tools.includes('neo4j')) {
    const memoryTools = supermemoryTools(process.env.SUPERMEMORY_API_KEY);
    Object.assign(tools, memoryTools);
  }
  
  // 2. Browser-Use (if 'browser' in agent.tools)
  if (agent.tools.includes('browser')) {
    tools.browserTask = browserTaskTool;
  }
  
  // 3. Activity Logging (always included)
  tools.logActivity = logActivityTool;
  
  return tools;
}
```

**Important**: Tools are only added if:
1. The agent has the tool enabled in its `tools` array
2. The required environment variable is set (for external services)

---

## 📋 Complete Tool Inventory

### 1. **Supermemory Tools** (Memory & Knowledge)

**Enabled When**: `agent.tools` includes `'supermemory'` or `'neo4j'`  
**Requires**: `SUPERMEMORY_API_KEY` environment variable  
**Package**: `@supermemory/tools`

These tools are provided by the Supermemory SDK:

#### `search_memories`
- **Description**: Search through stored memories using semantic search
- **Use Case**: Recall past conversations, facts, or decisions
- **Input**:
  ```typescript
  {
    query: string;      // Search query
    limit?: number;     // Max results (default 10)
  }
  ```
- **Output**: Array of relevant memories with content and metadata

#### `store_memory`
- **Description**: Store a new memory for long-term recall
- **Use Case**: Save important information, facts, or decisions
- **Input**:
  ```typescript
  {
    content: string;    // What to remember
    metadata?: object;  // Additional context
  }
  ```
- **Output**: Memory ID and confirmation

#### `list_memories`
- **Description**: List all stored memories
- **Use Case**: Browse memory history
- **Input**:
  ```typescript
  {
    limit?: number;     // Max results
    offset?: number;    // Pagination
  }
  ```
- **Output**: Array of memories

**Example Agent Prompt**:
```
You are an AI assistant with long-term memory. When users share 
important information, use store_memory to save it. Before answering 
questions, use search_memories to recall relevant past context.
```

---

### 2. **Browser Task Tool** (Web Automation)

**Enabled When**: `agent.tools` includes `'browser'`  
**Requires**: `BROWSER_USE_API_KEY` environment variable  
**File**: `lib/ai/tools/browser-task.ts`

#### `browserTask`
- **Description**: Execute browser automation tasks like visiting websites, extracting data, filling forms, or clicking elements
- **Use Case**: Web scraping, research, form automation, data extraction
- **Input**:
  ```typescript
  {
    task: string;       // Natural language task description
    maxSteps: number;   // Max automation steps (1-20, default 10)
  }
  ```
- **Output**:
  ```typescript
  {
    success: boolean;
    task_id: string;
    status: string;
    output: any;        // Extracted data or result
    message: string;
  }
  ```

**Example Tasks**:
- `"Go to example.com and extract all product names"`
- `"Search Google for 'AI news' and summarize the top 3 results"`
- `"Visit the pricing page of stripe.com and tell me the starter plan cost"`
- `"Fill out the contact form at example.com with name: John, email: john@example.com"`

**Example Agent Prompt**:
```
You are a web research assistant. When asked to find information 
online, use the browserTask tool to visit websites and extract 
relevant data. Always cite your sources.
```

---

### 3. **Log Activity Tool** (Internal Logging)

**Enabled When**: **Always** (included for all agents)  
**Requires**: No external API key  
**File**: `lib/ai/tools/log-activity.ts`

#### `logActivity`
- **Description**: Log activities or milestones completed by the agent
- **Use Case**: Record important actions, decisions, or completed tasks for the activity feed
- **Input**:
  ```typescript
  {
    type: 'research' | 'email_sent' | 'webpage_viewed' | 'journal_read';
    payload: Record<string, any>;  // Activity details
    priority: 'low' | 'medium' | 'high' | 'urgent';
  }
  ```
- **Output**:
  ```typescript
  {
    success: boolean;
    activity_id: string;
    message: string;
  }
  ```

**Activity Types**:
- `research` - Research tasks completed
- `email_sent` - Emails sent (future)
- `webpage_viewed` - Webpages visited
- `journal_read` - Journal entries read

**Example Usage**:
```typescript
// Agent completes research
await logActivity({
  type: 'research',
  payload: {
    topic: 'AI trends 2025',
    summary: 'Found 3 key trends...',
    sources: ['url1', 'url2'],
  },
  priority: 'high',
});
```

**Why Always Included?**
- Provides observability into agent actions
- Creates audit trail
- Populates activity feed in dashboard
- No external dependencies

---

## 🚫 Tools NOT Yet Available

These tools are referenced in the codebase but not yet fully implemented:

### Twilio (Voice Calls)
- **Status**: Backend API exists, but NOT wired into agent tools
- **Reason**: Requires human-in-the-loop approval workflow
- **Future**: Will be added in v2 with approval flow

### Composio (Gmail & Calendar)
- **Status**: Deferred to v2
- **Reason**: Decided to launch v1 without email/calendar integration
- **Future**: Will use Composio toolkit for Gmail and Google Calendar

---

## 🎯 How Tools Are Selected

### In the UI (Create Agent Dialog)

When creating an agent, users see these tool options:

```typescript
// components/tool-permissions-selector.tsx (simplified)
const AVAILABLE_TOOLS = [
  { id: 'supermemory', name: 'Supermemory', category: 'Memory' },
  { id: 'browser', name: 'Browser Use', category: 'Automation' },
  // More tools in future...
];
```

### In the Database

Agent tools are stored as a string array:

```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name VARCHAR(255),
  prompt TEXT,
  tools TEXT[] DEFAULT '{}',  -- ['supermemory', 'browser']
  -- ...
);
```

### At Runtime

Tools are dynamically loaded when agent starts:

```typescript
const toolLoopAgent = new ToolLoopAgent({
  model: openai('gpt-4o'),
  tools: createAgentTools(agent),  // Only enabled tools
  system: agent.prompt,
  stopWhen: stepCountIs(20),
});
```

---

## 📊 Tool Comparison

| Tool | Category | API Key Required | Always Available | Cost Impact |
|------|----------|------------------|------------------|-------------|
| **Supermemory** | Memory | ✅ Yes | ❌ No | Low |
| **Browser Use** | Automation | ✅ Yes | ❌ No | Medium |
| **Log Activity** | Logging | ❌ No | ✅ Yes | None |

---

## 🔐 Environment Variables

For tools to work, you need these environment variables:

```bash
# AI Model (required for all agents)
OPENAI_API_KEY=sk-proj-...

# Supermemory (optional - only if using memory tools)
SUPERMEMORY_API_KEY=sm_...

# Browser-Use (optional - only if using browser tool)
BROWSER_USE_API_KEY=bu_...

# App Configuration (required)
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_ENCRYPTION_KEY=...  # 32-byte hex for AES-GCM
```

**Missing API Key Behavior**:
- If `SUPERMEMORY_API_KEY` is missing → Memory tools not added
- If `BROWSER_USE_API_KEY` is missing → Browser tool not added
- Agent will run with only available tools

---

## 🧪 Testing Tools

### Test Supermemory Tools

```typescript
// Create agent with supermemory enabled
const agent = {
  name: 'Memory Assistant',
  prompt: 'You are an AI with long-term memory.',
  tools: ['supermemory'],
};

// Test prompts:
// - "Remember that my favorite color is blue"
// - "What's my favorite color?" (should recall)
// - "List all my memories"
```

### Test Browser Tool

```typescript
// Create agent with browser enabled
const agent = {
  name: 'Web Researcher',
  prompt: 'You are a web research assistant.',
  tools: ['browser'],
};

// Test prompts:
// - "Go to example.com and tell me what you see"
// - "Search for 'AI news' on Google and summarize top 3 results"
// - "What is the pricing for Stripe's starter plan?"
```

### Test Activity Logging

```typescript
// Always available - test with any agent
const agent = {
  name: 'General Assistant',
  prompt: 'You are a helpful assistant.',
  tools: [],
};

// The agent will automatically use logActivity when completing tasks
// Check activity feed after agent completes work
```

---

## 📝 Tool Definition Example

Here's how a tool is defined using Vercel AI SDK 6:

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const exampleTool = tool({
  // 1. Description - helps LLM decide when to use it
  description: 'Does something useful for the agent',
  
  // 2. Input Schema - validates parameters
  inputSchema: z.object({
    param1: z.string().describe('What param1 is for'),
    param2: z.number().optional().default(10).describe('What param2 is for'),
  }),
  
  // 3. Execute Function - performs the action
  execute: async ({ param1, param2 }, { experimental_context }) => {
    // Implementation
    return {
      success: true,
      result: 'something useful',
    };
  },
});
```

---

## 🚀 Adding New Tools

To add a new tool to your agent system:

### 1. Create Tool File

```bash
# Create new tool
touch lib/ai/tools/my-new-tool.ts
```

### 2. Define Tool

```typescript
// lib/ai/tools/my-new-tool.ts
import { tool } from 'ai';
import { z } from 'zod';

export const myNewTool = tool({
  description: 'Description of what this tool does',
  inputSchema: z.object({
    input: z.string().describe('Input description'),
  }),
  execute: async ({ input }) => {
    // Tool logic
    return { success: true, data: 'result' };
  },
});
```

### 3. Add to Agent Tools

```typescript
// lib/ai/agent.ts
import { myNewTool } from './tools/my-new-tool';

export function createAgentTools(agent: Agent) {
  const tools: Record<string, any> = {};
  
  // ... existing tools ...
  
  // Add your new tool
  if (agent.tools.includes('my_new_tool')) {
    tools.myNewTool = myNewTool;
  }
  
  return tools;
}
```

### 4. Update Tool Selector UI

```typescript
// components/tool-permissions-selector.tsx
const AVAILABLE_TOOLS = [
  // ... existing tools ...
  {
    id: 'my_new_tool',
    name: 'My New Tool',
    description: 'What it does',
    category: 'Utilities',
  },
];
```

---

## ❓ FAQ

### Q: Can I use multiple tools in one agent?
**A**: Yes! An agent can have multiple tools enabled. For example:
```typescript
agent.tools = ['supermemory', 'browser'];
```

### Q: What happens if a tool fails?
**A**: The tool returns an error object with `success: false` and an error message. The agent continues execution and can try alternative approaches.

### Q: Can tools call other tools?
**A**: No, tools cannot directly call other tools. However, the agent can orchestrate multi-step workflows by calling tools sequentially based on previous results.

### Q: How many times can an agent call tools?
**A**: Limited by `maxSteps` (default 20). Each tool call counts as a step. The agent stops when:
- It completes the task
- Reaches max steps
- Encounters an unrecoverable error

### Q: Can I see which tools an agent called?
**A**: Yes! Check:
1. **Server logs** - Shows tool calls in real-time
2. **Agent Status Card** - Shows current tool being used
3. **Activity Feed** - Shows completed activities logged by tools
4. **Steps array** - Available in agent execution result

---

## 📚 Resources

- **Vercel AI SDK Docs**: https://v6.ai-sdk.dev/docs/agents/overview
- **Tool Calling Guide**: https://v6.ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
- **Supermemory Docs**: https://supermemory.ai/docs
- **Browser-Use Docs**: https://docs.cloud.browser-use.com

---

## ✅ Summary

Your agents currently have access to:

1. ✅ **Supermemory Tools** (memory storage/recall) - if enabled + API key set
2. ✅ **Browser Task Tool** (web automation) - if enabled + API key set
3. ✅ **Log Activity Tool** (internal logging) - always available

**Total**: Up to **5 tools** available (3 memory tools + 1 browser + 1 logging)

The agent intelligently chooses which tools to use based on:
- The task you give it
- Its system prompt
- Tool descriptions
- Previous conversation context

**No manual tool selection needed** - the LLM decides when to use each tool!

