# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI Agent Dashboard built with Next.js 16, Vercel AI SDK 6, and Neon Postgres. It provides an orchestration platform for AI agents with integrated tools (Supermemory for graph memory, Browser-Use Cloud for browser automation, and Twilio for voice calls).

## Development Commands

```bash
# Install dependencies
pnpm install

# Development server (http://localhost:3000)
pnpm dev

# Build production bundle (must succeed before review)
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint

# Database operations
pnpm db:setup      # Run migrations and seed demo data
pnpm db:migrate    # Run migrations only
```

## Architecture

### Core Stack
- **Frontend**: Next.js 16 (App Router, React Server Components), React 19.2.0
- **Backend**: Next.js Route Handlers (in `app/api/`)
- **Database**: Neon Postgres serverless with `@neondatabase/serverless` driver
- **AI**: Vercel AI SDK 6 (`generateText`, `streamText`, multi-step tool calling)
- **Styling**: Tailwind CSS 4, shadcn/ui components

### Directory Structure

```
app/
├── api/                    # Backend Route Handlers
│   ├── agents/            # Agent CRUD operations
│   ├── activities/        # Activity feed, approvals, modifications
│   ├── metrics/           # Dashboard metrics (spend, tasks, approvals, memories)
│   ├── memories/          # Supermemory integration (store/search)
│   ├── browser/           # Browser-Use Cloud tasks
│   ├── calls/             # Twilio outbound calls and summaries
│   ├── twilio/            # Twilio webhooks (voice, status, stream WebSocket)
│   └── settings/          # Tool configuration (encrypted API keys)
├── dashboard/             # Main dashboard UI
├── chat/                  # Chat interface
├── graph/                 # Knowledge graph visualization
└── settings/              # Settings page

lib/
├── ai/
│   ├── agent.ts          # Agent orchestration (createAgentTools, executeAgentTask, generateSummary)
│   └── tools/            # Custom AI SDK tools (browserTaskTool, logActivityTool)
├── db.ts                 # Neon serverless driver, TypeScript types for tables
├── crypto.ts             # AES-GCM encryption for tool_configs
└── utils.ts              # Shared utilities

db/
└── migrations/           # SQL migration files (001_init.sql)
```

### Database Schema

Key tables in Neon Postgres:
- **users**: User accounts (minimal, auth deferred to v2)
- **agents**: id, name, prompt, status, tools (string[]), created_at, updated_at
- **activities**: Unified feed with type, status, priority, payload (jsonb)
- **memories**: Supermemory references (provider_id, kind, metadata)
- **calls**: Twilio call records (to_number, status, twilio_sid, summary)
- **tool_configs**: Encrypted API keys per user/tool (data_encrypted with AES-GCM)

Activity types displayed in feed: `research`, `email_sent`, `phone_call`, `post_call_summary`, `calendar_event_added`, `calendar_event_modified`, `webpage_viewed`, `journal_read`

Types excluded (high frequency/noise): `video_watched`, `financial`, `image_seen`, `email_read`

## AI Agent Orchestration

### Agent Execution Pattern

Agents use Vercel AI SDK 6 with `generateText` or `streamText`. Tools are dynamically registered based on agent permissions:

```typescript
// lib/ai/agent.ts
export function createAgentTools(agent: Agent) {
  const tools: Record<string, any> = {};

  if (agent.tools.includes('supermemory')) {
    Object.assign(tools, supermemoryTools(process.env.SUPERMEMORY_API_KEY));
  }

  if (agent.tools.includes('browser')) {
    tools.browserTask = browserTaskTool;
  }

  tools.logActivity = logActivityTool; // Always included

  return tools;
}
```

Use `executeAgentTask` (streaming) or `executeAgentTaskSync` (non-streaming) to run agents with observability via `onStepFinish` callbacks.

### Tool Creation

All tools follow this structure:
- **description**: Helps LLM decide when to use the tool
- **inputSchema**: Zod schema for input validation
- **execute**: Async function performing the action

Tools can access context via `experimental_context` (e.g., `agentId`, `tools`).

Example tools:
- `lib/ai/tools/browser-task.ts`: Browser automation via Browser-Use Cloud SDK
- `lib/ai/tools/log-activity.ts`: Log activities to database

### Supermemory Integration

Memory tools are imported from `@supermemory/tools/ai-sdk` and provide:
- `search_memories`: Semantic search in agent's memory graph
- `store_memory`: Store new memories
- `list_memories`: Retrieve memories by type

## Environment Variables

Required variables (see `env.example` for full list):

```bash
# AI
OPENAI_API_KEY=sk-...

# Database
DATABASE_URL=postgresql://...
DATABASE_URL_POOLED=postgresql://...?pgbouncer=true

# Integrations
SUPERMEMORY_API_KEY=sm_...
BROWSER_USE_API_KEY=bu_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Security
APP_ENCRYPTION_KEY=...  # 32-byte hex (generate: openssl rand -hex 32)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Never expose secrets client-side. API keys are stored encrypted in `tool_configs` table using AES-GCM (see `lib/crypto.ts`).

## Code Style

- **TypeScript strict mode**: All code fully typed
- **Async/await**: No `.then()` chains
- **Zod schemas**: Validate all external inputs (API routes, tool inputs)
- **Error handling**: Always handle errors in Route Handlers with try/catch
- **File naming**: `kebab-case.tsx` for components, components are `PascalCase`
- **Functional components**: React hooks only, no class components

## Route Handler Patterns

All API routes in `app/api/` use Next.js 16 Route Handlers:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';

    const results = await sql`SELECT * FROM activities LIMIT ${limit}`;

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

Use `sql` tagged template for parameterized queries (prevents SQL injection).

## Key Integration Points

### Supermemory (Graph Memory)
- Tools integrated via `@supermemory/tools/ai-sdk`
- Memory references stored in `memories` table
- Search endpoint: `GET /api/memories/search`

### Browser-Use Cloud (Browser Automation)
- Custom AI SDK tool in `lib/ai/tools/browser-task.ts`
- Direct API: `POST /api/browser/task`
- Supports synchronous (`wait=true`) and async task execution

### Twilio + OpenAI Realtime (Voice Calls)
- Outbound calls: `POST /api/calls`
- TwiML webhook: `POST /api/twilio/voice` (returns `<Connect><Stream>`)
- Status callbacks: `POST /api/twilio/status`
- WebSocket proxy: `app/api/twilio/stream/route.ts` (stub for custom server)
- Call summaries: `POST /api/calls/:id/summary` (uses `generateSummary` helper)

## Testing & Deployment

- Run `pnpm lint` before committing
- Test affected routes in `pnpm dev` (dashboard metrics, chat drawer, agent management)
- For Twilio webhooks, use ngrok for local testing: `ngrok http 3000`
- Deploy to Vercel: Push to GitHub, import project, add environment variables

## Important Notes

### Authentication
Currently using mock auth (`userId = 'mock-user-id'`). Real auth (Neon Auth or Auth0) deferred to v2.

### WebSocket Proxy Limitation
`app/api/twilio/stream/route.ts` is a stub because Next.js Route Handlers don't natively support WebSocket upgrades. For full Twilio integration, deploy custom Node.js server or use Vercel Edge Functions with WebSocket support.

### Usage Tracking
Total Spend metric is mocked. For v2, store token usage from `onStepFinish` callbacks and calculate costs.

### Commit Conventions
Follow existing commit prefixes: `feat:`, `chore(next):`, `refactor:`. Keep subjects under 80 characters.

## Additional Documentation

Detailed architecture docs in `.cursor/rules/`:
- `01-project-architecture.mdc`: Tech stack and project structure
- `02-neon-database.mdc`: Database patterns and migrations
- `03-ai-agents.mdc`: Agent orchestration and tool creation
- `04-route-handlers.mdc`: API route patterns
- `05-integrations.mdc`: External service integrations
- `06-frontend-components.mdc`: UI component patterns

Vendor documentation in `docs/`:
- `nextjs-16/`: Next.js 16 features
- `vercel-ai-sdk-6/`: AI SDK patterns
- `supermemory/`: Memory tools and SDKs
- `browser-use/`: Browser automation
- `twilio/`: Voice API integration
- `neon/`: Postgres serverless features

## Quick Reference

**Create a new agent:**
```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "Research Bot", "prompt": "You are a research assistant", "tools": ["supermemory", "browser"]}'
```

**Execute a browser task:**
```bash
curl -X POST http://localhost:3000/api/browser/task \
  -H "Content-Type: application/json" \
  -d '{"task": "Go to example.com and extract the main heading", "wait": true}'
```

**Get dashboard metrics:**
```bash
curl http://localhost:3000/api/metrics/key
```
