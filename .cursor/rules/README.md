# Cursor Rules - Agent Dashboard

This directory contains Cursor AI rules that provide context about the project structure, patterns, and best practices for the AI Agent Dashboard.

## Rules Overview

### 1. Project Architecture (`01-project-architecture.mdc`)
**Always Applied:** ✅ Yes

Comprehensive overview of the entire project:
- Tech stack (Next.js 16, Vercel AI SDK 6, Neon, Supermemory, Browser-Use, Twilio)
- Project structure and file organization
- Database schema overview
- Agent orchestration flow
- Activity feed filtering rules
- Key metrics dashboard structure
- Environment variables
- Security principles
- Code style guidelines

**When to reference:** All development work

### 2. Neon Database (`02-neon-database.mdc`)
**Applies to:** `lib/db.ts`, `db/**/*`, `app/api/**/*.ts`

Database integration patterns:
- Neon serverless driver setup
- Connection string management (pooled vs direct)
- Query patterns (simple HTTP vs transactional)
- Schema design best practices
- Migration patterns
- Indexing strategies
- Connection management
- Database branching
- AI integration patterns (pgvector, embeddings)
- Tool configuration storage with encryption

**When to reference:** Database operations, API routes that query data

### 3. AI Agent Orchestration (`03-ai-agents.mdc`)
**Applies to:** `lib/ai/**/*`

Vercel AI SDK 6 patterns:
- ToolLoopAgent setup and configuration
- Tool creation (description, inputSchema, execute)
- Multi-step tool calling with `stopWhen`
- Context management for tools
- Step logging and observability
- Usage tracking and cost calculation
- Error handling for tool execution
- Supermemory integration
- Best practices for agent development

**When to reference:** AI agent logic, custom tool creation

### 4. Route Handlers (`04-route-handlers.mdc`)
**Applies to:** `app/api/**/*.ts`

Next.js 16 Route Handler patterns:
- File conventions and supported HTTP methods
- Request handling (body, query params, route params)
- Response patterns (JSON, errors, streaming)
- Agent CRUD APIs
- Activity APIs
- Metrics API
- Error handling patterns
- Middleware patterns
- Caching strategies

**When to reference:** API endpoint development

### 5. External Integrations (`05-integrations.mdc`)
**Applies to:** `app/api/**/*`, `lib/ai/tools/**/*`

Integration patterns for external services:
- **Supermemory:** Memory and context management
  - AI SDK tools integration
  - Manual API usage
  - Search memories
- **Browser-Use Cloud:** Browser automation
  - AI SDK tool creation
  - API endpoints
  - Sessions and profiles
- **Twilio:** Voice calls with Realtime API
  - Outbound call flow
  - TwiML response
  - WebSocket proxy
  - Status callbacks
  - Call summary generation
- Tool configuration management
- Security best practices

**When to reference:** Integration development, tool configuration

### 6. Frontend Components (`06-frontend-components.mdc`)
**Applies to:** `components/**/*.tsx`, `app/**/*.tsx`

React/Next.js component patterns:
- Component architecture
- Activity feed system (types to include/exclude)
- Unified activity card
- Metric cards (7 key metrics)
- Tool permissions selector (simplified, no templates)
- Agent creation dialog
- Settings page with tool configuration
- Phone call activity cards
- Live status indicators
- Best practices (Server vs Client Components)
- Styling conventions (Tailwind, shadcn/ui)

**When to reference:** UI component development, activity display, dashboard metrics

## Rule File Format

All rules use the `.mdc` extension (Markdown with Cursor extensions) and include frontmatter metadata:

```markdown
---
alwaysApply: true           # Applied to every request
description: "..."          # Description for manual/automatic selection
globs: *.ts,*.tsx          # File patterns this rule applies to
---
# Rule Title

Content...
```

## How Rules Are Applied

1. **Always Applied Rules:** Rules with `alwaysApply: true` are included in every AI request
2. **Glob Pattern Rules:** Rules are automatically applied when working on matching files
3. **Description-based Rules:** AI can select rules based on description relevance

## Referencing Files in Rules

Use the `mdc:` protocol to reference files:

```markdown
Reference: [lib/db.ts](mdc:lib/db.ts)
See: [docs/neon/README.md](mdc:docs/neon/README.md)
```

This creates clickable links in Cursor that help navigate the codebase.

## Updating Rules

When updating rules:

1. Keep examples concrete and based on actual project code
2. Reference documentation files in `docs/` folder
3. Update the README if adding new rules
4. Test that glob patterns match intended files
5. Ensure rules don't contradict each other

## Rule Dependencies

Rules build on each other:

```
01-project-architecture (foundation)
├── 02-neon-database (data layer)
├── 03-ai-agents (AI layer)
├── 04-route-handlers (API layer)
├── 05-integrations (external services)
└── 06-frontend-components (UI layer)
```

## Best Practices

1. **Be Specific:** Include concrete code examples
2. **Be Concise:** Focus on patterns, not exhaustive documentation
3. **Be Practical:** Show real-world usage, not theory
4. **Reference Docs:** Link to comprehensive docs for deep dives
5. **Update Regularly:** Keep rules in sync with codebase evolution

## Related Documentation

For comprehensive guides, see the `docs/` folder:

- [Neon Documentation](../docs/neon/README.md)
- [Vercel AI SDK 6](../docs/vercel-ai-sdk-6/introduction.md)
- [Supermemory](../docs/supermemory/README.md)
- [Browser-Use Cloud](../docs/browser-use/README.md)
- [Twilio Integration](../docs/twilio/README.md)
- [Next.js 16](../docs/nextjs-16/route-handlers.md)

## Implementation Plan

See [.cursor/plans/agent-94057d94.plan.md](../.cursor/plans/agent-94057d94.plan.md) for the complete backend v1 implementation plan.

---

**Last Updated:** October 28, 2025

