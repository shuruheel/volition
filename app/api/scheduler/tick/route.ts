import { NextRequest, NextResponse } from 'next/server';
import { processOverdueSchedules } from '@/lib/scheduler/heartbeat';

export const maxDuration = 300;

/**
 * POST /api/scheduler/tick
 * Called by Vercel Cron (production) or local interval (dev).
 * Processes all overdue agent schedules.
 */
export async function POST(request: NextRequest) {
  try {
    // In production, verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const started = await processOverdueSchedules();

    return NextResponse.json({
      ok: true,
      started,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[scheduler/tick] Error:', error);
    return NextResponse.json(
      { error: 'Scheduler tick failed' },
      { status: 500 }
    );
  }
}

// Also support GET for Vercel Cron (which sends GET by default)
export async function GET(request: NextRequest) {
  return POST(request);
}
