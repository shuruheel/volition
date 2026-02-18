import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Activity } from '@/lib/db';
import { requireActivityOwnership } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/activities/:id — fetch single activity (owned by authenticated user)
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    await requireActivityOwnership(id);

    const rows = await sql<Activity[]>`
      SELECT * FROM activities WHERE id = ${id}
    `;

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    if (error?.message === 'Activity not found' || error?.message === 'Authentication required') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Authentication required' ? 401 : 404 });
    }
    console.error('GET /api/activities/:id error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}


