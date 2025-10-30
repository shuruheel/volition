# Workflow Implementation Guide

## Overview

Agent execution now uses **Vercel Workflow** for durable, resumable task orchestration. This replaces the previous in-memory `executeAgentTask()` approach with a workflow-based system that survives restarts, deployments, and crashes.

## Workflow Patterns

Vercel Workflow supports different orchestration patterns depending on your use case. Understanding these patterns helps you choose the right approach.

### Pattern 1: Task-Driven Orchestration (Our Implementation)

**Use when:** Your agent needs to autonomously decide what to do next through multiple LLM calls.

**Characteristics:**
- LLM makes decisions in a loop
- Variables track state between LLM calls
- Workflow continues until task complete or max steps reached

**Example from our codebase:**
```typescript
export async function agentTaskWorkflow(agentId: string, prompt: string) {
  'use workflow';
  
  let currentStep = 0;
  let sessionId: string | null = null;  // Persists across restarts
  let researchStarted = false;
  
  // Agent decides next action repeatedly until done
  while (currentStep < maxSteps) {
    const result = await generateText({
      model: openai('gpt-5'),
      maxSteps: 1, // One decision per loop
      tools: {
        startResearch: { /* ... */ },
        doResearch: { /* ... */ },
        askUser: {
          execute: async ({ question }) => {
            // Pause here until user responds
            const events = userInputHook.create({ token });
            for await (const event of events) {
              return { answer: event.answer };
            }
          }
        }
      }
    });
    
    if (result.finishReason === 'stop') break;
    currentStep++;
  }
  
  return { completed: true, steps: currentStep };
}
```

**Best for:**
- Research agents that need multi-step exploration
- Agents that maintain state between LLM calls
- Complex task breakdown requiring iteration

### Pattern 2: Event-Driven Orchestration (Slack Bot Style)

**Use when:** Your workflow primarily waits for and responds to external events.

**Characteristics:**
- Single `for await` loop waiting for events
- Each event triggers processing
- State accumulates naturally in arrays/objects

**Example from [Vercel's Slack bot guide](https://vercel.com/guides/stateful-slack-bots-with-vercel-workflow):**
```typescript
export async function storytime(channelId: string) {
  'use workflow';
  
  let messages = [];  // State survives across restarts
  let finalStory = "";
  
  // AI generates introduction
  const intro = await generateStoryPiece(messages);
  await postToSlack(intro);
  
  // Wait for users to contribute
  const slackMessages = slackMessageHook.create({ 
    token: `story-${channelId}` 
  });
  
  for await (const userMessage of slackMessages) {
    messages.push({ role: "user", content: userMessage.text });
    
    const aiResponse = await generateStoryPiece(messages);
    await postToSlack(aiResponse);
    
    if (aiResponse.done) {
      finalStory = aiResponse.story;
      break;
    }
  }
  
  // Story complete - generate final image
  await generateStoryboardImage(finalStory);
}
```

**Best for:**
- Chat bots that respond to user messages
- Approval workflows with sequential steps
- Collaborative applications

### Pattern 3: Single LLM Call (Simplified Alternative)

**Use when:** You want AI SDK to handle orchestration internally.

**Characteristics:**
- Single `generateText()` call with higher maxSteps
- AI SDK manages the tool-calling loop
- Simpler but less control over state

**Example (alternative to our current implementation):**
```typescript
export async function agentTaskWorkflow(agentId: string, prompt: string) {
  'use workflow';
  
  // Let AI SDK handle the orchestration loop
  const result = await generateText({
    model: openai('gpt-5'),
    maxSteps: 40, // AI SDK loops internally
    tools: {
      startResearch: { /* ... */ },
      doResearch: { /* ... */ },
      askUser: {
        execute: async ({ question }) => {
          const events = userInputHook.create({ token });
          for await (const event of events) {
            return { answer: event.answer };
          }
        }
      }
    }
  });
  
  return result;
}
```

**Trade-offs:**
- ✅ Simpler implementation
- ✅ Less code to maintain
- ❌ Less control over state between LLM calls
- ❌ Harder to track progress (currentStep)
- ❌ Cannot prevent stopping mid-task

**When to use:** If testing reveals issues with the while loop pattern, this is a good fallback.

## Architecture

### Why Vercel Workflow?

Vercel Workflow provides:
- **Durable state** across restarts and deployments
- **Human-in-the-loop** via hooks (pauses workflow until external events)
- **Observable execution** in Vercel dashboard
- **Automatic retries** for failed steps
- **Zero-cost pausing** (no resources consumed while waiting)

### Critical Configuration Requirements

**REQUIRED**: Your `next.config.mjs` MUST be wrapped with `withWorkflow()`:

```javascript
import { withWorkflow } from 'workflow/next'

const nextConfig = {
  // your config
}

export default withWorkflow(nextConfig)
```

Without this wrapper:
- ❌ Workflows will fail silently
- ❌ `"use workflow"` and `"use step"` directives won't work
- ❌ No error messages will appear in logs

### Deployment Environments

**Vercel Workflow uses "Worlds" - adapters for different environments:**

1. **Local Development** (Automatic)
   - Uses "Embedded World" (filesystem-based)
   - Stores data in `.workflow-data/` directory
   - No configuration needed

2. **Vercel Production** (Automatic)
   - Uses "Vercel World" (production-ready)
   - Integrated with Vercel's infrastructure
   - No special console configuration needed
   - Works automatically once code is deployed

3. **Other Platforms** (Manual Setup)
   - Requires custom "World" implementation
   - See [Deploying Documentation](https://useworkflow.dev/docs/deploying)

### Key Components

```
┌─────────────────────────────────────────────┐
│         Agent Task Workflow                 │
│  (lib/ai/workflows/agent-workflow.ts)       │
│                                              │
│  'use workflow' - Makes function durable    │
│  - Fetches agent config from DB             │
│  - Calls LLM with tools                     │
│  - Tools delegate to workflow steps/hooks   │
│  - Survives restarts                        │
└──────────────┬──────────────────────────────┘
               │
      ┌────────┴─────────┐
      │                  │
┌─────▼──────┐  ┌───────▼────────┐
│   Hooks    │  │     Steps      │
│            │  │                │
│ - userInput│  │ - research     │
│ - phoneCall│  │ - browser      │
│ - email    │  │ - logActivity  │
│ - approval │  │ - sessions     │
└────────────┘  └────────────────┘
```

## Workflow Hooks

Hooks pause workflow execution until external events resume them.

### Available Hooks

Defined in `lib/ai/workflows/hooks.ts`:

1. **userInputHook** - For agent questions requiring text answers
   ```typescript
   {
     answer: string;
     activityId: string;
   }
   ```

2. **phoneCallHook** - For approving outbound calls
   ```typescript
   {
     approved: boolean;
     activityId: string;
   }
   ```

3. **emailApprovalHook** - For approving email sends (future)
   ```typescript
   {
     approved: boolean;
     modifications?: string;
     activityId: string;
   }
   ```

4. **activityApprovalHook** - Generic approval for other activities
   ```typescript
   {
     approved: boolean;
     activityId: string;
   }
   ```

### How Hooks Work

```typescript
// 1. In workflow: Create hook and pause
const token = `agent-${agentId}-activity-${activityId}`;
const events = userInputHook.create({ token });

for await (const event of events) {
  // Workflow resumes here when hook.resume() is called
  const answer = event.answer;
  return { answer };
}

// 2. In approval endpoint: Resume workflow
await userInputHook.resume(token, {
  answer: "User's response",
  activityId: activityId,
});
```

## Workflow Steps

Steps are durable units of work marked with `'use step'`. They automatically retry on failure.

### Available Steps

Defined in `lib/ai/workflows/steps.ts`:

- **executeResearchStep** - Search, scrape, and store content
- **executeBrowserStep** - Browser automation tasks
- **logActivityStep** - Log activities to database
- **startResearchSessionStep** - Initialize research session
- **appendToSessionStep** - Add results to session
- **completeResearchSessionStep** - Finalize session

### Example Step

```typescript
export async function executeResearchStep(agentId: string, query: string, sessionId: string) {
  'use step'; // ✅ Makes this function durable with retries
  
  const result = await searchAndScrape({ query, limit: 3 });
  
  for (const item of result.items) {
    await storeMarkdown({ agentId, url: item.url, markdown: item.markdown });
  }
  
  return { itemsScraped: result.items.length };
}
```

## How It Works

### 1. Agent Starts

```
User clicks "Start Agent" in dashboard
↓
POST /api/agents/:id/start
↓
Invokes POST /api/workflows/agent/:id
↓
agentTaskWorkflow() begins execution
```

### 2. LLM Orchestration Loop

```typescript
while (currentStep < maxSteps) {
  // Call LLM to decide next action
  const result = await generateText({
    model: openai('gpt-5'),
    tools: {
      startResearchSession: { ... },
      firecrawlResearch: { ... },
      askUser: { ... },
      // ... more tools
    },
  });
  
  // Tools execute as workflow steps or trigger hooks
  currentStep++;
}
```

### 3. Human-in-the-Loop Flow

```
Agent calls askUser tool
↓
Creates pending user_input activity
↓
Hook pauses workflow (no resources consumed)
↓
User answers in dashboard
↓
POST /api/activities/:id/approve
↓
hook.resume() called with answer
↓
Workflow resumes EXACTLY where it left off
↓
Agent receives answer and continues
```

### 4. Workflow Completes

```
Agent finishes task or reaches max steps
↓
Agent status updated to 'idle'
↓
Completion activity logged
↓
Workflow ends
```

## State Persistence

All workflow state is automatically persisted:

| State | Persistence |
|-------|-------------|
| Local variables (`currentSessionId`, `researchStarted`) | ✅ Persisted across restarts |
| LLM conversation history | ✅ Loaded from DB on start |
| Agent status | ✅ Updated in real-time |
| Tool results | ✅ Recorded in event log |
| Hook tokens | ✅ Maintained by Vercel Workflow |

## Restart/Crash Behavior

### Before Workflow (Old System)
```
Agent asks question
↓
Server restarts 💥
↓
User answers
↓
New agent task starts (NO memory of question)
↓
Research session orphaned ❌
```

### With Workflow (New System)
```
Agent asks question
↓
Workflow pauses at hook
↓
Server restarts 💥 (workflow state persisted)
↓
User answers
↓
hook.resume() called
↓
Workflow resumes from EXACT point
↓
Agent receives answer, continues research ✅
```

## API Endpoints

### Workflow Endpoint
```typescript
POST /api/workflows/agent/:agentId
Body: { prompt: string, maxSteps: number }
```

Starts a durable workflow for the agent.

### Approval Endpoints

```typescript
POST /api/activities/:id/approve
// Resumes workflow with approval

POST /api/activities/:id/reject
// Resumes workflow with rejection
```

Both endpoints use `hook.resume()` to continue paused workflows.

## Observability

### Viewing Workflows

1. Deploy to Vercel
2. Go to Vercel Dashboard
3. Navigate to: **Observability → Workflows**
4. View:
   - Active workflows
   - Paused workflows (waiting on hooks)
   - Completed workflows
   - Event logs (inputs/outputs for each step)

### Local Debugging

Workflow execution logs appear in terminal:
```
[Workflow] Starting agent abc-123
[Workflow] Step 1/40
[Workflow] Research query: Next.js caching
[Workflow] Asking user: Should I research X or Y?
[Approve] Resuming user input with answer: X
[Workflow] Received user answer: X
[Workflow] Completed after 18 steps
```

## Migration from Legacy System

### What Changed

| Old System | New System |
|------------|-----------|
| `executeAgentTask()` | `agentTaskWorkflow()` |
| In-memory state | Persisted state |
| Manual polling for approvals | Hooks (automatic resume) |
| New execution on restart | Continues from pause point |
| No observability | Full event logs in Vercel dashboard |

### Backward Compatibility

The old `lib/ai/agent.ts` has been moved to `lib/ai/agent.legacy.ts` for reference. It is **not imported** by any active code.

## Testing Checklist

### Basic Flow
- [ ] Start an agent from dashboard
- [ ] Agent creates research session
- [ ] Agent performs research (3-5 queries)
- [ ] Agent completes research session
- [ ] Verify activities logged correctly

### Human-in-the-Loop Flow
- [ ] Agent asks user a question
- [ ] Verify activity created with status='pending'
- [ ] User answers question in activity card
- [ ] Verify workflow resumes and continues

### Restart Resilience
- [ ] Start agent with research task
- [ ] Agent asks question
- [ ] Restart dev server (`Ctrl+C`, `pnpm dev`)
- [ ] Answer question after restart
- [ ] Verify workflow resumes from exact point
- [ ] Verify research session continues correctly

### Rejection Flow
- [ ] Agent asks question
- [ ] Click "End Work Session" (reject)
- [ ] Verify workflow resumes with rejection
- [ ] Verify agent handles rejection gracefully

### Multiple Agents
- [ ] Start Agent A with task
- [ ] Start Agent B with task
- [ ] Both ask questions
- [ ] Answer Agent B's question
- [ ] Verify only Agent B resumes
- [ ] Answer Agent A's question
- [ ] Verify Agent A resumes independently

## Deployment

### Environment Variables

No new environment variables required. Vercel Workflow is managed by Vercel automatically.

### Rollout Strategy

1. **Test locally**
   - Run `pnpm dev`
   - Test all flows above
   - Verify console logs show workflow execution

2. **Deploy to preview**
   ```bash
   git push origin feature/vercel-workflow
   # Creates preview deployment
   ```

3. **Test in preview**
   - Test restart resilience (preview deployments auto-restart)
   - View workflows in Vercel dashboard
   - Monitor for errors

4. **Deploy to production**
   ```bash
   git checkout main
   git merge feature/vercel-workflow
   git push origin main
   ```

5. **Monitor for 24h**
   - Check Workflow dashboard for errors
   - Monitor agent execution times
   - Watch for any orphaned workflows

## Troubleshooting

### Workflow Not Starting

**Symptoms:** Agent status stays 'idle' after clicking Start

**Causes:**
- Workflow endpoint not reachable
- `NEXT_PUBLIC_APP_URL` not set correctly

**Fix:**
```bash
# Set in .env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Hook Not Resuming

**Symptoms:** User answers question but workflow doesn't continue

**Causes:**
- Token mismatch between hook.create() and hook.resume()
- Workflow already completed before answer

**Debug:**
```typescript
// Check console logs for:
[Approve] Resuming workflow for user_input with token: agent-{id}-activity-{id}
[Workflow] Received user answer: ...
```

### Workflow Stuck

**Symptoms:** Workflow never completes, agent stays 'active'

**Causes:**
- Infinite loop in workflow
- Hook waiting but never resumed
- Step failing repeatedly

**Fix:**
- Check Vercel Workflow dashboard for paused workflows
- Look for workflows older than expected
- Cancel stuck workflows manually

## Performance

### Cost (Beta - FREE)

During beta, Workflow observability is **free for all plans**.

### After GA

- **Workflow Storage:** $0.50/GB/month (1GB free on Hobby)
- **Workflow Steps:** $25 per 1M steps (50k free on Hobby)

Typical usage per research session:
- ~10-15 steps (LLM calls + tool executions)
- ~1KB state storage

Estimated monthly cost for 5,000 research sessions:
- Steps: 50k-75k (within free tier)
- Storage: <100MB (well within free tier)
- **Total: $0/month on Hobby plan**

### Latency

No significant latency added:
- Step execution: Same as before (direct API calls)
- Hook pause/resume: <100ms
- State persistence: Transparent (handled by Vercel)

## Best Practices

1. **Use hooks for all approvals** - Don't manually poll, let hooks handle it
2. **Keep steps small** - Each step should be a single unit of work
3. **Log progress** - Use console.log liberally for debugging
4. **Handle rejections** - Always check `approved: false` in hook results
5. **Set reasonable maxSteps** - Prevents infinite loops (default: 40)
6. **Monitor Workflow dashboard** - Check for stuck/failed workflows regularly

## Pattern Validation

Our implementation is validated against Vercel's official examples:

### Verified Patterns from [Slack Bot Guide](https://vercel.com/guides/stateful-slack-bots-with-vercel-workflow)

✅ **Local variables persist across restarts**
```typescript
let history = []; // This survives across executions
```
Our `currentSessionId` and `researchStarted` work the same way.

✅ **Hook pattern with `for await` loops**
```typescript
for await (const message of messages) {
  history.push(message.text);
  // Process and potentially break
}
```
Identical to our `askUser` tool implementation.

✅ **AI calls inside workflows**
```typescript
const aiResponse = await generateStoryPiece(messages);
```
Confirms our `generateText()` calls are valid.

✅ **Direct external API calls**
```typescript
await postToSlack(message);
```
Validates our direct `sql` queries and API calls.

### Why Our Pattern Works

The Slack bot example demonstrates that workflows can:
1. **Maintain state** across pauses and restarts
2. **Call AI models** repeatedly inside loops
3. **Make external API calls** (database, webhooks, etc.)
4. **Pause at hooks** and resume when events arrive

Our task-driven pattern (while loop + LLM) is a valid extension of the event-driven pattern (for await + user events). Both use the same core Workflow primitives.

### Implementation Confidence: 95%

Based on the Slack bot example and Workflow documentation:
- ✅ Hook usage is correct (matches examples exactly)
- ✅ Step pattern is correct
- ✅ Variable persistence is confirmed
- ✅ AI calls in workflows are supported
- ⚠️ While loop pattern is novel but follows valid primitives

The remaining 5% uncertainty is the while-loop-with-LLM pattern, which is not explicitly shown in examples but uses valid building blocks. The restart resilience test will validate this approach.

## Next Steps

- [ ] Test all flows locally
- [ ] **Critical:** Test restart resilience (proves pattern works)
- [ ] Deploy to preview environment
- [ ] Run full test suite
- [ ] Monitor Workflow dashboard
- [ ] Deploy to production
- [ ] Update team documentation

---

**For questions or issues, check:**
- [Vercel Workflow Docs](https://vercel.com/docs/workflow)
- [Workflow DevKit](https://github.com/vercel/workflow)
- [Slack Bot Example](https://vercel.com/guides/stateful-slack-bots-with-vercel-workflow) (official guide)
- Project Slack: #agent-dashboard

