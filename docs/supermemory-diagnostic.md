# Supermemory Integration Diagnostic

## Issue
"Memories Added" metric shows 0 despite research sessions completing.

## Expected Flow

```
1. Agent calls firecrawlResearch tool
   ↓
2. Tool scrapes web pages via Firecrawl
   ↓
3. For each page, storeMarkdown() is called
   ↓
4. storeMarkdown() does TWO things:
   a) Sends content to Supermemory API (sm.documents.create)
   b) Stores reference in local DB (POST /api/memories/store)
   ↓
5. /api/memories/store inserts into memories table
   ↓
6. Metrics API counts from memories table
```

## Code References

### 1. Research Tool
**File:** `lib/ai/tools/firecrawl-research.ts`
```typescript
for (const item of result.items) {
  if (md.length > 0) {
    // This should be calling storeMarkdown
    await storeMarkdown({ 
      agentId, 
      url: item.url, 
      title: item.title, 
      markdown: md 
    })
  }
}
```

### 2. Store Function
**File:** `lib/integrations/supermemory.ts`
```typescript
export async function storeMarkdown({ agentId, url, title, markdown }) {
  let providerId: string | undefined

  // Step 1: Store in Supermemory (if API key exists)
  const apiKey = process.env.SUPERMEMORY_API_KEY
  if (apiKey) {
    const sm = new Supermemory({ apiKey })
    const doc = await sm.documents.create({
      content: markdown,
      metadata: { agentId, url, title, source: 'firecrawl' },
    })
    providerId = doc.id
  } else {
    // Fallback: deterministic id
    providerId = `firecrawl:${crypto.createHash('sha1').update(url).digest('hex')}`
  }

  // Step 2: Store reference in our DB
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const resp = await fetch(`${baseUrl}/api/memories/store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_id: agentId,
      provider_id: providerId,
      kind: 'document',
      metadata: { url, title, source: 'firecrawl' },
    }),
  })

  if (!resp.ok) {
    throw new Error(`Failed to store memory reference`)
  }
  
  return { providerId }
}
```

### 3. Storage Endpoint
**File:** `app/api/memories/store/route.ts`
```typescript
export async function POST(request: NextRequest) {
  const { agent_id, provider_id, kind, metadata = {} } = await request.json();
  
  const result = await sql`
    INSERT INTO memories (agent_id, provider_id, kind, metadata)
    VALUES (${agent_id}, ${provider_id}, ${kind}, ${JSON.stringify(metadata)})
    RETURNING *
  `;
  
  return NextResponse.json(result[0], { status: 201 });
}
```

### 4. Metrics Calculation
**File:** `app/api/metrics/key/route.ts`
```typescript
const memoriesResult = await sql`
  SELECT COUNT(*) as count
  FROM memories
  WHERE created_at >= ${oneDayAgo.toISOString()}
`;
const memoriesAdded = parseInt(memoriesResult[0].count as string);
```

## Potential Issues

### Issue #1: SUPERMEMORY_API_KEY Not Set
If the API key is missing:
- Supermemory API call is skipped (fallback to SHA1 hash)
- Local DB reference should still be stored
- **Impact:** Memories Added should still increment

### Issue #2: Fetch to localhost:3000 Failing
The `storeMarkdown` function uses `fetch()` to call the API:
```typescript
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
await fetch(`${baseUrl}/api/memories/store`, ...)
```

**Potential problems:**
- If `NEXT_PUBLIC_APP_URL` is not set and app runs on different port
- If `fetch()` call fails silently (error caught in firecrawl-research.ts)
- If server-side fetch to localhost is blocked

### Issue #3: Error Handling Swallows Failures
In `firecrawl-research.ts`:
```typescript
try {
  await storeMarkdown({ ... })
} catch (error) {
  // Error is logged but doesn't stop the tool
  console.error('firecrawlResearch error:', error)
  return { success: false, error: error.message }
}
```

If `storeMarkdown` throws, the tool returns an error but doesn't retry.

### Issue #4: Database Schema Mismatch
Check if `memories` table exists:
```sql
SELECT * FROM memories LIMIT 1;
```

## Diagnostic Steps

### Step 1: Check Environment Variables
```bash
# In your terminal or .env.local
echo $SUPERMEMORY_API_KEY
echo $NEXT_PUBLIC_APP_URL
```

Expected:
- `SUPERMEMORY_API_KEY`: Should be set (starts with `sm_...`)
- `NEXT_PUBLIC_APP_URL`: Should be your app URL or empty for localhost

### Step 2: Check Database Table
```sql
-- Check if table exists
SELECT COUNT(*) FROM memories;

-- Check recent inserts
SELECT * FROM memories ORDER BY created_at DESC LIMIT 10;

-- Check if any memories exist at all
SELECT COUNT(*) as total, 
       COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h
FROM memories;
```

### Step 3: Check Server Logs
Look for these log patterns during research:
- `storeMarkdown` being called
- Supermemory API responses
- `/api/memories/store` responses
- Any fetch errors

### Step 4: Test Direct API Call
```bash
curl -X POST http://localhost:3000/api/memories/store \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test-agent-id",
    "provider_id": "test-provider-id",
    "kind": "document",
    "metadata": {"test": true}
  }'
```

Expected: 201 response with created memory object

### Step 5: Test Supermemory SDK
```typescript
// Test in a route handler or script
import Supermemory from 'supermemory';

const sm = new Supermemory({ 
  apiKey: process.env.SUPERMEMORY_API_KEY! 
});

const doc = await sm.documents.create({
  content: 'Test content',
  metadata: { test: true }
});

console.log('Created doc:', doc.id);
```

## Recommended Fixes

### Fix #1: Add Better Logging
Update `lib/integrations/supermemory.ts`:
```typescript
export async function storeMarkdown({ agentId, url, title, markdown }) {
  console.log('[storeMarkdown] Starting for:', url);
  
  const apiKey = process.env.SUPERMEMORY_API_KEY;
  console.log('[storeMarkdown] API key exists:', !!apiKey);
  
  // ... existing code ...
  
  const resp = await fetch(`${baseUrl}/api/memories/store`, ...);
  console.log('[storeMarkdown] API response status:', resp.status);
  
  if (!resp.ok) {
    const err = await resp.text();
    console.error('[storeMarkdown] API error:', err);
    throw new Error(`Failed to store memory reference: ${err}`);
  }
  
  const json = await resp.json();
  console.log('[storeMarkdown] Stored with ID:', json.id);
  
  return { providerId, memoryId: json.id };
}
```

### Fix #2: Use Direct Database Insert
Instead of `fetch()`, use direct SQL:
```typescript
import { sql } from '@/lib/db';

export async function storeMarkdown({ agentId, url, title, markdown }) {
  // ... Supermemory API call ...

  // Direct DB insert instead of fetch
  const [memory] = await sql`
    INSERT INTO memories (agent_id, provider_id, kind, metadata)
    VALUES (${agentId}, ${providerId}, 'document', ${JSON.stringify({ url, title, source: 'firecrawl' })})
    RETURNING *
  `;
  
  return { providerId, memoryId: memory.id };
}
```

**Benefits:**
- No fetch to localhost needed
- Faster (no HTTP overhead)
- Better error messages
- Works in all environments

### Fix #3: Verify Research Tool is Actually Called
Add logging to `lib/ai/tools/firecrawl-research.ts`:
```typescript
execute: async ({ query, limit, ... }) => {
  console.log('[firecrawlResearch] Starting query:', query);
  
  const result = await searchAndScrape({ ... });
  console.log('[firecrawlResearch] Scraped items:', result.items.length);
  
  for (const item of result.items) {
    if (md.length > 0) {
      console.log('[firecrawlResearch] Storing:', item.url);
      await storeMarkdown({ ... });
      console.log('[firecrawlResearch] Stored successfully');
    }
  }
  
  // ...
}
```

## Quick Test

To verify the fix works:

1. **Start dev server:**
   ```bash
   pnpm dev
   ```

2. **Trigger a research session** through the dashboard

3. **Watch the logs** for:
   - `[firecrawlResearch]` logs
   - `[storeMarkdown]` logs
   - Database insert confirmations

4. **Check the metrics:**
   ```bash
   curl http://localhost:3000/api/metrics/key
   ```
   
   Look for `"memoriesAdded": N` where N > 0

5. **Query database directly:**
   ```sql
   SELECT COUNT(*) FROM memories WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

## Next Steps

1. **Immediate:** Add logging to understand where the failure occurs
2. **Best fix:** Replace `fetch()` with direct SQL insert
3. **Verify:** Test end-to-end with a research session
4. **Monitor:** Check metrics dashboard after fix

