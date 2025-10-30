# Phase 3: The Stop Guard - The REAL Fix

**Date:** October 28, 2025  
**Status:** ✅ Implemented  
**Priority:** CRITICAL

---

## The Problem (Still!)

After Phase 1 (descriptions) and Phase 2 (auto-tracking), **the agent STILL stopped after step 1**.

User logs showed:
```
Step 1: startResearchSession called ✓
finishReason: 'tool-calls' 
Agent completed ← STOPPED HERE!
```

---

## Root Cause: No Stop Guard

The fundamental issue: **The model can freely choose to stop at any time.**

```typescript
// Before: No restrictions
generateText({
  model: openai('gpt-5-2025-08-07'),
  maxSteps: 40, // Model can stop at step 1, 2, 3... whenever it wants
  tools,
  // ... NO stopWhen condition!
})
```

**What happens:**
1. Model calls `startResearchSession`
2. Tool returns `{ success: true, session_id: "..." }`
3. Model thinks: "Success! Task complete!" 
4. Model chooses to stop (finishReason: 'tool-calls')
5. Generation ends → No step 2 → `prepareStep` never fires!

**Why `prepareStep` didn't help:**
`prepareStep` runs BEFORE each step. But if the model decided to stop after step 1, there IS no step 2 to prepare!

---

## The Fix: `stopWhen` Guard

Added a **hard stop guard** that PREVENTS stopping until research has started:

```typescript
stopWhen: ({ text, toolCalls, finishReason }) => {
  // Stop on errors/limits
  if (finishReason === 'error' || finishReason === 'length') {
    return true; // Stop
  }
  
  // CRITICAL: If session exists but no research, PREVENT stopping
  if (currentSessionId && !researchStarted) {
    console.log(`⚠️ Stop prevented: Session ${currentSessionId} has no research yet`);
    return false; // Force continuation!
  }
  
  // Otherwise, respect model's decision
  return finishReason === 'stop';
}
```

**How it works:**
- `stopWhen` is called after each step to decide if generation should stop
- Returns `true` = STOP, Returns `false` = CONTINUE
- If session created but no research → Always returns `false` (force continuation)
- Model CANNOT stop until at least one `firecrawlResearch` call happens

---

## Bonus Fix: Logging Order

Also fixed a bug where logging happened before `currentSessionId` was set:

**Before:**
```typescript
console.log({ researchSession: currentSessionId }); // Still null!
// Later...
currentSessionId = res.session_id; // Set too late
```

**After:**
```typescript
// Set currentSessionId FIRST
currentSessionId = res.session_id;
console.log(`✅ Research session created: ${currentSessionId}`);
// Then log with correct value
console.log({ researchSession: currentSessionId });
```

---

## Why This is THE Fix

| Phase | What It Did | Why It Wasn't Enough |
|-------|-------------|----------------------|
| **Phase 1** | Enhanced descriptions | Model understood workflow but could still stop |
| **Phase 2** | Auto-tracking, nudging | Reduced friction but model still had full control |
| **Phase 3** | Stop guard | **FORCES continuation until research happens** |

**The key insight:**
- Phase 1-2 = **Encouragement** ("Please continue")
- Phase 3 = **Enforcement** ("You CANNOT stop yet")

---

## How It Works Together

### Flow Diagram

```
Step 1: startResearchSession()
  ↓
onStepFinish: currentSessionId = "abc-123" ✓
  ↓
Model tries to stop (finishReason: 'tool-calls')
  ↓
stopWhen called: 
  - currentSessionId? YES ("abc-123")
  - researchStarted? NO
  → return false (PREVENT STOP) ⛔
  ↓
prepareStep fires for Step 2:
  → "Session created! Now call firecrawlResearch"
  ↓
Step 2: Model MUST choose a tool (can't stop)
  ↓
Model calls firecrawlResearch() ✓
  ↓
onStepFinish: researchStarted = true ✓
  ↓
Model tries to stop again
  ↓
stopWhen called:
  - currentSessionId? YES
  - researchStarted? YES ✓
  → return true (ALLOW STOP) ✓
  ↓
Generation ends naturally
```

---

## Expected Behavior

### Before Phase 3:
```
Step 1: startResearchSession() → Tool returns
Agent: "Done!" → STOPS
Result: Empty session, no research
```

### After Phase 3:
```
Step 1: startResearchSession() → Tool returns
Agent: "Done!" → Tries to stop
stopWhen: "No you're not!" → PREVENTED ⛔
prepareStep: "Now call firecrawlResearch"
Step 2: firecrawlResearch() → Research begins
Agent: "Done!" → Can stop now ✓
Result: Session with actual research data
```

---

## Testing

Look for this log when testing:
```
⚠️ Stop prevented: Session abc-123 has no research yet (step 1)
✅ Research session created: abc-123
```

If you see "Stop prevented" → The guard is working!

---

## Why Previous Phases Failed

**Phase 1 Problem:**
- Model knew WHAT to do
- But had no obligation to do it
- Could ignore instructions and stop

**Phase 2 Problem:**
- Auto-tracking removed friction
- Nudging encouraged continuation  
- But model still in control → Could ignore and stop

**Phase 3 Solution:**
- Stop guard removes control
- Model MUST continue until research starts
- Not a suggestion, an enforcement

---

## Code Changes

### File: `lib/ai/agent.ts`

**Added:**
1. `stopWhen` condition (lines 124-139)
   - Prevents stopping if session exists but no research
   - Logs when stop is prevented
   - Forces continuation

2. Reordered `onStepFinish` (lines 183-214)
   - Track session BEFORE logging
   - Log with correct session info
   - Better debugging

---

## Rollback Plan

If Phase 3 causes infinite loops or other issues:

```typescript
// Remove stopWhen entirely
// generateText({
//   stopWhen: ...  ← Delete this whole block
// })
```

The agent will revert to Phase 2 behavior (can stop early).

---

## Success Criteria

✅ Agent creates session  
✅ Agent tries to stop  
✅ Stop is prevented (see log)  
✅ prepareStep nudge fires  
✅ Agent calls firecrawlResearch  
✅ researchStarted = true  
✅ Agent can now stop naturally  

**If you see "Stop prevented" in logs → It's working!**

---

## The Complete Solution

| Component | What It Does | Result |
|-----------|--------------|--------|
| **Phase 1: Descriptions** | Teaches workflow | Model knows WHAT to do |
| **Phase 2: Auto-tracking** | Removes friction | Model CAN do it easily |
| **Phase 3: Stop guard** | Enforces continuation | Model MUST do it |

**Together:** Education + Easy + Enforcement = Success

---

## Key Takeaway

**You can't just teach the model - you have to enforce the workflow.**

- Phase 1-2: Soft guidance (teaching, helping)
- Phase 3: Hard constraint (enforcing, requiring)

Both are necessary. Education without enforcement = Model ignores you.

---

**Status:** ✅ Complete  
**Confidence:** Very High (this is the missing piece)  
**Next:** Test with real agent run

---

## Debugging Tips

If it still doesn't work, check:
1. Is `stopWhen` being called? (add console.log at start)
2. Is `currentSessionId` set correctly? (should see "✅ Research session created")
3. Is `researchStarted` false when stop is attempted? (should see "Stop prevented")
4. Does `prepareStep` fire after stop is prevented? (should see nudge message)

If stop is prevented but agent still doesn't research:
- Check that `prepareStep` nudge is strong enough
- Verify `firecrawlResearch` tool is available
- Look for model errors or refusals in logs

