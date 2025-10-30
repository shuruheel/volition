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
      console.log(`[executeResearchStep] Stored memory for ${item.url}, memoryId: ${stored.memoryId}`);
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
 * TEST: Execute one LLM decision cycle using AI SDK with workflow fetch.
 * This tests if we can use AI SDK's generateText with maxSteps instead of manual loops.
 */
export async function executeLLMDecisionStepV2(args: {
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
  let currentSessionId = args.currentSessionId;
  let researchStarted = args.researchStarted;
  let researchSessionCompleted = false;

  // CRITICAL: Set workflow's fetch for AI SDK to automatically create steps
  const { fetch: workflowFetch } = await import('workflow');
  globalThis.fetch = workflowFetch;

  // Dynamically import AI SDK and OpenAI provider
  const { generateText } = await import('ai');
  const { openai } = await import('@ai-sdk/openai');
  const { tool } = await import('ai');
  const { z } = await import('zod');

  // Build messages array
  const messages: Array<any> = [];
  if (history && history.length > 0) {
    messages.push(...history);
  }
  if (researchContext) {
    messages.push({ role: 'user', content: researchContext });
  }
  if (memoryContext) {
    messages.push({ role: 'user', content: memoryContext });
  }
  messages.push({ role: 'user', content: userPrompt });

  // Define tools using AI SDK tool() helper - these will call step functions directly
  const tools: Record<string, any> = {
    startResearchSession: tool({
      description: 'Start a new research session and initialize tracking',
      inputSchema: z.object({
        title: z.string().describe('Title for the research session'),
      }),
      execute: async ({ title }) => {
        const res = await startResearchSessionStep(agentId, title);
        currentSessionId = res.session_id;
        researchStarted = false;
        return { success: true, session_id: currentSessionId };
      },
    }),

    firecrawlResearch: tool({
      description: 'Search and scrape the web; call multiple times with focused queries',
      inputSchema: z.object({
        query: z.string(),
        limit: z.number().int().min(1).max(3).default(3),
      }),
      execute: async ({ query }) => {
        if (!currentSessionId) {
          return { success: false, error: 'No active session' };
        }
        researchStarted = true;
        const res = await executeResearchStep(agentId, query, currentSessionId);
        const links = res.leads.map((l: any) => l.url);
        const notes = res.leads.map((l: any) => `${l.title}: ${l.url}`);
        await appendToSessionStep(currentSessionId, query, links, notes);
        return { success: true, itemsScraped: res.itemsScraped, session_id: currentSessionId };
      },
    }),

    completeResearchSession: tool({
      description: `Finalize a research session with a comprehensive summary. After completing a session, you MUST analyze what you've learned, identify knowledge gaps in your system prompt, and plan your next research session. If unclear about priorities, use askUser to seek guidance before starting a new session. This is part of your continuous research process - do NOT stop after completing one session.`,
      inputSchema: z.object({
        summary: z.string().describe('Comprehensive markdown summary synthesizing all findings from this research session. Include key insights, citations, and structured information.'),
      }),
      execute: async ({ summary }) => {
        if (!currentSessionId) {
          return { success: false, error: 'No active session' };
        }
        await completeResearchSessionStep(currentSessionId, summary);
        const completedId = currentSessionId;
        currentSessionId = null;
        researchStarted = false;
        researchSessionCompleted = true;
        return { success: true, session_id: completedId };
      },
    }),

    askUser: tool({
      description: 'Ask the user a question when you need clarification, especially about research priorities or directions. The workflow will pause until answered.',
      inputSchema: z.object({
        question: z.string().describe('Your question to the user. Be specific about what you need clarification on, especially regarding research priorities or next steps.'),
        priority: z.enum(['low', 'medium', 'high']).default('medium'),
      }),
      execute: async ({ question, priority }) => {
        const { stepId } = getStepMetadata();
        const activityId = await createPendingActivityStep(
          agentId,
          'user_input',
          priority || 'medium',
          { question }
        );

        await updateAgentStatusStep(agentId, {
          status: 'active',
          currentActivity: 'Waiting for user input',
          currentTool: 'askUser',
        });

        const token = `agent-${agentId}-activity-${activityId}-step-${stepId}`;
        
        const [existingActivity] = await sql<any[]>`
          SELECT status, payload FROM activities WHERE id = ${activityId}
        `;
        
        if (existingActivity?.status === 'approved' && existingActivity?.payload?.answer) {
          return { success: true, answer: existingActivity.payload.answer };
        }

        try {
          const events = userInputHook.create({ token });
          for await (const event of events) {
            await updateActivityStatusStep(event.activityId, 'approved', { answer: event.answer });
            return { success: true, answer: event.answer };
          }
        } catch (error: any) {
          if (error?.name === 'MessageNotFoundError' || error?.message?.includes('not found')) {
            const [recheckActivity] = await sql<any[]>`
              SELECT status, payload FROM activities WHERE id = ${activityId}
            `;
            if (recheckActivity?.status === 'approved' && recheckActivity?.payload?.answer) {
              return { success: true, answer: recheckActivity.payload.answer };
            }
            return { success: false, error: 'Failed to receive user input, please retry' };
          }
          throw error;
        }
        return { success: false, error: 'No user input received' };
      },
    }),

    logActivity: tool({
      description: 'Log a completed activity to the database',
      inputSchema: z.object({
        type: z.enum([
          'research',
          'email_sent',
          'phone_call',
          'webpage_viewed',
          'journal_read',
          'task_completed',
          'agent_stopped',
        ]),
        payload: z.record(z.any()),
      }),
      execute: async ({ type, payload }) => {
        await logActivityStep(agentId, type, payload || {});
        return { success: true };
      },
    }),
  };

  // Add browser tool if enabled
  if (args.enabledTools.includes('browser')) {
    tools.browserTask = tool({
      description: 'Execute a browser automation task',
      inputSchema: z.object({
        task: z.string(),
        maxSteps: z.number().int().min(1).max(20).default(10),
      }),
      execute: async ({ task, maxSteps }) => {
        return await executeBrowserStep(agentId, task, maxSteps);
      },
    });
  }

  // Use AI SDK's generateText with maxSteps - this should automatically create steps
  console.log(`[executeLLMDecisionStepV2] Starting with ${messages.length} messages`);
  console.log(`[executeLLMDecisionStepV2] System prompt length: ${systemPrompt.length} chars`);
  console.log(`[executeLLMDecisionStepV2] Using AI SDK generateText with maxSteps=40`);

  try {
    const { stepCountIs } = await import('ai');
    const result = await generateText({
      model: openai('gpt-5-2025-08-07'),
      system: systemPrompt,
      messages,
      tools,
      stopWhen: stepCountIs(40), // Use stopWhen instead of maxSteps
      experimental_context: {
        agentId,
        get currentSessionId() { return currentSessionId },
      },
    });

    console.log(`[executeLLMDecisionStepV2] Completed with finishReason: ${result.finishReason}`);
    console.log(`[executeLLMDecisionStepV2] Steps used: ${result.steps?.length || 0}`);

    // Check if research session was completed by checking if currentSessionId was cleared
    // (completeResearchSession sets currentSessionId to null)
    const sessionWasCompleted = args.currentSessionId && !currentSessionId;
    if (sessionWasCompleted) {
      researchSessionCompleted = true;
    }

    // Return serializable data only
    return {
      finishReason: result.finishReason || 'stop',
      currentSessionId,
      researchStarted,
      researchSessionCompleted,
    };
  } catch (error) {
    console.error('[executeLLMDecisionStepV2] Error:', error);
    throw error;
  }
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
        name: 'firecrawlResearch',
        description: 'Search and scrape the web; call multiple times with focused queries',
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
  const maxTurns = 40; // Allow up to 40 tool call rounds per workflow step
  
  // Log initial state for debugging
  console.log(`[executeLLMDecisionStep] Starting with ${conversationMessages.length} messages`);
  console.log(`[executeLLMDecisionStep] System prompt length: ${systemPrompt.length} chars`);
  console.log(`[executeLLMDecisionStep] User prompt: ${userPrompt}`);
  console.log(`[executeLLMDecisionStep] Available tools: ${args.enabledTools.join(', ')}`);
  console.log(`[executeLLMDecisionStep] Tools count: ${tools.length}`);
  
  for (let turn = 0; turn < maxTurns; turn++) {
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-2025-08-07', // Use latest gpt-4o with strong tool calling
      messages: conversationMessages,
      tools,
      tool_choice: 'auto',
    });

    const message = completion.choices[0]?.message;
    lastFinishReason = message?.finish_reason || 'stop';
    
    // Log what the model returned for debugging
    console.log(`[LLM Turn ${turn + 1}] Finish reason: ${lastFinishReason}`);
    console.log(`[LLM Turn ${turn + 1}] Tool calls: ${message?.tool_calls?.length || 0}`);
    if (message?.content) {
      console.log(`[LLM Turn ${turn + 1}] Content: ${message.content?.substring(0, 150)}...`);
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
      console.log(`[LLM Turn ${turn + 1}] No tool calls, ending conversation loop`);
      break;
    }
    
    console.log(`[LLM Turn ${turn + 1}] Executing ${message.tool_calls.length} tool call(s)...`);
    
    // Execute tool calls and collect results
    const toolResults: Array<any> = [];
    
    for (const toolCall of message.tool_calls) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      console.log(`[Tool Execution] Calling ${functionName} with args:`, args);
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
        case 'firecrawlResearch': {
          if (!currentSessionId) {
            result = { success: false, error: 'No active session' };
          } else {
            researchStarted = true;
            const res = await executeResearchStep(agentId, args.query, currentSessionId);
            const links = res.leads.map((l: any) => l.url);
            const notes = res.leads.map((l: any) => `${l.title}: ${l.url}`);
            await appendToSessionStep(currentSessionId, args.query, links, notes);
            result = { success: true, itemsScraped: res.itemsScraped, session_id: currentSessionId };
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

