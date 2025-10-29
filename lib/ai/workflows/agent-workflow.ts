/**
 * Main agent workflow using Vercel Workflow for durable, resumable execution
 * Replaces executeAgentTask() with workflow directives
 * 
 * IMPORTANT: This workflow defines tools INLINE with 'parameters' key.
 * DO NOT import tools from lib/ai/tools/ - those use AI SDK tool() helper
 * which is incompatible with Vercel Workflow tool format.
 * 
 * See docs/workflow-vs-legacy-tools.md for detailed explanation.
 */

import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { Agent } from '@/lib/db-types';
import { withHITLGuidelines } from '../prompts';
import { userInputHook, phoneCallHook, activityApprovalHook } from './hooks';
import {
  executeResearchStep,
  executeBrowserStep,
  logActivityStep,
  startResearchSessionStep,
  appendToSessionStep,
  completeResearchSessionStep,
  fetchAgentStep,
  createPendingActivityStep,
  updateActivityStatusStep,
  updateAgentDBStatusStep,
  getAgentContextStep,
  updateAgentStatusStep,
  clearAgentStatusStep,
} from './steps';

export async function agentTaskWorkflow(
  agentId: string,
  initialPrompt: string,
  maxSteps: number = 40
) {
  'use workflow';

  console.log(`[Workflow] Starting agent ${agentId} with prompt: ${initialPrompt}`);

  // Fetch agent configuration
  const agent = await fetchAgentStep(agentId);

  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  // Build context from database
  const { history, researchContext, memoryContext, pending } = await getAgentContextStep(agentId, 20, 5);

  // Build system prompt with HITL guidelines
  let systemPrompt = withHITLGuidelines(agent.prompt);
  if (pending) {
    systemPrompt += `\n\nNote: There is a pending user question awaiting approval. Do not re-ask. Wait by polling approval instead.`;
  }

  // Track workflow state (persisted across restarts)
  let currentStep = 0;
  let currentSessionId: string | null = null;
  let researchStarted = false;

  // Initialize agent status
  await updateAgentStatusStep(agentId, {
    status: 'active',
    currentStep: 0,
    totalSteps: maxSteps,
    currentActivity: 'Starting workflow...',
  });

  try {
    // Main workflow loop
    while (currentStep < maxSteps) {
      console.log(`[Workflow] Step ${currentStep + 1}/${maxSteps}`);

      await updateAgentStatusStep(agentId, {
        status: 'active',
        currentStep: currentStep + 1,
        totalSteps: maxSteps,
        currentActivity: `Step ${currentStep + 1}/${maxSteps}`,
      });

      // Call LLM to decide next action
      // Dynamic import to avoid workflow sandbox global issues
      const { generateText, stepCountIs } = await import('ai');
      const result = await generateText({
        model: openai('gpt-5-2025-08-07'),
        system: systemPrompt,
        messages: [
          ...history,
          ...(researchContext ? [{ role: 'user' as const, content: researchContext }] : []),
          ...(memoryContext ? [{ role: 'user' as const, content: memoryContext }] : []),
          { role: 'user', content: initialPrompt },
        ],
        tools: {
          // Research tools
          startResearchSession: {
            description: 'STEP 1 of research workflow. Start a new research session with a title. After calling this, you MUST call firecrawlResearch multiple times.',
            inputSchema: z.object({
              title: z.string().describe('Title for the research session'),
            }),
            execute: async ({ title }) => {
              const result = await startResearchSessionStep(agentId, title);
              currentSessionId = result.session_id;
              researchStarted = false; // Reset for new session
              console.log(`[Workflow] Started research session: ${currentSessionId}`);
              return { session_id: currentSessionId, message: 'Session started. Now call firecrawlResearch to do actual research.' };
            },
          },

          firecrawlResearch: {
            description: 'STEP 2+ of research workflow. Search and scrape web content. Call this 3-5 times per session with different queries.',
            inputSchema: z.object({
              query: z.string().describe('Focused search query'),
              limit: z.number().int().min(1).max(3).default(3).describe('Number of results to scrape'),
            }),
            execute: async ({ query, limit }) => {
              if (!currentSessionId) {
                return { success: false, error: 'No active session. Call startResearchSession first.' };
              }
              
              researchStarted = true;
              console.log(`[Workflow] Research query: ${query}`);
              
              const result = await executeResearchStep(agentId, query, currentSessionId);
              
              // Append to session
              const links = result.leads.map((l: any) => l.url);
              const notes = result.leads.map((l: any) => `${l.title}: ${l.url}`);
              await appendToSessionStep(currentSessionId, query, links, notes);
              
              return {
                success: true,
                itemsScraped: result.itemsScraped,
                session_id: currentSessionId,
              };
            },
          },

          completeResearchSession: {
            description: 'FINAL STEP of research. Complete and finalize the research session with a summary.',
            inputSchema: z.object({
              summary: z.string().describe('Comprehensive summary of all research findings'),
            }),
            execute: async ({ summary }) => {
              if (!currentSessionId) {
                return { success: false, error: 'No active session to complete' };
              }
              
              console.log(`[Workflow] Completing research session: ${currentSessionId}`);
              await completeResearchSessionStep(currentSessionId, summary);
              
              const completedSessionId = currentSessionId;
              currentSessionId = null; // Clear session
              researchStarted = false;
              
              return {
                success: true,
                session_id: completedSessionId,
                message: 'Research session completed successfully',
              };
            },
          },

          // Browser automation tool
          ...(agent.tools.includes('browser')
            ? {
                browserTask: {
                  description: 'Execute browser automation for interactive tasks (logins, forms, clicks)',
                  inputSchema: z.object({
                    task: z.string().describe('Natural language description of browser task'),
                    maxSteps: z.number().min(1).max(20).default(10),
                  }),
                  execute: async ({ task, maxSteps }) => {
                    console.log(`[Workflow] Browser task: ${task}`);
                    return await executeBrowserStep(agentId, task, maxSteps);
                  },
                },
              }
            : {}),

          // Human-in-the-loop tools
          askUser: {
            description: 'Ask the user a question when you need clarification. Workflow pauses until user responds.',
            inputSchema: z.object({
              question: z.string().describe('The question to ask'),
              priority: z.enum(['low', 'medium', 'high']).default('medium'),
            }),
            execute: async ({ question, priority }) => {
              console.log(`[Workflow] Asking user: ${question}`);
              
              // Create pending activity
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

              // Pause workflow and wait for user input via hook
              const token = `agent-${agentId}-activity-${activityId}`;
              const events = userInputHook.create({ token });

              for await (const event of events) {
                console.log(`[Workflow] Received user answer: ${event.answer}`);
                
                // Update activity with answer
                await updateActivityStatusStep(
                  event.activityId,
                  'approved',
                  { answer: event.answer }
                );

                // Return answer to LLM
                return {
                  success: true,
                  answer: event.answer,
                  message: `User responded: ${event.answer}`,
                };
              }
              
              // Should never reach here
              return { success: false, error: 'No response received' };
            },
          },

          createPendingActivity: {
            description: 'Create a pending activity that requires approval (e.g., phone call, email)',
            inputSchema: z.object({
              type: z.enum(['phone_call', 'email_sent', 'calendar_event_created']),
              payload: z.record(z.any()).describe('Activity data'),
              priority: z.enum(['low', 'medium', 'high']).default('medium'),
            }),
            execute: async ({ type, payload, priority }) => {
              console.log(`[Workflow] Creating pending ${type}`);
              
              const activityId = await createPendingActivityStep(
                agentId,
                type,
                priority,
                payload
              );

              // Pause and wait for approval
              const token = `agent-${agentId}-activity-${activityId}`;
              
              let hookToUse = activityApprovalHook;
              if (type === 'phone_call') {
                hookToUse = phoneCallHook;
              }
              
              const events = hookToUse.create({ token });

              for await (const event of events) {
                console.log(`[Workflow] Activity ${type} ${event.approved ? 'approved' : 'rejected'}`);
                
                await updateActivityStatusStep(
                  activityId,
                  event.approved ? 'approved' : 'rejected'
                );

                return {
                  success: true,
                  approved: event.approved,
                  activity_id: activityId,
                  message: event.approved ? 'Activity approved' : 'Activity rejected',
                };
              }
              
              return { success: false, error: 'No approval received' };
            },
          },

          logActivity: {
            description: 'Log a completed activity to the database',
            inputSchema: z.object({
              type: z.string().describe('Activity type'),
              payload: z.record(z.any()).describe('Activity data'),
            }),
            execute: async ({ type, payload }) => {
              await logActivityStep(agentId, type, payload);
              return { success: true, message: 'Activity logged' };
            },
          },
        },
        stopWhen: stepCountIs(1), // One LLM call per workflow step
      });

      // Check finish reason
      if (result.finishReason === 'stop') {
        console.log('[Workflow] Agent decided to stop');
        break;
      }

      if (result.finishReason === 'length') {
        console.log('[Workflow] Agent hit token limit, but continuing...');
      }

      // Prevent stopping if research session active but not started
      if (currentSessionId && !researchStarted) {
        console.log('[Workflow] Research session active but no research done yet, forcing continuation');
        currentStep++;
        continue;
      }

      currentStep++;
    }

    console.log(`[Workflow] Completed after ${currentStep} steps`);

    // Mark agent as idle
    await clearAgentStatusStep(agentId);
    await updateAgentDBStatusStep(agentId, 'idle');

    // Log completion
    await logActivityStep(agentId, 'task_completed', {
      prompt: initialPrompt,
      steps: currentStep,
      completedAt: new Date().toISOString(),
    });

    return {
      completed: true,
      steps: currentStep,
      agentId,
    };
  } catch (error) {
    console.error('[Workflow] Error:', error);

    // Mark agent as error
    await updateAgentStatusStep(agentId, {
      status: 'error',
      currentActivity: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    await updateAgentDBStatusStep(agentId, 'error');

    throw error;
  }
}

