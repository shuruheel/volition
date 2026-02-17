/**
 * Heartbeat scheduler — queries overdue schedules and starts workflow runs.
 * Called by /api/scheduler/tick (Vercel Cron or local interval).
 * Only processes schedules for enabled agents.
 */

import { sql } from '@/lib/db';

export interface ScheduleRow {
  id: string;
  agent_id: string;
  schedule_type: string;
  interval_minutes: number | null;
  checklist: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
}

/**
 * Process all overdue schedules: start agent workflows for each.
 * Returns the number of workflows started.
 */
export async function processOverdueSchedules(): Promise<number> {
  const overdue = await sql<ScheduleRow[]>`
    SELECT s.*, a.status as agent_status
    FROM agent_schedules s
    JOIN agents a ON a.id = s.agent_id
    WHERE s.enabled = true
      AND a.enabled = true
      AND s.next_run_at <= NOW()
      AND a.status != 'active'
    ORDER BY s.next_run_at ASC
    LIMIT 10
  `;

  if (overdue.length === 0) return 0;

  let started = 0;

  for (const schedule of overdue) {
    try {
      // Build heartbeat prompt from checklist
      const prompt = buildHeartbeatPrompt(schedule.checklist);

      // Start the workflow (10 steps — heartbeats should be quick check-ins)
      const { start } = await import('workflow/api');
      const { agentTaskWorkflow } = await import('@/lib/ai/workflows/agent-workflow');
      await start(agentTaskWorkflow, [schedule.agent_id, prompt, 10, 'heartbeat']);

      // Update schedule timestamps
      const nextRun = calculateNextRun(schedule);
      await sql`
        UPDATE agent_schedules
        SET last_run_at = NOW(), next_run_at = ${nextRun}
        WHERE id = ${schedule.id}
      `;

      console.log(`[heartbeat] Started agent ${schedule.agent_id}, next run: ${nextRun}`);
      started++;
    } catch (error) {
      console.error(`[heartbeat] Failed to start agent ${schedule.agent_id}:`, error);
    }
  }

  return started;
}

function buildHeartbeatPrompt(checklist: string | null): string {
  const base = 'This is a scheduled heartbeat check-in. Review your checklist and decide what needs attention RIGHT NOW. If nothing is due, report all clear and stop. Do not force research — only act if there is something actionable.';
  if (!checklist) return base;
  return `${base}\n\n## Checklist\n${checklist}`;
}

function calculateNextRun(schedule: ScheduleRow): string {
  const now = new Date();
  const intervalMs = (schedule.interval_minutes || 60) * 60 * 1000;
  return new Date(now.getTime() + intervalMs).toISOString();
}
