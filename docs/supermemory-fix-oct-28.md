# Supermemory Integration Fix (Oct 28, 2025)

## Problem

The "Memories Added" metric was showing 0 despite research sessions completing successfully. Research content was being scraped but not counted.

## Root Cause

In `lib/integrations/supermemory.ts`, the `storeMarkdown()` function was using `fetch()` to call the local API endpoint `/api/memories/store`:

```typescript
// OLD CODE - PROBLEMATIC
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const resp = await fetch(`${baseUrl}/api/memories/store`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ... })
})
```

**Why this failed:**
1. Server-side `fetch()` to `localhost` can be unreliable
2. Errors were caught silently in the research tool
3. The agent continued successfully while the DB insert failed
4. No memories were actually stored in the database

## Solution

Replace the `fetch()` call with a **direct SQL insert** using the Neon serverless driver:

```typescript
// NEW CODE - FIXED
import { sql } from '@/lib/db'

const [memory] = await sql`
  INSERT INTO memories (agent_id, provider_id, kind, metadata)
  VALUES (${agentId}, ${providerId}, 'document', ${JSON.stringify(metadata)})
  RETURNING id, provider_id
`
```

**Benefits:**
✅ No HTTP overhead - direct database connection  
✅ More reliable - no localhost fetch issues  
✅ Faster - eliminates round-trip  
✅ Better error handling - SQL errors are explicit  
✅ Works in all environments (local, Vercel, etc.)

## Implementation Details

### Changed File
`lib/integrations/supermemory.ts`

### Key Changes

1. **Added SQL import:**
   ```typescript
   import { sql } from '@/lib/db'
   ```

2. **Replaced fetch with direct SQL:**
   ```typescript
   // Store reference in local database (direct SQL instead of fetch)
   const [memory] = await sql`
     INSERT INTO memories (agent_id, provider_id, kind, metadata)
     VALUES (${agentId}, ${providerId}, 'document', ${JSON.stringify({ url, title, source: 'firecrawl' })})
     RETURNING id, provider_id
   `
   ```

3. **Added comprehensive logging:**
   ```typescript
   console.log('[storeMarkdown] Storing content for URL:', url)
   console.log('[storeMarkdown] Using Supermemory API')
   console.log('[storeMarkdown] Supermemory document created:', providerId)
   console.log('[storeMarkdown] Storing reference in local DB')
   console.log('[storeMarkdown] Successfully stored memory with ID:', memory.id)
   ```

4. **Improved error handling:**
   - Supermemory API errors now fall back to hash-based IDs
   - Database errors are caught and logged explicitly
   - Error messages include actual error details

## Data Flow (After Fix)

```
1. Agent calls firecrawlResearch tool
   ↓
2. Tool scrapes web pages (3-5 per session)
   ↓
3. For each page:
   ├── Store content → Supermemory API (sm.documents.create)
   │                   Returns: providerId (e.g., "doc_abc123")
   └── Store reference → Local DB (direct SQL insert)
                         Returns: memoryId (UUID)
   ↓
4. Metrics API counts from memories table
   └── SELECT COUNT(*) FROM memories WHERE created_at > now() - interval '24 hours'
   ↓
5. Dashboard displays "Memories Added: N"
```

## Testing

### Manual Test
1. Start the dev server:
   ```bash
   pnpm dev
   ```

2. Create a research task in the dashboard

3. Watch the terminal logs for:
   ```
   [storeMarkdown] Storing content for URL: https://example.com
   [storeMarkdown] Using Supermemory API
   [storeMarkdown] Supermemory document created: doc_xyz123
   [storeMarkdown] Storing reference in local DB
   [storeMarkdown] Successfully stored memory with ID: abc-def-123
   ```

4. Check the metrics endpoint:
   ```bash
   curl http://localhost:3000/api/metrics/key
   ```
   
   Should return:
   ```json
   {
     "memoriesAdded": 3,  // Should be > 0 now!
     ...
   }
   ```

5. Query the database directly:
   ```sql
   SELECT COUNT(*) FROM memories 
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

### Expected Results

For a typical research session with 3 pages scraped:
- **3 documents** stored in Supermemory API
- **3 rows** inserted into `memories` table
- **"Memories Added"** shows 3 on dashboard

## Supermemory Integration Modes

### Mode 1: With SUPERMEMORY_API_KEY (Recommended)
```bash
SUPERMEMORY_API_KEY=sm_your_key_here
```

Flow:
1. Calls `sm.documents.create()` → stores full markdown in Supermemory
2. Uses returned `doc.id` as `provider_id`
3. Inserts reference into local `memories` table
4. Benefits: Full semantic search, RAG, retrieval via Supermemory tools

### Mode 2: Without SUPERMEMORY_API_KEY (Fallback)
If no API key is set:
1. Generates deterministic `provider_id` using SHA1 hash of URL
2. Inserts reference into local `memories` table
3. Benefits: Still tracks metrics, can add Supermemory later

## Architecture Notes

### Why Two Storage Locations?

1. **Supermemory (External)**
   - Stores full content (markdown, embeddings)
   - Provides semantic search and RAG
   - Used by AI agents for retrieval

2. **Local Database (Neon)**
   - Stores lightweight references
   - Tracks metrics (Memories Added count)
   - Links memories to agents and sessions

This dual storage allows:
- Fast metrics queries (no API calls)
- Rich semantic search (via Supermemory)
- Graceful degradation (works without Supermemory)

## Related Files

- `lib/integrations/supermemory.ts` - Storage implementation (FIXED)
- `lib/ai/tools/firecrawl-research.ts` - Calls storeMarkdown()
- `app/api/memories/store/route.ts` - No longer used (can be removed)
- `app/api/metrics/key/route.ts` - Counts from memories table
- `db/migrations/001_init.sql` - Memories table schema

## Future Improvements

1. **Remove unused endpoint:** `app/api/memories/store/route.ts` is no longer needed
2. **Batch inserts:** For performance, batch multiple memory inserts
3. **Retry logic:** Add exponential backoff for Supermemory API failures
4. **Metrics caching:** Cache memory counts for 1 minute to reduce DB load
5. **Memory pruning:** Add job to archive old memories (v2)

## Verification Checklist

After deploying this fix:

- [ ] Research sessions create memories in database
- [ ] "Memories Added" metric shows correct count (> 0)
- [ ] Logs show successful `[storeMarkdown]` operations
- [ ] No `Failed to store memory reference` errors
- [ ] Supermemory API receives content (if API key is set)
- [ ] Memory count increases with each research session

## Rollback Plan

If this fix causes issues, revert `lib/integrations/supermemory.ts` to use fetch():

```bash
git checkout HEAD~1 lib/integrations/supermemory.ts
```

Then investigate:
1. Database connection issues
2. SQL syntax errors
3. Permission problems

