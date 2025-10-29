# Vercel Workflow - Getting Started (Next.js)

## Critical Setup Requirements

### 1. Install Workflow Package

```bash
pnpm add workflow
```

### 2. Configure Next.js (**REQUIRED**)

**This is the most critical step!** Your `next.config.mjs` MUST be wrapped with `withWorkflow()`:

```javascript
import { withWorkflow } from 'workflow/next'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // your config
}

export default withWorkflow(nextConfig)
```

**Without this wrapper:**
- ❌ Workflows will fail silently
- ❌ `"use workflow"` and `"use step"` directives won't work
- ❌ No error messages will appear in logs

### 3. TypeScript IntelliSense (Optional)

Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["workflow"]
  }
}
```

## Creating Your First Workflow

### Workflow Function

Create a workflow file (e.g., `workflows/user-signup.ts`):

```typescript
import { sleep } from "workflow"

export async function handleUserSignup(email: string) {
  "use workflow" // Critical directive
  
  const user = await createUser(email)
  await sendWelcomeEmail(user)
  
  await sleep("5s") // Pause for 5s - doesn't consume resources
  await sendOnboardingEmail(user)
  
  return { userId: user.id, status: "onboarded" }
}
```

**Key Characteristics:**
- Orchestrates steps (doesn't do actual work)
- Runs in sandboxed environment (limited Node.js access)
- Must be deterministic (replayed multiple times)
- Can suspend execution without consuming resources

### Step Functions

Define the actual work in steps:

```typescript
import { FatalError } from "workflow"

async function createUser(email: string) {
  "use step" // Critical directive
  
  console.log(`Creating user with email: ${email}`)
  
  // Full Node.js access - database calls, APIs, etc.
  return { id: crypto.randomUUID(), email }
}

async function sendWelcomeEmail(user: { id: string; email: string }) {
  "use step"
  
  console.log(`Sending welcome email to user: ${user.id}`)
  
  if (Math.random() < 0.3) {
    // By default, steps will be retried for unhandled errors
    throw new Error("Retryable!")
  }
}

async function sendOnboardingEmail(user: { id: string; email: string }) {
  "use step"
  
  if (!user.email.includes("@")) {
    // To skip retrying, throw a FatalError instead
    throw new FatalError("Invalid Email")
  }
  
  console.log(`Sending onboarding email to user: ${user.id}`)
}
```

**Key Characteristics:**
- Full Node.js runtime access
- Automatic retry on errors (default: 3 attempts)
- Results persisted for replay
- Can throw `FatalError` to skip retries

## Invoking Workflows

### Create API Route Handler

Create `app/api/signup/route.ts`:

```typescript
import { start } from 'workflow/api' // CRITICAL: Use start()
import { handleUserSignup } from "@/workflows/user-signup"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { email } = await request.json()
  
  // Executes asynchronously and doesn't block your app
  const run = await start(handleUserSignup, [email])
  
  return NextResponse.json({
    message: "User signup workflow started",
    runId: run.runId
  })
}
```

**Critical Points:**
- ✅ **MUST** use `start()` from `workflow/api`
- ❌ **NEVER** call workflow function directly
- Returns immediately after enqueuing
- First arg is workflow function
- Second arg is array of arguments (optional if no args)

## Running in Development

Start your dev server:

```bash
pnpm dev
```

Trigger your workflow:

```bash
curl -X POST --json '{"email":"hello@example.com"}' http://localhost:3000/api/signup
```

Check logs in terminal for workflow execution.

### Inspect with Web UI

```bash
# CLI inspection
npx workflow inspect runs

# Web UI (visual)
npx workflow inspect runs --web
```

## Deploying to Production

### Vercel (Automatic)

Workflow DevKit works automatically on Vercel:
- **No console configuration needed**
- Uses "Vercel World" (production backend)
- Integrated with Vercel's infrastructure
- Just deploy your code and it works ✅

### Other Platforms

Requires custom "World" implementation. See [Deploying Documentation](./07-deploying.md).

## Common Patterns

### 1. Fire and Forget

```typescript
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

### 2. Wait for Completion

```typescript
export async function POST(request: Request) {
  const run = await start(generateReport, [reportId])
  
  // Wait for the workflow to complete
  const report = await run.returnValue
  
  return Response.json({ report })
}
```

⚠️ **Warning:** Be cautious - if workflow takes long, API route may timeout.

### 3. Stream Updates

```typescript
export async function POST(request: Request) {
  const { prompt } = await request.json()
  
  // Start the workflow
  const run = await start(generateAIContent, [prompt])
  
  // Return the stream immediately
  return new Response(run.readable, {
    headers: {
      'Content-Type': 'application/octet-stream',
    },
  })
}
```

## Next Steps

- [Workflows and Steps](./02-workflows-and-steps.md) - Core concepts
- [Starting Workflows](./03-starting-workflows.md) - Invocation patterns
- [Hooks & Webhooks](./04-hooks-and-webhooks.md) - Human-in-the-loop
- [Errors & Retrying](./05-errors-and-retries.md) - Error handling

## References

- [Official Documentation](https://useworkflow.dev/docs/getting-started/next)
- [Vercel Workflow GitHub](https://github.com/vercel/workflow)

