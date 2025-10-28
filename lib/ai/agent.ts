import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { supermemoryTools } from '@supermemory/tools/ai-sdk';
import { browserTaskTool } from './tools/browser-task';
import { logActivityTool } from './tools/log-activity';
import type { Agent } from '../db';

/**
 * Agent orchestration using Vercel AI SDK 6
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
  
  // Always include activity logging
  tools.logActivity = logActivityTool;
  
  return tools;
}

/**
 * Execute agent task with streaming
 */
export async function executeAgentTask(
  config: AgentConfig,
  prompt: string,
  onUpdate?: (chunk: any) => void
) {
  const { agent, maxSteps = 10, temperature = 0.8 } = config;
  
  const tools = createAgentTools(agent);
  
  try {
    const result = await streamText({
      model: openai('gpt-4o'),
      prompt: `${agent.prompt}\n\nUser request: ${prompt}`,
      tools,
      maxSteps,
      temperature,
      experimental_context: {
        agentId: agent.id,
        tools: agent.tools,
      },
      onStepFinish: async ({ text, toolCalls, toolResults, finishReason, usage }) => {
        // Log step completion for observability
        console.log('Agent step completed:', {
          agentId: agent.id,
          finishReason,
          usage,
          toolCallsCount: toolCalls.length,
        });
        
        // Optionally persist usage metrics to database
        if (usage) {
          // TODO: Store usage metrics for billing/analytics
        }
        
        // Call update callback if provided
        if (onUpdate) {
          onUpdate({
            type: 'step',
            text,
            toolCalls,
            toolResults,
            finishReason,
            usage,
          });
        }
      },
    });
    
    return result;
  } catch (error) {
    console.error('Agent execution error:', error);
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
  const { agent, maxSteps = 10, temperature = 0.8 } = config;
  
  const tools = createAgentTools(agent);
  
  try {
    const result = await generateText({
      model: openai('gpt-4o'),
      prompt: `${agent.prompt}\n\nUser request: ${prompt}`,
      tools,
      maxSteps,
      temperature,
      experimental_context: {
        agentId: agent.id,
        tools: agent.tools,
      },
      onStepFinish: async ({ toolCalls, usage }) => {
        console.log('Agent step completed:', {
          agentId: agent.id,
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

