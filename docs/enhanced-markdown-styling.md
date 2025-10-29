# Enhanced Markdown Styling for Activity Feed

**Date:** October 28, 2025  
**Issue:** Markdown was rendering but lacked proper formatting, spacing, and visual hierarchy  
**Status:** ✅ Fixed

---

## Problem

After adding ReactMarkdown, the text was no longer a wall of text, but it still lacked:
- ❌ Clear header hierarchy
- ❌ Spacing between paragraphs
- ❌ Visual distinction for different elements
- ❌ Proper list formatting
- ❌ Readable link styling

The prose classes alone weren't enough to make the content readable.

---

## Solution

Added **custom component mapping** to ReactMarkdown with explicit styling for each element:

### Custom Components

```typescript
<ReactMarkdown
  components={{
    // Headers with clear hierarchy
    h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-6 mb-3 text-foreground" {...props} />,
    h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-5 mb-2 text-foreground" {...props} />,
    h3: ({ node, ...props }) => <h3 className="text-base font-semibold mt-4 mb-2 text-foreground" {...props} />,
    
    // Paragraphs with vertical spacing
    p: ({ node, ...props }) => <p className="my-3 leading-relaxed" {...props} />,
    
    // Lists with proper spacing and bullets
    ul: ({ node, ...props }) => <ul className="my-3 space-y-1 list-disc pl-6" {...props} />,
    ol: ({ node, ...props }) => <ol className="my-3 space-y-1 list-decimal pl-6" {...props} />,
    li: ({ node, ...props }) => <li className="my-1" {...props} />,
    
    // Links - blue, underlined, clickable
    a: ({ node, ...props }) => <a 
      className="text-blue-400 hover:text-blue-300 underline break-words" 
      target="_blank" 
      rel="noopener noreferrer" 
      {...props} 
    />,
    
    // Code - inline and block
    code: ({ node, inline, ...props }: any) => 
      inline 
        ? <code className="bg-gray-800 px-1 py-0.5 rounded text-sm text-blue-300" {...props} />
        : <code className="block bg-gray-800 p-2 rounded my-2 text-sm overflow-x-auto" {...props} />,
  }}
>
  {String(question)}
</ReactMarkdown>
```

### Enhanced Prose Classes

Also added Tailwind prose modifiers for backup styling:
```typescript
className="prose prose-sm prose-invert max-w-none 
  prose-headings:font-bold 
  prose-headings:text-foreground 
  prose-h1:text-xl 
  prose-h2:text-lg 
  prose-h3:text-base 
  prose-p:my-3 
  prose-ul:my-3 
  prose-li:my-1 
  prose-a:text-blue-400 
  prose-a:underline 
  prose-strong:text-foreground 
  prose-code:text-blue-300"
```

---

## Visual Improvements

### Before
```
I've kicked off the research session and synthesized an initial, source-backed brief across the four areas. If you want me to deepen any section (e.g., hands-on configs, model picks, or a domain-specific KG schema), say the word. Executive summary (each bullet cites a source) Preference finetuning (DPO/variants) often complements or outperforms plain SFT...
```
(One massive paragraph, hard to scan)

### After
```
I've kicked off the research session and synthesized an initial, source-backed brief across the four areas.

If you want me to deepen any section (e.g., hands-on configs, model picks, or a domain-specific KG schema), say the word.

Executive summary (each bullet cites a source)

Preference finetuning (DPO/variants) often complements or outperforms plain SFT for alignment-style behaviors...

- DPO optimizes a closed-form objective [link]
- ORPO removes the reference model term [link]
- TRL provides a production-ready trainer [link]
```
(Clear sections, breathing room, scannable)

---

## Styling Details

### Headers
- **H1:** `text-xl` (20px), `font-bold`, `mt-6 mb-3` (large top/bottom margin)
- **H2:** `text-lg` (18px), `font-bold`, `mt-5 mb-2` (medium spacing)
- **H3:** `text-base` (16px), `font-semibold`, `mt-4 mb-2` (smaller spacing)

### Paragraphs
- `my-3`: 12px top and bottom margin
- `leading-relaxed`: 1.625 line height for readability

### Lists
- `my-3`: Same vertical spacing as paragraphs
- `space-y-1`: 4px between list items
- `list-disc`/`list-decimal`: Visible bullets/numbers
- `pl-6`: 24px left padding for indentation

### Links
- `text-blue-400`: Visible blue color
- `hover:text-blue-300`: Lighter on hover
- `underline`: Always underlined for clarity
- `break-words`: Long URLs wrap instead of overflowing
- `target="_blank"`: Opens in new tab
- `rel="noopener noreferrer"`: Security best practice

### Code
- **Inline:** `bg-gray-800` background, `px-1 py-0.5` padding, `text-blue-300`
- **Block:** `block` display, `p-2` padding, `overflow-x-auto` for long lines

---

## Why Custom Components?

The default prose classes weren't strong enough because:
1. **Style conflicts** - Other CSS was overriding defaults
2. **Dark mode** - Needed explicit foreground colors
3. **Spacing** - Default spacing too tight for long research summaries
4. **Links** - Default link styling not visible enough

Custom components give us **full control** over every element's appearance.

---

## File Modified

- `components/unified-activity-card.tsx` (lines 280-299)
  - Added custom ReactMarkdown components
  - Enhanced prose classes
  - Explicit styling for all markdown elements

---

## Result

Agent questions now have:
- ✅ **Clear visual hierarchy** - Headers stand out
- ✅ **Breathing room** - Generous spacing between sections
- ✅ **Scannable content** - Easy to skim and find information
- ✅ **Readable links** - Blue, underlined, clickable
- ✅ **Proper lists** - Bullets and numbers visible
- ✅ **Code highlighting** - Inline and block code styled
- ✅ **Professional appearance** - Matches design system

Research summaries with dozens of citations, multiple sections, and long explanations are now **actually readable**!

---

## Next Steps

- [ ] Apply same styling to chat drawer (user mentioned doing this later)
- [ ] Test with various markdown formats (tables, blockquotes, etc.)
- [ ] Consider adding syntax highlighting for code blocks (react-syntax-highlighter)

---

**Status:** ✅ Complete - Activity feed questions are now beautifully formatted and readable!

