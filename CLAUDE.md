# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Volition — open-source AI agent orchestration platform built with Next.js 16, Vercel AI SDK 6, Vercel Workflow, and Neon Postgres. Orchestration platform for AI agents with integrated tools: Firecrawl (web research), Supermemory (graph memory), Google APIs (Gmail + Calendar), Telegram (bot messaging), Browser-Use Cloud (browser automation), and Twilio (voice calls).

## Development Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Dev server at http://localhost:3000 (PGlite auto-configures if no DATABASE_URL)
pnpm build            # Production build (must succeed before review)
pnpm lint             # ESLint
pnpm db:setup         # Run migrations + seed demo data (Neon or PGlite)
pnpm db:migrate       # Run migrations only
pnpm db:reset         # Delete local PGlite database (.volition/data/)
```

No test framework is configured yet. Verify changes manually via `pnpm dev` and `pnpm build`.

## Architecture

### Core Stack
- **Runtime**: Next.js 16 (App Router, RSC), React 19.2.0
- **Agent Execution**: Vercel Workflow (`'use workflow'` / `'use step'` directives) for durable, resumable agent execution
- **AI**: OpenAI GPT-5.2 via raw OpenAI SDK inside workflow steps (not AI SDK `tool()` helper)
- **Database**: Dual-mode — PGlite (embedded Postgres, zero-config local dev) or Neon Postgres (remote, set `DATABASE_URL`)
- **Styling**: Tailwind CSS 4, shadcn/ui (New York style, RSC-enabled)

### Agent Execution: Vercel Workflow

The execution engine is in `lib/ai/workflows/`:

- **`agent-workflow.ts`**: Main workflow function using `'use workflow'` directive. Runs a step loop where each step is one LLM decision cycle with tool calling.
- **`steps.ts`**: Reusable durable steps marked with `'use step'`. Each step gets automatic retries and durability. Key steps: `executeLLMDecisionStep`, `fetchAgentStep`, `planResearchQueriesStep`, `executeResearchStep`, `executeBrowserStep`, `logActivityStep`. All workflow tool definitions (research, email, calendar, telegram, browser) are inline here.
- **`hooks.ts`**: Human-in-the-loop hooks using `defineHook()` from `workflow`. Hooks pause the workflow until an external event resumes it: `userInputHook`, `phoneCallHook`, `emailApprovalHook`, `activityApprovalHook`.

**Critical**: Tools inside workflows are defined as **raw OpenAI function call format** (JSON Schema with `parameters` key), NOT using the AI SDK `tool()` helper.

### Configuration

- `next.config.mjs`: Wrapped with `withWorkflow()` from `workflow/next`
- `tsconfig.json`: Includes `"workflow"` plugin alongside `"next"` plugin
- `typescript.ignoreBuildErrors: true` in next config

### Database

`lib/db.ts` exports a dual-mode database client:
- If `DATABASE_URL` is set → Neon Postgres (production/remote)
- If `DATABASE_URL` is NOT set → PGlite embedded Postgres (zero-config local dev, data in `.volition/data/`)

Exports:
- `sql` — Tagged template client for most queries. Use this by default.
- `getPool()` — Lazy Pool client for transactions. In workflow steps, always use `getPool()` not the direct `pool` export (which throws).

Migrations (`db/migrations/` 001-008) are tracked in a `schema_migrations` table and auto-run in PGlite mode. For Neon, run `pnpm db:setup`.

Key tables: `agents`, `activities`, `memories`, `calls`, `tool_configs`, `agent_status`, `users`, `telegram_users`

Activity types: `research`, `email_sent`, `email_received`, `phone_call`, `post_call_summary`, `calendar_event_added`, `calendar_event_modified`, `webpage_viewed`, `journal_read`, `task_completed`, `agent_stopped`, `user_input`, `user_message`, `telegram_message_sent`, `telegram_message_received`

Migrations are in `db/migrations/` (001 through 008). Run sequentially.

### Integration Modules

- **`lib/integrations/firecrawl.ts`**: Web search + scraping via Firecrawl API (`/search`, `/scrape`). `searchAndScrape()` combines both in one request.
- **`lib/integrations/supermemory.ts`**: Document storage and semantic search via Supermemory v4. `storeMarkdown()` stores content and creates a local `memories` table reference. `searchMemories()` queries by agent with metadata filters.
- **`lib/integrations/google.ts`**: Gmail and Google Calendar via `googleapis` NPM package. OAuth2 flow with token refresh. Functions: `sendEmail()`, `listEmails()`, `createCalendarEvent()`, `listCalendarEvents()`.
- **`lib/integrations/telegram.ts`**: Telegram bot via grammY. `sendTelegramMessage()`, `handleIncomingMessage()`, `linkTelegramUser()`.
- Browser automation via Browser-Use Cloud SDK (inline in workflow steps).
- Twilio voice integration via `app/api/twilio/` routes.

### Directory Layout

```
app/
├── api/                    # Route Handlers (REST endpoints)
│   ├── agents/            # Agent CRUD + start/stop
│   ├── activities/        # Activity feed, approvals
│   ├── auth/google/       # Google OAuth flow
│   ├── metrics/           # Dashboard metrics
│   ├── memories/          # Supermemory search/store
│   ├── email/             # Gmail send/search
│   ├── calendar/          # Google Calendar list/create
│   ├── browser/           # Browser-Use tasks
│   ├── calls/             # Twilio outbound calls
│   ├── twilio/            # Twilio webhooks (voice, status, stream stub)
│   ├── telegram/          # Telegram webhook, send, setup
│   └── settings/          # Encrypted tool config (API keys)
├── dashboard/             # Main dashboard UI
├── chat/                  # Chat interface
├── graph/                 # Knowledge graph visualization
└── settings/              # Settings page

lib/
├── ai/
│   ├── workflows/         # Vercel Workflow (primary execution engine)
│   │   ├── agent-workflow.ts
│   │   ├── steps.ts
│   │   └── hooks.ts
│   ├── prompts.ts         # System prompt helpers (withHITLGuidelines)
│   ├── chat-history.ts    # Chat turn retrieval
│   ├── research-context.ts # Research session context builder
│   └── utils.ts           # generateSummary helper
├── integrations/
│   ├── firecrawl.ts       # Firecrawl search + scrape
│   ├── supermemory.ts     # Supermemory storage + search
│   ├── google.ts          # Gmail + Google Calendar (OAuth2)
│   └── telegram.ts        # Telegram bot (grammY)
├── db.ts                  # Dual-mode DB client (Neon or PGlite), TypeScript types
├── db-local.ts            # PGlite tagged template wrapper (local dev)
├── db-migrate.ts          # Auto-migration runner (schema_migrations tracking)
├── crypto.ts              # AES-GCM encryption for tool_configs (auto dev key)
├── agent-status.ts        # Agent execution status tracking
└── utils.ts               # cn() and shared utilities

db/migrations/             # SQL migrations (001-008)
```

## Environment Variables

Required (see `env.example`):

```bash
OPENAI_API_KEY=sk-...              # Only truly required variable
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Auto-configured (optional — omit for zero-config local dev):

```bash
DATABASE_URL=postgresql://...                       # Omit → PGlite embedded Postgres
DATABASE_URL_POOLED=postgresql://...?pgbouncer=true  # Omit → PGlite
APP_ENCRYPTION_KEY=...                               # Omit in dev → auto-generated dev key
```

Optional integrations:

```bash
FIRECRAWL_API_KEY=fc_...
SUPERMEMORY_API_KEY=sm_...
BROWSER_USE_API_KEY=bu_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
TELEGRAM_BOT_TOKEN=...
```

## Code Patterns

### Route Handlers

All API routes use `NextRequest`/`NextResponse` with try/catch. Use `sql` tagged template for parameterized queries (prevents SQL injection).

### Adding New Workflow Tools

New tools for agent workflows must be defined **inline in `executeLLMDecisionStep`** using raw OpenAI function call JSON Schema format, not the AI SDK `tool()` helper. Add the tool definition to the `tools` array and a handler in the `switch` statement. See `CONTRIBUTING.md` for detailed instructions.

### Commit Conventions

Prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`. Keep subjects under 80 characters.

## Important Caveats

- **Auth**: Mock auth (`userId = 'mock-user-id'`). Real auth deferred to v2.
- **WebSocket**: `app/api/twilio/stream/route.ts` is a stub — Next.js Route Handlers don't support WebSocket upgrades.
- **Spend tracking**: Total Spend metric is mocked.
- **Workflow tool format**: Workflow tools must use raw OpenAI JSON Schema format. Do NOT use AI SDK `tool()` helper in workflow files.

## Supplemental Docs

- `docs/` — Vendor documentation (Next.js 16, AI SDK 6, Supermemory, Browser-Use, Twilio, Neon)
