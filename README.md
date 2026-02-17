# Volition

An open-source AI agent orchestration platform. Create agents that research, email, schedule, and take action on your behalf — with human-in-the-loop approval for every sensitive action.

Built with Next.js 16, Vercel Workflow, Neon Postgres, and multi-provider LLM support (OpenAI + Anthropic).

## Why Volition

Most agent frameworks focus on chain-of-thought execution but ignore the hard parts: **durability** (what happens when a step fails?), **human oversight** (should the agent really send that email?), and **memory** (does the agent remember what it researched yesterday?).

Volition solves all three with a visual, web-native platform that non-engineers can use:

- **Durable Execution** — Vercel Workflow with `'use workflow'` / `'use step'` directives gives each agent step automatic retries and resumability
- **Human-in-the-Loop** — Workflow hooks pause execution for user approval before sensitive actions (emails, calendar events, phone calls)
- **Persistent Memory** — Google Drive files (soul.md, preferences.md, knowledge.md) + Supermemory semantic search
- **Background Agents** — Heartbeat scheduler runs agents on configurable intervals with checklist-driven tasks
- **Multi-Provider LLM** — OpenAI (GPT-5.2, o3) and Anthropic (Claude Sonnet 4.5, Opus 4.6) with per-agent model selection
- **Skills System** — Pre-built capabilities (email digest, outreach campaigns, job applications) that non-engineers can enable with one click
- **Multi-Tool Agents** — Firecrawl (web research), Gmail + Google Calendar, Google Drive (agent memory), Browser-Use Cloud, Twilio (voice calls), Telegram bot

## Features

| Feature | Status |
|---------|--------|
| Google OAuth authentication | Stable |
| Agent CRUD + dashboard UI | Stable |
| Durable workflow execution (Vercel Workflow) | Stable |
| Web research (Firecrawl search + scrape) | Stable |
| Semantic memory (Supermemory) | Stable |
| Human-in-the-loop approval hooks | Stable |
| Activity feed + real-time metrics (SSE) | Stable |
| Encrypted tool config management (AES-GCM) | Stable |
| Chat interface | Stable |
| Heartbeat scheduler (background agents) | Stable |
| Skills system (6 built-in skills) | Stable |
| Multi-provider LLM (OpenAI + Anthropic) | Stable |
| Agent templates (5 pre-built) | Stable |
| Agent analytics | Stable |
| Google Drive memory (per-agent files) | Stable |
| Sub-agent spawning | Stable |
| Gmail (send, search) | Needs testing |
| Google Calendar (list, create events) | Needs testing |
| Telegram bot (send/receive messages) | Needs testing |
| Browser automation (Browser-Use Cloud) | Needs testing |
| Voice calls (Twilio) | Needs testing |
| Knowledge graph visualization | Preview |

## Architecture

```
Next.js 16 App Router
├── Dashboard UI (React 19, Tailwind CSS 4, shadcn/ui)
├── API Routes (REST endpoints, 40+)
├── Vercel Workflow Engine
│   ├── agent-workflow.ts    — Main workflow loop ('use workflow')
│   ├── steps.ts             — Durable steps ('use step') + 15+ inline tool definitions
│   └── hooks.ts             — HITL hooks (defineHook) for approval flows
├── LLM Providers
│   ├── OpenAI               — GPT-5.2, o3, o4-mini, GPT-4.1
│   └── Anthropic            — Claude Sonnet 4.5, Opus 4.6, Haiku 4.5
├── Skills System
│   └── 6 built-in skills    — Email digest, calendar, outreach, job search, briefing, research
├── Integrations
│   ├── Firecrawl            — Web search + scraping
│   ├── Supermemory          — Semantic memory storage + retrieval
│   ├── Google APIs          — Gmail + Calendar + Drive via googleapis
│   ├── Telegram             — Bot messaging via grammY
│   ├── Browser-Use Cloud    — Browser automation
│   └── Twilio               — Voice calls
├── Scheduler
│   └── Heartbeat            — Vercel Cron (production) / setInterval (dev)
└── Database                  — Neon Postgres (serverless)
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

This runs all 14 migrations to create the schema.

### 4. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Try it out

1. Sign in with Google
2. Enter your OpenAI API key on the onboarding screen
3. Create an agent (or use a template from the Templates page)
4. Click the Play button to start the agent
5. Watch the activity feed populate with research results
6. Approve or reject pending actions in the feed

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Login | `/login` | Google OAuth sign-in |
| Onboarding | `/onboarding` | OpenAI API key setup |
| Dashboard | `/dashboard` | Main agent management, activity feed, metrics |
| Templates | `/templates` | Pre-built agent templates (Email Manager, Research Assistant, Outreach Agent, Daily Briefing, Job Hunter) |
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
