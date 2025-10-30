import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { supermemoryTools } from '@supermemory/tools/ai-sdk';
import { browserTaskTool } from './tools/browser-task';
import { logActivityTool } from './tools/log-activity';
import { createPendingActivityTool } from './tools/create-pending-activity';
import { checkApprovalTool } from './tools/check-approval';
import { askUserTool } from './tools/ask-user';
import { planNextStepTool } from './tools/plan-next-step';
import { firecrawlResearchTool } from './tools/firecrawl-research';
import { startResearchSessionTool } from './tools/start-research-session';
import { completeResearchSessionTool } from './tools/complete-research-session';
import { searchAndScrape } from '@/lib/integrations/firecrawl';
import { storeMarkdown } from '@/lib/integrations/supermemory';
import { updateAgentStatus } from '@/lib/agent-status';
import { withHITLGuidelines } from './prompts';
import type { Agent } from '../db';
import { getLastChatTurns, hasPendingUserInput } from './chat-history';
import { getRecentResearchContext, getRecentMemoriesContext } from './research-context';

/**
 * Agent orchestration using Vercel AI SDK 6 ToolLoopAgent
 * Supports Supermemory, Browser-Use, and activity logging
 */

export interface AgentConfig {
  agent: Agent;
  maxSteps?: number;
  temperature?: number;
}

export interface AgentContext {
  agentId: string;
  tools: string[];
}

export interface AgentStatusUpdate {
  type: 'step' | 'tool_call' | 'text' | 'complete' | 'error';
  stepNumber?: number;
  toolName?: string;
  toolInput?: any;
  toolResult?: any;
  text?: string;
  error?: string;
  timestamp: Date;
}

/**
 * Create tools for an agent based on configured permissions
 */
export function createAgentTools(agent: Agent) {
  const tools: Record<string, any> = {};
  
  // Do NOT expose Supermemory tools to the LLM; we manage storage/search internally.
  // Neon remains for metrics, while Supermemory is the source of truth for documents.
  
  if (agent.tools.includes('browser')) {
    tools.browserTask = browserTaskTool;
  }
  // Firecrawl research tools (enabled via explicit permission)
  if (agent.tools.includes('firecrawl')) {
    tools.startResearchSession = startResearchSessionTool;
    tools.firecrawlResearch = firecrawlResearchTool;
    tools.completeResearchSession = completeResearchSessionTool;
  }
  
  // Always include activity logging
  tools.logActivity = logActivityTool;
  // Always include HITL tools
  tools.createPendingActivity = createPendingActivityTool;
  tools.checkApprovalStatus = checkApprovalTool;
  tools.askUser = askUserTool;
  // Planner tool for iterative continuation
  tools.planNextStep = planNextStepTool;
  
  return tools;
}

/**
 * Execute agent task with generateText (AI SDK 6 beta compatible)
 * Note: ToolLoopAgent callbacks don't work in beta, using generateText instead
 */
export async function executeAgentTask(
  config: AgentConfig,
  prompt: string,
  onUpdate?: (update: AgentStatusUpdate) => void
) {
  const { agent, maxSteps = 20 } = config;
  const tools = createAgentTools(agent);
  
  try {
    let currentStep = 0;
    let systemPrompt = withHITLGuidelines(agent.prompt);
    let currentSessionId: string | null = null;
    let kickoffHintGiven = false;
    let researchStarted = false; // Track if any firecrawlResearch calls have been made

    // Build DB-backed chat context (last 20 turns)
    const history = await getLastChatTurns(agent.id, 20);
    const researchContext = await getRecentResearchContext(agent.id, 5);
    const memoryContext = await getRecentMemoriesContext(agent.id, 5);
    const pending = await hasPendingUserInput(agent.id);
    if (pending) {
      systemPrompt += `\n\nNote: There is a pending user question awaiting approval. Do not re-ask. Wait by polling approval instead.`;
    }

    const result = await generateText({
      model: openai('gpt-5-2025-08-07'),
      system: systemPrompt,
      messages: [
        // History comes without a system message; we already set system above
        ...history,
        ...(researchContext ? [{ role: 'user' as const, content: researchContext }] : []),
        ...(memoryContext ? [{ role: 'user' as const, content: memoryContext }] : []),
        { role: 'user', content: prompt },
      ],
      tools,
      maxSteps,
      experimental_context: { 
        agentId: agent.id,
        get currentSessionId() { return currentSessionId }, // Pass current session to tools
      },
      
      // CRITICAL: Prevent stopping until research has actually happened
      stopWhen: ({ text, toolCalls, finishReason }) => {
        // Stop immediately on errors or length limit
        if (finishReason === 'error' || finishReason === 'length') {
          return true; // Stop
        }
        
        // If a research session exists but research hasn't started, PREVENT stopping
        if (currentSessionId && !researchStarted) {
          console.log(`⚠️ Stop prevented: Session ${currentSessionId} has no research yet (step ${currentStep})`);
          return false; // Force continuation - DON'T stop!
        }
        
        // Otherwise, respect the model's natural stopping point
        return finishReason === 'stop';
      },
      // Guide the model to continue after session start
      prepareStep: async ({ steps }) => {
        // First nudge: Immediately after session creation
        if (currentSessionId && !kickoffHintGiven) {
          kickoffHintGiven = true;
          return {
            messages: [
              { 
                role: 'system', 
                content: `RESEARCH SESSION CREATED (ID: ${currentSessionId})

You have completed STEP 1 of the research workflow. Now you MUST proceed to STEP 2.

Next action required:
→ Call firecrawlResearch with:
  - query: A focused search query derived from the user's request
  - limit: 3
  - NOTE: session_id is automatically tracked, but you can pass it explicitly if needed

After that, continue calling firecrawlResearch 2-4 more times with different angles, then finalize with completeResearchSession.

Remember: The session is just a container. You must populate it with actual research before stopping.`
              },
            ],
          };
        }
        
        // Second nudge: If session exists but no research has started after 3+ steps
        if (currentSessionId && !researchStarted && currentStep >= 3) {
          return {
            messages: [
              {
                role: 'system',
                content: `⚠️ RESEARCH SESSION ALERT

Session ${currentSessionId} was created ${currentStep - 1} steps ago but NO research has been performed yet!

You MUST call firecrawlResearch now to gather information. The session is empty and will be useless without actual research data.

Call firecrawlResearch immediately with a focused query related to the user's request.`
              },
            ],
          };
        }
        
        return {};
      },
      
      onStepFinish: async ({ text, toolCalls, toolResults, finishReason, usage }) => {
        currentStep++;
        
        const toolNames = toolCalls.map(c => c.toolName);
        const usedFirecrawl = toolNames.some(n => n === 'firecrawlSearch' || n === 'firecrawlScrape');
        const usedResearch = toolNames.some(n => n === 'firecrawlResearch');
        
        // Track if research has started
        if (usedResearch) {
          researchStarted = true;
        }
        
        // Track research session id FIRST (before logging)
        try {
          for (let i = 0; i < toolCalls.length; i++) {
            const call = toolCalls[i];
            if (call.toolName === 'startResearchSession') {
              // Debug: log the actual structure
              console.log('DEBUG toolResults[i]:', JSON.stringify(toolResults[i], null, 2));
              
              // Try different paths to access the result
              const res = (toolResults[i]?.result || toolResults[i]) as any;
              
              console.log('DEBUG res:', JSON.stringify(res, null, 2));
              
              if (res?.success && res?.session_id) {
                currentSessionId = res.session_id as string;
                console.log(`✅ Research session created: ${currentSessionId}`);
                await updateAgentStatus(agent.id, {
                  status: 'active',
                  currentStep,
                  totalSteps: maxSteps,
                  currentActivity: 'Research session started',
                  currentTool: 'firecrawl',
                });
              }
            }
          }
        } catch (e) {
          console.error('Session tracking failed:', e);
        }
        
        // Now log with correct session info
        console.log(`Agent ${agent.id} - Step ${currentStep}/${maxSteps} completed:`, {
          toolCallsCount: toolCalls.length,
          tools: toolNames,
          finishReason,
          usage,
          tags: usedFirecrawl ? ['source=firecrawl'] : [],
          researchSession: currentSessionId ? { id: currentSessionId, started: researchStarted } : null,
        });
        
        // Track other activities
        try {
          for (let i = 0; i < toolCalls.length; i++) {
            const call = toolCalls[i];
            if (call.toolName === 'createPendingActivity') {
              const res = toolResults[i]?.result as any;
              if (res?.success && res?.activity_id) {
                await updateAgentStatus(agent.id, {
                  status: 'active',
                  currentStep,
                  totalSteps: maxSteps,
                  currentActivity: 'Waiting for user approval',
                  currentTool: 'createPendingActivity',
                });
              }
            } else if (call.toolName === 'askUser') {
              const res = toolResults[i]?.result as any;
              if (res?.success && res?.activity_id) {
                await updateAgentStatus(agent.id, {
                  status: 'active',
                  currentStep,
                  totalSteps: maxSteps,
                  currentActivity: 'Waiting for user input',
                  currentTool: 'askUser',
                });
              }
            }
          }
        } catch (e) {
          console.error('Status update (waiting for approval) failed:', e);
        }

        // Update currentTool for observability when firecrawl tools are used
        try {
          if (usedFirecrawl) {
            await updateAgentStatus(agent.id, {
              status: 'active',
              currentStep,
              totalSteps: maxSteps,
              currentActivity: 'Research (Firecrawl)',
              currentTool: 'firecrawl',
            });
          }
        } catch (e) {
          console.error('Status update (firecrawl) failed:', e);
        }

        // Emit step update
        onUpdate?.({
          type: 'step',
          stepNumber: currentStep,
          timestamp: new Date(),
        });
        
        // Emit tool call updates
        toolCalls.forEach((toolCall, index) => {
          onUpdate?.({
            type: 'tool_call',
            stepNumber: currentStep,
            toolName: toolCall.toolName,
            toolInput: toolCall.args,
            toolResult: toolResults[index]?.result,
            timestamp: new Date(),
          });
        });
        
        // Emit text update
        if (text) {
          onUpdate?.({
            type: 'text',
            stepNumber: currentStep,
            text,
            timestamp: new Date(),
          });

          // Fallback: if the model asked a question without using askUser, create a pending user_input
          try {
            const askedQuestion = /\?$/.test(text.trim()) || /^(could you|can you|would you|please)/i.test(text.trim());
            const noToolsCalled = toolCalls.length === 0;
            if (askedQuestion && noToolsCalled) {
              const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
              const resp = await fetch(`${baseUrl}/api/activities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  agent_id: agent.id,
                  type: 'user_input',
                  status: 'pending',
                  priority: 'medium',
                  payload: { question: text },
                }),
              });
              if (resp.ok) {
                await updateAgentStatus(agent.id, {
                  status: 'active',
                  currentStep,
                  totalSteps: maxSteps,
                  currentActivity: 'Waiting for user input',
                  currentTool: 'askUser',
                });
              }
            }
          } catch (e) {
            console.error('Failed to create user_input fallback:', e);
          }
        }
      },
    });
    
    // Fallback: if a session was started but no notes were appended (model stalled),
    // bootstrap the session with one search using the original prompt.
    try {
      if (currentSessionId) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const activityResp = await fetch(`${baseUrl}/api/activities/${currentSessionId}`);
        if (activityResp.ok) {
          const activity = await activityResp.json();
          const payload = (activity?.payload ?? {}) as any;
          const notes: string[] = Array.isArray(payload.notes) ? payload.notes : [];
          if (notes.length === 0) {
            // Run one deterministic kickoff search+scrape with the user's prompt
            const kickoff = await searchAndScrape({ query: prompt.slice(0, 200), limit: 3, scrapeOptions: { formats: ['markdown', 'links'] } });
            const appendedNotes: string[] = [];
            const links: string[] = [];
            for (const it of kickoff.items) {
              if (!it?.url) continue;
              if (it.markdown) {
                await storeMarkdown({ agentId: agent.id, url: it.url, title: it.title, markdown: it.markdown.slice(0, 40000) });
                // Summarize briefly for the session notes
                try {
                  const { text } = await generateText({
                    model: openai('gpt-4o-mini'),
                    temperature: 0.2,
                    prompt: `Summarize this page into 4–8 bullets with a single inline URL (${it.url}). Focus on concrete facts, methods, metrics.\n\n${(it.markdown || '').slice(0, 8000)}`,
                  });
                  appendedNotes.push(text);
                } catch {
                  appendedNotes.push(`- ${it.title ?? it.url}`);
                }
              }
              links.push(it.url);
            }
            if (appendedNotes.length > 0 || links.length > 0) {
              await fetch(`${baseUrl}/api/research/sessions/${currentSessionId}/append`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: prompt.slice(0, 200), links, notes: appendedNotes }),
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('Kickoff fallback failed:', e);
    }

    // Auto-complete session if we reached finish without explicit completion
    try {
      if (currentSessionId) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        await fetch(`${baseUrl}/api/research/sessions/${currentSessionId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
      }
    } catch (e) {
      console.error('Auto-complete research session failed:', e);
    }

    return {
      text: result.text,
      steps: result.steps,
      usage: result.usage,
    };
  } catch (error) {
    console.error('Agent execution error:', error);
    onUpdate?.({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
    });
    throw error;
  }
}

/**
 * Execute agent task without streaming (simple completion)
 */
export async function executeAgentTaskSync(
  config: AgentConfig,
  prompt: string
): Promise<{
  text: string;
  steps: any[];
  usage: any;
}> {
  const { agent, maxSteps = 20 } = config;
  const tools = createAgentTools(agent);
  
  try {
    const result = await generateText({
      model: openai('gpt-4o'),
      system: agent.prompt,
      prompt,
      tools,
      maxSteps,
      onStepFinish: ({ toolCalls, usage }) => {
        console.log(`Agent ${agent.id} step completed:`, {
          toolCallsCount: toolCalls.length,
          usage,
        });
      },
    });
    
    return {
      text: result.text,
      steps: result.steps || [],
      usage: result.usage,
    };
  } catch (error) {
    console.error('Agent execution error:', error);
    throw error;
  }
}

/**
 * Generate a summary using AI
 * Useful for call summaries and activity summarization
 */
export async function generateSummary(
  content: string,
  context?: string
): Promise<string> {
  try {
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: `Summarize the following content concisely:\n\n${context ? `Context: ${context}\n\n` : ''}${content}`,
      temperature: 0.3,
    });
    
    return result.text;
  } catch (error) {
    console.error('Summary generation error:', error);
    throw error;
  }
}

/**
 * Extract structured data from text
 */
export async function extractStructuredData<T>(
  text: string,
  schema: any,
  instructions?: string
): Promise<T> {
  try {
    const result = await generateText({
      model: openai('gpt-4o'),
      prompt: `${instructions || 'Extract structured data from the following text:'}\n\n${text}`,
      temperature: 0,
    });
    
    // Parse the result as JSON
    return JSON.parse(result.text) as T;
  } catch (error) {
    console.error('Structured data extraction error:', error);
    throw error;
  }
}

