# Agent Dashboard – Current State (after HITL, Chat, SSE, and Planner)

Last updated: now

## Summary
The app now supports a complete Human-in-the-Loop (HITL) flow, real chat backed by activities, server-sent events (SSE) for live updates, iterative agent planning, and improved research persistence. The agent uses gpt-5-2025-08-07 with a planner tool to continue multi-step research, and the browser integration was hardened with longer, non-throwing timeouts and domain allowlists.

## Key Changes
- Model: gpt-5-2025-08-07 for stronger tool calling and planning.
- HITL: Agents create pending activities (createPendingActivity, askUser), and the UI supports approve/modify/reject. Approved user answers resume agents.
- Chat: Backed by DB activities (user_input, user_message, research acks). Auto-opens on new pending question. Messages and answers persist.
- Context injection: Agent receives last 20 chat turns plus recent research context each run, preventing repeats.
- Planner-in-the-loop: New planNextStep tool forces explicit next-step selection (browserTask | askUser | stop) between actions.
- Research: Browser output is summarized into concrete bullet points with URLs when present; saved to Supermemory and logged as a research activity only when meaningful content exists.
- Browser-Use: Endpoint waits up to 120s without throwing; returns 202 pending on timeout. Tool supports allowedDomains to speed navigation and avoid detours.
- Live updates: SSE endpoints for activities and key metrics; dashboard subscribes for real-time UI updates.

## Files of Interest
- Agent and Tools
  - `lib/ai/agent.ts` – Orchestration (gpt-5-2025-08-07), messages history + research context, tool registration, step handling.
  - `lib/ai/tools/plan-next-step.ts` – Planner tool schema and echo.
  - `lib/ai/tools/browser-task.ts` – Research executor, content summarizer (uses gpt-4o-mini), only logs activity if content is meaningful; supports allowedDomains.
  - `lib/ai/prompts.ts` – HITL + Iterative Research + Planner + Timeout handling guidance.
  - `lib/ai/chat-history.ts` – Builds last 20 turns from activities.
  - `lib/ai/research-context.ts` – Packs recent research results to steer continuation and avoid repeats.

- APIs
  - Activities
    - `app/api/activities/route.ts` – List/create activities.
    - `app/api/activities/[id]/approve/route.ts` – Approve (resumes agent after user_input).
    - `app/api/activities/stream/route.ts` – SSE stream of new activities (filters research to chat acks for chat use).
  - Agents
    - `app/api/agents/[id]/start/route.ts` – Starts background execution (step budget now 40); rich status updates.
  - Browser Use
    - `app/api/browser/task/route.ts` – Create task; wait non-throwing up to 120s; returns 200 with output or 202 pending; accepts { allowedDomains }.
  - Metrics
    - `app/api/metrics/key/route.ts` – Point fetch for dashboard.
    - `app/api/metrics/stream/route.ts` – SSE stream for live metrics.

- UI
  - `app/dashboard/page.tsx` – Subscribes to SSE for activities/metrics; auto-opens chat once per pending question.
  - `components/chat-drawer.tsx` – Uses SSE to stream chat-related activities; sends answers to pending user_input or creates user_message.

## Current Behavior
- Starting an agent updates live status and begins a single session with up to 40 steps.
- The model alternates between tools and planNextStep. If a browser task times out or returns pending, the planner pivots (e.g., new source or constrained domain) rather than stopping.
- Research results:
  - Output summarized (8–12 concise bullets) with inferred URLs.
  - Memory stored via `/api/memories/store`.
  - Activity card created only when content is substantive (summary length/links heuristic).
- Chat & HITL:
  - Agent asks via askUser or question fallback; dashboard and chat auto-surface the pending question.
  - Approving with an answer acknowledges in chat and resumes the agent.
- Live metrics and feed update in real time via SSE.

## Configuration
- Env vars (excerpt)
  - `OPENAI_API_KEY`
  - `DATABASE_URL`, `DATABASE_URL_POOLED`
  - `SUPERMEMORY_API_KEY`
  - `BROWSER_USE_API_KEY`
  - `NEXT_PUBLIC_APP_URL`
- Browser Use
  - API accepts: `{ task, maxSteps=10, wait=true, timeoutMs=120000, allowedDomains?: string[] }`.
  - Tool accepts: `{ task, maxSteps, allowedDomains }` and passes through.

## Known Limitations / Observations
- Browser-Use may still take long on sites with heavy client JS, interstitials, or rate-limits. Domain allowlisting and smaller `maxSteps` help.
- Link extraction is best-effort (regex and model summarization). For fully structured extraction, consider schema-guided extraction or a dedicated crawler.
- Planner’s continuation relies on prompt adherence; pathological cases may still stop early if the model declares “stop” with exitReason. Raising step budget or adding a minimum number of cycles in the prompt can help.
- Activities SSE streams only “chat-relevant” research (acks) for chat; the dashboard subscribes to a broader activity stream.

## Validation Checklist (manual)
- Start agent → inline status updates appear; Active Tasks increments, then returns to 0.
- Pending `user_input` auto-opens chat and shows question; answering approves and resumes agent.
- Research results create an activity with content-based bullets and URLs when meaningful; memory count increases.
- Dashboard metrics and activity feed update without refresh (SSE).

## Suggested Next Steps
- Search-first research tools (faster than headless browsing):
  - Firecrawl API tool
    - Pros: Focused crawling, structured extraction, faster page access, API retries.
    - Tool: `firecrawlSearch` (query → urls, content), `firecrawlCrawl` (url → sections, metadata). Integrate into planner as an alternative nextAction.
  - Perplexity Search API tool
    - Pros: Rapid aggregation across sources; great for lead discovery before deep extraction.
    - Tool: `perplexitySearch` (query → citations+snippets). Planner can use it to find initial leads, then `browserTask` only for targeted pages.
- Reliability
  - Add exponential backoff and source rotation when repeated timeouts occur.
  - Add minimal per-step “evidence ledger” (DB table or activity subtype) to avoid revisiting the same URL.
- UX
  - Show `liveUrl` and extracted links inline on the research activity card.
  - Add a toggle to pause/resume live SSE updates for low-noise demos.

## Appendix – Interfaces
- Planner tool output
```json
{
  "nextAction": "browserTask" | "askUser" | "stop",
  "task": "Open X and extract Y...",
  "reason": "Why this is next",
  "exitReason": "Why we stopped"
}
```

- Browser task POST (server)
```json
{
  "task": "Visit ... and extract ...",
  "maxSteps": 10,
  "wait": true,
  "timeoutMs": 120000,
  "allowedDomains": ["thinkingmachines.ai"]
}
```

- Research activity payload (example)
```json
{
  "title": "Research result",
  "description": "• Bullet 1 (https://...)\n• Bullet 2 (https://...) ...",
  "task": "Go to ...",
  "liveUrl": "https://...",
  "links": ["https://...", "https://..."]
}
```


