import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Activity } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>; 
}

/**
 * GET /api/activities/:id — fetch single activity
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const rows = await sql<Activity[]>`
      SELECT * FROM activities WHERE id = ${id}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('GET /api/activities/:id error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}


