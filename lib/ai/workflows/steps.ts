/**
 * Workflow steps - reusable durable units of work
 * Each step is marked with 'use step' for automatic retries and durability
 */

import { sql } from '@/lib/db';
import { getLastChatTurns, hasPendingUserInput } from '../chat-history';
import { getRecentResearchContext, getRecentMemoriesContext } from '../research-context';

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

/**
 * Fetch agent from database
 */
export async function fetchAgentStep(agentId: string) {
  'use step';
  
  const agents = await sql<any[]>`SELECT * FROM agents WHERE id = ${agentId}`;
  return agents[0] || null;
}

/**
 * Create a pending activity
 */
export async function createPendingActivityStep(
  agentId: string,
  type: string,
  priority: string,
  payload: any
) {
  'use step';
  
  const result = await sql<any[]>`
    INSERT INTO activities (agent_id, type, status, priority, payload)
    VALUES (${agentId}, ${type}, 'pending', ${priority}, ${JSON.stringify(payload)})
    RETURNING id
  `;
  
  return result[0]?.id;
}

/**
 * Update activity status with additional payload data
 */
export async function updateActivityStatusStep(
  activityId: string,
  status: string,
  additionalPayload?: any
) {
  'use step';
  
  if (additionalPayload) {
    await sql`
      UPDATE activities
      SET status = ${status}, 
          payload = payload || ${JSON.stringify(additionalPayload)}::jsonb
      WHERE id = ${activityId}
    `;
  } else {
    await sql`
      UPDATE activities
      SET status = ${status}
      WHERE id = ${activityId}
    `;
  }
}

/**
 * Update agent status
 */
export async function updateAgentDBStatusStep(
  agentId: string,
  status: string
) {
  'use step';
  
  await sql`
    UPDATE agents
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${agentId}
  `;
}

/**
 * Get chat history and context for agent
 */
export async function getAgentContextStep(agentId: string, historyLimit: number = 20, contextLimit: number = 5) {
  'use step';
  
  const history = await getLastChatTurns(agentId, historyLimit);
  const researchContext = await getRecentResearchContext(agentId, contextLimit);
  const memoryContext = await getRecentMemoriesContext(agentId, contextLimit);
  const pending = await hasPendingUserInput(agentId);
  
  return {
    history,
    researchContext,
    memoryContext,
    pending,
  };
}

/**
 * Execute AI generateText call in a step (required for Vercel Workflow compatibility)
 */
export async function generateTextStep(params: {
  model: any;
  system: string;
  messages: any[];
  tools: Record<string, any>;
  maxSteps: number;
}) {
  'use step';
  
  const { generateText } = await import('ai');
  
  return await generateText({
    model: params.model,
    system: params.system,
    messages: params.messages,
    tools: params.tools,
    maxSteps: params.maxSteps,
  });
}

/**
 * Update agent status in database (for real-time UI updates)
 */
export async function updateAgentStatusStep(agentId: string, update: {
  status: 'idle' | 'active' | 'error';
  currentStep?: number;
  totalSteps?: number;
  currentActivity?: string | null;
  currentTool?: string | null;
}) {
  'use step';
  
  try {
    await sql`
      INSERT INTO agent_status (agent_id, status, current_step, total_steps, current_activity, current_tool)
      VALUES (
        ${agentId},
        ${update.status},
        ${update.currentStep ?? 0},
        ${update.totalSteps ?? 0},
        ${update.currentActivity ?? null},
        ${update.currentTool ?? null}
      )
      ON CONFLICT (agent_id)
      DO UPDATE SET
        status = ${update.status},
        current_step = ${update.currentStep ?? 0},
        total_steps = ${update.totalSteps ?? 0},
        current_activity = ${update.currentActivity ?? null},
        current_tool = ${update.currentTool ?? null},
        last_update = NOW()
    `;
  } catch (error) {
    console.error('Failed to update agent status:', error);
  }
}

/**
 * Clear agent status (set to idle)
 */
export async function clearAgentStatusStep(agentId: string) {
  'use step';
  
  await updateAgentStatusStep(agentId, {
    status: 'idle',
    currentStep: 0,
    totalSteps: 0,
    currentActivity: null,
    currentTool: null,
  });
}

