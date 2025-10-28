import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { supermemoryTools } from '@supermemory/tools/ai-sdk';
import { browserTaskTool } from './tools/browser-task';
import { logActivityTool } from './tools/log-activity';
import { createPendingActivityTool } from './tools/create-pending-activity';
import { checkApprovalTool } from './tools/check-approval';
import { askUserTool } from './tools/ask-user';
import { planNextStepTool } from './tools/plan-next-step';
import { firecrawlSearchTool } from './tools/firecrawl-search';
import { firecrawlScrapeTool } from './tools/firecrawl-scrape';
import { updateAgentStatus } from '@/lib/agent-status';
import { withHITLGuidelines } from './prompts';
import type { Agent } from '../db';
import { getLastChatTurns, hasPendingUserInput } from './chat-history';
import { getRecentResearchContext } from './research-context';

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
  
  // Add tools based on agent's enabled tools
  if (agent.tools.includes('supermemory') || agent.tools.includes('neo4j')) {
    // Supermemory provides memory storage and retrieval
    const supermemoryApiKey = process.env.SUPERMEMORY_API_KEY;
    if (supermemoryApiKey) {
      const memoryTools = supermemoryTools(supermemoryApiKey);
      Object.assign(tools, memoryTools);
    }
  }
  
  if (agent.tools.includes('browser')) {
    tools.browserTask = browserTaskTool;
  }
  // Firecrawl research tools (enabled via explicit permission)
  if (agent.tools.includes('firecrawl')) {
    tools.firecrawlSearch = firecrawlSearchTool;
    tools.firecrawlScrape = firecrawlScrapeTool;
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

    // Build DB-backed chat context (last 20 turns)
    const history = await getLastChatTurns(agent.id, 20);
    const researchContext = await getRecentResearchContext(agent.id, 5);
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
        { role: 'user', content: prompt },
      ],
      tools,
      maxSteps,
      experimental_context: { agentId: agent.id },
      
      onStepFinish: async ({ text, toolCalls, toolResults, finishReason, usage }) => {
        currentStep++;
        
        const toolNames = toolCalls.map(c => c.toolName);
        const usedFirecrawl = toolNames.some(n => n === 'firecrawlSearch' || n === 'firecrawlScrape');
        console.log(`Agent ${agent.id} - Step ${currentStep}/${maxSteps} completed:`, {
          toolCallsCount: toolCalls.length,
          tools: toolNames,
          finishReason,
          usage,
          tags: usedFirecrawl ? ['source=firecrawl'] : [],
        });
        
        // Check if agent created a pending activity and reflect waiting status
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

