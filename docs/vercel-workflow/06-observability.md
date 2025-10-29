# Observability

## Overview

Workflow DevKit provides powerful tools to inspect, monitor, and debug your workflows through the CLI and Web UI. These tools allow you to inspect workflow runs, steps, webhooks, events, and stream output.

---

## Quick Start

### Install CLI

The CLI comes pre-installed with the Workflow DevKit:

```bash
npx workflow
```

If the `workflow` package is not already installed, `npx workflow` will install it globally, or use the local installed version if available.

### Basic Commands

```bash
# See all available commands
npx workflow inspect --help

# List recent workflow runs
npx workflow inspect runs
```

---

## Web UI

Workflow DevKit ships with a local web UI for inspecting your workflows. The CLI will locally serve the Web UI when using the `--web` flag.

### Launch Web UI

```bash
# Launch Web UI for visual exploration
npx workflow inspect runs --web
```

This opens an interactive dashboard showing:
- ✅ All workflow runs
- ✅ Step-by-step execution
- ✅ Timing and performance
- ✅ Errors and retries
- ✅ Hook events and resumptions

**Perfect for:**
- 🔍 Debugging workflows locally
- 📊 Understanding execution flow
- ⏱️ Performance analysis
- 🐛 Error diagnosis

---

## Backends (Environments)

The Workflow DevKit CLI can inspect data from any **World** (environment adapter). By default, it inspects data in your local development environment.

### Local Development (Default)

For Next.js projects, the CLI automatically finds data in:
```
.next/workflow-data/
```

No configuration needed! Just run:
```bash
npx workflow inspect runs --web
```

### Production/Remote Environments

To inspect workflows running in production or other environments, use the `--backend` flag:

```bash
# Inspect workflows running on Vercel
npx workflow inspect runs --backend @workflow/world-vercel
```

⚠️ **Note:** Backends might require additional configuration (e.g., environment variables, authentication). The World package should provide instructions.

---

## Vercel Backend

To inspect workflows running on Vercel:

### Prerequisites

1. **Vercel CLI logged in**: `vercel login`
2. **Project linked**: `vercel link`

See [Vercel CLI authentication docs](https://vercel.com/docs/cli/project-linking).

### Usage

```bash
# Inspect workflows running on Vercel
npx workflow inspect runs --backend @workflow/world-vercel
```

This connects to your deployed Vercel project and shows:
- Production workflow runs
- Step execution logs
- Hook events
- Performance metrics

---

## CLI Commands Reference

### List Workflow Runs

```bash
# List all runs
npx workflow inspect runs

# List runs in Web UI
npx workflow inspect runs --web

# List runs from Vercel backend
npx workflow inspect runs --backend @workflow/world-vercel
```

### Inspect Specific Run

```bash
# Get details for a specific run
npx workflow inspect run <runId>

# View in Web UI
npx workflow inspect run <runId> --web
```

### List Steps

```bash
# List all steps for a run
npx workflow inspect steps <runId>
```

### View Hooks

```bash
# List hook events
npx workflow inspect hooks

# View specific hook
npx workflow inspect hook <hookId>
```

---

## What You Can See

### 1. Workflow Runs

- **Status**: `running`, `completed`, `failed`
- **Start/End time**: When workflow started and finished
- **Duration**: Total execution time
- **Return value**: Final workflow result
- **Error details**: If workflow failed

### 2. Steps

- **Step name**: Function name
- **Status**: `pending`, `running`, `completed`, `failed`
- **Retry attempts**: Current attempt number
- **Duration**: Time to execute
- **Input/Output**: Arguments and return values
- **Errors**: Stack traces for failures

### 3. Hooks

- **Hook type**: `userInputHook`, `phoneCallHook`, etc.
- **Token**: Unique identifier for hook instance
- **Status**: `waiting`, `resumed`, `timed_out`
- **Resume data**: Data passed when hook was resumed
- **Waiting time**: How long workflow waited

### 4. Events

- **Event log**: Complete replay history
- **Determinism**: Verify deterministic execution
- **State snapshots**: Workflow state at each step

---

## Debugging Workflows

### Common Issues and How to Debug

#### Issue: Workflow not starting

**Check:**
```bash
# List recent runs
npx workflow inspect runs

# If no runs appear, check:
# 1. Is withWorkflow() wrapper in next.config.mjs?
# 2. Are you using start() from workflow/api?
# 3. Check dev server logs for errors
```

#### Issue: Step failing repeatedly

**Debug:**
```bash
# Inspect the specific run
npx workflow inspect run <runId> --web

# Look at:
# - Step error messages
# - Retry attempts (should see 1, 2, 3)
# - Input parameters to the step
# - Previous successful steps
```

#### Issue: Workflow stuck waiting

**Check:**
```bash
# List hooks for the run
npx workflow inspect hooks

# Verify:
# - Hook was created with correct token
# - No errors in hook creation
# - Resume is being called with matching token
```

#### Issue: Workflow not resuming after restart

**Verify:**
```bash
# Check if run still exists
npx workflow inspect run <runId>

# Ensure:
# 1. withWorkflow() is in config
# 2. Workflow is deterministic
# 3. .workflow-data/ directory exists
```

---

## Best Practices

### 1. Monitor During Development

Keep the Web UI open while developing:
```bash
# In a separate terminal
npx workflow inspect runs --web
```

Refresh after each test to see latest runs.

### 2. Add Console Logs

```typescript
export async function myWorkflow(userId: string) {
  "use workflow"
  
  console.log('[Workflow] Starting for user:', userId)
  
  const user = await fetchUser(userId)
  console.log('[Workflow] Fetched user:', user.email)
  
  await sendEmail(user)
  console.log('[Workflow] Email sent')
  
  return { success: true }
}
```

Logs appear in:
- Dev server console
- Vercel function logs
- Workflow DevKit CLI

### 3. Use Descriptive Step Names

```typescript
// ✅ Good - clear what step does
async function sendWelcomeEmailToNewUser(userId: string) {
  "use step"
  // ...
}

// ❌ Bad - unclear
async function step1(data: any) {
  "use step"
  // ...
}
```

### 4. Log Hook Events

```typescript
const token = `agent-${agentId}-question-${questionId}`
console.log(`[Hook] Creating userInputHook with token: ${token}`)

const events = userInputHook.create({ token })

for await (const event of events) {
  console.log(`[Hook] Received event for ${token}:`, event)
  // ...
}
```

### 5. Track Run IDs

```typescript
// Store runId when starting workflow
const run = await start(myWorkflow, [userId])
console.log(`[Workflow] Started with runId: ${run.runId}`)

// Save to database for later tracking
await sql`
  INSERT INTO workflow_runs (agent_id, run_id, started_at)
  VALUES (${agentId}, ${run.runId}, NOW())
`
```

---

## Production Observability

### Vercel Dashboard

Once deployed to Vercel, workflows appear in:

**Vercel Dashboard → Observability → Workflows**

You'll see:
- 📊 Real-time workflow execution
- ⏱️ Performance metrics
- 🔍 Step-by-step breakdown
- ⚠️ Errors and alerts
- 📈 Historical trends

### Custom Monitoring

Integrate with your monitoring stack:

```typescript
export async function myWorkflow(data: any) {
  "use workflow"
  
  const startTime = Date.now()
  
  try {
    const result = await processData(data)
    
    // Log success metric
    await logMetric('workflow.success', {
      duration: Date.now() - startTime,
      workflowName: 'myWorkflow'
    })
    
    return result
  } catch (error) {
    // Log failure metric
    await logMetric('workflow.failure', {
      duration: Date.now() - startTime,
      error: error.message
    })
    
    throw error
  }
}
```

---

## Troubleshooting Guide

### Workflow not appearing in CLI

**Symptoms:** `npx workflow inspect runs` shows no runs

**Solutions:**
1. Check `next.config.mjs` has `withWorkflow()` wrapper
2. Verify you're using `start()` from `workflow/api`
3. Check `.next/workflow-data/` directory exists
4. Restart dev server

### Web UI not loading

**Symptoms:** `--web` flag doesn't open browser

**Solutions:**
1. Check port 3000 isn't blocked
2. Try manual URL: `http://localhost:3000/_workflow/ui`
3. Check console for errors
4. Update workflow package: `pnpm update workflow`

### Vercel backend connection fails

**Symptoms:** Can't connect to Vercel backend

**Solutions:**
1. Run `vercel login` to authenticate
2. Run `vercel link` to link project
3. Verify environment variables are set
4. Check Vercel project has workflows deployed

---

## Summary

**Local Development:**
```bash
npx workflow inspect runs --web
```

**Production (Vercel):**
```bash
npx workflow inspect runs --backend @workflow/world-vercel
```

**Vercel Dashboard:**
- Navigate to **Observability → Workflows**
- Real-time monitoring
- Historical data
- Error alerts

---

## References

- [Official Documentation](https://useworkflow.dev/docs/observability)
- [Vercel Workflow Dashboard](https://vercel.com/docs/observability)
- [CLI Commands](https://useworkflow.dev/docs/api-reference/cli)

