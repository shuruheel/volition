import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Activity } from '@/lib/db';
import { requireActivityOwnership } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/activities/:id/modify
 * Modify an activity's payload (owned by authenticated user)
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    await requireActivityOwnership(id);
    const body = await request.json();
    const { payload } = body;
    
    if (!payload) {
      return NextResponse.json(
        { error: 'payload is required' },
        { status: 400 }
      );
    }
    
    const result = await sql<Activity[]>`
      UPDATE activities
      SET payload = ${JSON.stringify(payload)}
      WHERE id = ${id}
      RETURNING *
    `;
    
    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Failed to modify activity:', error);
    return NextResponse.json(
      { error: 'Failed to modify activity' },
      { status: 500 }
    );
  }
}

