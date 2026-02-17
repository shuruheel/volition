# Volition v2 Readiness Review

Last updated: 2026-02-17

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
| Google OAuth sign-in | Ready | Real auth, no mock |
| Onboarding flow | Ready | API key encryption works |
| Agent CRUD | Ready | Scoped to user |
| Model selection (OpenAI/Anthropic) | Ready | Per-agent provider + model |
| **Agent enable/disable lifecycle** | **Ready** | **New: `enabled` column, welcome/chat/heartbeat trigger types** |
| **Chat-triggered workflows** | **Ready** | **New: `/api/agents/[id]/chat` with atomic status claim** |
| **Trigger-aware prompts** | **Ready** | **New: welcome/chat/heartbeat/manual prompt variants** |
| **Graceful mid-workflow disable** | **Ready** | **New: `checkAgentEnabledStep` in loop** |
| Workflow execution | Ready | Durable steps, trigger-type-aware step limits |
| Research pipeline | Ready | Plan queries -> Firecrawl -> Supermemory |
| HITL approval | Ready | Email and calendar require approval |
| Activity feed + SSE | Ready | Real-time updates |
| Skills system | Ready | 6 built-in, injectable into prompts |
| Agent templates | Ready | 5 pre-built configurations |
| Heartbeat scheduler | Ready | Vercel Cron + `enabled` check + 10-step limit |
| Agent analytics | Ready | Queries activity/memory tables |
| Settings encryption | Ready | AES-GCM per-user |

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

| Issue | Impact | Workaround |
|-------|--------|-----------|
| Twilio WebSocket stream is a stub | Voice call streaming not functional | Outbound calls work, just no real-time audio streaming |
| Total Spend metric is mocked at $0 | No cost tracking | Track via provider dashboards |
| No global navigation component | Users must know page URLs or use dashboard links | Dashboard has links to Templates, Skills; each page has back-to-dashboard button |
| `typescript.ignoreBuildErrors: true` | Type errors not caught at build time | Run `pnpm lint` separately |
| No message queuing for busy agents | If agent is active, chat messages are stored but not queued for serial processing | Messages appear in context on next workflow run |
| 10-step chat workflow limit | Complex tasks requested via chat may hit the step limit | User can re-message to continue, or heartbeat picks up |

### Fixes Applied

- **Removed mock-user-id fallbacks**: All 4 instances in `steps.ts` now throw `Error('User authentication required')` instead of silently falling back to `'mock-user-id'`. Email and calendar operations require a real authenticated user.
- **Updated CLAUDE.md**: Removed outdated PGlite references, mock auth caveat, and wrong file paths. Reflects current multi-user, multi-provider architecture.
- **Agent lifecycle redesign**: Replaced start/stop (run-once) with enable/disable (persistent assistant) model. Added `enabled` column, welcome workflows, chat-triggered workflows, trigger-aware prompts, heartbeat `enabled` checks, and graceful mid-workflow disable.

---

## Files Created/Modified

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
