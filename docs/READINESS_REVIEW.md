# Volition v2 Readiness Review

Last updated: 2026-02-17 (v3)

---

## Complete User Flow

Here's the end-to-end journey a user takes through Volition:

### 1. Sign In (`/login`)
User visits the app. Middleware redirects unauthenticated users to `/login`. User clicks "Sign in with Google" which triggers NextAuth.js Google OAuth. During sign-in, the `signIn` callback in `lib/auth.ts` upserts the user in the `users` table and stores Google OAuth tokens (encrypted) in `tool_configs` for Gmail/Calendar/Drive access.

### 2. Onboarding (`/onboarding`)
After sign-in, `app/page.tsx` (server component) checks if the user has an OpenAI key configured. If not, redirects to `/onboarding`. User pastes their OpenAI API key, which is encrypted via AES-GCM and stored in `tool_configs`. User can also skip this step.

### 3. Dashboard (`/dashboard`)
Main hub. Shows:
- **Agent cards** with enabled/disabled state, status indicators (Disabled / Listening... / Running... / Error), heartbeat countdown, enable/disable and delete controls
- **Key metrics** (active tasks, pending approvals, memories, emails sent, calls made)
- **Activity feed** with real-time SSE updates
- **Chat drawer** that auto-opens when an agent asks a question (HITL), and triggers chat workflows when the user messages an enabled agent
- Navigation links to **Templates**, **Skills**, and **Settings**

### 4. Create an Agent
Two paths:
- **From scratch**: Click "Create Agent" — dialog with 4 tabs (Basics, Model, Tools, Schedule)
- **From template**: Visit `/templates` — 5 pre-built templates (Email Manager, Research Assistant, Outreach Agent, Daily Briefing, Job Hunter) that auto-configure tools, skills, and schedules

New agents are created in the **disabled** state. The user must explicitly enable them.

### 5. Configure Skills (`/skills`)
Visual marketplace. Select an agent, then enable/disable skills (email digest, calendar summary, outreach campaign, job application prep, daily briefing, research deep dive). Skills are prompt templates injected into the agent's system prompt.

### 6. Configure Settings (`/settings`)
Manage encrypted API keys for all integrations: OpenAI, Anthropic, Supermemory, Firecrawl, Browser-Use, Twilio, Google, Telegram.

### 7. Enable Agent (The New Lifecycle)

Click **Enable** on an agent card. This calls `/api/agents/[id]/start` which:

1. Sets `enabled = true` on the agent
2. Creates a default 60-minute heartbeat schedule (if none exists), or re-enables a disabled one
3. Launches a **welcome workflow** (5 steps max, `triggerType: 'welcome'`)

The welcome workflow introduces the agent and uses `askUser` to ask what the user wants done. The agent does NOT start tasks or research until the user responds. After the welcome workflow completes, the agent goes to **idle** but stays **enabled** — it's now "listening" for chat messages or heartbeat triggers.

### 8. Chat with an Enabled Agent

When the user sends a message in the chat drawer, it calls `/api/agents/[id]/chat` which:

1. Stores the `user_message` activity
2. Checks if the agent is `enabled = true` and `status != 'active'`
3. If yes, atomically claims the agent (using `WHERE status = 'idle' RETURNING *` to prevent race conditions) and starts a **chat workflow** (10 steps max, `triggerType: 'chat'`)
4. If the agent is busy (already running), the message is stored and the running workflow will see it in context
5. If the agent is disabled, the message is stored but no workflow triggers

The chat workflow uses a conversational prompt focused on responding to the user's specific message.

### 9. Heartbeat (Background Check-ins)

Enabled agents with schedules run automatically. Vercel Cron hits `/api/scheduler/tick` every minute. The scheduler queries `agent_schedules` for overdue agents where **both** `agent_schedules.enabled = true` AND `agents.enabled = true`, then starts **heartbeat workflows** (10 steps max, `triggerType: 'heartbeat'`).

Heartbeat prompts are decision-oriented: "Review your checklist, decide what needs attention RIGHT NOW. If nothing is due, report all clear and stop." This prevents heartbeats from ballooning into full research sessions.

### 10. Disable Agent

Click **Disable** on an agent card. This calls `/api/agents/[id]/stop` which:

1. Sets `enabled = false`, `status = 'idle'`
2. Disables all `agent_schedules` for the agent
3. Clears `agent_status` (real-time tracking)
4. Logs an `agent_stopped` activity

If a workflow is running when the agent is disabled, it will exit gracefully at the start of the next loop iteration (via `checkAgentEnabledStep`).

### 11. Workflow Completion Behavior

After any workflow completes, the agent is set to `status = 'idle'` but `enabled` is NOT touched. An enabled agent returns to the "Listening..." state, ready for the next chat message or heartbeat. A disabled agent stays disabled.

---

## Agent Lifecycle State Machine

```
                  ┌─────────────────────────────────────────┐
                  │                                         │
  Create ──► [Disabled, Idle] ──Enable──► [Enabled, Idle]   │
                  ▲                      ("Listening...")    │
                  │                           │             │
              Disable                    Chat msg /         │
                  │                    Heartbeat /          │
                  │                     Welcome             │
                  │                         │               │
                  │                         ▼               │
                  │              [Enabled, Active]          │
                  │               ("Running...")            │
                  │                    │                    │
                  │             Workflow completes          │
                  │             or agent stops              │
                  │                    │                    │
                  │                    ▼                    │
                  │              [Enabled, Idle] ──────────┘
                  │              ("Listening...")
                  │                    │
                  └────────────────────┘
```

Key insight: `enabled` and `status` are orthogonal. `enabled` is the user's intent ("should this agent participate?"). `status` is the execution state ("is it currently running?"). An enabled agent can be idle (listening) or active (running). A disabled agent is always idle.

---

## Trigger-Aware Prompt System

The system prompt adapts to how the workflow was triggered:

| Trigger | Max Steps | Prompt Focus |
|---------|-----------|-------------|
| `welcome` | 5 | Introduce yourself, ask what user wants. Don't start tasks. |
| `chat` | 10 | Respond to user's message. Be conversational, take action if asked. |
| `heartbeat` | 10 | Quick check-in. Review checklist, only act if needed. Default to stop. |
| `manual` | 20 | Full continuous research agent. Plan queries, gather, analyze, repeat. |

All four variants share the same HITL approval core (createPendingActivity for emails/calls/calendar, askUser for clarification). The difference is in the agent's role framing and expected behavior.

---

## Comparison with OpenClaw

Volition's enable/disable model was inspired by OpenClaw's persistent agent approach, but adapted for a multi-user hosted web app rather than a single-user local daemon.

### What We Borrowed

| Concept | OpenClaw | Volition |
|---------|----------|---------|
| **Persistent agents** | Agents are always-on while the Gateway daemon runs | Enabled agents are persistent — they listen for messages, run heartbeats, and stay active until explicitly disabled |
| **Heartbeat check-ins** | Reads `HEARTBEAT.md` every 30 min, agent decides if action needed | Database-backed schedules, heartbeat prompt says "only act if needed, default to stop" |
| **Chat as primary interaction** | Messages flow through channel adapters (WhatsApp, Telegram, etc.) | Chat drawer sends to `/api/agents/[id]/chat`, triggering a workflow if agent is idle |
| **Separation of scheduling and execution** | Cron jobs are separate from the chat lane | Heartbeat scheduler is separate from chat-triggered workflows |

### Where We Diverge

| Aspect | OpenClaw | Volition | Why |
|--------|----------|---------|-----|
| **Deployment** | Local daemon (single-user) | Hosted web app (multi-user SaaS) | Different target audience — Volition aims at teams and non-technical users |
| **Per-agent enable/disable** | No first-class toggle. Remove from config to disable. | `enabled` boolean column with UI toggle | Web app needs explicit per-agent control without editing config files |
| **Welcome workflow** | No concept — agents are config entries, not interactive entities | Agent introduces itself and asks what user wants | Creates a more natural "onboarding" moment when enabling an agent |
| **Execution durability** | Stateless per-turn | Vercel Workflow with automatic retries and durable steps | Cloud deployment needs resilience to function timeouts |
| **Graceful disable** | Kill the daemon | `checkAgentEnabledStep` checks at each loop iteration, exits cleanly | Can't kill a serverless function — need cooperative shutdown |
| **Schedule storage** | File-based (`HEARTBEAT.md`, `jobs.json`) | Database tables (`agent_schedules`) | Multi-user SaaS needs shared persistent storage |
| **Prompt adaptation** | Single prompt style; heartbeat vs chat distinguished by channel | Four `triggerType` variants with distinct prompt framing | Prevents heartbeats from behaving like research agents, prevents welcome from starting tasks |

### Assessment: Is the Flow Natural?

**Yes, with caveats.**

The enable/disable model is a significant improvement over the old "click Play to run 20 steps, then agent goes dormant" pattern. The new flow feels more like managing a team member:

1. **Enable = "You're on duty"** — the agent introduces itself and asks for direction
2. **Chat = natural interaction** — messages trigger responses, like messaging a coworker
3. **Heartbeat = autonomous check-ins** — the agent proactively reviews its checklist without being prompted
4. **Disable = "You're off duty"** — clean shutdown, no more heartbeats, no more chat responses

This mirrors OpenClaw's "always-on assistant" feel, adapted for a web dashboard instead of a local CLI.

**What works well:**
- The welcome workflow creates a natural first-contact moment instead of the agent silently starting to research
- Chat-triggered workflows make the agent feel responsive and interactive
- Heartbeat prompts that default to "all clear and stop" prevent runaway background activity
- The atomic status claim (`WHERE status = 'idle' RETURNING *`) prevents duplicate workflows from race conditions
- Graceful disable via `checkAgentEnabledStep` means mid-workflow disables don't leave orphaned state

**What could be improved later:**
- OpenClaw's Lane Queue (serial per-session execution) is more sophisticated than our atomic claim approach — we prevent duplicate workflows but don't queue messages for serial processing
- OpenClaw's isolated vs main session modes for cron jobs is a useful concept we don't have yet — all our heartbeats share the same conversation context
- No channel adapters yet (WhatsApp, Telegram integration exists but doesn't trigger workflows the way chat does)
- The 10-step limit on chat workflows may be too restrictive for complex tasks — OpenClaw has no per-turn step limit

---

## Readiness Assessment

### Ready for Testing

| Component | Status | Notes |
|-----------|--------|-------|
| Google OAuth sign-in | Ready | Real auth, deployed and tested on staging |
| Onboarding flow | Ready | API key encryption works, redirect fixed |
| Agent CRUD | Ready | Scoped to user via `requireAgentOwnership` |
| Model selection (OpenAI/Anthropic) | Ready | Per-agent provider + model |
| Agent enable/disable lifecycle | Ready | `enabled` column, welcome/chat/heartbeat trigger types |
| Chat-triggered workflows | Ready | `/api/agents/[id]/chat` with atomic status claim |
| Trigger-aware prompts | Ready | welcome/chat/heartbeat/manual prompt variants |
| Graceful mid-workflow disable | Ready | `checkAgentEnabledStep` in loop |
| Multi-user data isolation | **Needs Fix** | **2 routes missing ownership checks (see below)** |
| API route authentication | **Needs Fix** | **`POST /api/activities` and `/api/agents/:id/memory` lack `requireAgentOwnership`** |
| Workflow execution | Ready | Durable steps, trigger-type-aware step limits |
| Research pipeline | Ready | Plan queries -> Firecrawl -> Supermemory (public data only) |
| HITL approval | Ready | Email and calendar require approval |
| Activity feed + SSE | Ready | Real-time updates, scoped to user |
| Skills system | Ready | 6 built-in, injectable into prompts |
| Agent templates | Ready | 5 pre-built configurations |
| Heartbeat scheduler | Ready | Vercel Cron + `enabled` check + 10-step limit |
| Agent analytics | Ready | Scoped to user's agents |
| Settings encryption | Ready | AES-GCM per-user, APP_ENCRYPTION_KEY set for all Vercel environments |
| Database migrations | Ready | Runner fixed (dotenv, Neon API, multi-statement, comments) |
| **Per-user LLM keys** | **Ready** | **`resolveProviderConfig()` fixed — reads `data_encrypted` column, uses `decrypt()`** |
| **Per-user Supermemory keys** | **Ready** | **`resolveSupermemoryKey()` reads per-user key from `tool_configs`, falls back to env var** |
| **Memory context auto-injection** | **Ready** | **`loadMemoryContextStep()` loads soul.md/preferences.md, `withMemoryContext()` injects into system prompt** |

### Needs Integration Testing

| Component | What to Test | Dependencies |
|-----------|-------------|-------------|
| Enable/disable cycle | Enable agent -> welcome message -> chat -> heartbeat -> disable -> re-enable | OpenAI or Anthropic API key |
| Chat workflow triggering | Send message to enabled+idle agent, verify workflow starts | Agent must be enabled |
| Heartbeat with enabled check | Create schedule, enable agent, wait for heartbeat, then disable and verify no more runs | Vercel Cron or local interval |
| Concurrent chat prevention | Send two messages rapidly, verify only one workflow starts | Race condition test |
| Gmail send/search | Sign in with Google, enable Google tool, create agent, have it send email | Google OAuth tokens stored correctly |
| Google Calendar | Create/list events via agent | Same as Gmail |
| Google Drive memory | Agent reads/writes soul.md, knowledge.md | Drive API enabled, `drive.file` scope |
| Telegram bot | Send/receive via linked Telegram user | Bot token, webhook URL |
| Browser automation | Agent opens browser, completes tasks | Browser-Use API key |
| Twilio voice | Agent initiates outbound call | Twilio credentials + phone number |
| Anthropic provider | Create agent with Claude model, run workflow | Anthropic API key |
| Sub-agent spawning | Parent agent creates child agent for subtask | OpenAI or Anthropic key |

### Known Limitations

#### Security Issues (Must Fix Before Production)

| Issue | Severity | Details |
|-------|----------|---------|
| **`POST /api/activities` missing auth** | **High** | No `requireAgentOwnership()` call. Any user can create activities for any agent. |
| **`/api/agents/:id/memory` missing ownership check** | **Medium** | Uses `requireUserId()` but not `requireAgentOwnership()`. Data leakage risk is mitigated by Google Drive OAuth scoping (each user's token accesses their own Drive), but user A could create spurious files for agent B in their own Drive. Must add `requireAgentOwnership()`. |
| **Telegram webhook allows hijacking** | **Medium** | `/start <agentId>` deep-link lets any Telegram user link to any agent without ownership validation. Could misdirect messages. |

#### Per-User API Key Gaps — RESOLVED (v3)

All integration points now resolve per-user keys from `tool_configs`. See the Per-User API Key Resolution Audit section for the full matrix.

#### Other Limitations

| Issue | Impact | Workaround |
|-------|--------|-----------|
| No embedding-based memory retrieval | Large knowledge.md files loaded in full or not at all | Acceptable for now (OpenClaw also does full-file load) |
| No memory file compaction | journal.md and knowledge.md grow indefinitely | Manual editing in Google Drive |
| Twilio WebSocket stream is a stub | Voice call streaming not functional | Outbound calls work, just no real-time audio streaming |
| Total Spend metric is mocked at $0 | No cost tracking | Track via provider dashboards |
| No global navigation component | Users must know page URLs or use dashboard links | Dashboard has links to Templates, Skills; each page has back-to-dashboard button |
| `typescript.ignoreBuildErrors: true` | Type errors not caught at build time | Run `pnpm lint` separately |
| No message queuing for busy agents | If agent is active, chat messages are stored but not queued for serial processing | Messages appear in context on next workflow run |
| 10-step chat workflow limit | Complex tasks requested via chat may hit the step limit | User can re-message to continue, or heartbeat picks up |

### Fixes Applied

#### v3 (Per-User Keys & Memory Context)

**Per-user key resolution for LLM providers and Supermemory:**
- **Fixed `resolveProviderConfig()` bug**: `lib/ai/providers/index.ts` referenced non-existent `decryptValue` function and wrong column `config`. Fixed to use `decrypt()` from `lib/crypto.ts` and correct column `data_encrypted`. Per-user LLM API keys now actually work.
- **Added `resolveSupermemoryKey(userId)`**: `lib/integrations/supermemory.ts` now resolves per-user encrypted API keys from `tool_configs` before falling back to `process.env.SUPERMEMORY_API_KEY`. Eliminates shared-key admin visibility concern for users who configure their own key.
- **Updated `storeMarkdown()` and `searchMemories()`**: Both functions accept `userId` and pass it to `resolveSupermemoryKey()`. All workflow call sites (`planResearchQueriesStep`, `executeResearchStep`, tool handlers) and the `/api/memories/search` route pass `userId` through.

**Memory context auto-injection:**
- **Added `loadMemoryContextStep()`**: New durable workflow step in `steps.ts` that loads `soul.md` and `preferences.md` from Google Drive via `readMemoryFile()`. Gracefully returns nulls if Drive is not configured or files don't exist.
- **Wired up `withMemoryContext()`**: `agent-workflow.ts` now calls `loadMemoryContextStep()` after `getAgentContextStep()` and injects the results via `withMemoryContext()` into the system prompt. Prompt order: base -> HITL guidelines -> memory context -> skills. Agents now retain personality and learned preferences across workflow runs.

**Per-user key resolution for all remaining integrations:**
- **Added `resolveFirecrawlKey(userId)`**: `lib/integrations/firecrawl.ts` resolves per-user keys. Updated `searchFirecrawl()`, `scrapeFirecrawl()`, and `searchAndScrape()` to accept optional `apiKey`. Updated `executeResearchStep()` and both Firecrawl API routes to resolve and pass per-user key.
- **Added `resolveBrowserUseKey(userId)`**: New `lib/integrations/browser-use.ts` module. Updated `executeBrowserStep()` to accept `userId` and resolve key. Updated `/api/browser/task` route to create client per-request with resolved key (removed module-level singleton).
- **Added `resolveTelegramToken(userId)`**: `lib/integrations/telegram.ts` resolves per-user bot tokens. Updated `sendTelegramMessage()` to accept optional `botToken`. Updated workflow `sendTelegramMessage` handler and `/api/telegram/send` route to resolve and pass per-user token.
- **Added `resolveTwilioConfig(userId)`**: `app/api/calls/route.ts` resolves per-user Twilio credentials (accountSid, authToken, phoneNumber). Removed module-level singleton Twilio client; now creates client per-request with resolved config.
- **Fixed `planResearchQueriesStep()`**: Replaced hardcoded `process.env.OPENAI_API_KEY` + direct OpenAI client with `resolveProviderConfig()` + `createProvider()`. Now uses the agent's configured model provider/model and respects per-user API keys. Added `modelProvider` and `modelId` parameters.

#### v1 (Lifecycle Redesign)

- **Removed mock-user-id fallbacks**: All 4 instances in `steps.ts` now throw `Error('User authentication required')` instead of silently falling back to `'mock-user-id'`. Email and calendar operations require a real authenticated user.
- **Updated CLAUDE.md**: Removed outdated PGlite references, mock auth caveat, and wrong file paths. Reflects current multi-user, multi-provider architecture.
- **Agent lifecycle redesign**: Replaced start/stop (run-once) with enable/disable (persistent assistant) model. Added `enabled` column, welcome workflows, chat-triggered workflows, trigger-aware prompts, heartbeat `enabled` checks, and graceful mid-workflow disable.

#### v2 (Staging Deployment & Multi-User Security Hardening)

**Database Migration Fixes:**
- **dotenv loading**: `scripts/setup-db.ts` now loads `.env.local` via `dotenv` because `tsx` does not auto-load environment files like Next.js does.
- **Neon SDK API**: Changed `sql(string)` to `sql.query(string)` — Neon's tagged-template client no longer supports direct string invocation.
- **Multi-statement splitting**: Migration runner now splits SQL files on semicolons and executes statements individually, since Neon's HTTP driver does not support multi-statement prepared statements.
- **Comment stripping**: Fixed a bug where SQL statements starting with `--` comments were filtered out during splitting, causing migrations like `ALTER TABLE ... ADD COLUMN google_id` to be silently skipped.
- **Migrations 007/008 manually applied**: These were marked as applied in `schema_migrations` (seeded to avoid re-running 001-008 on existing tables) but had never actually run. Applied manually to fix missing composite UNIQUE constraint on `tool_configs(user_id, tool)` and missing `google_oauth` in the tool CHECK constraint.

**Authentication Fixes:**
- **NextAuth sign-in method**: Login page was doing `GET /api/auth/signin/google`, but NextAuth v5 requires POST. Fixed by using `signIn('google', { callbackUrl: '/' })` from `next-auth/react`.
- **Onboarding redirect**: Login `callbackUrl` changed from `/dashboard` to `/` so the server component in `app/page.tsx` can check for onboarding requirements before redirecting to the dashboard.
- **APP_ENCRYPTION_KEY for Preview**: The `parity` branch deploys as a Vercel Preview environment, which is separate from Production and Development. The encryption key was missing for Preview, causing all `tool_configs` writes to fail.

**Data Isolation (Single-User Legacy Data):**
- **Removed NULL user fallback**: `app/api/agents/route.ts` had `WHERE user_id = ${userId} OR user_id IS NULL`, which returned pre-existing unowned agents to every authenticated user. Removed the `OR user_id IS NULL` clause.

**Comprehensive Multi-User Security Hardening (26 routes):**

Added two ownership verification helpers to `lib/auth.ts`:
- `requireAgentOwnership(agentId)` — verifies the authenticated user owns the agent
- `requireActivityOwnership(activityId)` — verifies the authenticated user owns the activity (via agent join)

Routes secured with `requireAgentOwnership`:
- `app/api/agents/[id]/route.ts` (GET, PATCH, DELETE)
- `app/api/agents/[id]/start/route.ts` (POST)
- `app/api/agents/[id]/stop/route.ts` (POST)
- `app/api/agents/[id]/chat/route.ts` (POST)
- `app/api/agents/[id]/analytics/route.ts` (GET)
- `app/api/agents/[id]/status/route.ts` (GET)
- `app/api/agents/[id]/schedule/route.ts` (GET, POST, DELETE)
- `app/api/calls/route.ts` (POST)
- `app/api/memories/search/route.ts` (POST — now requires `agentId`)
- `app/api/memories/store/route.ts` (POST)
- `app/api/skills/route.ts` (POST)
- `app/api/research/sessions/start/route.ts` (POST)

Routes secured with `requireActivityOwnership`:
- `app/api/activities/[id]/route.ts` (GET)
- `app/api/activities/[id]/approve/route.ts` (POST)
- `app/api/activities/[id]/reject/route.ts` (POST)
- `app/api/activities/[id]/modify/route.ts` (POST)
- `app/api/research/sessions/[id]/append/route.ts` (POST)
- `app/api/research/sessions/[id]/complete/route.ts` (POST)

Routes secured with `requireUserId` + user-scoped queries:
- `app/api/activities/route.ts` (GET — all query branches join through agents for user scoping)
- `app/api/activities/stream/route.ts` (GET — SSE stream scoped to user's agents)
- `app/api/metrics/key/route.ts` (GET — all 7 metric queries join through agents)
- `app/api/metrics/stream/route.ts` (GET — SSE stream scoped to user's agents)
- `app/api/calls/route.ts` (GET — joins through agents for user scoping)
- `app/api/calls/[id]/summary/route.ts` (POST — call lookup scoped to user's agents)
- `app/api/browser/task/route.ts` (GET, POST)
- `app/api/telegram/send/route.ts` (POST)
- `app/api/telegram/setup/route.ts` (POST)

---

## Memory System Analysis

### Supermemory — Current State (Updated v3)

**Architecture**: Supermemory is an external semantic search API used as a research cache for web content scraped via Firecrawl. Documents are stored with `metadata.agentId` and filtered at query time.

**v3 improvements**:
1. **Per-user API key resolution**: `resolveSupermemoryKey(userId)` checks `tool_configs` for a per-user encrypted key before falling back to `process.env.SUPERMEMORY_API_KEY`. Users who configure their own key get fully isolated Supermemory workspaces.
2. **userId flows through all call sites**: `storeMarkdown()`, `searchMemories()`, `planResearchQueriesStep()`, `executeResearchStep()`, and `/api/memories/search` all pass `userId` for key resolution.

**Remaining considerations**:
1. **Shared env-var fallback**: If a user has no per-user key and the env var is set, all such users share a single Supermemory workspace. Data is filtered by `agentId` at query time, but an administrator with the env key could query across users.
2. **Personal memories NOT stored here**: Soul, preferences, knowledge, and journal files are stored in Google Drive (per-user OAuth isolation). Supermemory only caches research web content — publicly available information.
3. **Acceptable risk**: Since Supermemory only stores public web scrapes (not personal data), the shared-fallback risk is low. Users who want full isolation can configure their own Supermemory key in Settings.

### Google Drive Memory — Current State

**Architecture**: Each user authenticates with their own Google OAuth tokens (stored encrypted in `tool_configs`). The `lib/integrations/google-drive.ts` module creates a per-agent folder structure:
```
Volition/
  Agent - {name}/
    soul.md          — Agent personality, identity
    preferences.md   — User preferences the agent learns
    knowledge.md     — Accumulated knowledge
    journal.md       — Ongoing activity log
```

**Security strengths**:
1. **Per-user OAuth isolation**: Each user's Drive files are accessed via their own OAuth token. No admin API key. No cross-user visibility.
2. **`drive.file` scope**: Volition can only access files it created. It cannot read the user's other Drive files.
3. **User owns the data**: Files are in the user's own Google Drive. They can view, edit, or delete them outside of Volition. They survive account deletion.

**v3 improvements**:
1. **`withMemoryContext()` now wired up**: `agent-workflow.ts` calls `loadMemoryContextStep()` to read `soul.md` and `preferences.md` from Google Drive, then passes them to `withMemoryContext()` for injection into the system prompt. Agents now have persistent identity across workflow runs.
2. **Auto-injection of memory files**: `loadMemoryContextStep()` is a durable workflow step that gracefully handles missing files, missing Google OAuth tokens, or Drive API errors (returns nulls). Prompt order: base prompt -> HITL guidelines -> memory context -> skills.

**Remaining gaps**:
1. **No embedding-based retrieval**: Google Drive files are accessed by exact filename only. There is no semantic/vector search over memory contents. If an agent has accumulated 50 pages of knowledge.md, there is no way to retrieve only the relevant sections for the current task.
2. **No memory summarization or compaction**: Files grow indefinitely. No mechanism to summarize old journal entries or compact knowledge.md.
3. **knowledge.md and journal.md not auto-loaded**: Only `soul.md` and `preferences.md` are injected into the system prompt. `knowledge.md` and `journal.md` must be read explicitly via the `readMemory` tool. This is intentional — these files can grow large and would waste context window space.

### Comparison with OpenClaw's Memory System

| Feature | OpenClaw | Volition (Current) | Status |
|---------|----------|-------------------|--------|
| **Memory file auto-loading** | Personality + memory files loaded into context automatically at each turn | `soul.md` and `preferences.md` auto-loaded via `loadMemoryContextStep()` + `withMemoryContext()` | **Parity** — both auto-inject personality/preferences |
| **User-owned storage** | Local filesystem | Google Drive (user's account) | **Parity** — both give users ownership |
| **File structure** | soul.md, memories.md, etc. in agent directory | soul.md, preferences.md, knowledge.md, journal.md in Drive folder | **Parity** |
| **Semantic retrieval** | No (file-based, full load) | No (file-based, full load) | **Parity** — neither uses embeddings |
| **Admin visibility** | Admin has filesystem access (local deployment) | Admin has NO access (user's own Drive) | **Volition is better** for multi-user |
| **Cross-agent memory** | Shared filesystem possible | Per-agent Drive folders, no sharing | Acceptable difference |
| **Per-user API key isolation** | N/A (single-user) | Per-user encrypted keys for LLM providers, Supermemory, Google OAuth | **Volition is better** — multi-tenant isolation |

### Recommended Actions

1. ~~**Wire up `withMemoryContext()`**~~ — **DONE (v3)**. `loadMemoryContextStep()` + `withMemoryContext()` now auto-inject soul.md and preferences.md into the system prompt at workflow start.

2. ~~**Per-user Supermemory keys**~~ — **DONE (v3)**. `resolveSupermemoryKey(userId)` resolves per-user encrypted keys from `tool_configs`, with env var fallback. All call sites pass `userId`.

3. **Fix remaining auth gaps** (priority: high):
   - Add `requireAgentOwnership()` to `POST /api/activities`
   - Add `requireAgentOwnership()` to `GET/PUT /api/agents/:id/memory`
   - Add ownership validation to Telegram `/start <agentId>` deep-link

4. ~~**Add per-user key resolution for remaining services**~~ — **DONE (v3)**. Added `resolveFirecrawlKey()`, `resolveBrowserUseKey()`, `resolveTelegramToken()`, `resolveTwilioConfig()`. Fixed `planResearchQueriesStep()` to use `resolveProviderConfig()` with the agent's model config instead of hardcoded `process.env.OPENAI_API_KEY`.

5. **Add memory file size management** (priority: low): Implement a `compactMemory` step that summarizes journal.md when it exceeds a threshold (e.g., 10K characters). Prevents context window overflow when loading memory files.

6. **Future: Embedding-based retrieval**: For knowledge.md (which can grow large), consider chunking and embedding for contextual retrieval. This is not urgent — OpenClaw also does full-file loading — but will become necessary as agents accumulate knowledge over weeks/months.

---

## Per-User API Key Resolution Audit

This section tracks whether each external service correctly resolves per-user keys from `tool_configs` (encrypted) or relies solely on environment variables.

| Service | Key Source | Per-User? | userId Flows? | Settings UI? | Status |
|---------|-----------|-----------|---------------|-------------|--------|
| **OpenAI** (LLM) | `resolveProviderConfig()` -> `tool_configs` -> `process.env` | Yes | Yes (workflow) | Yes | **Working** |
| **Anthropic** (LLM) | `resolveProviderConfig()` -> `tool_configs` -> `process.env` | Yes | Yes (workflow) | Yes | **Working** |
| **Supermemory** | `resolveSupermemoryKey()` -> `tool_configs` -> `process.env` | Yes | Yes (all call sites) | Yes | **Working** |
| **Google OAuth** | `getOAuth2Client(userId)` -> `tool_configs` | Yes (required) | Yes | Yes | **Working** |
| **Google Drive** | Inherits from Google OAuth | Yes | Yes | N/A | **Working** |
| **Firecrawl** | `resolveFirecrawlKey()` -> `tool_configs` -> `process.env` | Yes | Yes (workflow + API routes) | Yes | **Working** |
| **Browser-Use** | `resolveBrowserUseKey()` -> `tool_configs` -> `process.env` | Yes | Yes (workflow + API route) | Yes | **Working** |
| **Telegram** | `resolveTelegramToken()` -> `tool_configs` -> `process.env` | Yes | Yes (workflow + API route) | Yes | **Working** |
| **Twilio** | `resolveTwilioConfig()` -> `tool_configs` -> `process.env` | Yes | Yes (calls route) | Yes | **Working** |
| **`planResearchQueriesStep`** | `resolveProviderConfig()` -> `tool_configs` -> `process.env` | Yes | Yes (agent model config passed through) | N/A | **Working** |

**Summary**: All 10 integration points correctly resolve per-user keys from `tool_configs` (encrypted), with env var fallback. Every Settings UI-saveable tool is now backed by actual per-user key resolution in the integration code.

---

## Staging Testing Checklist

### Authentication & Onboarding
- [ ] New user signs in with Google OAuth → redirected to onboarding
- [ ] User completes onboarding (enters OpenAI API key) → redirected to dashboard
- [ ] User skips onboarding → redirected to dashboard
- [ ] Second sign-in → goes directly to dashboard (no onboarding)
- [ ] Invalid/expired session → redirected to login

### Multi-User Data Isolation
- [ ] User A creates an agent → User B cannot see it
- [ ] User A's activities do not appear in User B's feed
- [ ] User A's metrics (active tasks, pending, memories) reflect only their data
- [ ] SSE streams (activities, metrics) deliver only the authenticated user's data
- [ ] User A cannot access User B's agent by guessing the ID (returns 404)
- [ ] User A cannot approve/reject User B's activities
- [ ] Memory search requires agentId and only returns results for user's own agents
- [ ] Settings page shows only the authenticated user's API keys
- [ ] No pre-existing unowned data (user_id IS NULL) appears for any user

### Agent Lifecycle
- [ ] Create agent → appears as Disabled
- [ ] Enable agent → welcome workflow fires, agent asks what user wants
- [ ] Chat with enabled agent → chat workflow triggers
- [ ] Chat with disabled agent → message stored, no workflow
- [ ] Heartbeat fires for enabled agent with schedule
- [ ] Heartbeat does NOT fire for disabled agent
- [ ] Disable agent mid-workflow → workflow exits gracefully
- [ ] Re-enable agent → new welcome workflow fires

### Security Regression Tests
- [ ] Unauthenticated request to any protected API route → 401
- [ ] Authenticated request to another user's agent → 404 (not 403, to avoid leaking existence)
- [ ] Authenticated request to another user's activity → 404
- [ ] Telegram webhook (unauthenticated by design) → works correctly
- [ ] Scheduler tick (unauthenticated by design) → works correctly
- [ ] Twilio webhooks (unauthenticated by design) → works correctly

---

## Files Created/Modified

### New files (v3):
- `lib/integrations/browser-use.ts` — `resolveBrowserUseKey(userId)` helper for per-user Browser-Use API key resolution

### Modified files (v3 — per-user keys & memory context):
- `lib/ai/providers/index.ts` — Fixed `resolveProviderConfig()`: `decryptValue` -> `decrypt`, `config` column -> `data_encrypted`
- `lib/integrations/supermemory.ts` — Added `resolveSupermemoryKey(userId)`, added `userId` to `StoreMarkdownInput`, updated `storeMarkdown()` and `searchMemories()` signatures
- `lib/integrations/firecrawl.ts` — Added `resolveFirecrawlKey(userId)`, threaded `apiKey` through `getAuthHeader()`, `doFetch()`, `searchFirecrawl()`, `scrapeFirecrawl()`, `searchAndScrape()`
- `lib/integrations/telegram.ts` — Added `resolveTelegramToken(userId)`, updated `sendTelegramMessage()` to accept optional `botToken`
- `lib/ai/workflows/steps.ts` — Added `userId` param to `planResearchQueriesStep()`, `executeResearchStep()`, and `executeBrowserStep()`. Updated all tool switch case call sites. Added `loadMemoryContextStep()`. Replaced hardcoded OpenAI client in `planResearchQueriesStep()` with `resolveProviderConfig()` + `createProvider()`.
- `lib/ai/workflows/agent-workflow.ts` — Imported `withMemoryContext` and `loadMemoryContextStep`, wired up memory context injection after `getAgentContextStep()`
- `app/api/memories/search/route.ts` — Imported `resolveSupermemoryKey`, captured `userId` from `requireAgentOwnership()`, replaced env var with `resolveSupermemoryKey(userId)`
- `app/api/research/firecrawl/search/route.ts` — Imported `resolveFirecrawlKey` and `getUserId`, resolve per-user key before calling `searchFirecrawl()`
- `app/api/research/firecrawl/scrape/route.ts` — Imported `resolveFirecrawlKey` and `getUserId`, resolve per-user key before calling `scrapeFirecrawl()`
- `app/api/browser/task/route.ts` — Imported `resolveBrowserUseKey`, removed module-level singleton client, resolve per-user key and create client per-request
- `app/api/telegram/send/route.ts` — Imported `resolveTelegramToken`, resolve per-user token and pass to `sendTelegramMessage()`
- `app/api/calls/route.ts` — Added `resolveTwilioConfig()`, removed module-level singleton Twilio client, resolve per-user config and create client per-request

### New files (lifecycle redesign):
- `db/migrations/015_agent_enabled.sql` — `enabled BOOLEAN` column on agents
- `app/api/agents/[id]/chat/route.ts` — Chat-triggered workflow endpoint

### New files (earlier):
- `app/skills/page.tsx` — Skills marketplace page
- `app/templates/page.tsx` — Agent templates page
- `lib/ai/providers/types.ts` — LLM provider interface
- `lib/ai/providers/openai.ts` — OpenAI provider
- `lib/ai/providers/anthropic.ts` — Anthropic provider with format conversion
- `lib/ai/providers/index.ts` — Provider factory and model registry
- `components/model-selector.tsx` — Provider/model picker UI
- `components/agent-analytics.tsx` — Per-agent analytics display
- `app/api/agents/[id]/analytics/route.ts` — Analytics API endpoint
- `db/migrations/014_agent_model.sql` — Model columns migration
- `docs/SETUP.md` — Detailed setup and deployment guide
- `docs/READINESS_REVIEW.md` — This file

### Modified files (staging deployment & security hardening):
- `scripts/setup-db.ts` — dotenv loading, Neon API fix, multi-statement splitting, comment stripping
- `app/login/page.tsx` — NextAuth sign-in method fix, callbackUrl fix
- `lib/auth.ts` — Added `requireAgentOwnership()`, `requireActivityOwnership()`
- `app/api/agents/route.ts` — Removed `OR user_id IS NULL` fallback
- `app/api/agents/[id]/route.ts` — Added `requireAgentOwnership` to GET/PATCH/DELETE
- `app/api/agents/[id]/start/route.ts` — Added `requireAgentOwnership`
- `app/api/agents/[id]/stop/route.ts` — Added `requireAgentOwnership`
- `app/api/agents/[id]/chat/route.ts` — Added `requireAgentOwnership`
- `app/api/agents/[id]/analytics/route.ts` — Added `requireAgentOwnership`
- `app/api/agents/[id]/status/route.ts` — Added `requireAgentOwnership` to GET
- `app/api/agents/[id]/schedule/route.ts` — Upgraded to `requireAgentOwnership`
- `app/api/activities/route.ts` — User-scoped queries via agent join
- `app/api/activities/stream/route.ts` — User-scoped SSE stream
- `app/api/activities/[id]/route.ts` — Added `requireActivityOwnership`
- `app/api/activities/[id]/approve/route.ts` — Added `requireActivityOwnership`
- `app/api/activities/[id]/reject/route.ts` — Added `requireActivityOwnership`
- `app/api/activities/[id]/modify/route.ts` — Added `requireActivityOwnership`
- `app/api/metrics/key/route.ts` — All 7 queries scoped to user's agents
- `app/api/metrics/stream/route.ts` — SSE stream scoped to user's agents
- `app/api/calls/route.ts` — `requireAgentOwnership` for POST, user-scoped GET
- `app/api/calls/[id]/summary/route.ts` — User-scoped call lookup
- `app/api/memories/search/route.ts` — `requireAgentOwnership`, requires agentId param
- `app/api/memories/store/route.ts` — `requireAgentOwnership`
- `app/api/browser/task/route.ts` — Added `requireUserId`
- `app/api/research/sessions/start/route.ts` — Added `requireAgentOwnership`
- `app/api/research/sessions/[id]/append/route.ts` — Added `requireActivityOwnership`
- `app/api/research/sessions/[id]/complete/route.ts` — Added `requireActivityOwnership`
- `app/api/skills/route.ts` — Upgraded to `requireAgentOwnership` for POST
- `app/api/telegram/send/route.ts` — Added `requireUserId`
- `app/api/telegram/setup/route.ts` — Added `requireUserId`

### Modified files (lifecycle redesign):
- `lib/db.ts` — Added `enabled: boolean` to Agent interface
- `app/api/agents/[id]/start/route.ts` — Rewritten: enable + welcome workflow
- `app/api/agents/[id]/stop/route.ts` — Rewritten: disable + schedule disable + cleanup
- `lib/scheduler/heartbeat.ts` — Added `a.enabled = true` check, decision-oriented prompt, 10-step limit
- `lib/ai/workflows/agent-workflow.ts` — Accepts `triggerType`, calls `checkAgentEnabledStep` each loop
- `lib/ai/workflows/steps.ts` — Added `checkAgentEnabledStep`
- `lib/ai/prompts.ts` — Exports `TriggerType`, four prompt variants (welcome/chat/heartbeat/manual)
- `components/chat-drawer.tsx` — Calls `/api/agents/[id]/chat` instead of `POST /api/activities`
- `app/dashboard/page.tsx` — Enabled-aware status display and toggle button

### Modified files (earlier):
- `README.md` — Complete rewrite for v2
- `CLAUDE.md` — Updated architecture docs
- `lib/ai/workflows/agent-workflow.ts` — Skills injection, provider passthrough
- `lib/ai/workflows/steps.ts` — Provider abstraction, mock-user-id removal
- `lib/db.ts` — Extended Agent interface
- `app/api/agents/route.ts` — Accepts model_provider/model_id
- `app/dashboard/page.tsx` — Analytics, nav links to Templates/Skills
- `components/create-agent-dialog.tsx` — Model tab, 4-tab layout
- `app/settings/page.tsx` — Anthropic API key configuration card
- `env.example` — Added ANTHROPIC_API_KEY

---

## Database Schema (15 Migrations)

1. **001_init.sql** — Core tables: users, agents, activities, memories, calls, tool_configs
2. **002_add_activity_types.sql** — Activity type documentation
3. **003_agent_status.sql** — Real-time agent execution status tracking
4. **004_update_activity_type_check.sql** — Expanded activity types
5. **005_add_user_input_type.sql** — user_input activity type for HITL
6. **006_add_user_message_type.sql** — user_message activity type
7. **007_fix_tool_configs_unique.sql** — Composite UNIQUE (user_id, tool)
8. **008_google_telegram.sql** — telegram_users table
9. **009_real_auth.sql** — google_id, avatar_url on users; user_id FK on agents
10. **010_agent_schedules.sql** — agent_schedules table (heartbeat/cron/interval)
11. **011_drive_references.sql** — drive_folder_id, drive_file_ids on agents
12. **012_sub_agents.sql** — parent_agent_id on agents, parent_activity_id on activities
13. **013_skills.sql** — skills TEXT[] on agents
14. **014_agent_model.sql** — model_provider, model_id on agents
15. **015_agent_enabled.sql** — `enabled BOOLEAN DEFAULT false` on agents with index
