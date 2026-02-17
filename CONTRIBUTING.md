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

Agent workflow tools are defined **inline** in `lib/ai/workflows/steps.ts` using raw OpenAI function call JSON Schema. Do NOT use the AI SDK `tool()` helper — it is incompatible with Vercel Workflow.

### 1. Add the tool definition

In `executeLLMDecisionStep`, add to the `tools` array (conditionally if tied to an integration):

```typescript
if (args.enabledTools.includes('my_tool')) {
  tools.push({
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
  });
}
```

### 2. Add the handler

In the same function's `switch` block:

```typescript
case 'myTool': {
  try {
    const { myFunction } = await import('@/lib/integrations/my-integration');
    const res = await myFunction(args.param1);
    result = { success: true, ...res };
  } catch (error: any) {
    result = { success: false, error: error?.message || 'Failed' };
  }
  break;
}
```

### 3. For sensitive actions, use HITL approval

```typescript
case 'myDangerousTool': {
  const activityId = await createPendingActivityStep(agentId, 'my_type', 'high', args);
  // ... use activityApprovalHook or emailApprovalHook to pause for user approval
  break;
}
```

## How to Add a New Integration

Follow the pattern in `lib/integrations/firecrawl.ts`:

1. Create `lib/integrations/my-service.ts` with exported functions
2. Use `process.env.MY_SERVICE_API_KEY` for credentials (or load from `tool_configs` for user-configurable keys)
3. Add the env var to `env.example`
4. Add a settings card in `app/settings/page.tsx` (in `TOOL_DEFINITIONS`)
5. Add to `validTools` array in `app/api/settings/tools/route.ts`
6. Update types in `lib/db.ts` if adding new tool config or activity types
7. Create a database migration in `db/migrations/` if schema changes are needed

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
