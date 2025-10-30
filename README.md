# Agent Dashboard

An AI Agent Dashboard built with Next.js 16, Vercel AI SDK 6, and Neon Postgres.

## Features

- **Agent Orchestration**: Create and manage AI agents with custom prompts and tool permissions
- **Tool Integration**: Supermemory (graph memory), Browser-Use Cloud (browser automation), Twilio (voice calls)
- **Activity Feed**: Track agent actions, research, calls, and more
- **Key Metrics**: Monitor spend, active tasks, pending approvals, memories, and actions
- **Tool Configuration**: Securely manage API keys with AES-GCM encryption
- **Voice Calls**: Outbound calls via Twilio with OpenAI Realtime API integration

## Tech Stack

- **Frontend**: Next.js 16 (App Router, React Server Components), React 19.2.0
- **Backend**: Next.js Route Handlers, Vercel AI SDK 6
- **Database**: Neon Postgres (serverless)
- **AI**: OpenAI GPT-4o, Supermemory, Browser-Use Cloud
- **Voice**: Twilio + OpenAI Realtime API
- **Styling**: Tailwind CSS 4, shadcn/ui components

## Quick Start

### 1. Prerequisites

- Node.js 20+
- pnpm (or npm/yarn)
- Neon Postgres account (free tier available)
- OpenAI API key

### 2. Clone and Install

```bash
git clone <your-repo-url>
cd agent-dashboard
pnpm install
```

### 3. Environment Setup

Copy the example environment file:

```bash
cp env.example .env.local
```

Edit `.env.local` with your credentials:

```bash
# AI Models
OPENAI_API_KEY=sk-...

# Database (Neon Postgres)
DATABASE_URL=postgresql://...
DATABASE_URL_POOLED=postgresql://...?pgbouncer=true

# Memory (Supermemory - optional)
SUPERMEMORY_API_KEY=sm_...

# Browser Automation (Browser-Use - optional)
BROWSER_USE_API_KEY=bu_...

# Research (Firecrawl - recommended)
FIRECRAWL_API_KEY=fc_...

# Voice (Twilio - optional)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_ENCRYPTION_KEY=... # Generate with: openssl rand -hex 32
```

### 4. Database Setup

Run migrations and seed demo data:

```bash
pnpm db:setup
```

This will:
- Create all database tables
- Seed a demo user and agent
- Create sample activities and memories

### 5. Start Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your dashboard.

### 6. Test Agent Execution

1. Create a new agent via the UI
2. Click the **Play button** (▶️) to start the agent
3. Watch server logs for execution progress
4. Check the Activity Feed for completed tasks

See **[AGENT_EXECUTION.md](AGENT_EXECUTION.md)** for detailed testing guide.

## Project Structure

```
app/
├── api/                    # Backend API routes
│   ├── agents/            # Agent CRUD
│   ├── activities/        # Activity feed & approvals
│   ├── metrics/           # Dashboard metrics
│   ├── memories/          # Supermemory integration
│   ├── browser/           # Browser-Use tasks
│   ├── calls/             # Twilio outbound calls
│   ├── twilio/            # Twilio webhooks & WebSocket
│   └── settings/          # Tool configuration
├── dashboard/             # Main dashboard UI
├── chat/                  # Chat interface
├── graph/                 # Knowledge graph
└── settings/              # Settings page

lib/
├── ai/
│   ├── agent.ts          # ToolLoopAgent orchestration
│   └── tools/            # Custom AI SDK tools
├── db.ts                 # Neon database client
├── crypto.ts             # AES-GCM encryption
└── utils.ts              # Utilities

components/
├── ui/                   # shadcn/ui components
├── activity-*.tsx        # Activity card variants
└── unified-activity-card.tsx

db/
└── migrations/           # SQL migration files
```

## Database Schema

Core tables:

- **users**: User accounts (minimal for v1)
- **agents**: AI agents with prompts and tool permissions
- **activities**: Agent activity feed (research, calls, emails, etc.)
- **memories**: References to Supermemory graph nodes
- **calls**: Twilio call records and summaries
- **tool_configs**: Encrypted API keys and tool configurations

See `db/migrations/001_init.sql` for full schema.

## API Routes

### Agents
- `GET /api/agents` - List all agents
- `POST /api/agents` - Create agent
- `POST /api/agents/:id/start` - Start agent execution
- `POST /api/agents/:id/stop` - Stop agent execution
- `PATCH /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

### Activities
- `GET /api/activities` - List activities (with filters)
- `POST /api/activities` - Create activity
- `POST /api/activities/:id/approve` - Approve activity
- `POST /api/activities/:id/reject` - Reject activity

### Metrics
- `GET /api/metrics/key` - Get key metrics (spend, tasks, approvals, etc.)

### Memories (Supermemory)
- `POST /api/memories/store` - Store memory reference
- `GET /api/memories/search` - Search memories

### Browser Tasks (Browser-Use)
- `POST /api/browser/task` - Create browser automation task

### Calls (Twilio)
- `POST /api/calls` - Initiate outbound call
- `POST /api/calls/:id/summary` - Generate call summary
- `POST /api/twilio/voice` - TwiML webhook
- `POST /api/twilio/status` - Status callback
- `WS /api/twilio/stream` - WebSocket proxy to OpenAI Realtime

### Settings
- `GET /api/settings/tools` - Get tool configurations (masked)
- `POST /api/settings/tools` - Save tool configuration
- `POST /api/settings/test` - Test tool connectivity

## Agent Orchestration

Agents use Vercel AI SDK 6 for autonomous task execution:

```typescript
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { supermemoryTools } from '@supermemory/tools/ai-sdk';
import { browserTaskTool } from '@/lib/ai/tools/browser-task';

const result = await streamText({
  model: openai('gpt-4o'),
  tools: {
    ...supermemoryTools(process.env.SUPERMEMORY_API_KEY),
    browserTask: browserTaskTool,
    logActivity: logActivityTool,
  },
  prompt: agent.prompt + '\n\nUser request: ' + task,
  maxSteps: 10,
  onStepFinish: async ({ toolCalls, usage }) => {
    // Log steps and track usage
  },
});
```

### How It Works

1. **Create Agent**: Define system prompt and select tools
2. **Start Agent**: Click Play button in UI → calls `POST /api/agents/:id/start`
3. **Background Execution**: Agent runs autonomously with AI SDK streaming
4. **Tool Execution**: Agent can call Supermemory, Browser-Use, and log activities
5. **Completion**: Status updates to `idle`, activities logged

**Current Limitations**:
- Agents execute once per start (not continuously)
- 60-second Vercel timeout applies (use job queue for longer tasks)
- No real-time UI updates during execution

**Production Ready**:
- Use job queue (BullMQ/Inngest) for reliable execution
- Add WebSocket for real-time updates
- Implement scheduled/recurring tasks

See **[AGENT_EXECUTION.md](AGENT_EXECUTION.md)** for detailed guide and `lib/ai/agent.ts` for implementation.

## Deployment

### Vercel

1. Push to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

Vercel will automatically:
- Build with Next.js 16
- Enable edge functions for API routes
- Set up preview deployments

### Database Migrations

Run migrations on production:

```bash
# Using Neon CLI
neonctl connection-string main | xargs -I {} psql {} -f db/migrations/001_init.sql

# Or using Vercel env vars
psql $DATABASE_URL -f db/migrations/001_init.sql
```

## Development

### Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint

# Database
pnpm db:setup         # Run migrations + seed data
pnpm db:migrate       # Run migrations only
```

### Adding New Tools

1. Create tool in `lib/ai/tools/my-tool.ts`:

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const myTool = tool({
  description: 'Description for the LLM',
  inputSchema: z.object({
    param: z.string().describe('Parameter description'),
  }),
  execute: async ({ param }) => {
    // Tool implementation
    return { result: 'success' };
  },
});
```

2. Add to agent tools in `lib/ai/agent.ts`
3. Update `tool_configs` enum if storing credentials
4. Add settings UI in `app/settings/page.tsx`

### Activity Types

Filtered in activity feed:

**Included:**
- `research` - Research tasks
- `email_sent` - Sent emails
- `phone_call` - Phone calls
- `post_call_summary` - Call summaries
- `calendar_event_added` - Calendar events created
- `calendar_event_modified` - Calendar events modified
- `webpage_viewed` - Web pages visited
- `journal_read` - Journal entries

**Excluded (high frequency/noise):**
- `video_watched`
- `financial`
- `image_seen`
- `email_read`

## Security

- **API Keys**: Never exposed client-side, server-only
- **Encryption**: AES-GCM for tool configs at rest
- **Webhooks**: Validate Twilio signatures (optional)
- **Auth**: Mock auth for v1, real auth in v2

## Roadmap (v2)

- [ ] Neon Auth or Auth0 integration
- [ ] Composio Gmail + Google Calendar integration
- [ ] Inbound calls and call recordings
- [ ] Usage billing and rate limiting
- [ ] Advanced observability (OpenTelemetry)
- [ ] Multi-user support with RBAC

## Resources

- [Next.js 16 Docs](https://nextjs.org/docs)
- [Vercel AI SDK 6](https://v6.ai-sdk.dev)
- [Neon Postgres](https://neon.com/docs)
- [Supermemory](https://supermemory.ai/docs)
- [Browser-Use Cloud](https://docs.cloud.browser-use.com)
- [Twilio Voice API](https://www.twilio.com/docs/voice)

## License

MIT

---

## Next.js 16 Upgrade Notes

- Upgraded to Next.js 16.0.0 and React 19.2.0
- Removed `eslint` config from `next.config.mjs` (no longer supported)
- Updated `vaul` to `^1.1.2` for React 19 compatibility
- TypeScript set to `react-jsx` runtime; `.next/dev/types` added to `tsconfig.json` include

### Verification
- `pnpm build` succeeds
- Dev server starts and routes work at `http://localhost:3000`
