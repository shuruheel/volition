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
  console.log('[storeMarkdown] Storing content for URL:', url)
  
  let providerId: string | undefined

  // Store in Supermemory API if configured
  const apiKey = process.env.SUPERMEMORY_API_KEY
  if (apiKey) {
    console.log('[storeMarkdown] Using Supermemory API')
    try {
      const sm = new Supermemory({ apiKey })
      const doc = await sm.documents.create({
        content: markdown,
        metadata: { agentId, url, title, source: 'firecrawl' },
      })
      providerId = doc.id
      console.log('[storeMarkdown] Supermemory document created:', providerId)
    } catch (error) {
      console.error('[storeMarkdown] Supermemory API error:', error)
      // Fall back to hash-based ID if Supermemory fails
      providerId = `firecrawl:${crypto.createHash('sha1').update(url).digest('hex')}`
    }
  } else {
    console.log('[storeMarkdown] No Supermemory API key, using fallback')
    // Fallback: deterministic id
    providerId = `firecrawl:${crypto.createHash('sha1').update(url).digest('hex')}`
  }

  // Store reference in local database (direct SQL instead of fetch)
  console.log('[storeMarkdown] Storing reference in local DB')
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
    console.log('[storeMarkdown] Successfully stored memory with ID:', memory.id)
    return { providerId, memoryId: memory.id }
  } catch (error) {
    console.error('[storeMarkdown] Database insert failed:', error)
    throw new Error(`Failed to store memory reference: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}


