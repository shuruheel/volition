# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Volition — open-source AI agent orchestration platform built with Next.js 16 and Neon Postgres. Multi-user SaaS with Google OAuth authentication, heartbeat scheduling, multi-provider LLM support (OpenAI + Anthropic), Google Drive agent memory, skills system, and sub-agent spawning. Integrated tools: Firecrawl (web research), Supermemory (graph memory), Google APIs (Gmail + Calendar + Drive), Telegram (bot messaging), Browser-Use Cloud (browser automation), and Twilio (voice calls).

## Development Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Dev server at http://localhost:3000
pnpm build            # Production build (must succeed before review)
pnpm lint             # ESLint
pnpm db:setup         # Run migrations against Neon Postgres
pnpm db:migrate       # Run migrations (alias for db:setup)
```

No test framework is configured yet. Verify changes manually via `pnpm dev` and `pnpm build`.

## Architecture

### Core Stack
- **Runtime**: Next.js 16 (App Router, RSC), React 19.2.0
- **Agent Execution**: Plain async functions with `waitUntil` from `@vercel/functions` for background execution, event-driven HITL
- **AI**: Multi-provider via `lib/ai/providers/` — OpenAI (GPT-5.2, o3) and Anthropic (Claude Sonnet 4.5, Opus 4.6) with per-agent model selection
- **Database**: Neon Postgres (serverless). Requires `DATABASE_URL` environment variable.
- **Auth**: NextAuth.js v5 (beta) with Google OAuth provider, JWT sessions. `lib/auth.ts` (full config), `lib/auth.config.ts` (edge-safe for middleware).
- **Styling**: Tailwind CSS 4, shadcn/ui (New York style, RSC-enabled)

### Agent Execution Engine

The execution engine is in `lib/ai/workflows/` and `lib/agent-runner.ts`:

- **`agent-runner.ts`**: Background execution helper. `runAgentInBackground()` launches `agentTaskWorkflow` as a detached promise via `waitUntil` from `@vercel/functions`, letting the HTTP response return immediately.
- **`agent-workflow.ts`**: Main workflow function (plain async). Runs a step loop (max 20 steps) where each step is one LLM decision cycle with tool calling. Injects skills and memory context into system prompts. Exits early when `awaitingHumanInput` is set.
- **`steps.ts`**: Reusable async step functions. Key functions: `executeLLMDecisionStep`, `fetchAgentStep`, `planResearchQueriesStep`, `executeResearchStep`, `executeBrowserStep`, `logActivityStep`. All workflow tool definitions (research, email, calendar, telegram, browser, memory, sub-agents) are inline here.

**HITL pattern (event-driven)**: When the agent calls `askUser`, `sendEmail`, or `createCalendarEvent`, the step creates a pending activity, sets `awaitingHumanInput = true`, and the workflow exits cleanly. The approve route executes the action (e.g., actually sends the email) and triggers a NEW workflow run via `runAgentInBackground`. Rejection sets the agent to idle with no continuation.

**Critical**: Tools inside workflows are defined as **raw OpenAI function call format** (JSON Schema with `parameters` key), NOT using the AI SDK `tool()` helper.

### LLM Providers

`lib/ai/providers/` contains the multi-provider abstraction:
- `types.ts` — Common `LLMProvider` interface
- `openai.ts` — OpenAI provider (wraps openai SDK)
- `anthropic.ts` — Anthropic provider (converts OpenAI tool format to/from Anthropic format)
- `index.ts` — Factory, model registry, `resolveProviderConfig()` (tries user's encrypted API key, falls back to env vars)

### Skills System

`lib/skills/` manages prompt-template skills injected into agent system prompts:
- `types.ts` — Skill interface
- `registry.ts` — 6 built-in skills (email-digest, calendar-summary, outreach-campaign, job-application, daily-briefing, research-deep-dive)

Skills are enabled per-agent via `skills TEXT[]` column on agents table.

### Scheduler

`lib/scheduler/heartbeat.ts` processes overdue agent schedules. Production uses Vercel Cron (`vercel.json`), local dev uses `instrumentation.ts` with `setInterval`.

### Configuration

- `next.config.mjs`: Plain Next.js config (no wrappers)
- `typescript.ignoreBuildErrors: true` in next config
- `vercel.json`: Cron job (`* * * * *`) for `/api/scheduler/tick`
- `proxy.ts`: NextAuth proxy (Next.js 16) protecting all routes except `/`, `/api/auth`, `/login`, `/api/twilio`, `/api/telegram`, `/api/scheduler`

### Database

`lib/db.ts` exports a Neon Postgres client. Requires `DATABASE_URL` environment variable.

Exports:
- `sql` — Tagged template client for most queries. Use this by default.
- `getPool()` — Lazy Pool client for transactions. In workflow steps, always use `getPool()` not the direct `pool` export (which throws).

Migrations (`db/migrations/` 001-014) are tracked in a `schema_migrations` table. Run `pnpm db:setup` to apply.

Key tables: `agents`, `activities`, `memories`, `calls`, `tool_configs`, `agent_status`, `agent_schedules`, `users`, `telegram_users`

Agent columns: `id`, `name`, `prompt`, `status`, `tools`, `skills`, `user_id`, `model_provider`, `model_id`, `drive_folder_id`, `drive_file_ids`, `parent_agent_id`, `created_at`, `updated_at`

Migrations are in `db/migrations/` (001 through 014). Run sequentially.

### Integration Modules

- **`lib/integrations/firecrawl.ts`**: Web search + scraping via Firecrawl API (`/search`, `/scrape`). `searchAndScrape()` combines both in one request.
- **`lib/integrations/supermemory.ts`**: Document storage and semantic search via Supermemory v4. `storeMarkdown()` stores content and creates a local `memories` table reference. `searchMemories()` queries by agent with metadata filters.
- **`lib/integrations/google.ts`**: Gmail and Google Calendar via `googleapis` NPM package. OAuth2 flow with token refresh. Functions: `sendEmail()`, `listEmails()`, `createCalendarEvent()`, `listCalendarEvents()`.
- **`lib/integrations/google-drive.ts`**: Google Drive integration for agent memory files. Functions: `writeMemoryFile()`, `readMemoryFile()`, `listMemoryFiles()`. Creates `Volition/Agent - {name}/` folder structure with soul.md, preferences.md, knowledge.md, journal.md.
- **`lib/integrations/telegram.ts`**: Telegram bot via grammY. `sendTelegramMessage()`, `handleIncomingMessage()`, `linkTelegramUser()`.
- Browser automation via Browser-Use Cloud SDK (inline in workflow steps).
- Twilio voice integration via `app/api/twilio/` routes.

### Directory Layout

```
app/
├── api/                    # Route Handlers (REST endpoints, 40+)
│   ├── agents/            # Agent CRUD + start/stop/schedule/memory/analytics
│   ├── activities/        # Activity feed, approvals, SSE stream
│   ├── auth/              # NextAuth [...nextauth] + Google OAuth callback
│   ├── metrics/           # Dashboard metrics + SSE stream
│   ├── memories/          # Supermemory search/store
│   ├── email/             # Gmail send/search
│   ├── calendar/          # Google Calendar list/create
│   ├── browser/           # Browser-Use tasks
│   ├── calls/             # Twilio outbound calls
│   ├── twilio/            # Twilio webhooks (voice, status, stream stub)
│   ├── telegram/          # Telegram webhook, send, setup
│   ├── scheduler/         # Heartbeat tick endpoint (Vercel Cron)
│   ├── skills/            # Skills listing + per-agent enable/disable
│   └── settings/          # Encrypted tool config (API keys)
├── login/                 # Google OAuth sign-in page
├── onboarding/            # OpenAI API key setup (post-signup)
├── dashboard/             # Main dashboard UI (agents, activity feed, metrics)
├── templates/             # Pre-built agent templates
├── skills/                # Skills marketplace UI
├── chat/                  # Chat interface
├── graph/                 # Knowledge graph visualization
└── settings/              # Settings page (API key management)

lib/
├── ai/
│   ├── providers/         # Multi-provider LLM abstraction
│   │   ├── index.ts       # Factory, model registry, config resolution
│   │   ├── types.ts       # LLMProvider interface
│   │   ├── openai.ts      # OpenAI provider
│   │   └── anthropic.ts   # Anthropic provider (format conversion)
│   ├── workflows/         # Agent execution engine (plain async + event-driven HITL)
│   │   ├── agent-workflow.ts  # Main workflow loop
│   │   └── steps.ts       # ~1300 lines, all tools + step logic
│   ├── prompts.ts         # System prompt helpers (withHITLGuidelines, withSkills, withMemoryContext)
│   ├── chat-history.ts    # Chat turn retrieval
│   ├── research-context.ts # Research session context builder
│   └── utils.ts           # generateSummary helper
├── integrations/
│   ├── firecrawl.ts       # Firecrawl search + scrape
│   ├── supermemory.ts     # Supermemory storage + search
│   ├── google.ts          # Gmail + Google Calendar (OAuth2)
│   ├── google-drive.ts    # Google Drive (agent memory files)
│   └── telegram.ts        # Telegram bot (grammY)
├── skills/
│   ├── types.ts           # Skill interface
│   └── registry.ts        # 6 built-in skills
├── scheduler/
│   └── heartbeat.ts       # Process overdue agent schedules
├── agent-runner.ts        # Background execution via waitUntil
├── auth.ts                # NextAuth.js v5 config (full, server-only)
├── auth.config.ts         # NextAuth.js config (edge-safe, for middleware)
├── db.ts                  # Neon Postgres client, TypeScript types
├── crypto.ts              # AES-GCM encryption for tool_configs (auto dev key)
├── agent-status.ts        # Agent execution status tracking
└── utils.ts               # cn() and shared utilities

db/migrations/             # SQL migrations (001-014)
```

## Environment Variables

Required (see `env.example`):

```bash
DATABASE_URL=postgresql://...                       # Neon Postgres (required)
GOOGLE_CLIENT_ID=...                                # Google OAuth (required)
GOOGLE_CLIENT_SECRET=...                            # Google OAuth (required)
AUTH_SECRET=...                                      # NextAuth session key (required)
NEXT_PUBLIC_APP_URL=http://localhost:3000            # App URL (required)
OPENAI_API_KEY=sk-...                               # Default LLM key (recommended)
```

Auto-configured (optional):

```bash
DATABASE_URL_POOLED=postgresql://...?pgbouncer=true  # Pooled connection
APP_ENCRYPTION_KEY=...                               # Omit in dev → auto-generated dev key
```

Optional integrations:

```bash
ANTHROPIC_API_KEY=sk-ant-...
FIRECRAWL_API_KEY=fc_...
SUPERMEMORY_API_KEY=sm_...
BROWSER_USE_API_KEY=bu_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
TELEGRAM_BOT_TOKEN=...
```

## Code Patterns

### Route Handlers

All API routes use `NextRequest`/`NextResponse` with try/catch. Use `sql` tagged template for parameterized queries (prevents SQL injection). Protected routes use `requireUserId()` from `lib/auth.ts`.

### Authentication

- `lib/auth.config.ts` — Lightweight config (imported by `proxy.ts`). Does NOT import any Node.js modules.
- `lib/auth.ts` — Full config with DB callbacks (imported by API routes and server components). Exports `auth()`, `getUserId()`, `requireUserId()`.
- Never import `lib/auth.ts` from `proxy.ts` — use `lib/auth.config.ts` instead.

### Adding New Workflow Tools

New tools for agent workflows must be defined **inline in `executeLLMDecisionStep`** using raw OpenAI function call JSON Schema format, not the AI SDK `tool()` helper. Add the tool definition to the `tools` array and a handler in the `switch` statement. See `CONTRIBUTING.md` for detailed instructions.

### Adding New LLM Providers

Create a new provider class implementing `LLMProvider` in `lib/ai/providers/`, register it in the factory at `lib/ai/providers/index.ts`, and add model/provider metadata.

### Commit Conventions

Prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`. Keep subjects under 80 characters.

## Important Caveats

- **WebSocket**: `app/api/twilio/stream/route.ts` is a stub — Next.js Route Handlers don't support WebSocket upgrades.
- **Spend tracking**: Total Spend metric is mocked at $0.
- **Tool format**: Workflow tools must use raw OpenAI JSON Schema format. Do NOT use AI SDK `tool()` helper in workflow files.
- **Auth config split**: `proxy.ts` uses `lib/auth.config.ts` (lightweight). API routes use `lib/auth.ts` (full, server-only). Never mix them.
- **HITL is event-driven**: `askUser`/`sendEmail`/`createCalendarEvent` create pending activities and exit the workflow. The approve route executes the action and triggers a new run. No hooks or pausing.

## Supplemental Docs

- `docs/SETUP.md` — Detailed setup and deployment guide
- `docs/` — Vendor documentation (Next.js 16, AI SDK 6, Supermemory, Browser-Use, Twilio, Neon)
