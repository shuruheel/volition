# Root Cause Analysis: Research Sessions Not Working

## Critical Issues Discovered

### Issue #1: Session ID Not Automatically Tracked ⚠️

**Problem:**
The `firecrawlResearch` tool requires the model to manually pass `session_id` from the previous `startResearchSession` result. This creates a memory burden on the model:

1. Model calls `startResearchSession` → Returns `{ success: true, session_id: "abc-123" }`
2. Model must **remember** this session_id
3. Model must **manually pass** it to `firecrawlResearch({ session_id: "abc-123", query: "..." })`

This is asking too much! The model often forgets or decides not to pass it.

**Evidence in Code:**
```typescript
// lib/ai/tools/firecrawl-research.ts
inputSchema: z.object({
  session_id: z.string().optional(), // ⚠️ Model must pass this manually!
  // ...
})
```

**Fix:**
Make session_id truly optional and auto-detect the current active session from agent context.

---

### Issue #2: prepareStep Only Fires Once 🚫

**Problem:**
The `prepareStep` nudge only fires immediately after session creation, but:

```typescript
// lib/ai/agent.ts
if (currentSessionId && !kickoffHintGiven) {
  kickoffHintGiven = true; // ⚠️ Set to true, never fires again
  return { messages: [...] };
}
```

If the model STILL doesn't call `firecrawlResearch` after that one nudge, there's no follow-up enforcement.

**Why This Fails:**
- Model gets ONE chance to follow the nudge
- If it decides to stop anyway, game over
- No mechanism to re-nudge or check progress

---

### Issue #3: Fallback Runs AFTER Agent Completes ⏰

**Problem:**
The kickoff fallback logic runs after `generateText` completes:

```typescript
const result = await generateText({ ... });

// ⚠️ This runs AFTER the agent has already stopped!
if (currentSessionId) {
  const activity = await fetch(`/api/activities/${currentSessionId}`);
  // Check if notes are empty, run fallback...
}
```

By the time this runs, the agent has already finished its execution. It's like trying to steer a car that's already parked.

**What Happens:**
1. Agent creates session
2. Agent stops (didn't do research)
3. Fallback kicks in and does ONE research call
4. But the agent is already done - no iterative loop

---

## Why The Enhanced Descriptions Aren't Enough

The tool descriptions and system prompt improvements ARE valuable, but they're **fighting against implementation issues**:

- ✅ Better descriptions help the model **understand** what to do
- ❌ But poor tooling makes it **difficult** to actually do it
- ❌ Manual session_id tracking is cognitive overhead
- ❌ One-time nudge doesn't enforce continuation
- ❌ Post-run fallback is too late

**Analogy:**
It's like writing perfect assembly instructions (documentation) for a car that has a broken steering wheel (implementation).

---

## The Real Root Causes

### 1. **State Management is Manual**
- Session tracking should be automatic
- Model shouldn't need to remember and pass session_id
- Context should maintain "current active session"

### 2. **No Mid-Run Enforcement**
- One nudge isn't enough
- Need continuous checking: "Did research happen yet?"
- Should inject reminders every N steps if session is still empty

### 3. **Timing Issues**
- Fallback runs too late (post-completion)
- Should run mid-execution as a watchdog
- Need real-time intervention, not retrospective fixes

---

## Sustainable Fixes (Implementation Changes)

### Fix #1: Auto-Track Session in Context (HIGH PRIORITY)

Make session_id fully automatic:

```typescript
// In agent.ts - track currentSessionId
let currentSessionId: string | null = null;

// In firecrawlResearch tool - auto-inject session_id
execute: async ({ query, limit, session_id: providedSessionId }, context) => {
  const ctx = context.experimental_context as { 
    agentId?: string; 
    currentSessionId?: string; // ← Pass via context
  };
  
  // Use provided session_id OR auto-detect from context
  const sessionId = providedSessionId || ctx?.currentSessionId;
  
  if (sessionId) {
    // Append to session automatically
  }
}
```

**Benefits:**
- Model doesn't need to remember session_id
- Reduces cognitive load
- Makes research flow automatic

---

### Fix #2: Continuous Nudging (MEDIUM PRIORITY)

Check session progress on every step:

```typescript
prepareStep: async ({ steps }) => {
  // First nudge after session creation
  if (currentSessionId && !kickoffHintGiven) {
    kickoffHintGiven = true;
    return { messages: [...] };
  }
  
  // ✨ NEW: Mid-run check
  if (currentSessionId && currentStep > 3 && !researchStarted) {
    // If 3+ steps have passed and no firecrawlResearch called yet
    return {
      messages: [{
        role: 'system',
        content: `WARNING: Research session ${currentSessionId} has no research yet! You MUST call firecrawlResearch now.`
      }]
    };
  }
  
  return {};
}
```

**Benefits:**
- Catches stalled sessions mid-run
- Gives model multiple chances to course-correct
- Prevents premature completion

---

### Fix #3: Track Research Progress (MEDIUM PRIORITY)

Add a flag to track if any research has happened:

```typescript
let researchStarted = false;

onStepFinish: async ({ toolCalls }) => {
  // Track if firecrawlResearch was called
  if (toolCalls.some(tc => tc.toolName === 'firecrawlResearch')) {
    researchStarted = true;
  }
}
```

Use this in `stopWhen` or validation logic.

---

### Fix #4: Optional - Merge Tools (LOW PRIORITY)

Consider merging session creation + first research:

```typescript
startResearchSession({
  title: string;
  initialQuery?: string; // ← NEW: Auto-run first search
})
```

If `initialQuery` provided, automatically:
1. Create session
2. Run firecrawlResearch with that query
3. Return results + session_id

This eliminates the window for premature stopping entirely.

---

## Implementation Priority

### Phase 1 (MUST DO):
1. ✅ Auto-track session_id in context and pass to firecrawlResearch
2. ✅ Add mid-run nudging when session is empty after N steps
3. ✅ Track researchStarted flag to monitor progress

### Phase 2 (NICE TO HAVE):
4. Consider merging startResearchSession + first firecrawlResearch
5. Add telemetry for abandoned sessions
6. Create dashboard for session health monitoring

---

## Expected Outcome After Fixes

✅ **Session_id flows automatically** - Model doesn't need to remember it  
✅ **Mid-run intervention** - System nudges if no research after 2-3 steps  
✅ **Progress tracking** - System knows if research has started  
✅ **Higher success rate** - Combined with better descriptions, should work  

---

## Why This Is Different From Previous Fixes

**Previous approach (Phase 1):**
- Enhanced descriptions ✅
- Improved system prompt ✅
- Added one-time nudge ✅
- Fixed SSE errors ✅

**This approach (Phase 2):**
- Fix state management (session_id tracking)
- Add continuous enforcement (mid-run checks)
- Track progress (researchStarted flag)
- Remove friction (automatic context passing)

**Combined Effect:**
- Phase 1 teaches the model WHAT to do
- Phase 2 makes it EASY to actually do it
- Together: Model understands AND can execute successfully

---

**Conclusion:**
The enhanced descriptions were necessary but not sufficient. The implementation has fundamental issues that prevent the workflow from succeeding even when the model understands what to do.

Next: Implement Phase 1 fixes to address state management and mid-run enforcement.

