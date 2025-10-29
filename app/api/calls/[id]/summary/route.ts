import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { generateSummary } from '@/lib/ai/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/calls/:id/summary
 * Generate and store call summary, create activity
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { transcript } = body;
    
    if (!transcript) {
      return NextResponse.json(
        { error: 'transcript is required' },
        { status: 400 }
      );
    }
    
    // Get call details
    const callResult = await sql`
      SELECT * FROM calls WHERE id = ${id}
    `;
    
    if (callResult.length === 0) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }
    
    const call = callResult[0];
    
    // Generate AI summary
    const summaryText = await generateSummary(
      transcript,
      `Phone call from agent ${call.agent_id} to ${call.to_number}`
    );
    
    // Extract key points (simple split for now, can enhance with structured extraction)
    const keyPoints = summaryText
      .split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
      .map(line => line.replace(/^[-•]\s*/, '').trim())
      .filter(Boolean);
    
    const summary = {
      brief: summaryText.split('\n')[0], // First line as brief summary
      keyPoints,
      transcript: transcript.substring(0, 1000), // Store partial transcript
      duration: call.ended_at && call.started_at 
        ? (new Date(call.ended_at).getTime() - new Date(call.started_at).getTime()) / 1000
        : 0,
    };
    
    // Update call with summary
    await sql`
      UPDATE calls
      SET summary = ${JSON.stringify(summary)}
      WHERE id = ${id}
    `;
    
    // Create activity for phone call summary
    await sql`
      INSERT INTO activities (agent_id, type, status, priority, payload)
      VALUES (
        ${call.agent_id},
        'post_call_summary',
        'completed',
        'medium',
        ${JSON.stringify({
          call_id: id,
          to_number: call.to_number,
          summary: summary.brief,
          keyPoints: summary.keyPoints,
          duration: summary.duration,
        })}
      )
    `;
    
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('Failed to generate call summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate call summary' },
      { status: 500 }
    );
  }
}

