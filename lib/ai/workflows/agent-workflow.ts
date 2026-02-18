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

import { withHITLGuidelines, withSkills, withMemoryContext, type TriggerType } from '../prompts';
import {
  fetchAgentStep,
  updateAgentDBStatusStep,
  getAgentContextStep,
  updateAgentStatusStep,
  clearAgentStatusStep,
  logActivityStep,
  executeLLMDecisionStep,
  autoCompleteResearchSessionStep,
  checkAgentEnabledStep,
  loadMemoryContextStep,
} from './steps';

export async function agentTaskWorkflow(
  agentId: string,
  initialPrompt: string,
  maxSteps: number = 20,
  triggerType: TriggerType = 'manual'
) {
  'use workflow';

  console.log(`[Workflow] Starting agent ${agentId} (trigger: ${triggerType}) with prompt: ${initialPrompt}`);

  // Fetch agent configuration
  const agentRaw = await fetchAgentStep(agentId);

  if (!agentRaw) {
    throw new Error(`Agent ${agentId} not found`);
  }

  // Ensure agent is fully serializable
  const agent = JSON.parse(JSON.stringify(agentRaw));

  // Build context from database (pass userId so Supermemory can resolve per-user key)
  const contextRaw = await getAgentContextStep(agentId, 20, 5, agent.user_id || null);

  // Ensure all context data is fully serializable
  const { history, researchContext, memoryContext, pending } = JSON.parse(JSON.stringify(contextRaw));

  // Load memory files (soul.md, preferences.md) from Google Drive
  const { soulMd, preferencesMd } = await loadMemoryContextStep(agent.user_id || null, agentId);

  // Build system prompt based on trigger type
  let systemPrompt = withHITLGuidelines(agent.prompt, triggerType);

  // Inject memory context (personality + preferences) into system prompt
  systemPrompt = withMemoryContext(systemPrompt, soulMd, preferencesMd);

  // Inject enabled skill instructions into system prompt
  if (Array.isArray(agent.skills) && agent.skills.length > 0) {
    const { getSkillsByIds } = await import('@/lib/skills/registry');
    const enabledSkills = getSkillsByIds(agent.skills);
    if (enabledSkills.length > 0) {
      systemPrompt = withSkills(systemPrompt, enabledSkills.map(s => s.instructions));
    }
  }

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
      // Check if agent was disabled mid-workflow
      const stillEnabled = await checkAgentEnabledStep(agentId);
      if (!stillEnabled) {
        console.log(`[Workflow] Agent ${agentId} was disabled, stopping gracefully`);
        break;
      }

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
        userId: agent.user_id || null,
        modelProvider: agent.model_provider || null,
        modelId: agent.model_id || null,
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
      const researchSessionCompleted = result.researchSessionCompleted;

      // If a research session was just completed, update userPrompt to encourage analysis and planning
      if (researchSessionCompleted) {
        console.log('[Workflow] Research session completed, encouraging post-session analysis and planning');
        initialPrompt = `You've just completed a research session. Now you MUST:
1. Analyze what you've learned in this session
2. Review your system prompt to identify remaining knowledge gaps
3. Plan what research topic to tackle next
4. If unclear about next priorities, use askUser to ask for guidance
5. If clear, proceed to start a new research session on the next topic

Remember: You are a CONTINUOUS RESEARCH AGENT. Your goal is to populate your memory with comprehensive research based on your system prompt. Do NOT stop after one session - continue researching until you have comprehensive coverage of all topics in your system prompt.`;
      }

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

    // Auto-complete research session if workflow ends without explicit completion
    if (currentSessionId) {
      try {
        const result = await autoCompleteResearchSessionStep(currentSessionId);
        if (result.success) {
          console.log(`[Workflow] Auto-completed research session ${currentSessionId}`);
        } else if (result.skipped) {
          console.log(`[Workflow] Skipped auto-complete: ${result.reason}`);
        }
      } catch (e) {
        console.error('[Workflow] Auto-complete research session failed:', e);
      }
    }

    // Mark agent as idle (does NOT touch enabled — agent stays enabled)
    await clearAgentStatusStep(agentId);
    await updateAgentDBStatusStep(agentId, 'idle');

    // Log completion
    await logActivityStep(agentId, 'task_completed', {
      prompt: initialPrompt,
      steps: currentStep,
      triggerType,
      completedAt: new Date().toISOString(),
    });

    return {
      completed: true,
      steps: currentStep,
      agentId,
      triggerType,
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
