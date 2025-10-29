/**
 * Workflow steps - reusable durable units of work
 * Each step is marked with 'use step' for automatic retries and durability
 */

import { sql } from '@/lib/db';

/**
 * Execute a research step: search, scrape, and store content
 */
export async function executeResearchStep(agentId: string, query: string, sessionId: string) {
  'use step';
  
  const { searchAndScrape } = await import('@/lib/integrations/firecrawl');
  const { storeMarkdown } = await import('@/lib/integrations/supermemory');
  
  const result = await searchAndScrape({ 
    query, 
    limit: 3, 
    scrapeOptions: { formats: ['markdown', 'links'] } 
  });
  
  const leads: Array<{ url: string; title?: string; providerId?: string }> = [];
  
  for (const item of result.items) {
    if (!item.url) continue;
    
    const md = (item.markdown ?? '').slice(0, 40000);
    if (md.length > 0) {
      const stored = await storeMarkdown({ 
        agentId, 
        url: item.url, 
        title: item.title, 
        markdown: md 
      });
      leads.push({ url: item.url, title: item.title, providerId: stored.providerId });
    }
  }
  
  return { 
    itemsScraped: result.items.length, 
    sessionId,
    leads 
  };
}

/**
 * Execute a browser automation task
 */
export async function executeBrowserStep(agentId: string, task: string, maxSteps?: number) {
  'use step';
  
  // Browser automation using Browser-Use SDK
  const { BrowserUseClient } = await import('browser-use-sdk');
  
  const browserClient = new BrowserUseClient({
    apiKey: process.env.BROWSER_USE_API_KEY!,
  });
  
  try {
    const browserTask = await browserClient.tasks.createTask({
      task,
      maxSteps: maxSteps ?? 10,
    });
    
    const result = await browserTask.complete();
    
    return {
      success: true,
      output: result.output,
      parsed: result.parsed,
    };
  } catch (error) {
    console.error('Browser task error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Log an activity to the database
 */
export async function logActivityStep(
  agentId: string, 
  type: string, 
  payload: any,
  status: string = 'completed'
) {
  'use step';
  
  await sql`
    INSERT INTO activities (agent_id, type, status, payload)
    VALUES (${agentId}, ${type}, ${status}, ${JSON.stringify(payload)})
  `;
}

/**
 * Start a research session
 */
export async function startResearchSessionStep(agentId: string, title: string) {
  'use step';
  
  const payload = {
    title,
    queries: [] as string[],
    links: [] as string[],
    notes: [] as string[],
    source: 'firecrawl',
  };

  const rows = await sql<any[]>`
    INSERT INTO activities (agent_id, type, status, priority, payload)
    VALUES (${agentId}, 'research', 'approved', 'medium', ${JSON.stringify(payload)})
    RETURNING id
  `;

  const id = rows[0]?.id as string;
  return { session_id: id };
}

/**
 * Append research results to a session
 */
export async function appendToSessionStep(
  sessionId: string, 
  query: string, 
  links: string[], 
  notes: string[]
) {
  'use step';
  
  const [row] = await sql<any[]>`
    SELECT payload FROM activities WHERE id = ${sessionId}
  `;
  
  if (!row) {
    throw new Error('Session not found');
  }

  const payload = (row.payload ?? {}) as Record<string, any>;
  const existingQueries: string[] = Array.isArray(payload.queries) ? payload.queries : [];
  const existingLinks: string[] = Array.isArray(payload.links) ? payload.links : [];
  const existingNotes: string[] = Array.isArray(payload.notes) ? payload.notes : [];

  const nextPayload = {
    ...payload,
    queries: query ? [...existingQueries, query] : existingQueries,
    links: Array.from(new Set([...existingLinks, ...links])).slice(0, 1000),
    notes: [...existingNotes, ...notes].slice(0, 500),
  };

  await sql`
    UPDATE activities SET payload = ${JSON.stringify(nextPayload)} WHERE id = ${sessionId}
  `;
}

/**
 * Complete a research session
 */
export async function completeResearchSessionStep(sessionId: string, summary: string) {
  'use step';
  
  const [row] = await sql<any[]>`
    SELECT payload FROM activities WHERE id = ${sessionId}
  `;
  
  if (!row) {
    throw new Error('Session not found');
  }

  const payload = (row.payload ?? {}) as Record<string, any>;
  const nextPayload = { ...payload, summary };

  await sql`
    UPDATE activities
    SET status = 'completed', payload = ${JSON.stringify(nextPayload)}
    WHERE id = ${sessionId}
  `;
}

