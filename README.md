# Volition

An open-source AI agent orchestration platform with durable workflows, human-in-the-loop approval, and multi-tool integration.

Built with Next.js 16, Vercel Workflow, OpenAI, and Neon Postgres.

## Why This Exists

Most agent frameworks focus on chain-of-thought execution but ignore the hard parts: **durability** (what happens when a step fails?), **human oversight** (should the agent really send that email?), and **memory** (does the agent remember what it researched yesterday?).

This dashboard tackles all three:

- **Durable Execution** — Vercel Workflow with `'use workflow'` / `'use step'` directives gives each agent step automatic retries and resumability
- **Human-in-the-Loop** — Workflow hooks pause execution for user approval before sensitive actions (emails, calendar events, phone calls)
- **Persistent Memory** — Supermemory integration stores and retrieves research across sessions
- **Multi-Tool Agents** — Firecrawl (web research), Gmail + Google Calendar, Browser-Use Cloud (browser automation), Twilio (voice calls), Telegram bot

## Features

| Feature | Status |
|---------|--------|
| Agent CRUD + dashboard UI | Stable |
| Durable workflow execution (Vercel Workflow) | Stable |
| Web research (Firecrawl search + scrape) | Stable |
| Semantic memory (Supermemory) | Stable |
| Human-in-the-loop approval hooks | Stable |
| Activity feed + metrics | Stable |
| Encrypted tool config management | Stable |
| Chat interface | Stable |
| Gmail (send, search) | Needs testing |
| Google Calendar (list, create events) | Needs testing |
| Telegram bot (send/receive messages) | Needs testing |
| Browser automation (Browser-Use Cloud) | Needs testing |
| Voice calls (Twilio) | Needs testing |
| Knowledge graph visualization | Preview |
| Authentication | Single-user (no login) |

## Architecture

```
Next.js 16 App Router
├── Dashboard UI (React 19, Tailwind CSS 4, shadcn/ui)
├── API Routes (REST endpoints)
├── Vercel Workflow Engine
│   ├── agent-workflow.ts    — Main workflow loop ('use workflow')
│   ├── steps.ts             — Durable steps ('use step') + inline tool definitions
│   └── hooks.ts             — HITL hooks (defineHook) for approval flows
├── Integrations
│   ├── Firecrawl            — Web search + scraping
│   ├── Supermemory           — Semantic memory storage + retrieval
│   ├── Google APIs           — Gmail + Calendar via googleapis
│   ├── Telegram              — Bot messaging via grammY
│   ├── Browser-Use Cloud     — Browser automation
│   └── Twilio                — Voice calls
└── Neon Postgres             — Serverless database
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- [Neon Postgres](https://neon.tech) account (free tier works)
- [OpenAI](https://platform.openai.com) API key

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

Edit `.env.local` with your credentials. Only `OPENAI_API_KEY`, `DATABASE_URL`, `DATABASE_URL_POOLED`, and `APP_ENCRYPTION_KEY` are required. All integrations are optional.

### 3. Set up database

```bash
pnpm db:setup
```

### 4. Start dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Try it out

1. Create an agent with a research-focused system prompt
2. Click the Play button to start the agent
3. Watch the activity feed populate with research results
4. Approve or reject pending actions in the feed

## Adding New Tools

Tools for agent workflows are defined **inline** in `lib/ai/workflows/steps.ts` using raw OpenAI function call JSON Schema (not the AI SDK `tool()` helper). See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding conventions, and how to add new integrations.

## License

[MIT](LICENSE)
