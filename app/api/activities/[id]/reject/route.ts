import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Activity } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/activities/:id/reject
 * Reject a pending activity
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
    const result = await sql<Activity[]>`
      UPDATE activities
      SET status = 'rejected'
      WHERE id = ${id} AND status = 'pending'
      RETURNING *
    `;
    
    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Activity not found or not pending' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Failed to reject activity:', error);
    return NextResponse.json(
      { error: 'Failed to reject activity' },
      { status: 500 }
    );
  }
}

