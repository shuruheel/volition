# Vercel Workflow – Current Issues and Attempts

This document captures the two recurring problems we’re seeing in production and the concrete changes we tried, with proposed next steps. Use this as a handoff for a fresh debugging session.

## Symptoms

- Duplicate workflow runs for a single user action (multiple Step 1/40 logs back-to-back)
- Runtime errors during the first step loop:
  - `ReferenceError: originalGenerateId is not defined at generateText (...)`

## Context Recap

- Workflows are defined in `lib/ai/workflows/agent-workflow.ts` (uses `'use workflow'`).
- All DB, external network and non-deterministic work were moved into step functions in `lib/ai/workflows/steps.ts` (uses `'use step'`).
- Two API routes exist that can start the workflow:
  - `app/api/agents/[id]/start/route.ts` – enqueues with `start(agentTaskWorkflow, [...])` (intended entrypoint)
  - `app/api/workflows/agent/[agentId]/route.ts` – initially invoked the workflow directly, now refactored to enqueue via `start(...)` as well.

## Issue A: Duplicate Workflow Starts

### Observed
- Logs show two back-to-back POSTs to `/.well-known/workflow/...` and two consecutive "Step 1/40" entries for the same agent.

### Root-Cause Candidates
1. Two API entrypoints are both reachable from the UI (both enqueue the same workflow).
2. Client/UI double-submit (e.g., useEffect running twice, a double click, or another background caller).
3. Retries/idempotency not enforced on the start action.

### What We Changed
- `app/api/workflows/agent/[agentId]/route.ts` refactored to use `start(agentTaskWorkflow, [agentId, prompt, maxSteps])` (previously called the workflow function directly).
- `app/api/agents/[id]/start/route.ts` already enqueues with `start(...)` and checks `agents.status` before starting.

### What Still Might Be Duplicating
- Both routes remain available and valid, so the UI might be hitting both; or another consumer could be calling one route while the UI calls the other.

### Next-Step Options
- Short-term:
  - Disable one route (prefer keeping `app/api/agents/[id]/start`) and update UI to call only that.
  - Add a quick idempotency guard: a per-agent row in `agent_status` or a `workflow_runs` table keyed by `(agent_id, run_window)`; if a row exists in "starting" state within N seconds, return 202 and do not enqueue again.
- Medium-term (per docs – idempotency): use an explicit idempotency key when hitting your own start API and reject duplicates within a time window.
  - Docs: https://useworkflow.dev/docs/foundations/idempotency

## Issue B: `originalGenerateId is not defined` from AI SDK `generateText`

### Observed
- Runtime ReferenceError thrown when `generateText` is called from within the workflow loop.

### Root-Cause Candidates
1. Import-time evaluation of the AI SDK in the workflow sandbox rebinds/rewrites global symbols.
2. Incompatible usage of `generateText` in `'use workflow'` context (examples frequently perform AI calls in step contexts).

### What We Tried
- Removed top-level `import { generateText } from 'ai'` in the workflow; replaced with dynamic import:
  - `const { generateText, stepCountIs } = await import('ai')`
- Replaced `maxSteps: 1` with `stopWhen: stepCountIs(1)` to match types and API.
- Normalized tool schemas from `parameters` to `inputSchema` to satisfy TS types for AI SDK tool definitions.

### Why It May Still Fail
- Even with dynamic `import('ai')`, some AI SDK internals can still reference globals that are not present in the replayer sandbox.
- Official patterns in examples tend to execute AI calls from steps (full Node runtime), not from the workflow function:
  - Examples repo: https://github.com/vercel/workflow-examples/tree/main/ai-sdk-workflow-patterns/workflows

### Safe Patterns from Docs
- Keep functions/tools inside the context that executes `generateText`. Because functions aren’t serializable, defining tools in the workflow and calling `generateText` in a step is tricky unless the tools also live in that same step.
- Serialization rules: only pass serializable data back and forth between workflow and steps (no functions). Docs: https://useworkflow.dev/docs/foundations/serialization

### Next-Step Options
- Option 1 (Minimal change): Keep `generateText` in the workflow, but switch to an SDK/version known to work in Workflow’s sandbox. If this persists, move to Option 2.
- Option 2 (Recommended from examples): Move the AI call and tool execution into a step function and run a single LLM decision cycle per step.
  - Define tools inside the step (same context that calls `generateText`).
  - The workflow loop becomes: call `llmDecisionStep(state) → decision/result`, update state, continue.
  - This matches the examples pattern and avoids the sandbox global mismatch.
- Option 3 (No tools): Keep `generateText` in a step without tools and have the model return a JSON plan; then the workflow calls the appropriate step (start session, scrape, complete) based on that JSON. This avoids function serialization entirely at the expense of manual tool execution.

## Additional Changes Already Landed
- Moved all DB access to step functions (`lib/ai/workflows/steps.ts`) to eliminate Node.js module violations in workflows.
- Split types into `lib/db-types.ts` so importing types in workflows does not pull in `lib/db.ts` (which configures node/websocket adapters).

## Current State
- Build succeeds; workflow starts; duplicate runs and the `originalGenerateId` error still reported by logs.

## Proposed Fresh-Session Plan

1. Eliminate duplication at the source
   - Temporarily remove `app/api/workflows/agent/[agentId]/route.ts`, keep only `app/api/agents/[id]/start/route.ts`.
   - Add a 5–10s idempotency window in the start route keyed by `(agent_id)`; reject/enqueue-once behavior.

2. Move LLM decision + tools into a step
   - Create `llmDecisionStep(agentId, state)` that:
     - Defines tools inside the step
     - Calls `generateText({ tools, stopWhen: stepCountIs(1), ... })`
     - Returns `{ nextAction, payload }` (serializable)
   - Workflow becomes a thin loop: await `llmDecisionStep()` → branch to existing step functions → continue.

3. Keep everything serializable across the workflow boundary
   - Only pass plain data structures (no functions, classes, streams) between workflow and steps. See: https://useworkflow.dev/docs/foundations/serialization

4. Use idempotency for non-idempotent side effects in steps
   - If you add side effects (email/SMS/payments) in steps, use `getStepMetadata().stepId` as the idempotency key. See: https://useworkflow.dev/docs/foundations/idempotency

## Files Most Relevant
- `lib/ai/workflows/agent-workflow.ts` – main workflow
- `lib/ai/workflows/steps.ts` – steps (DB, browser, research, status)
- `app/api/agents/[id]/start/route.ts` – preferred start API
- `app/api/workflows/agent/[agentId]/route.ts` – secondary start API (can remove)
