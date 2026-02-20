# Contributing to Volition

## Development Setup

```bash
git clone https://github.com/shuruheel/volition.git
cd volition
pnpm install
cp env.example .env.local   # fill in your credentials
pnpm db:setup                # run migrations + seed data
pnpm dev                     # start dev server at http://localhost:3000
```

### Verifying changes

There is no test framework yet. Verify changes manually:

```bash
pnpm build     # must succeed
pnpm dev       # smoke-test in browser
```

## How to Add a New Workflow Tool

Tools are defined as modular files in `lib/ai/tools/` using the `ToolModule` interface. Each tool is a self-contained file with a definition (OpenAI JSON Schema), a handler, and optional dependency metadata.

### 1. Create the tool file

Create a new file in the appropriate subdirectory of `lib/ai/tools/`:

- `core/` — Always-available tools (no integration requirements)
- `research/` — Tools requiring Firecrawl (`requires: ['firecrawl']`)
- `memory/` — Tools requiring Google Drive + auth (`requires: ['google']`, `requiresAuth: true`)
- `google/` — Tools requiring Google APIs (`requires: ['google']`)
- `browser/` — Tools requiring Browser-Use (`requires: ['browser']`)
- `telegram/` — Tools requiring Telegram (`requires: ['telegram']`)

```typescript
import type { ToolModule, ToolContext } from '../types';

export const myTool: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'myTool',
      description: 'What this tool does',
      parameters: {
        type: 'object',
        properties: {
          param1: { type: 'string', description: 'Description' },
        },
        required: ['param1'],
        additionalProperties: false,
      },
    },
  },

  requires: ['my_integration'],  // Optional: tool group dependency
  requiresAuth: true,            // Optional: requires userId

  handler: async (args: { param1: string }, context: ToolContext) => {
    try {
      const { myFunction } = await import('@/lib/integrations/my-integration');
      const res = await myFunction(args.param1);
      return { success: true, ...res };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed' };
    }
  },
};
```

### 2. Register the tool

In `lib/ai/tools/registry.ts`, import the tool and add it to the `ALL_TOOLS` array:

```typescript
import { myTool } from './my-category/my-tool';

const ALL_TOOLS: ToolModule[] = [
  // ... existing tools
  myTool,
];
```

The registry's `collectTools()` function will automatically include or exclude the tool based on the agent's `enabledTools` config and whether the user is authenticated.

### 3. For HITL (sensitive) actions

Set `context.state.awaitingHumanInput = true` in the handler to pause the workflow:

```typescript
handler: async (args: any, context: ToolContext) => {
  // Create a pending activity for user approval
  const { logActivityStep } = await import('@/lib/ai/workflows/steps');
  await logActivityStep(context.agentId, 'my_pending_type', {
    status: 'pending',
    priority: 'high',
    ...args,
  });
  context.state.awaitingHumanInput = true;
  return { success: true, message: 'Awaiting user approval' };
},
```

### 4. Using ToolContext

The `ToolContext` object provides:
- `agentId`, `userId` — Current agent and user IDs
- `enabledTools` — List of enabled tool groups
- `modelProvider`, `modelId` — LLM config for sub-calls
- `state` — Mutable state object:
  - `awaitingHumanInput` — Set to `true` to pause workflow
  - `currentSessionId` — Track research session
  - `researchStarted` — Track if research has begun
  - `researchSessionCompleted` — Signal session completion
  - `usedSendMessage` — Track if sendMessage was called

## How to Add a New Skill

Skills are defined as `SKILL.md` files in the `skills/` directory at project root.

### 1. Create the skill directory and file

```
skills/my-skill/SKILL.md
```

### 2. Write the SKILL.md

Use YAML frontmatter for metadata and markdown for instructions:

```markdown
---
id: my-skill
name: My Skill Name
description: Brief description of what this skill does
tools: [google, firecrawl]
triggers: [heartbeat, manual]
---

## Skill: My Skill Name

When this skill is active:
1. Step one of what the agent should do
2. Step two...
3. Step three...
```

The skill's instructions are injected into the agent's system prompt when enabled.

## How to Add a New Integration

Follow the pattern in `lib/integrations/firecrawl.ts`:

1. Create `lib/integrations/my-service.ts` with exported functions
2. Use `process.env.MY_SERVICE_API_KEY` for credentials (or load from `tool_configs` for user-configurable keys)
3. Add the env var to `env.example`
4. Add a settings card in `app/settings/page.tsx` (in `TOOL_DEFINITIONS`)
5. Add to `validTools` array in `app/api/settings/tools/route.ts`
6. Update types in `lib/db.ts` if adding new tool config or activity types
7. Create a database migration in `db/migrations/` if schema changes are needed
8. Create tool module(s) in `lib/ai/tools/` and register in the registry

## Commit Conventions

Use prefixed commit messages:

- `feat:` — New feature
- `fix:` — Bug fix
- `chore:` — Maintenance (deps, config)
- `refactor:` — Code restructuring without behavior change
- `docs:` — Documentation only

Keep subjects under 80 characters. Use the body for details.

## Pull Requests

- One feature or fix per PR
- Include a description of what changed and why
- Verify `pnpm build` passes
- Update `CLAUDE.md` if architectural patterns change
