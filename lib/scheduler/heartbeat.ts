/**
 * Heartbeat scheduler — queries overdue schedules and starts workflow runs.
 * Called by /api/scheduler/tick (Vercel Cron or local interval).
 * Only processes schedules for enabled agents.
 *
 * Features:
 * - Active hours: skips schedules outside configured time window
 * - HEARTBEAT.md: reads checklist from Google Drive if available
 * - OK suppression: marks uneventful heartbeats as low-priority
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
  active_hours_start: string | null;
  active_hours_end: string | null;
  user_id?: string;
}

/**
 * Check if current time is within active hours.
 * Returns true if no active hours are set (always active).
 */
function isWithinActiveHours(startTime: string | null, endTime: string | null): boolean {
  if (!startTime || !endTime) return true;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // Normal range (e.g., 08:00 - 23:00)
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Overnight range (e.g., 22:00 - 06:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}

/**
 * Try to load heartbeat.md from Google Drive for the agent.
 * Falls back to null if not available.
 */
async function loadHeartbeatMd(userId: string | null, agentId: string): Promise<string | null> {
  if (!userId) return null;

  try {
    const { readMemoryFile } = await import('@/lib/integrations/google-drive');
    const content = await readMemoryFile(userId, agentId, 'heartbeat.md');
    return content || null;
  } catch {
    return null;
  }
}

/**
 * Process all overdue schedules: start agent workflows for each.
 * Returns the number of workflows started.
 */
export async function processOverdueSchedules(): Promise<number> {
  const overdue = await sql<ScheduleRow[]>`
    SELECT s.*, a.status as agent_status, a.user_id
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
      // Check active hours
      if (!isWithinActiveHours(schedule.active_hours_start, schedule.active_hours_end)) {
        // Skip but still update next_run_at to avoid re-processing
        const nextRun = calculateNextRun(schedule);
        await sql`
          UPDATE agent_schedules
          SET next_run_at = ${nextRun}
          WHERE id = ${schedule.id}
        `;
        console.log(`[heartbeat] Skipped agent ${schedule.agent_id} — outside active hours`);
        continue;
      }

      // Try loading heartbeat.md from Drive (overrides checklist field)
      const heartbeatMd = await loadHeartbeatMd(schedule.user_id || null, schedule.agent_id);
      const checklist = heartbeatMd || schedule.checklist;

      // Build heartbeat prompt from checklist
      const prompt = buildHeartbeatPrompt(checklist);

      // Start the workflow (10 steps — heartbeats should be quick check-ins)
      const { runAgentInBackground } = await import('@/lib/agent-runner');
      runAgentInBackground(schedule.agent_id, prompt, 10, 'heartbeat');

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
