# Workflow Tools vs Legacy Agent Tools

## Overview

This document explains the critical distinction between tool definitions for **Vercel Workflows** and **AI SDK generateText()**, and why they cannot be used interchangeably.

## The Two Systems

### 1. Vercel Workflow System (Current)

**File**: `lib/ai/workflows/agent-workflow.ts`

**Purpose**: Durable, resumable agent execution that survives restarts and deployments.

**Tool Format**:
```typescript
tools: {
  myTool: {
    description: 'Description of what the tool does',
    parameters: z.object({
      input: z.string().describe('Input parameter')
    }),
    execute: async ({ input }) => {
      // Delegate to step functions for actual work
      const result = await myStepFunction(input);
      return result;
    }
  }
}
```

**Key Characteristics**:
- Uses `parameters` key (not `inputSchema`)
- Tools defined **inline** in the workflow
- **Sandboxed environment** - limited Node.js access
- All business logic in **step functions** (`lib/ai/workflows/steps.ts`)
- Zod schemas work fine for validation

**Constraints**:
- ❌ Cannot import Node.js modules like `fs`, database drivers, etc.
- ❌ Cannot use AI SDK `tool()` helper
- ❌ Cannot import tools from `lib/ai/tools/*.ts`
- ✅ Can use basic JavaScript, Zod, and workflow primitives
- ✅ Can call step functions that have full Node.js access

### 2. Legacy AI SDK System

**File**: `lib/ai/agent.legacy.ts`

**Purpose**: Original agent implementation using AI SDK's generateText() with tool calling.

**Tool Format**:
```typescript
// lib/ai/tools/my-tool.ts
import { tool } from 'ai';
import { z } from 'zod';
import { sql } from '@/lib/db'; // ✅ Full Node.js access

export const myTool = tool({
  description: 'Description of what the tool does',
  inputSchema: z.object({  // Note: inputSchema, not parameters
    input: z.string().describe('Input parameter')
  }),
  execute: async ({ input }) => {
    // Can directly use Node.js modules
    const result = await sql`SELECT * FROM table`;
    return result;
  }
});
```

**Key Characteristics**:
- Uses `inputSchema` key (not `parameters`)
- Tools exported from separate files
- **Full Node.js runtime** access
- Can import any npm package or database driver
- Uses AI SDK `tool()` helper

**Constraints**:
- ❌ No durability - loses state on restart
- ❌ Not observable via Vercel Workflow dashboard
- ✅ Full Node.js and npm package access
- ✅ Can use database connections directly

## Why They're Incompatible

### Problem 1: Different Key Names

```typescript
// Workflow expects this:
{ parameters: z.object({...}) }

// AI SDK tool() returns this:
{ inputSchema: z.object({...}) }
```

The workflow system doesn't recognize `inputSchema` and throws the error:
> Invalid schema for function 'X': schema must be a JSON Schema of 'type: "object"', got 'type: "None"'

### Problem 2: Sandboxed Environment

```typescript
// This works in AI SDK tools:
import { sql } from '@/lib/db';
export const myTool = tool({
  execute: async () => {
    await sql`SELECT * FROM table`; // ✅ Works
  }
});

// This FAILS in workflows:
import { sql } from '@/lib/db'; // ❌ Error: Cannot use Node.js module
export async function myWorkflow() {
  'use workflow';
  // ...
}
```

Build error:
> Cannot use Node.js module "fs" in workflow functions. Move this module to a step function.

## The Solution: Separation of Concerns

### For Workflows: Inline Tools + Step Functions

```typescript
// lib/ai/workflows/agent-workflow.ts
export async function agentTaskWorkflow(agentId: string) {
  'use workflow';
  
  await generateText({
    tools: {
      // Define tool INLINE
      researchTopic: {
        description: 'Research a topic',
        parameters: z.object({
          query: z.string()
        }),
        execute: async ({ query }) => {
          // Delegate to step function
          return await executeResearchStep(agentId, query);
        }
      }
    }
  });
}

// lib/ai/workflows/steps.ts
export async function executeResearchStep(agentId: string, query: string) {
  'use step';
  
  // Full Node.js access here
  import { sql } from '@/lib/db';
  import { searchAndScrape } from '@/lib/integrations/firecrawl';
  
  const results = await searchAndScrape({ query });
  await sql`INSERT INTO ...`;
  
  return results;
}
```

### For Legacy Agent: Import Tool Files

```typescript
// lib/ai/agent.legacy.ts
import { myTool } from './tools/my-tool';

export async function executeAgentTask(agent: Agent, prompt: string) {
  const tools = { myTool }; // Import from separate file
  
  const result = await generateText({
    model: openai('gpt-4o'),
    tools,
    prompt
  });
  
  return result;
}
```

## Adding New Tools

### Adding a Tool to Workflows

1. **Define inline** in `lib/ai/workflows/agent-workflow.ts`:

```typescript
tools: {
  myNewTool: {
    description: 'What it does',
    parameters: z.object({ /* ... */ }),
    execute: async (params) => {
      // Call step function for actual work
      return await myNewStep(params);
    }
  }
}
```

2. **Create step function** in `lib/ai/workflows/steps.ts`:

```typescript
export async function myNewStep(params: any) {
  'use step';
  
  // Full Node.js access here
  const result = await doWork(params);
  return result;
}
```

### Adding a Tool to Legacy Agent

1. **Create tool file** `lib/ai/tools/my-new-tool.ts`:

```typescript
/**
 * LEGACY AGENT TOOL - For use with AI SDK generateText() only
 * DO NOT import into Vercel Workflows
 */
import { tool } from 'ai';
import { z } from 'zod';

export const myNewTool = tool({
  description: 'What it does',
  inputSchema: z.object({ /* ... */ }),
  execute: async (params) => {
    // Direct implementation with full Node.js
    return await doWork(params);
  }
});
```

2. **Import in agent.legacy.ts**:

```typescript
import { myNewTool } from './tools/my-new-tool';

const tools = {
  ...existingTools,
  myNewTool
};
```

## Common Mistakes to Avoid

### ❌ DON'T: Import tool files into workflows

```typescript
// lib/ai/workflows/agent-workflow.ts
import { myTool } from '../tools/my-tool'; // ❌ WRONG

export async function workflow() {
  'use workflow';
  
  await generateText({
    tools: { myTool } // ❌ Will fail with schema error
  });
}
```

**Why it fails**:
1. Tool has `inputSchema` instead of `parameters`
2. Tool imports Node.js modules that can't be used in workflows

### ❌ DON'T: Use JSON Schema instead of Zod

```typescript
// You might think: "Let me use JSON Schema to avoid Zod issues"
parameters: {
  type: 'object',
  properties: {
    query: { type: 'string' }
  }
}
```

**This is unnecessary** - Zod works perfectly fine in workflows. The issue is the `tool()` helper, not Zod.

### ✅ DO: Define tools inline with proper key

```typescript
tools: {
  myTool: {
    description: '...',
    parameters: z.object({ query: z.string() }), // ✅ CORRECT
    execute: async ({ query }) => {
      return await myStep(query); // ✅ Delegate to step
    }
  }
}
```

## Migration Guide

If you have an existing tool in `lib/ai/tools/` that you want to use in a workflow:

1. **Don't move or import the file** - leave it for legacy agent use
2. **Create inline tool definition** in workflow:
   - Copy the `description`
   - Copy the Zod schema to `parameters` (not `inputSchema`)
   - Create a step function with the execute logic
   - Call the step function from tool's execute

3. **Example**:

```typescript
// BEFORE (lib/ai/tools/my-tool.ts):
export const myTool = tool({
  description: 'Does something',
  inputSchema: z.object({ input: z.string() }),
  execute: async ({ input }) => {
    const data = await sql`SELECT * FROM table WHERE id = ${input}`;
    return data;
  }
});

// AFTER (workflow):
// Step function:
export async function myToolStep(input: string) {
  'use step';
  const data = await sql`SELECT * FROM table WHERE id = ${input}`;
  return data;
}

// Inline tool definition:
tools: {
  myTool: {
    description: 'Does something',
    parameters: z.object({ input: z.string() }),
    execute: async ({ input }) => {
      return await myToolStep(input);
    }
  }
}
```

## Verification Checklist

Before deploying:

- [ ] No imports from `lib/ai/tools/` in workflow files
- [ ] All workflow tools use `parameters` key
- [ ] All business logic is in step functions (marked with `'use step'`)
- [ ] Legacy agent still imports tool files correctly
- [ ] Build succeeds without sandbox violation errors
- [ ] Workflow observability works in Vercel dashboard

## References

- [Vercel Workflow Documentation](https://vercel.com/docs/workflow)
- [Workflows and Steps](./vercel-workflow/02-workflows-and-steps.md)
- [AI SDK Tool Calling](./vercel-ai-sdk-6/tool-calling.md)
- [Workflow Implementation Guide](./workflow-implementation.md)

