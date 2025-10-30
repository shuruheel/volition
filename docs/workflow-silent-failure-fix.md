# Workflow Silent Failure Fix - October 29, 2025

## Issue

Workflow was failing silently with no error messages:
```
2025-10-29T00:50:12.144Z [info] [Agent Start] Invoking workflow for agent b942c096-1c74-402e-9bd7-ceb20ba8f1bd
2025-10-29T00:50:12.145Z [info] [Workflow] Starting agent b942c096-1c74-402e-9bd7-ceb20ba8f1bd with prompt: Start working on your assigned tasks

// ... then nothing
```

## Root Cause

**Missing `withWorkflow()` wrapper in `next.config.mjs`**

According to [Vercel Workflow documentation](https://useworkflow.dev/docs/getting-started/next), the Next.js config MUST be wrapped with `withWorkflow()` to enable:
- The `"use workflow"` directive
- The `"use step"` directive
- Workflow execution runtime

Without this wrapper, workflows fail silently because the directives are treated as no-ops.

## The Fix

### Before (❌ Broken):
```javascript
// next.config.mjs
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
```

### After (✅ Fixed):
```javascript
// next.config.mjs
import { withWorkflow } from 'workflow/next'

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default withWorkflow(nextConfig)
```

## How Vercel Workflow Works

### Environments ("Worlds")

Vercel Workflow uses "Worlds" - adapters for different infrastructure:

#### 1. Local Development (Automatic)
- **World**: Embedded World (filesystem-based)
- **Storage**: `.workflow-data/` directory
- **Configuration**: None needed
- **Detection**: Automatic when running `npm run dev`

#### 2. Vercel Production (Automatic)
- **World**: Vercel World (production-ready)
- **Storage**: Vercel's infrastructure
- **Configuration**: None needed in Vercel console
- **Detection**: Automatic when deployed to Vercel

#### 3. Other Platforms (Manual)
- Requires custom "World" implementation
- See [Deploying Documentation](https://useworkflow.dev/docs/deploying)

### Key Principles

✅ **Workflow Functions** (`"use workflow"`):
- Orchestrate steps
- Run in sandboxed environment (limited Node.js access)
- Must be deterministic (replayed multiple times)
- Can suspend execution without consuming resources

✅ **Step Functions** (`"use step"`):
- Execute actual business logic
- Full Node.js runtime access
- Automatic retry on errors (max 3 attempts)
- Results persisted in event log

✅ **Suspension Mechanisms**:
- `await stepFunction()` - workflow suspends while step runs
- `sleep("5s")` - pause for fixed duration
- `await hook` - pause until external event (user input, approval, etc.)

### Observability

View workflow execution:
- **Local**: `npx workflow inspect runs --web`
- **Vercel Dashboard**: Observability → Workflows (after deployment)

## Why Silent Failure?

Without `withWorkflow()`:
1. The build succeeds (no compilation error)
2. The `"use workflow"` directive is treated as a string literal (no-op)
3. The function tries to run but lacks the workflow runtime
4. Execution stops but doesn't throw an error
5. No logs appear because the workflow never actually starts

## Testing Verification

After applying the fix, you should see:
```
[Workflow] Starting agent <id> with prompt: <prompt>
[Workflow] Agent <id> - Step 0/40
[Workflow] Thinking...
[Workflow] Calling <toolName>
[Step] Executing research for agent <id>
...
```

## References

- [Vercel Workflow - Getting Started (Next.js)](https://useworkflow.dev/docs/getting-started/next)
- [Workflows and Steps](https://useworkflow.dev/docs/foundations/workflows-and-steps)
- [Hooks & Webhooks](https://useworkflow.dev/docs/foundations/hooks)
- [Deploying](https://useworkflow.dev/docs/deploying)

---

**Key Takeaway**: Always wrap your Next.js config with `withWorkflow()` when using Vercel Workflow. This is the **most critical** configuration requirement.

