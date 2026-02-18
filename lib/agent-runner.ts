/**
 * Background execution helper — replaces `start()` from `workflow/api`.
 * Launches agentTaskWorkflow as a detached promise, using waitUntil
 * to keep Vercel serverless functions alive after the response is sent.
 */

import { waitUntil } from '@vercel/functions';
import { agentTaskWorkflow } from '@/lib/ai/workflows/agent-workflow';
import type { TriggerType } from '@/lib/ai/prompts';

/**
 * Run an agent workflow in the background (fire-and-forget).
 * The caller's HTTP response can return immediately while the workflow
 * continues executing via waitUntil.
 */
export function runAgentInBackground(
  agentId: string,
  prompt: string,
  maxSteps: number = 20,
  triggerType: TriggerType = 'task'
): void {
  const promise = agentTaskWorkflow(agentId, prompt, maxSteps, triggerType).catch((error) => {
    console.error(`[agent-runner] Workflow failed for agent ${agentId}:`, error);
  });

  waitUntil(promise);
}
