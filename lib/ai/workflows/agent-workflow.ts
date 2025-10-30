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

import { withHITLGuidelines } from '../prompts';
import {
  fetchAgentStep,
  updateAgentDBStatusStep,
  getAgentContextStep,
  updateAgentStatusStep,
  clearAgentStatusStep,
  logActivityStep,
  executeLLMDecisionStep,
} from './steps';

export async function agentTaskWorkflow(
  agentId: string,
  initialPrompt: string,
  maxSteps: number = 40
) {
  'use workflow';

  console.log(`[Workflow] Starting agent ${agentId} with prompt: ${initialPrompt}`);

  // Fetch agent configuration
  const agentRaw = await fetchAgentStep(agentId);

  if (!agentRaw) {
    throw new Error(`Agent ${agentId} not found`);
  }

  // Ensure agent is fully serializable
  const agent = JSON.parse(JSON.stringify(agentRaw));

  // Build context from database
  const contextRaw = await getAgentContextStep(agentId, 20, 5);
  
  // Ensure all context data is fully serializable
  const { history, researchContext, memoryContext, pending } = JSON.parse(JSON.stringify(contextRaw));

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

      // Execute one LLM decision inside a step (tools are defined in the step)
      // Ensure all arguments are serializable by deep cloning through JSON
      const result = await executeLLMDecisionStep({
        agentId: String(agentId),
        systemPrompt: String(systemPrompt),
        history: JSON.parse(JSON.stringify(history)),
        researchContext: researchContext || null,
        memoryContext: memoryContext || null,
        userPrompt: String(initialPrompt),
        enabledTools: Array.isArray(agent.tools) ? [...agent.tools] : [],
        currentSessionId: currentSessionId || null,
        researchStarted: Boolean(researchStarted),
      });

      // Increment step counter FIRST (this step just completed)
      currentStep++;

      // Sync state updates from step
      currentSessionId = result.currentSessionId;
      researchStarted = result.researchStarted;

      // Check finish reason
      if (result.finishReason === 'stop') {
        console.log(`[Workflow] Agent decided to stop after ${currentStep} step(s)`);
        break;
      }

      if (result.finishReason === 'length') {
        console.log('[Workflow] Agent hit token limit, but continuing...');
      }

      // Prevent stopping if research session active but not started
      if (currentSessionId && !researchStarted) {
        console.log('[Workflow] Research session active but no research done yet, forcing continuation');
        continue;
      }
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

