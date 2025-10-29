# Collapsible Content & Smart Heading Detection

**Date:** October 28, 2025  
**Features:** Collapsible long content + Smart heading conversion  
**Status:** ✅ Implemented

---

## Feature 1: Collapsible Content

### Problem
Long research summaries with many citations made activity cards very tall and hard to scan. Users had to scroll through entire summaries to see other activities.

### Solution
Added **show more/less** functionality that:
- Collapses content to ~17 lines (400px height) by default
- Shows a gradient fade at the bottom when collapsed
- Provides "Show more/less" button to toggle
- Only appears for long content (>1000 characters)

### Implementation

```typescript
const [isExpanded, setIsExpanded] = useState(false);
const isLongContent = question.length > 1000;

<div className="relative">
  <div className={cn(
    "prose prose-sm ...",
    !isExpanded && isLongContent && "max-h-[400px] overflow-hidden"
  )}>
    {/* Content */}
  </div>
  
  {/* Fade overlay */}
  {!isExpanded && isLongContent && (
    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-card to-transparent pointer-events-none" />
  )}
</div>

{/* Toggle button */}
{isLongContent && (
  <Button onClick={() => setIsExpanded(!isExpanded)}>
    {isExpanded ? 'Show less' : 'Show more'}
  </Button>
)}
```

### Visual Effect
- **Collapsed**: Shows ~17 lines with smooth fade to transparent
- **Expanded**: Shows full content without restrictions
- **Button**: Clear "Show more/less" with chevron icons

---

## Feature 2: Smart Heading Detection

### Problem
Agent generated markdown like:
```
1. Executive summary (each bullet cites a source)
```

This was rendered as a numbered list item, not a heading, making it hard to scan sections.

### Solution
Added **smart list item detection** that converts specific list items to headings:

```typescript
li: ({ node, children, ...props }) => {
  const text = String(children);
  
  // Check if this list item is actually a section header
  if (text.match(/^(Executive summary|Key techniques|Advanced reasoning|Evaluation)/i)) {
    return <h3 className="text-base font-semibold mt-4 mb-2 text-foreground list-none -ml-6">
      {children}
    </h3>
  }
  
  // Otherwise render as normal list item
  return <li className="my-1" {...props}>{children}</li>
}
```

### Detected Keywords
- **Executive summary** → H3
- **Key techniques** → H3  
- **Advanced reasoning** → H3
- **Evaluation** → H3

Case-insensitive matching.

### Styling
- `text-base font-semibold` - Prominent but not too large
- `mt-4 mb-2` - Good spacing above/below
- `text-foreground` - High contrast
- `list-none` - Removes bullet/number
- `-ml-6` - Removes list indentation

---

## Combined UX

### Before
```
[Very tall card with entire summary visible]
- Hard to find specific sections
- Lots of scrolling
- "1. Executive summary" looks like list item
```

### After
```
[Compact card showing first ~17 lines]
- Easy to scan multiple activities
- Click "Show more" to expand when interested
- "Executive summary" stands out as heading
- Smooth fade indicates more content below
```

---

## Implementation Details

### State Management
```typescript
const [isExpanded, setIsExpanded] = useState(false);
```
Simple boolean toggle - no external state needed.

### Height Calculation
- 400px ≈ 17 lines of text at `prose-sm` size
- Adjusts based on line-height and font-size
- Works well for typical research summaries

### Threshold
- Checks `question.length > 1000` characters
- Roughly correlates to 15-20 lines
- Only shows toggle when needed

### Gradient Overlay
- 96px (h-24) tall fade
- `from-card to-transparent` - matches background
- `pointer-events-none` - doesn't block interactions
- Only visible when collapsed

### Button Styling
- Full width (`w-full`)
- Ghost variant - subtle appearance
- Muted colors - doesn't distract
- Icons (ChevronDown/ChevronUp) for clarity

---

## Files Modified

1. `components/unified-activity-card.tsx`
   - Added `isExpanded` state
   - Added `isLongContent` check
   - Added conditional max-height
   - Added gradient overlay
   - Added show more/less button
   - Added smart heading detection in `li` component
   - Added ChevronDown/ChevronUp imports
   - Added `cn` utility import

---

## Testing Checklist

- [ ] Long content (>1000 chars) shows collapsed with fade
- [ ] Short content (<1000 chars) doesn't show toggle button
- [ ] "Show more" expands content fully
- [ ] "Show less" collapses back to 17 lines
- [ ] "Executive summary" renders as heading (bold, no bullet)
- [ ] Other section keywords also convert to headings
- [ ] Regular list items still render normally
- [ ] Gradient overlay matches card background
- [ ] Expand/collapse animation is smooth

---

## Future Enhancements

### Possible Improvements
1. **Smooth animation** - Add transition on height change
2. **Remember state** - Persist expanded state in localStorage
3. **Custom threshold** - Let users configure default height
4. **More keywords** - Add other common section patterns
5. **Auto-detect headings** - Use NLP to identify section headers

### Advanced Features
- Click-to-expand individual sections
- Table of contents for long summaries
- Search within collapsed content
- Export summary as PDF

---

## Benefits

**For Users:**
- ✅ Cleaner activity feed - more content visible
- ✅ Faster scanning - see summaries for multiple activities
- ✅ Better organization - headings stand out
- ✅ Choice - expand when interested, keep collapsed otherwise

**For Developers:**
- ✅ Simple implementation - just state + conditional classes
- ✅ No dependencies - pure React
- ✅ Reusable pattern - can apply to other long content
- ✅ Accessible - keyboard navigation works

---

**Status:** ✅ Complete - Activity feed is now scannable and well-organized!

