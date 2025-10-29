/**
 * Workflow steps - reusable durable units of work
 * Each step is marked with 'use step' for automatic retries and durability
 */

import { sql } from '@/lib/db';
import { getLastChatTurns, hasPendingUserInput } from '../chat-history';
import { getRecentResearchContext, getRecentMemoriesContext } from '../research-context';
import { userInputHook, phoneCallHook, activityApprovalHook } from './hooks';
import { getStepMetadata } from 'workflow';

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
    const { stepId } = getStepMetadata();

    const browserTask = await browserClient.tasks.createTask({
      task,
      maxSteps: maxSteps ?? 10,
      // Attach idempotency metadata if supported by provider (no-op if ignored)
      metadata: { idempotencyKey: stepId },
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

/**
 * Execute one LLM decision cycle with tools defined inside the step context.
 * Returns serializable state deltas and finish reason.
 */
export async function executeLLMDecisionStep(args: {
  agentId: string;
  systemPrompt: string;
  history: Array<any>;
  researchContext?: string | null;
  memoryContext?: string | null;
  userPrompt: string;
  enabledTools: string[];
  currentSessionId: string | null;
  researchStarted: boolean;
}) {
  'use step';

  const { agentId, systemPrompt, history, researchContext, memoryContext, userPrompt } = args;
  let { currentSessionId, researchStarted } = args;

  // Import AI SDK within step context
  const { generateText, stepCountIs } = await import('ai');
  const { openai } = await import('@ai-sdk/openai');

  const tools: Record<string, any> = {
    startResearchSession: {
      description: 'Start a new research session and initialize tracking',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title for the research session' },
        },
        required: ['title'],
        additionalProperties: false,
      },
      execute: async ({ title }: { title: string }) => {
        const result = await startResearchSessionStep(agentId, title);
        currentSessionId = result.session_id;
        researchStarted = false;
        return { session_id: currentSessionId };
      },
    },
    firecrawlResearch: {
      description: 'Search and scrape the web; call multiple times with focused queries',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 3, default: 3 },
        },
        required: ['query'],
        additionalProperties: false,
      },
      execute: async ({ query, limit }: { query: string; limit: number }) => {
        if (!currentSessionId) return { success: false, error: 'No active session' };
        researchStarted = true;
        const result = await executeResearchStep(agentId, query, currentSessionId);
        const links = result.leads.map((l: any) => l.url);
        const notes = result.leads.map((l: any) => `${l.title}: ${l.url}`);
        await appendToSessionStep(currentSessionId, query, links, notes);
        return { success: true, itemsScraped: result.itemsScraped, session_id: currentSessionId };
      },
    },
    completeResearchSession: {
      description: 'Finalize a research session with a summary',
      inputSchema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
        },
        required: ['summary'],
        additionalProperties: false,
      },
      execute: async ({ summary }: { summary: string }) => {
        if (!currentSessionId) return { success: false, error: 'No active session' };
        await completeResearchSessionStep(currentSessionId, summary);
        const completed = currentSessionId;
        currentSessionId = null;
        researchStarted = false;
        return { success: true, session_id: completed };
      },
    },
    logActivity: {
      description: 'Log a completed activity to the database',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          payload: { type: 'object', additionalProperties: true },
        },
        required: ['type', 'payload'],
        additionalProperties: false,
      },
      execute: async ({ type, payload }: { type: string; payload: any }) => {
        await logActivityStep(agentId, type, payload);
        return { success: true };
      },
    },
    askUser: {
      description: 'Ask the user a question; pause until answered',
      inputSchema: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
        },
        required: ['question'],
        additionalProperties: false,
      },
      execute: async ({ question, priority }: { question: string; priority: 'low' | 'medium' | 'high' }) => {
        const activityId = await createPendingActivityStep(
          agentId,
          'user_input',
          priority,
          { question }
        );

        await updateAgentStatusStep(agentId, {
          status: 'active',
          currentActivity: 'Waiting for user input',
          currentTool: 'askUser',
        });

        const token = `agent-${agentId}-activity-${activityId}`;
        const events = userInputHook.create({ token });

        for await (const event of events) {
          await updateActivityStatusStep(event.activityId, 'approved', { answer: event.answer });
          return { success: true, answer: event.answer };
        }
        return { success: false, error: 'No response received' };
      },
    },
  };

  // Conditionally include browser tool
  if (args.enabledTools.includes('browser')) {
    tools.browserTask = {
      description: 'Execute browser automation tasks',
      inputSchema: {
        type: 'object',
        properties: {
          task: { type: 'string' },
          maxSteps: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
        },
        required: ['task'],
        additionalProperties: false,
      },
      execute: async ({ task, maxSteps }: { task: string; maxSteps: number }) => {
        return await executeBrowserStep(agentId, task, maxSteps);
      },
    };
  }

  const result = await generateText({
    model: openai('gpt-5-2025-08-07'),
    system: systemPrompt,
    messages: [
      ...history,
      ...(researchContext ? [{ role: 'user' as const, content: researchContext }] : []),
      ...(memoryContext ? [{ role: 'user' as const, content: memoryContext }] : []),
      { role: 'user', content: userPrompt },
    ],
    tools,
    stopWhen: stepCountIs(1),
  });

  return {
    finishReason: result.finishReason,
    currentSessionId,
    researchStarted,
  } as const;
}

