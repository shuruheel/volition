import crypto from 'crypto'
import Supermemory from 'supermemory'
import { sql } from '@/lib/db'

/**
 * Supermemory integration helper
 * Stores content in Supermemory API and persists a reference in our local DB.
 */

export interface StoreMarkdownInput {
  agentId: string
  url: string
  title?: string
  markdown: string
}

export interface StoreMarkdownResult {
  providerId: string
  memoryId?: string
}

export async function storeMarkdown({ agentId, url, title, markdown }: StoreMarkdownInput): Promise<StoreMarkdownResult> {
  let providerId: string | undefined

  // Store in Supermemory API if configured
  const apiKey = process.env.SUPERMEMORY_API_KEY
  if (apiKey) {
    try {
      const sm = new Supermemory({ apiKey })
      // Use documents.add() as per Supermemory SDK docs
      const doc = await sm.documents.add({
        content: markdown,
        metadata: { agentId, url, title, source: 'firecrawl' },
      })
      providerId = doc.id
    } catch (error) {
      console.error('[storeMarkdown] Supermemory API error:', error instanceof Error ? error.message : String(error))
      // Fall back to hash-based ID if Supermemory fails
      providerId = `firecrawl:${crypto.createHash('sha1').update(url).digest('hex')}`
    }
  } else {
    // Fallback: deterministic id
    providerId = `firecrawl:${crypto.createHash('sha1').update(url).digest('hex')}`
  }

  // Store reference in local database
  try {
    const [memory] = await sql`
      INSERT INTO memories (agent_id, provider_id, kind, metadata)
      VALUES (
        ${agentId}, 
        ${providerId}, 
        'document', 
        ${JSON.stringify({ url, title, source: 'firecrawl' })}
      )
      RETURNING id, provider_id
    `
    return { providerId, memoryId: memory.id }
  } catch (error) {
    console.error('[storeMarkdown] Database insert failed:', error instanceof Error ? error.message : String(error))
    // Don't throw - continue even if DB insert fails (Supermemory storage succeeded)
    return { providerId, memoryId: undefined }
  }
}

/**
 * Search Supermemory for relevant research documents
 */
export async function searchMemories(agentId: string, query: string, limit: number = 10): Promise<Array<{ id: string; content: string; metadata?: any }>> {
  const apiKey = process.env.SUPERMEMORY_API_KEY
  if (!apiKey) {
    return []
  }

  try {
    const sm = new Supermemory({ apiKey })
    const results = await sm.search.documents({
      q: query,
      filters: { AND: [{ key: 'metadata.agentId', value: agentId }] },
      limit,
    })

    return (results.items || []).map((item: any) => ({
      id: item.id,
      content: item.content || '',
      metadata: item.metadata || {},
    }))
  } catch (error) {
    console.error('[searchMemories] Error:', error instanceof Error ? error.message : String(error))
    return []
  }
}


