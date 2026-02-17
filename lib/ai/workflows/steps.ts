/**
 * Workflow steps - reusable durable units of work
 * Each step is marked with 'use step' for automatic retries and durability
 */

import { sql } from '@/lib/db';
import { getLastChatTurns, hasPendingUserInput } from '../chat-history';
import { getRecentResearchContext, getRecentMemoriesContext } from '../research-context';
import { userInputHook, phoneCallHook, emailApprovalHook, activityApprovalHook } from './hooks';
import { getStepMetadata } from 'workflow';

/**
 * Plan research queries by decomposing a topic into focused search queries,
 * checking Supermemory for existing research to avoid duplication
 */
export async function planResearchQueriesStep(
  agentId: string,
  researchTopic: string,
  systemPrompt?: string
): Promise<{ queries: string[]; existingResearch?: string }> {
  'use step';

  const { searchMemories } = await import('@/lib/integrations/supermemory');
  
  // Search Supermemory for existing research on this topic
  const existingDocs = await searchMemories(agentId, researchTopic, 10);
  
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

  // Use LLM to decompose topic into focused search queries
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

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
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: [
        {
          role: 'system',
          content: 'You are a research query planner. Always return a JSON object with a "queries" array property containing search query strings.',
        },
        { role: 'user', content: planningPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
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
export async function executeResearchStep(agentId: string, query: string, sessionId: string) {
  'use step';
  
  const { searchAndScrape } = await import('@/lib/integrations/firecrawl');
  const { storeMarkdown, searchMemories } = await import('@/lib/integrations/supermemory');
  
  const result = await searchAndScrape({ 
    query, 
    limit: 3, 
    scrapeOptions: { formats: ['markdown', 'links'] } 
  });
  
  const leads: Array<{ url: string; title?: string; providerId?: string }> = [];
  
  for (const item of result.items) {
    if (!item.url) continue;
    
    // Check for duplicate URL in Supermemory before storing
    try {
      const existingDocs = await searchMemories(agentId, item.url, 1);
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
          markdown: md 
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
  
  console.log(`[completeResearchSessionStep] Completing session ${sessionId} with summary length: ${summary.length}`);
}

/**
 * Auto-complete research session if it has research content but no summary
 * This is used as a fallback when workflow ends without explicit completion
 */
export async function autoCompleteResearchSessionStep(sessionId: string) {
  'use step';
  
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
 * Execute one LLM decision cycle using raw OpenAI API (bypassing AI SDK tool wrappers).
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
  let researchSessionCompleted = false;

  // Use raw OpenAI SDK to avoid AI SDK serialization issues
  const { default: OpenAI } = await import('openai');
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  // Define tools in raw OpenAI format (JSON Schema)
  const tools: Array<any> = [
    {
      type: 'function',
      function: {
        name: 'startResearchSession',
        description: 'Start a new research session and initialize tracking',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title for the research session' },
          },
          required: ['title'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'planResearchQueries',
        description: 'Decompose a research topic into focused search queries. This tool checks Supermemory for existing research to avoid duplication and generates 3-5 high-quality search queries that explore different angles. Use this BEFORE calling firecrawlResearch to ensure better query quality and avoid redundant research.',
        parameters: {
          type: 'object',
          properties: {
            researchTopic: { 
              type: 'string',
              description: 'The research topic or title to decompose into focused search queries',
            },
          },
          required: ['researchTopic'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'firecrawlResearch',
        description: 'Search and scrape the web using a focused query. For best results, first use planResearchQueries to get optimized queries based on existing research. Call multiple times with different queries to explore various angles.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 3, default: 3 },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'completeResearchSession',
        description: `Finalize a research session with a comprehensive summary. After completing a session, you MUST analyze what you've learned, identify knowledge gaps in your system prompt, and plan your next research session. If unclear about priorities, use askUser to seek guidance before starting a new session. This is part of your continuous research process - do NOT stop after completing one session.`,
        parameters: {
          type: 'object',
          properties: {
            summary: { 
              type: 'string',
              description: 'Comprehensive markdown summary synthesizing all findings from this research session. Include key insights, citations, and structured information.',
            },
          },
          required: ['summary'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'logActivity',
        description: 'Log a completed activity to the database. Use this to record important events like completed research, viewed webpages, tasks done, etc.',
        parameters: {
          type: 'object',
          properties: {
            type: { 
              type: 'string',
              enum: [
                'research',
                'email_sent',
                'phone_call',
                'webpage_viewed',
                'journal_read',
                'task_completed',
                'agent_stopped',
              ],
              description: 'Type of activity being logged',
            },
            payload: { 
              type: 'object', 
              additionalProperties: true,
              description: 'Activity details (title, description, url, etc.)',
            },
          },
          required: ['type', 'payload'],
          additionalProperties: false,
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'askUser',
        description: 'Ask the user a question when you need clarification, especially about research priorities or directions. Use this when: (1) you\'ve completed a research session and need guidance on what to research next, (2) you\'re unsure which research direction to pursue, (3) multiple valid research paths exist and you need user preference. The workflow will pause until answered. DO NOT ask questions only in text - use this tool.',
        parameters: {
          type: 'object',
          properties: {
            question: { 
              type: 'string',
              description: 'Your question to the user. Be specific about what you need clarification on, especially regarding research priorities or next steps.',
            },
            priority: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
          },
          required: ['question'],
          additionalProperties: false,
        },
      },
    },
  ];

  // Conditionally add Google tools (email + calendar)
  if (args.enabledTools.includes('google')) {
    tools.push(
      {
        type: 'function',
        function: {
          name: 'sendEmail',
          description: 'Send an email via Gmail. Requires HITL approval — the workflow will pause until the user approves.',
          parameters: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Recipient email address' },
              subject: { type: 'string', description: 'Email subject line' },
              body: { type: 'string', description: 'Email body (HTML supported)' },
              cc: { type: 'string', description: 'CC email address (optional)' },
              bcc: { type: 'string', description: 'BCC email address (optional)' },
            },
            required: ['to', 'subject', 'body'],
            additionalProperties: false,
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'searchEmails',
          description: 'Search Gmail for emails matching a query. Returns subject, from, date, and snippet.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Gmail search query (e.g., "from:user@example.com subject:invoice")' },
              maxResults: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
            },
            required: ['query'],
            additionalProperties: false,
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'createCalendarEvent',
          description: 'Create a Google Calendar event. Requires HITL approval — the workflow will pause until the user approves.',
          parameters: {
            type: 'object',
            properties: {
              summary: { type: 'string', description: 'Event title' },
              start: { type: 'string', description: 'Start time in ISO 8601 format (e.g., "2026-03-01T10:00:00-05:00")' },
              end: { type: 'string', description: 'End time in ISO 8601 format' },
              description: { type: 'string', description: 'Event description (optional)' },
              location: { type: 'string', description: 'Event location (optional)' },
              attendees: { type: 'array', items: { type: 'string' }, description: 'Attendee email addresses (optional)' },
            },
            required: ['summary', 'start', 'end'],
            additionalProperties: false,
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'listCalendarEvents',
          description: 'List upcoming Google Calendar events.',
          parameters: {
            type: 'object',
            properties: {
              timeMin: { type: 'string', description: 'Start of time range in ISO 8601 (defaults to now)' },
              timeMax: { type: 'string', description: 'End of time range in ISO 8601 (optional)' },
              maxResults: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
            },
            additionalProperties: false,
          },
        },
      }
    );
  }

  // Conditionally add browser tool
  if (args.enabledTools.includes('browser')) {
    tools.push({
      type: 'function',
      function: {
        name: 'browserTask',
        description: 'Execute browser automation tasks',
        parameters: {
          type: 'object',
          properties: {
            task: { type: 'string' },
            maxSteps: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
          },
          required: ['task'],
          additionalProperties: false,
        },
      },
    });
  }

  // Conditionally add Telegram tool
  if (args.enabledTools.includes('telegram')) {
    tools.push({
      type: 'function',
      function: {
        name: 'sendTelegramMessage',
        description: 'Send a message to a linked Telegram user. If chatId is not provided, looks up the linked chat from telegram_users table.',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Message text to send' },
            chatId: { type: 'number', description: 'Telegram chat ID (optional — auto-resolved from linked users if omitted)' },
            parseMode: { type: 'string', enum: ['HTML', 'MarkdownV2'], description: 'Message format (optional)' },
          },
          required: ['text'],
          additionalProperties: false,
        },
      },
    });
  }

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
  const maxTurns = 5; // Reduced to 5 to avoid timeout (each turn can take 10-20s with tool calls)
  
  // Minimal logging for key steps
  
  for (let turn = 0; turn < maxTurns; turn++) {
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.2-2025-12-11',
      messages: conversationMessages,
      tools,
      tool_choice: 'auto',
    });

    const message = completion.choices[0]?.message;
    lastFinishReason = message?.finish_reason || 'stop';
    
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
    }
    
    // If no tool calls, we're done
    if (!message?.tool_calls || message.tool_calls.length === 0) {
      break;
    }
    
    // Execute tool calls and collect results
    const toolResults: Array<any> = [];
    
    for (const toolCall of message.tool_calls) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      // Only log tool calls for memory-related operations
      if (functionName === 'firecrawlResearch' || functionName === 'planResearchQueries') {
        console.log(`[Tool] ${functionName}:`, args.query || args.researchTopic || 'N/A');
      }
      let result: any = { success: false, error: 'Unknown tool' };

      // Execute the appropriate tool
      switch (functionName) {
        case 'startResearchSession': {
          const res = await startResearchSessionStep(agentId, args.title);
          currentSessionId = res.session_id;
          researchStarted = false;
          result = { success: true, session_id: currentSessionId };
          break;
        }
        case 'planResearchQueries': {
          const planResult = await planResearchQueriesStep(agentId, args.researchTopic, systemPrompt);
          result = {
            success: true,
            queries: planResult.queries,
            existingResearch: planResult.existingResearch,
            message: `Planned ${planResult.queries.length} focused queries. ${planResult.existingResearch ? 'Found existing research - queries are designed to avoid duplication and explore new angles.' : 'No existing research found - queries explore the topic broadly.'}`,
          };
          break;
        }
        case 'firecrawlResearch': {
          if (!currentSessionId) {
            result = { success: false, error: 'No active session' };
          } else {
            researchStarted = true;
            try {
              const res = await executeResearchStep(agentId, args.query, currentSessionId);
              const links = res.leads.map((l: any) => l.url);
              const notes = res.leads.map((l: any) => `${l.title}: ${l.url}`);
              await appendToSessionStep(currentSessionId, args.query, links, notes);
              result = { success: true, itemsScraped: res.itemsScraped, session_id: currentSessionId, leadsCount: res.leads.length };
            } catch (error) {
              console.error(`[firecrawlResearch] Error:`, error instanceof Error ? error.message : String(error));
              result = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
          }
          break;
        }
        case 'completeResearchSession': {
          if (!currentSessionId) {
            result = { success: false, error: 'No active session' };
          } else {
            await completeResearchSessionStep(currentSessionId, args.summary);
            const completedId = currentSessionId;
            currentSessionId = null;
            researchStarted = false;
            researchSessionCompleted = true; // Mark that a session was just completed
            result = { success: true, session_id: completedId };
          }
          break;
        }
        case 'logActivity': {
          // Validate activity type
          const validTypes = [
            'research', 'email_sent', 'phone_call', 'webpage_viewed',
            'journal_read', 'task_completed', 'agent_stopped'
          ];
          
          if (!validTypes.includes(args.type)) {
            result = { 
              success: false, 
              error: `Invalid activity type: ${args.type}. Must be one of: ${validTypes.join(', ')}` 
            };
            break;
          }
          
          // Ensure payload is never null/undefined
          const payload = args.payload || {};
          await logActivityStep(agentId, args.type, payload);
          result = { success: true };
          break;
        }
        case 'askUser': {
          const { stepId } = getStepMetadata();
          const activityId = await createPendingActivityStep(
            agentId,
            'user_input',
            args.priority || 'medium',
            { question: args.question }
          );

          await updateAgentStatusStep(agentId, {
            status: 'active',
            currentActivity: 'Waiting for user input',
            currentTool: 'askUser',
          });

          // Use stepId in token for idempotency
          const token = `agent-${agentId}-activity-${activityId}-step-${stepId}`;
          
          // Check if activity is already approved (in case of replay)
          const [existingActivity] = await sql<any[]>`
            SELECT status, payload FROM activities WHERE id = ${activityId}
          `;
          
          if (existingActivity?.status === 'approved' && existingActivity?.payload?.answer) {
            // Already answered, return existing answer
            result = { success: true, answer: existingActivity.payload.answer };
          } else {
            // Wait for user input via hook
            try {
              const events = userInputHook.create({ token });
              for await (const event of events) {
                await updateActivityStatusStep(event.activityId, 'approved', { answer: event.answer });
                result = { success: true, answer: event.answer };
                break;
              }
            } catch (error: any) {
              // Handle MessageNotFoundError - message was already consumed, check activity status
              if (error?.name === 'MessageNotFoundError' || error?.message?.includes('not found')) {
                const [recheckActivity] = await sql<any[]>`
                  SELECT status, payload FROM activities WHERE id = ${activityId}
                `;
                if (recheckActivity?.status === 'approved' && recheckActivity?.payload?.answer) {
                  result = { success: true, answer: recheckActivity.payload.answer };
                } else {
                  // Still pending, might be a transient error
                  result = { success: false, error: 'Failed to receive user input, please retry' };
                }
              } else {
                throw error;
              }
            }
          }
          break;
        }
        case 'browserTask': {
          result = await executeBrowserStep(agentId, args.task, args.maxSteps || 10);
          break;
        }
        case 'sendEmail': {
          // HITL: require approval before sending
          const emailActivityId = await createPendingActivityStep(
            agentId,
            'email_sent',
            'high',
            { to: args.to, subject: args.subject, body: args.body, cc: args.cc, bcc: args.bcc }
          );

          await updateAgentStatusStep(agentId, {
            status: 'active',
            currentActivity: `Waiting for approval to send email to ${args.to}`,
            currentTool: 'sendEmail',
          });

          const { stepId: emailStepId } = getStepMetadata();
          const emailToken = `agent-${agentId}-activity-${emailActivityId}-step-${emailStepId}`;

          try {
            const emailEvents = emailApprovalHook.create({ token: emailToken });
            for await (const event of emailEvents) {
              if (event.approved) {
                const { sendEmail: gmailSend } = await import('@/lib/integrations/google');
                const userId = 'mock-user-id';
                const emailResult = await gmailSend(userId, {
                  to: args.to,
                  subject: args.subject,
                  body: args.body,
                  cc: args.cc,
                  bcc: args.bcc,
                });
                await updateActivityStatusStep(emailActivityId, 'approved');
                result = { success: true, ...emailResult };
              } else {
                await updateActivityStatusStep(emailActivityId, 'rejected');
                result = { success: false, error: 'Email sending was rejected by user' };
              }
              break;
            }
          } catch (error: any) {
            result = { success: false, error: error?.message || 'Failed to get email approval' };
          }
          break;
        }
        case 'searchEmails': {
          try {
            const { listEmails } = await import('@/lib/integrations/google');
            const userId = 'mock-user-id';
            const emails = await listEmails(userId, {
              query: args.query,
              maxResults: args.maxResults || 10,
            });
            result = { success: true, emails, count: emails.length };
          } catch (error: any) {
            result = { success: false, error: error?.message || 'Failed to search emails' };
          }
          break;
        }
        case 'createCalendarEvent': {
          // HITL: require approval before creating event
          const calActivityId = await createPendingActivityStep(
            agentId,
            'calendar_event_added',
            'high',
            { summary: args.summary, start: args.start, end: args.end, description: args.description, attendees: args.attendees }
          );

          await updateAgentStatusStep(agentId, {
            status: 'active',
            currentActivity: `Waiting for approval to create event: ${args.summary}`,
            currentTool: 'createCalendarEvent',
          });

          const { stepId: calStepId } = getStepMetadata();
          const calToken = `agent-${agentId}-activity-${calActivityId}-step-${calStepId}`;

          try {
            const calEvents = activityApprovalHook.create({ token: calToken });
            for await (const event of calEvents) {
              if (event.approved) {
                const { createCalendarEvent: gcalCreate } = await import('@/lib/integrations/google');
                const userId = 'mock-user-id';
                const calResult = await gcalCreate(userId, {
                  summary: args.summary,
                  start: args.start,
                  end: args.end,
                  description: args.description,
                  location: args.location,
                  attendees: args.attendees,
                });
                await updateActivityStatusStep(calActivityId, 'approved');
                result = { success: true, ...calResult };
              } else {
                await updateActivityStatusStep(calActivityId, 'rejected');
                result = { success: false, error: 'Calendar event creation was rejected by user' };
              }
              break;
            }
          } catch (error: any) {
            result = { success: false, error: error?.message || 'Failed to get calendar event approval' };
          }
          break;
        }
        case 'listCalendarEvents': {
          try {
            const { listCalendarEvents: gcalList } = await import('@/lib/integrations/google');
            const userId = 'mock-user-id';
            const events = await gcalList(userId, {
              timeMin: args.timeMin,
              timeMax: args.timeMax,
              maxResults: args.maxResults || 20,
            });
            result = { success: true, events, count: events.length };
          } catch (error: any) {
            result = { success: false, error: error?.message || 'Failed to list calendar events' };
          }
          break;
        }
        case 'sendTelegramMessage': {
          try {
            const { sendTelegramMessage: tgSend } = await import('@/lib/integrations/telegram');

            let chatId = args.chatId;
            if (!chatId) {
              // Look up linked Telegram user for this agent
              const rows = await sql<any[]>`
                SELECT telegram_user_id FROM telegram_users
                WHERE agent_id = ${agentId}
                LIMIT 1
              `;
              if (rows.length === 0) {
                result = { success: false, error: 'No Telegram user linked to this agent. User must /start the bot first.' };
                break;
              }
              chatId = rows[0].telegram_user_id;
            }

            const tgResult = await tgSend({ chatId, text: args.text, parseMode: args.parseMode });

            // Log activity
            await logActivityStep(agentId, 'telegram_message_sent', {
              chatId,
              text: args.text,
              messageId: tgResult.messageId,
            });

            result = { success: true, ...tgResult };
          } catch (error: any) {
            result = { success: false, error: error?.message || 'Failed to send Telegram message' };
          }
          break;
        }
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
  }

  // Return serializable data only
  return {
    finishReason: lastFinishReason,
    currentSessionId,
    researchStarted,
    researchSessionCompleted,
  };
}

