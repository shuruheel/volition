# Volition

An open-source AI agent orchestration platform. Create persistent agents that research, email, schedule, and take action on your behalf — with human-in-the-loop approval for every sensitive action.

Built with Next.js 16, Neon Postgres, and multi-provider LLM support (OpenAI + Anthropic).

## Why Volition

Most agent frameworks focus on chain-of-thought execution but ignore the hard parts: **durability** (what happens when a step fails?), **human oversight** (should the agent really send that email?), and **memory** (does the agent remember what it researched yesterday?).

Volition solves all three with a visual, web-native platform that non-engineers can use:

- **Persistent Agents** — Enable an agent and it stays on duty, listening for chat messages, running heartbeat check-ins, and acting autonomously until you disable it
- **Human-in-the-Loop** — Event-driven approval system pauses execution for user approval before sensitive actions (emails, calendar events, phone calls), then resumes in a new run
- **Dynamic Memory** — Google Drive files (any `.md` file — soul.md, preferences.md, project-notes.md) + Supermemory semantic search across all memory files
- **Background Agents** — Heartbeat scheduler runs agents on configurable intervals with checklist-driven tasks
- **Multi-Provider LLM** — OpenAI (GPT-5.2, o3) and Anthropic (Claude Sonnet 4.5, Opus 4.6) with per-agent model selection and per-user encrypted API keys
- **Skills System** — Pre-built capabilities (email digest, outreach campaigns, job applications) that non-engineers can enable with one click
- **Multi-Tool Agents** — Firecrawl (web research), Gmail + Google Calendar, Google Drive (agent memory), Browser-Use Cloud, Twilio (voice calls), Telegram bot
- **Multi-User SaaS** — Google OAuth, per-user data isolation, encrypted per-user API keys for every integration, ownership checks on all API routes

## How It Works

### Agent Lifecycle

```
Create Agent → [Disabled]
                  │
               Enable
                  ▼
            [Enabled, Idle]  ← "Listening..."
              │         ▲
         Chat /      Workflow
      Heartbeat /    completes
       Welcome          │
              ▼         │
         [Enabled, Active]  ← "Running..."
```

1. **Create** — Build from scratch or use a template. Agents start disabled.
2. **Enable** — Agent introduces itself via a welcome workflow, then listens for chat messages and heartbeats.
3. **Chat** — Send a message and the agent runs a workflow to respond and take action.
4. **Heartbeat** — On schedule, the agent checks its task list and acts only if needed.
5. **Disable** — Agent stops gracefully, mid-workflow if necessary.

### Memory System

Agents have persistent memory stored in your Google Drive:

| File | Purpose | Auto-loaded |
|------|---------|-------------|
| `soul.md` | Agent personality and identity | Yes |
| `preferences.md` | Learned user preferences | Yes |
| `knowledge.md` | Accumulated research | On request |
| `journal.md` | Activity log | On request |
| Custom `.md` files | Anything the agent creates | On request |

Agents can also **append** to files (for journals and notes) and **semantically search** across all memory files via Supermemory integration.

### Human-in-the-Loop

Sensitive actions require your approval before execution:

- **Emails** — Agent drafts, you approve or edit before sending
- **Calendar Events** — Agent proposes, you confirm
- **Phone Calls** — Agent requests, you authorize
- **Questions** — Agent asks for clarification, chat drawer auto-opens

## Features

| Feature | Status |
|---------|--------|
| Google OAuth authentication | Stable |
| Multi-user data isolation + ownership checks | Stable |
| Agent CRUD + enable/disable lifecycle | Stable |
| Async workflow execution with background runs | Stable |
| Trigger-aware prompts (welcome/chat/heartbeat/manual) | Stable |
| Web research (Firecrawl search + scrape) | Stable |
| Semantic memory search (Supermemory) | Stable |
| Dynamic memory files (create any .md file) | Stable |
| Memory append mode (incremental writes) | Stable |
| Human-in-the-loop event-driven approvals | Stable |
| Activity feed + real-time metrics (SSE) | Stable |
| Per-user encrypted API keys (AES-GCM) for all integrations | Stable |
| Chat interface with chat-triggered workflows | Stable |
| Heartbeat scheduler (background agents) | Stable |
| Skills system (6 built-in skills) | Stable |
| Multi-provider LLM (OpenAI + Anthropic) | Stable |
| Agent templates (5 pre-built) | Stable |
| Agent analytics | Stable |
| Google Drive memory (per-agent files) | Stable |
| Sub-agent spawning | Stable |
| Gmail (send, search) | Stable |
| Google Calendar (list, create events) | Stable |
| Telegram bot (send/receive messages) | Stable |
| Browser automation (Browser-Use Cloud) | Stable |
| Voice calls (Twilio) | Needs testing |
| Knowledge graph visualization | Preview |

## Architecture

```
Next.js 16 App Router
├── Dashboard UI (React 19, Tailwind CSS 4, shadcn/ui)
├── API Routes (REST endpoints, 40+, all with ownership checks)
├── Agent Execution Engine (plain async + event-driven HITL)
│   ├── agent-workflow.ts    — Main workflow loop (async function)
│   ├── steps.ts             — Step functions + 17 inline tool definitions
│   └── agent-runner.ts      — Background execution via waitUntil
├── LLM Providers (per-user encrypted API keys)
│   ├── OpenAI               — GPT-5.2, o3, o4-mini, GPT-4.1
│   └── Anthropic            — Claude Sonnet 4.5, Opus 4.6, Haiku 4.5
├── Memory System
│   ├── Google Drive          — Per-agent .md files (dynamic filenames, append mode)
│   └── Supermemory           — Semantic search across all memory files
├── Skills System
│   └── 6 built-in skills    — Email digest, calendar, outreach, job search, briefing, research
├── Integrations (all with per-user key resolution)
│   ├── Firecrawl            — Web search + scraping
│   ├── Supermemory          — Semantic memory storage + retrieval
│   ├── Google APIs          — Gmail + Calendar + Drive via googleapis
│   ├── Telegram             — Bot messaging via grammY
│   ├── Browser-Use Cloud    — Browser automation
│   └── Twilio               — Voice calls
├── Scheduler
│   └── Heartbeat            — Vercel Cron (production) / setInterval (dev)
└── Database                  — Neon Postgres (serverless), 15 migrations
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- A [Neon](https://neon.tech) Postgres database
- A [Google Cloud](https://console.cloud.google.com) project with OAuth credentials
- An [OpenAI](https://platform.openai.com) API key

### 1. Clone and install

```bash
git clone https://github.com/shuruheel/volition.git
cd volition
pnpm install
```

### 2. Configure environment

```bash
cp env.example .env.local
```

Edit `.env.local` with your credentials. See [docs/SETUP.md](docs/SETUP.md) for detailed setup instructions.

Required variables:
- `DATABASE_URL` — Neon Postgres connection string
- `OPENAI_API_KEY` — OpenAI API key (or configure per-user in Settings)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
- `AUTH_SECRET` — NextAuth secret (generate with `openssl rand -base64 32`)
- `NEXT_PUBLIC_APP_URL` — Your app URL

### 3. Set up the database

```bash
pnpm db:setup
```

This runs all 15 migrations to create the schema.

### 4. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Try it out

1. Sign in with Google
2. Enter your OpenAI API key on the onboarding screen
3. Create an agent (or use a template from the Templates page)
4. Enable the agent — it will introduce itself and ask what you want
5. Chat with the agent to give it tasks
6. Watch it research, take actions, and ask for approval on sensitive operations

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Landing | `/` | Product landing page |
| Login | `/login` | Google OAuth sign-in |
| Onboarding | `/onboarding` | OpenAI API key setup |
| Dashboard | `/dashboard` | Agent management, activity feed, metrics |
| Templates | `/templates` | Pre-built agent templates |
| Skills | `/skills` | Browse and enable skills per agent |
| Settings | `/settings` | Configure API keys for all integrations |
| Chat | `/chat` | Direct chat with agents |
| Graph | `/graph` | Knowledge graph visualization |

## Agent Templates

Start with a pre-configured agent:

- **Email Manager** — Triage inbox, draft responses, schedule meetings (30-min heartbeat)
- **Research Assistant** — Deep multi-session research on any topic
- **Outreach Agent** — Research prospects, draft personalized outreach (2-hour heartbeat)
- **Daily Briefing** — Morning intelligence briefing from configured sources (daily heartbeat)
- **Job Hunter** — Monitor job listings, research companies, prepare applications (6-hour heartbeat)

## Skills

Enable pre-built capabilities on any agent:

- **Email Digest** — Summarize unread emails, highlight action items
- **Calendar Summary** — Daily calendar briefing with meeting prep
- **Outreach Campaign** — Automated personalized email outreach
- **Job Application Prep** — Research companies, tailor resume, draft cover letters
- **Daily Intelligence Briefing** — Monitor sources, synthesize, deliver via email
- **Research Deep Dive** — Multi-session comprehensive research

## Security

- **Authentication** — Google OAuth via NextAuth.js v5 with JWT sessions
- **Authorization** — `requireAgentOwnership()` and `requireActivityOwnership()` on all protected API routes
- **Data Isolation** — All queries scoped to authenticated user's agents
- **Encrypted Keys** — AES-GCM encryption for all API keys stored in database
- **Per-User Keys** — Every integration resolves per-user keys from `tool_configs`, with env var fallback
- **Google Drive Isolation** — Per-user OAuth tokens, `drive.file` scope (only accesses files Volition created)
- **Telegram Validation** — Bot deep-links validate agent exists, is enabled, and has Telegram tool enabled

## Development

```bash
pnpm install          # Install dependencies
pnpm dev              # Dev server at http://localhost:3000
pnpm build            # Production build
pnpm lint             # ESLint
pnpm db:setup         # Run migrations
pnpm db:migrate       # Run migrations (alias)
```

### Adding New Tools

Tools for agent workflows are defined **inline** in `lib/ai/workflows/steps.ts` using raw OpenAI function call JSON Schema (not the AI SDK `tool()` helper). See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

### Adding New LLM Providers

Create a new provider class implementing `LLMProvider` in `lib/ai/providers/`, register it in the factory at `lib/ai/providers/index.ts`, and add the provider to the model selector UI in `components/model-selector.tsx`.

## Deployment

See [docs/SETUP.md](docs/SETUP.md) for detailed deployment instructions covering Vercel, Neon Postgres, Google Cloud OAuth, and optional integrations.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding conventions, and how to add new integrations.

## License

[MIT](LICENSE)
