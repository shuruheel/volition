# Serialization Fix - October 30, 2025

## Problem

Workflow was failing with serialization error:
```
Error [WorkflowRuntimeError]: Failed to serialize step arguments.
[cause]: Error [DevalueError]: Cannot stringify arbitrary non-POJOs
path: '[0].model'
```

## Root Cause

Vercel Workflow requires all arguments passed to step functions to be Plain Old JavaScript Objects (POJOs). Even though we were creating the OpenAI client **inside** the step function, the data being passed **to** the step (specifically the `history` array and `agent` object) contained non-serializable objects from database queries or previous operations.

## Solution

Added aggressive JSON serialization at multiple points in `lib/ai/workflows/agent-workflow.ts`:

### 1. Serialize Agent Object (line 41)
```typescript
const agentRaw = await fetchAgentStep(agentId);
const agent = JSON.parse(JSON.stringify(agentRaw));
```

### 2. Serialize Context Data (line 47)
```typescript
const contextRaw = await getAgentContextStep(agentId, 20, 5);
const { history, researchContext, memoryContext, pending } = JSON.parse(JSON.stringify(contextRaw));
```

### 3. Serialize History Before Passing to Step (line 79)
```typescript
const result = await executeLLMDecisionStep({
  agentId: String(agentId),
  systemPrompt: String(systemPrompt),
  history: JSON.parse(JSON.stringify(history)), // Deep clone to ensure POJO
  // ... other args
});
```

## Why This Works

`JSON.parse(JSON.stringify(obj))` creates a deep clone that:
- Removes any class instances or prototypes
- Removes any functions or symbols
- Converts everything to plain objects, arrays, and primitives
- Ensures compatibility with Vercel Workflow's serialization system

## Trade-offs

- **Performance**: JSON serialization has a small performance cost, but it's negligible compared to LLM API calls
- **Data Loss**: Any non-JSON-serializable data (functions, symbols, circular references) will be lost, but we don't need those in our workflow

## Additional Improvements

Added comprehensive logging throughout `executeLLMDecisionStep` to help debug future issues:
- Initial state logging (messages count, prompt length, tools count)
- Per-turn logging (finish reason, tool calls count, content preview)
- Tool execution logging (function name and arguments)

## Testing

Deploy and monitor Vercel logs for:
1. No more serialization errors
2. Logs showing LLM is receiving tools correctly
3. Logs showing tool calls being executed
4. Agent progressing through multiple steps

## Related Files

- `lib/ai/workflows/agent-workflow.ts` - Main workflow orchestrator
- `lib/ai/workflows/steps.ts` - Step functions including `executeLLMDecisionStep`
- `docs/vercel-workflow/08-serialization.md` - Vercel documentation on serialization

