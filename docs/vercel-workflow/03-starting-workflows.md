# Starting Workflows

## Overview

Once you've defined your workflow functions, you need to trigger them to begin execution. This is done using the `start()` function from `workflow/api`.

---

## The `start()` Function

The `start()` function is used to programmatically trigger workflow executions from:
- API routes
- Server Actions
- Any server-side code

### Basic Usage

```typescript
import { start } from 'workflow/api'
import { handleUserSignup } from './workflows/user-signup'

export async function POST(request: Request) {
  const { email } = await request.json()
  
  // Start the workflow
  const run = await start(handleUserSignup, [email])
  
  return Response.json({
    message: 'Workflow started',
    runId: run.runId
  })
}
```

### Key Points

- ✅ `start()` returns **immediately** after enqueuing (doesn't wait for completion)
- ✅ First argument is your workflow function
- ✅ Second argument is array of arguments to pass to workflow
  - Optional if workflow takes no arguments
  - Must be [serializable](https://useworkflow.dev/docs/foundations/serialization)

---

## The `Run` Object

When you call `start()`, it returns a `Run` object that provides access to the workflow's status and results.

### Basic Properties

```typescript
import { start } from 'workflow/api'
import { processOrder } from './workflows/process-order'

const run = await start(processOrder, [orderId])

// The run object has properties you can await
console.log('Run ID:', run.runId)

// Check the workflow status
const status = await run.status // 'running' | 'completed' | 'failed'

// Get the workflow's return value (blocks until completion)
const result = await run.returnValue
```

### Available Properties

| Property | Type | Description |
|----------|------|-------------|
| `runId` | `string` | Unique identifier for this workflow run |
| `status` | `Promise<string>` | Current status (`running`, `completed`, `failed`) |
| `returnValue` | `Promise<T>` | The value returned by the workflow (async, blocks until completion) |
| `readable` | `ReadableStream` | ReadableStream for streaming updates from the workflow |

⚠️ **Important:** Most `Run` properties are **async getters** that return promises. You need to `await` them.

---

## Common Patterns

### 1. Fire and Forget

The most common pattern - start a workflow and immediately return:

```typescript
import { start } from 'workflow/api'
import { sendNotifications } from './workflows/notifications'

export async function POST(request: Request) {
  // Start workflow and don't wait for it
  const run = await start(sendNotifications, [userId])
  
  // Return immediately
  return Response.json({
    message: 'Notifications queued',
    runId: run.runId
  })
}
```

**Use when:** Background tasks, async processing, non-critical workflows

---

### 2. Wait for Completion

Wait for the workflow to complete before responding:

```typescript
import { start } from 'workflow/api'
import { generateReport } from './workflows/reports'

export async function POST(request: Request) {
  const run = await start(generateReport, [reportId])
  
  // Wait for the workflow to complete
  const report = await run.returnValue
  
  return Response.json({ report })
}
```

**Use when:** Synchronous workflows, user expects immediate result

⚠️ **Warning:** If your workflow takes a long time, your API route may timeout!

---

### 3. Stream Updates to Client

Stream real-time updates from your workflow as it executes:

```typescript
import { start } from 'workflow/api'
import { generateAIContent } from './workflows/ai-generation'

export async function POST(request: Request) {
  const { prompt } = await request.json()
  
  // Start the workflow
  const run = await start(generateAIContent, [prompt])
  
  // Get the readable stream
  const stream = run.getReadable()
  
  // Return the stream immediately
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/octet-stream',
    },
  })
}
```

**In the workflow**, write to the stream:

```typescript
import { getWritable } from 'workflow'

export async function generateAIContent(prompt: string) {
  "use workflow"
  
  const writable = getWritable()
  
  await streamContentToClient(writable, prompt)
  
  return { status: 'complete' }
}

async function streamContentToClient(
  writable: WritableStream,
  prompt: string
) {
  "use step"
  
  const writer = writable.getWriter()
  
  // Stream updates as they become available
  for (let i = 0; i < 10; i++) {
    const chunk = new TextEncoder().encode(`Update ${i}\n`)
    await writer.write(chunk)
  }
  
  writer.releaseLock()
}
```

**Use when:** AI workflows, long-running processes, real-time progress updates

💡 **Tip:** Streams are particularly useful for showing progress to users in real-time.

---

### 4. Check Status Later

Retrieve a workflow run later using its `runId`:

```typescript
import { getRun } from 'workflow/api'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const runId = url.searchParams.get('runId')
  
  // Retrieve the existing run
  const run = getRun(runId)
  
  // Check its status
  const status = await run.status
  
  if (status === 'completed') {
    const result = await run.returnValue
    return Response.json({ result })
  }
  
  return Response.json({ status })
}
```

**Use when:** Polling, long-running workflows, webhook callbacks

---

## Real-World Example: Agent Workflow

From our implementation:

```typescript
// app/api/agents/[id]/start/route.ts
import { start } from 'workflow/api'
import { agentTaskWorkflow } from '@/lib/ai/workflows/agent-workflow'

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const { task } = await request.json()
  
  const prompt = task || 'Continue with your assigned tasks'
  
  console.log(`[Agent Start] Invoking workflow for agent ${id}`)
  
  // CRITICAL: Use start() to properly invoke the workflow
  // This enqueues the workflow and returns a Run object
  const run = await start(agentTaskWorkflow, [id, prompt, 40])
  
  console.log(`[Agent Start] Workflow started with runId: ${run.runId}`)
  
  return NextResponse.json({
    agent: await getAgent(id),
    message: 'Agent workflow started successfully',
    runId: run.runId,
    workflowInvoked: true,
  })
}
```

**Why this works:**
- ✅ Uses `start()` from `workflow/api`
- ✅ Passes arguments as array `[id, prompt, 40]`
- ✅ Returns `runId` for tracking
- ✅ Workflow runs in background
- ✅ Survives server restarts

---

## Common Mistakes

### ❌ Calling Workflow Directly

```typescript
// WRONG - This won't work!
await agentTaskWorkflow(id, prompt, 40)
```

### ✅ Using start()

```typescript
// CORRECT - This works!
await start(agentTaskWorkflow, [id, prompt, 40])
```

### ❌ Fetching Own API

```typescript
// WRONG - Anti-pattern!
await fetch('http://localhost:3000/api/workflows/agent/' + id, {
  method: 'POST',
  body: JSON.stringify({ prompt, maxSteps: 40 })
})
```

### ✅ Direct Import and start()

```typescript
// CORRECT - Direct import!
import { agentTaskWorkflow } from '@/lib/ai/workflows/agent-workflow'
await start(agentTaskWorkflow, [id, prompt, 40])
```

---

## Best Practices

### 1. Always Return runId

```typescript
const run = await start(myWorkflow, [args])

return Response.json({
  message: 'Workflow started',
  runId: run.runId // Important for tracking!
})
```

### 2. Log Workflow Starts

```typescript
console.log(`[Workflow] Starting ${workflowName} with runId: ${run.runId}`)
```

### 3. Handle Errors

```typescript
try {
  const run = await start(myWorkflow, [args])
  return Response.json({ runId: run.runId })
} catch (error) {
  console.error('Failed to start workflow:', error)
  return Response.json(
    { error: 'Failed to start workflow' },
    { status: 500 }
  )
}
```

### 4. Use Typed Arguments

```typescript
// Define workflow with typed parameters
export async function userOnboarding(
  userId: string,
  email: string,
  preferences: UserPreferences
) {
  "use workflow"
  // ...
}

// TypeScript will enforce correct arguments
const run = await start(userOnboarding, [
  userId,
  email,
  preferences
])
```

---

## Next Steps

- [Hooks & Webhooks](./04-hooks-and-webhooks.md) - Human-in-the-loop patterns
- [Errors & Retrying](./05-errors-and-retries.md) - Error handling
- [Observability](./06-observability.md) - Debugging and monitoring

## References

- [Official Documentation](https://useworkflow.dev/docs/foundations/starting-workflows)
- [start() API Reference](https://useworkflow.dev/docs/api-reference/workflow-api/start)
- [Run API Reference](https://useworkflow.dev/docs/api-reference/workflow-api/start#returns)

