# Vercel Workflow Documentation

This directory contains comprehensive documentation for Vercel Workflow integration in the Agent Dashboard project.

## Documentation Index

### Getting Started
- [**01 - Getting Started**](./01-getting-started.md)
  - Critical setup requirements
  - `withWorkflow()` configuration
  - Creating your first workflow
  - Invoking workflows with `start()`

### Core Concepts
- [**02 - Workflows and Steps**](./02-workflows-and-steps.md)
  - Workflow functions (`"use workflow"`)
  - Step functions (`"use step"`)
  - Suspension and resumption
  - Best practices

- [**03 - Starting Workflows**](./03-starting-workflows.md)
  - The `start()` function
  - Run object and properties
  - Common patterns (fire-and-forget, wait, stream, polling)
  - Real-world examples

### Advanced Features
- [**04 - Hooks and Webhooks**](./workflow-overview.md#hooks) *(See Workflow Overview)*
  - Human-in-the-loop patterns
  - `defineHook` and hook lifecycle
  - User input, approvals, and external events

- [**05 - Errors and Retries**](./05-errors-and-retries.md)
  - Default retry behavior
  - `FatalError` for intentional failures
  - `RetryableError` for custom delays
  - Exponential backoff
  - Rollback patterns (Saga)

### Operations
- [**06 - Observability**](./06-observability.md)
  - CLI and Web UI
  - Local development debugging
  - Production monitoring (Vercel Dashboard)
  - Troubleshooting guide

- [**07 - Deploying**](./07-deploying.md)
  - Worlds (environment adapters)
  - Embedded World (local)
  - Vercel World (production)
  - Custom worlds
  - Deployment checklist

### Implementation Guides
- [**Workflow Overview**](./workflow-overview.md)
  - Architecture overview
  - Key concepts and mechanics
  - Slack bot example validation

- [**Workflow Implementation**](./workflow-implementation.md)
  - Our implementation specifics
  - Workflow patterns comparison
  - Integration points
  - Testing checklist

## Quick Reference

### Critical Setup (Don't Skip!)

**1. Wrap Next.js config:**
```javascript
// next.config.mjs
import { withWorkflow } from 'workflow/next'
export default withWorkflow(nextConfig)
```

**2. Use `start()` to invoke:**
```typescript
import { start } from 'workflow/api'
const run = await start(myWorkflow, [args])
```

**3. Never call workflows directly:**
```typescript
// ❌ WRONG
await myWorkflow(args)

// ✅ CORRECT
await start(myWorkflow, [args])
```

## Common Issues & Solutions

### Issue: Workflow fails silently

**Cause:** Missing `withWorkflow()` wrapper  
**Solution:** Add to `next.config.mjs` - see [01-getting-started.md](./01-getting-started.md)

### Issue: Workflow doesn't start

**Cause:** Calling workflow directly instead of using `start()`  
**Solution:** Import and use `start()` from `workflow/api` - see [03-starting-workflows.md](./03-starting-workflows.md)

### Issue: Workflow doesn't resume after restart

**Cause:** Not using hooks correctly or workflow not deterministic  
**Solution:** Check hooks implementation and ensure workflow is deterministic - see [workflow-overview.md](./workflow-overview.md)

## Key Concepts

### Workflows vs Steps

| Aspect | Workflow | Step |
|--------|----------|------|
| **Directive** | `"use workflow"` | `"use step"` |
| **Purpose** | Orchestrate | Execute work |
| **Runtime** | Sandboxed | Full Node.js |
| **Can suspend** | Yes | No |
| **Auto-retry** | No | Yes (3 attempts) |

### Workflow Lifecycle

```
┌─────────────────┐
│  start() called │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Workflow runs  │◄────────┐
└────────┬────────┘         │
         │                  │
         v                  │
    ┌─────────┐            │
    │ Need    │            │
    │ input?  │            │
    └────┬────┘            │
         │                  │
    Yes  │  No             │
         v                  │
┌─────────────────┐        │
│ Suspend (hook)  │        │
└────────┬────────┘        │
         │                  │
         v                  │
┌─────────────────┐        │
│ User approves   │        │
└────────┬────────┘        │
         │                  │
         v                  │
┌─────────────────┐        │
│ hook.resume()   │────────┘
└─────────────────┘
         │
         v
┌─────────────────┐
│  Workflow done  │
└─────────────────┘
```

### Our Implementation

**Hooks:**
- `userInputHook` - Agent questions
- `phoneCallHook` - Call approvals
- `emailApprovalHook` - Email approvals
- `activityApprovalHook` - Generic approvals

**Steps:**
- `executeResearchStep` - Web search + scrape
- `executeBrowserStep` - Browser automation
- `logActivityStep` - Activity logging
- Research session steps (start, append, complete)

**Main Workflow:**
- `agentTaskWorkflow` - Core agent orchestration

## Testing Workflows

### Local Development

```bash
# Start dev server
pnpm dev

# In another terminal, open Web UI
npx workflow inspect runs --web
```

### Critical Test (Restart Simulation)

1. Start an agent
2. Agent asks a question → workflow pauses
3. **Restart dev server** (Ctrl+C, then `pnpm dev`)
4. Answer the question
5. ✅ Workflow should resume from exact point

## Production Deployment

### Vercel (Automatic)

```bash
# Just deploy - no configuration needed!
vercel deploy
```

Workflows automatically use Vercel World. View execution in:
**Vercel Dashboard → Observability → Workflows**

### Deployment Checklist

- [ ] `withWorkflow()` in `next.config.mjs`
- [ ] Using `start()` (not direct calls)
- [ ] No `fetch()` to own API routes
- [ ] Environment variables set
- [ ] Test in preview environment
- [ ] Monitor Vercel Dashboard

## External Resources

- [Official Documentation](https://useworkflow.dev/docs)
- [GitHub Repository](https://github.com/vercel/workflow)
- [Examples](https://github.com/vercel/workflow-examples)
- [Slack Bot Guide](https://vercel.com/guides/stateful-slack-bots-with-vercel-workflow)

## Need Help?

1. Check [troubleshooting sections](./06-observability.md#troubleshooting-guide) in each doc
2. Review [Workflow Overview](./workflow-overview.md) for architecture
3. See [our implementation](./workflow-implementation.md) for specific patterns
4. Check [official docs](https://useworkflow.dev/docs) for latest updates

---

**Last Updated:** October 29, 2025  
**Vercel Workflow Version:** Latest  
**Project:** Agent Dashboard

