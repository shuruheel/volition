/**
 * Workflow steps — reusable async functions for agent execution.
 * HITL tools (askUser, sendEmail, createCalendarEvent) set awaitingHumanInput
 * which causes the workflow to exit cleanly and resume on approval.
 */

import { sql } from '@/lib/db';
import { getLastChatTurns, hasPendingUserInput } from '../chat-history';
import { getRecentResearchContext, getRecentMemoriesContext } from '../research-context';

/**
 * Plan research queries by decomposing a topic into focused search queries,
 * checking Supermemory for existing research to avoid duplication
 */
export async function planResearchQueriesStep(
  agentId: string,
  researchTopic: string,
  systemPrompt?: string,
  userId?: string | null,
  modelProvider?: string | null,
  modelId?: string | null
): Promise<{ queries: string[]; existingResearch?: string }> {

  const { searchMemories } = await import('@/lib/integrations/supermemory');

  // Search Supermemory for existing research on this topic
  const existingDocs = await searchMemories(agentId, researchTopic, 10, userId);

  let existingResearchSummary = '';
  if (existingDocs.length > 0) {
    // Extract URLs to avoid exact duplicates
    const existingUrls = existingDocs
      .map(doc => doc.metadata?.url)
      .filter(Boolean) as string[];

    // Use longer content previews (1000 chars) for better context
    const summaries = existingDocs.slice(0, 5).map((doc, idx) => {
      const title = doc.metadata?.title || `Document ${idx + 1}`;
      const url = doc.metadata?.url || '';
      const preview = doc.content.slice(0, 1000).replace(/\s+/g, ' ');
      return `- ${title}${url ? ` (${url})` : ''}: ${preview}...`;
    });

    existingResearchSummary = `\n\nExisting research found in memory (${existingDocs.length} documents):\n${summaries.join('\n')}\n\nCRITICAL: Do NOT research URLs that are already in memory. Existing URLs: ${existingUrls.slice(0, 15).join(', ')}\n\nFocus on gaps, new angles, or deeper dives into specific aspects that aren't covered above.`;
  } else {
    existingResearchSummary = '\n\nNo existing research found in memory. You can explore this topic broadly.';
  }

  // Use LLM provider abstraction to decompose topic into focused search queries
  const { resolveProviderConfig, createProvider } = await import('@/lib/ai/providers');
  const providerConfig = await resolveProviderConfig(modelProvider, modelId, userId);
  const provider = createProvider(providerConfig);

  const planningPrompt = `You are a research query planner. Decompose the research topic into 3-5 focused, specific search queries that will yield high-quality results.

Research Topic: ${researchTopic}
${systemPrompt ? `\nAgent's Research Goals (from system prompt): ${systemPrompt.slice(0, 500)}` : ''}
${existingResearchSummary}

Requirements:
- Each query should be 5-12 words (NOT longer - Firecrawl works best with concise queries)
- Remove quotes and complex operators - use simple keyword combinations
- Focus on the most important keywords from the topic
- Queries should explore different angles of the topic
- Avoid queries that would duplicate existing research
- Use search-friendly language (e.g., "context engineering techniques 2024" not "context engineering" "system prompt" instruction hierarchy)
- Prioritize queries that fill knowledge gaps or explore new aspects
- Return 3-5 queries total

Return a JSON object with a "queries" array containing 3-5 search query strings. Example: {"queries": ["query 1", "query 2", "query 3"]}`;

  try {
    const completion = await provider.createCompletion({
      model: providerConfig.model,
      messages: [
        {
          role: 'system',
          content: 'You are a research query planner. Always return a JSON object with a "queries" array property containing search query strings.',
        },
        { role: 'user', content: planningPrompt },
      ],
    });

    const responseText = completion.message?.content || '{}';
    const parsed = JSON.parse(responseText);
    
    // Extract queries from response (handle different formats)
    let queries: string[] = [];
    if (Array.isArray(parsed.queries)) {
      queries = parsed.queries;
    } else if (typeof parsed === 'object') {
      // Try to find queries in any array property
      const arrKeys = Object.keys(parsed).filter(k => Array.isArray(parsed[k]));
      if (arrKeys.length > 0) {
        queries = parsed[arrKeys[0]];
      }
    }

    // Validate and clean queries
    queries = queries
      .filter((q: any) => typeof q === 'string' && q.trim().length > 0)
      .map((q: string) => q.trim())
      .slice(0, 5); // Limit to 5 queries max

    if (queries.length === 0) {
      // Fallback: create a simple query from the topic
      queries = [researchTopic];
    }

    return {
      queries,
      existingResearch: existingDocs.length > 0 ? existingResearchSummary : undefined,
    };
  } catch (error) {
    console.error('[planResearchQueriesStep] Error planning queries:', error);
    // Fallback: return topic as single query
    return { queries: [researchTopic] };
  }
}

/**
 * Execute a research step: search, scrape, and store content
 */
export async function executeResearchStep(agentId: string, query: string, sessionId: string, userId?: string | null) {

  const { searchAndScrape, resolveFirecrawlKey } = await import('@/lib/integrations/firecrawl');
  const { storeMarkdown, searchMemories } = await import('@/lib/integrations/supermemory');

  const firecrawlKey = await resolveFirecrawlKey(userId);
  const result = await searchAndScrape({
    query,
    limit: 3,
    apiKey: firecrawlKey,
    scrapeOptions: { formats: ['markdown', 'links'] },
  });
  
  const leads: Array<{ url: string; title?: string; providerId?: string }> = [];
  
  for (const item of result.items) {
    if (!item.url) continue;
    
    // Check for duplicate URL in Supermemory before storing
    try {
      const existingDocs = await searchMemories(agentId, item.url, 1, userId);
      const isDuplicate = existingDocs.some(doc => doc.metadata?.url === item.url);
      
      if (isDuplicate) {
        console.log(`[executeResearchStep] ⚠️ Skipping duplicate URL: ${item.url}`);
        continue;
      }
    } catch (error) {
      // If search fails, continue anyway (better to store than skip)
      console.warn(`[executeResearchStep] Failed to check for duplicates:`, error instanceof Error ? error.message : String(error));
    }
    
    const md = (item.markdown ?? '').slice(0, 40000);
    if (md.length > 0) {
      try {
        const stored = await storeMarkdown({
          agentId,
          url: item.url,
          title: item.title,
          markdown: md,
          userId: userId || undefined,
        });
        if (stored.memoryId) {
          console.log(`[executeResearchStep] ✅ Stored: ${item.title || item.url} (memoryId: ${stored.memoryId})`);
        }
        leads.push({ url: item.url, title: item.title, providerId: stored.providerId });
      } catch (error) {
        console.error(`[executeResearchStep] ❌ Failed to store ${item.url}:`, error instanceof Error ? error.message : String(error));
        // Continue processing other items even if one fails
        leads.push({ url: item.url, title: item.title });
      }
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
export async function executeBrowserStep(agentId: string, task: string, maxSteps?: number, userId?: string | null) {

  // Browser automation using Browser-Use SDK
  const { BrowserUseClient } = await import('browser-use-sdk');
  const { resolveBrowserUseKey } = await import('@/lib/integrations/browser-use');

  const apiKey = await resolveBrowserUseKey(userId);
  if (!apiKey) {
    return { success: false, error: 'BROWSER_USE_API_KEY not configured' };
  }

  const browserClient = new BrowserUseClient({ apiKey });
  
  try {
    const idempotencyKey = crypto.randomUUID();

    const browserTask = await browserClient.tasks.createTask({
      task,
      maxSteps: maxSteps ?? 10,
      metadata: { idempotencyKey },
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

  // Ensure payload is never null/undefined (DB constraint requires non-null)
  const safePayload = payload || {};
  
  await sql`
    INSERT INTO activities (agent_id, type, status, payload)
    VALUES (${agentId}, ${type}, ${status}, ${JSON.stringify(safePayload)})
  `;
}

/**
 * Start a research session
 */
export async function startResearchSessionStep(agentId: string, title: string) {

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
  
  console.log(`[completeResearchSessionStep] Completing session ${sessionId} with summary length: ${summary.length}`);
}

/**
 * Auto-complete research session if it has research content but no summary
 * This is used as a fallback when workflow ends without explicit completion
 */
export async function autoCompleteResearchSessionStep(sessionId: string) {

  const [row] = await sql<any[]>`
    SELECT payload, status FROM activities WHERE id = ${sessionId}
  `;
  
  if (!row || row.status === 'completed') {
    return { skipped: true, reason: 'Session not found or already completed' };
  }
  
  const payload = (row.payload ?? {}) as Record<string, any>;
  const notes: string[] = Array.isArray(payload.notes) ? payload.notes : [];
  const queries: string[] = Array.isArray(payload.queries) ? payload.queries : [];
  
  // Only auto-complete if there's actual research content
  if (notes.length === 0 && queries.length === 0) {
    return { skipped: true, reason: 'No research content found' };
  }
  
  // Generate summary using AI
  const { generateSummary } = await import('@/lib/ai/utils');
  const summary = await generateSummary(notes.join('\n\n'), `Queries: ${queries.join('; ')}`);
  
  // Complete the session
  await completeResearchSessionStep(sessionId, summary);
  
  return { success: true, sessionId, summaryLength: summary.length };
}

/**
 * Fetch agent from database
 */
export async function fetchAgentStep(agentId: string) {

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

  await sql`
    UPDATE agents
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${agentId}
  `;
}

/**
 * Get chat history and context for agent
 */
export async function getAgentContextStep(agentId: string, historyLimit: number = 20, contextLimit: number = 5, userId?: string | null) {

  const history = await getLastChatTurns(agentId, historyLimit);
  const researchContext = await getRecentResearchContext(agentId, contextLimit);
  const memoryContext = await getRecentMemoriesContext(agentId, contextLimit, userId);
  const pending = await hasPendingUserInput(agentId);
  
  // Ensure history is fully serializable (map to plain objects)
  const serializedHistory = history.map((msg: any) => ({
    role: msg.role,
    content: msg.content,
  }));
  
  return {
    history: serializedHistory,
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

  await updateAgentStatusStep(agentId, {
    status: 'idle',
    currentStep: 0,
    totalSteps: 0,
    currentActivity: null,
    currentTool: null,
  });
}

/**
 * Check if agent is still enabled. Returns true if enabled, false if disabled.
 * Used at the start of each workflow loop iteration for graceful shutdown.
 */
export async function checkAgentEnabledStep(agentId: string): Promise<boolean> {

  const rows = await sql<any[]>`SELECT enabled FROM agents WHERE id = ${agentId}`;
  if (rows.length === 0) return false;
  return rows[0].enabled === true;
}

/**
 * Execute one LLM decision cycle using raw OpenAI API (bypassing AI SDK tool wrappers).
 * Uses the modular tool registry from lib/ai/tools/.
 * Returns serializable state deltas and finish reason.
 */
export async function executeLLMDecisionStep(args: {
  agentId: string;
  userId?: string | null;
  modelProvider?: string | null;
  modelId?: string | null;
  systemPrompt: string;
  history: Array<any>;
  researchContext?: string | null;
  memoryContext?: string | null;
  userPrompt: string;
  enabledTools: string[];
  currentSessionId: string | null;
  researchStarted: boolean;
}) {

  const { agentId, userId, systemPrompt, history, researchContext, memoryContext, userPrompt } = args;

  // Resolve provider config (supports OpenAI, Anthropic, etc.)
  const { resolveProviderConfig, createProvider } = await import('@/lib/ai/providers');
  const providerConfig = await resolveProviderConfig(args.modelProvider, args.modelId, userId);
  const provider = createProvider(providerConfig);

  // Collect tools from modular registry based on agent config
  const { collectTools } = await import('@/lib/ai/tools/registry');
  const { definitions: tools, handlers } = collectTools(args.enabledTools, userId);

  // Shared mutable context for tool handlers
  const toolContext = {
    agentId,
    userId: userId || null,
    enabledTools: args.enabledTools,
    modelProvider: args.modelProvider,
    modelId: args.modelId,
    systemPrompt,
    state: {
      awaitingHumanInput: false,
      currentSessionId: args.currentSessionId,
      researchStarted: args.researchStarted,
      researchSessionCompleted: false,
      usedSendMessage: false,
    },
  };

  // Build messages array
  const messages: Array<any> = [
    { role: 'system', content: systemPrompt },
    ...history,
  ];

  if (researchContext) {
    messages.push({ role: 'user', content: researchContext });
  }
  if (memoryContext) {
    messages.push({ role: 'user', content: memoryContext });
  }
  messages.push({ role: 'user', content: userPrompt });

  // Multi-turn conversation loop (like AI SDK maxSteps behavior)
  const conversationMessages = [...messages];
  let lastFinishReason = 'stop';
  let lastAssistantText: string | null = null;
  const maxTurns = 5; // Reduced to 5 to avoid timeout (each turn can take 10-20s with tool calls)

  for (let turn = 0; turn < maxTurns; turn++) {
    // Call LLM via provider abstraction
    const completion = await provider.createCompletion({
      model: providerConfig.model,
      messages: conversationMessages,
      tools,
      tool_choice: 'auto',
    });

    const message = completion.message;
    lastFinishReason = completion.finishReason || 'stop';

    // Log what the model returned (minimal)
    if (message?.tool_calls?.length) {
      console.log(`[LLM Turn ${turn + 1}] ${message.tool_calls.length} tool call(s)`);
    }

    // Add assistant message to conversation (serialize to plain object)
    if (message) {
      conversationMessages.push({
        role: 'assistant',
        content: message.content,
        tool_calls: message.tool_calls,
      });
      // Track latest assistant text for auto-persistence
      if (typeof message.content === 'string' && message.content.trim()) {
        lastAssistantText = message.content.trim();
      }
    }

    // If no tool calls, we're done
    if (!message?.tool_calls || message.tool_calls.length === 0) {
      break;
    }

    // Execute tool calls via registry handlers
    const toolResults: Array<any> = [];

    for (const toolCall of message.tool_calls) {
      const functionName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments);

      // Log research-related tool calls
      if (functionName === 'firecrawlResearch' || functionName === 'planResearchQueries') {
        console.log(`[Tool] ${functionName}:`, toolArgs.query || toolArgs.researchTopic || 'N/A');
      }

      const handler = handlers.get(functionName);
      let result: any;

      if (handler) {
        result = await handler(toolArgs, toolContext);
      } else {
        result = { success: false, error: `Unknown tool: ${functionName}` };
      }

      // Add tool result to conversation
      toolResults.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        name: functionName,
        content: JSON.stringify(result),
      });
    }

    // Add all tool results to conversation
    conversationMessages.push(...toolResults);

    // If any tool signaled HITL pause, break out of the multi-turn loop
    if (toolContext.state.awaitingHumanInput) break;
  }

  // Auto-persist final LLM text as agent_message if sendMessage wasn't explicitly used
  if (lastAssistantText && !toolContext.state.usedSendMessage) {
    try {
      await logActivityStep(agentId, 'agent_message', { content: lastAssistantText });
    } catch (e) {
      console.error('[executeLLMDecisionStep] Failed to auto-persist LLM text:', e);
    }
  }

  // Return serializable data only
  return {
    finishReason: lastFinishReason,
    currentSessionId: toolContext.state.currentSessionId,
    researchStarted: toolContext.state.researchStarted,
    researchSessionCompleted: toolContext.state.researchSessionCompleted,
    awaitingHumanInput: toolContext.state.awaitingHumanInput,
  };
}

/**
 * Load soul.md and preferences.md from Google Drive for memory context injection.
 * Returns nulls gracefully if Drive is not configured or files don't exist yet.
 */
export async function loadMemoryContextStep(
  userId: string | null,
  agentId: string
): Promise<{ soulMd: string | null; preferencesMd: string | null }> {

  if (!userId) {
    return { soulMd: null, preferencesMd: null };
  }

  try {
    const { readMemoryFile } = await import('@/lib/integrations/google-drive');
    const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T | null> =>
      Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
    const [soulMd, preferencesMd] = await Promise.all([
      withTimeout(readMemoryFile(userId, agentId, 'soul.md'), 10000).catch(() => null),
      withTimeout(readMemoryFile(userId, agentId, 'preferences.md'), 10000).catch(() => null),
    ]);
    return { soulMd: soulMd || null, preferencesMd: preferencesMd || null };
  } catch {
    return { soulMd: null, preferencesMd: null };
  }
}

/**
 * Pre-flight validation: check whether each tool in enabledTools
 * has its underlying integration configured (DB tool_configs or env var).
 * Returns { valid, missing } — does NOT block, just reports.
 */
export async function validateToolConfigsStep(
  userId: string | null,
  enabledTools: string[]
): Promise<{ valid: boolean; missing: string[] }> {

  if (!userId || enabledTools.length === 0) {
    return { valid: true, missing: [] };
  }

  // Fetch all configured tool_configs for this user
  const rows = await sql<{ tool: string }[]>`
    SELECT tool FROM tool_configs WHERE user_id = ${userId}
  `;
  const configuredTools = new Set(rows.map(r => r.tool));

  const missing: string[] = [];

  for (const tool of enabledTools) {
    switch (tool) {
      case 'google':
        if (!configuredTools.has('google_oauth')) {
          missing.push('google');
        }
        break;
      case 'firecrawl':
        if (!configuredTools.has('firecrawl') && !process.env.FIRECRAWL_API_KEY) {
          missing.push('firecrawl');
        }
        break;
      case 'supermemory':
        if (!configuredTools.has('supermemory') && !process.env.SUPERMEMORY_API_KEY) {
          missing.push('supermemory');
        }
        break;
      case 'browser':
        if (!configuredTools.has('browser_use') && !process.env.BROWSER_USE_API_KEY) {
          missing.push('browser');
        }
        break;
      case 'telegram':
        if (!configuredTools.has('telegram') && !process.env.TELEGRAM_BOT_TOKEN) {
          missing.push('telegram');
        }
        break;
    }
  }

  return { valid: missing.length === 0, missing };
}

