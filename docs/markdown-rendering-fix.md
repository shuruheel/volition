# Markdown Rendering Fix for Agent Questions

**Date:** October 28, 2025  
**Issue:** Agent questions displayed as one giant unformatted paragraph  
**Status:** ✅ Fixed

---

## Problem

When the agent asked questions (via `user_input` activities), the text was rendered as plain text in a single `<p>` tag, making long research summaries with bullet points, citations, and formatting completely unreadable.

Example: The agent provided a comprehensive research summary with:
- Multiple sections
- Bullet points
- Citations with URLs
- Numbered lists

But it all appeared as one giant wall of text.

---

## Root Cause

In `unified-activity-card.tsx` and `chat-drawer.tsx`, the `user_input` question was rendered as plain text:

```typescript
// Before (unified-activity-card.tsx line 280)
<p className="text-sm">{question}</p>  // ← Plain text!

// Before (chat-drawer.tsx line 238)
<p className="text-sm">{message.content}</p>  // ← Plain text!
```

Meanwhile, `research` activities correctly used ReactMarkdown for summaries.

---

## Solution

Added markdown rendering to agent questions in both components:

### 1. unified-activity-card.tsx

```typescript
// After
case 'user_input': {
  return (
    <div className="space-y-3">
      <div className="prose prose-sm prose-invert max-w-none">
        <ReactMarkdown>{String(question)}</ReactMarkdown>
      </div>
      {/* ... rest of the component */}
    </div>
  )
}
```

### 2. chat-drawer.tsx

```typescript
// After
<div className={cn(
  "prose prose-sm max-w-none",
  message.role === "user" ? "prose-invert" : "prose-invert"
)}>
  <ReactMarkdown>{message.content}</ReactMarkdown>
</div>
```

Also added the missing import:
```typescript
import ReactMarkdown from 'react-markdown'
```

---

## Result

Now agent questions are properly formatted with:
- ✅ Headers (# ## ###)
- ✅ Bullet points and numbered lists
- ✅ **Bold** and *italic* text
- ✅ [Links](https://example.com)
- ✅ Code blocks
- ✅ Proper line breaks and spacing

The research summaries are now **actually readable** instead of being a wall of text!

---

## Files Modified

1. `components/unified-activity-card.tsx`
   - Wrapped `question` in ReactMarkdown component
   - Added prose styling classes

2. `components/chat-drawer.tsx`
   - Added ReactMarkdown import
   - Wrapped message content in ReactMarkdown
   - Added prose styling classes

---

## Testing

Test by:
1. Starting an agent with research task
2. Agent completes research and asks a question with markdown
3. Verify formatting appears correctly:
   - Bullet points are actual bullets
   - Links are clickable
   - Headers are larger/bolder
   - Code blocks have monospace font

---

## Notes

- ReactMarkdown was already imported in `unified-activity-card.tsx`
- Used `prose-sm` for smaller text in compact card layout
- Used `prose-invert` for dark mode compatibility
- `max-w-none` prevents prose from constraining width too much

---

**Status:** ✅ Complete - Agent questions now render beautifully!

