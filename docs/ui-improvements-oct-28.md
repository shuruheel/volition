# UI Improvements (Oct 28, 2025)

## Changes Made

### 1. Activity Card Title Change
**File:** `components/unified-activity-card.tsx`

Changed the label for `user_input` activities from "Agent Question" to "Question" for cleaner, more concise labeling.

```typescript
// Before
label: 'Agent Question',

// After
label: 'Question',
```

### 2. End Work Session Button
**File:** `components/unified-activity-card.tsx`

Replaced the previous Approve/Reject button layout with a new design that includes:
- **Send button** (primary action) - Submits answer and continues session
- **End Work Session button** (secondary action) - Allows user to gracefully end the session without answering

Key improvements:
- Buttons are now inline with the input field for better UX
- Added keyboard shortcut (Enter key) to submit answer
- Added helper text explaining the options
- "End Work Session" uses `outline` variant to de-emphasize secondary action

```tsx
<div className="flex gap-2">
  <input {...} />
  <Button size="sm">Send</Button>
  <Button size="sm" variant="outline">End Work Session</Button>
</div>
<p className="text-xs text-muted-foreground">
  Answer the question to continue, or end the work session
</p>
```

## Behavior

### When User Answers
1. Types answer in input
2. Clicks "Send" or presses Enter
3. Answer is stored in activity payload via `onModify`
4. Activity is approved via `onApprove`
5. Agent continues with the provided context

### When User Ends Session
1. Clicks "End Work Session"
2. Activity is rejected via `onReject`
3. Agent receives rejection signal
4. Research session completes with current data

## Content Storage Note

When a user ends a work session early (by clicking "End Work Session"), **all research data is already safely stored**:

- Research content is stored to **Supermemory immediately** as each `firecrawlResearch` call happens
- Session notes are appended in real-time
- No data is lost when ending early

Reference: `lib/ai/tools/firecrawl-research.ts` - `storeMarkdown` is called for each scraped result before returning.

