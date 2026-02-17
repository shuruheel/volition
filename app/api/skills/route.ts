import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { getAllSkills } from '@/lib/skills/registry';

/**
 * GET /api/skills
 * List all available skills
 */
export async function GET() {
  try {
    const skills = getAllSkills();
    return NextResponse.json(skills);
  } catch (error) {
    console.error('Failed to fetch skills:', error);
    return NextResponse.json([], { status: 500 });
  }
}

/**
 * POST /api/skills
 * Enable/disable a skill on an agent
 */
export async function POST(request: NextRequest) {
  try {
    await requireUserId();
    const { agentId, skillId, enabled } = await request.json();

    if (!agentId || !skillId) {
      return NextResponse.json({ error: 'agentId and skillId are required' }, { status: 400 });
    }

    const agents = await sql`SELECT skills FROM agents WHERE id = ${agentId}`;
    if (agents.length === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const currentSkills: string[] = agents[0].skills || [];
    let updatedSkills: string[];

    if (enabled) {
      updatedSkills = currentSkills.includes(skillId) ? currentSkills : [...currentSkills, skillId];
    } else {
      updatedSkills = currentSkills.filter((s: string) => s !== skillId);
    }

    await sql`UPDATE agents SET skills = ${updatedSkills} WHERE id = ${agentId}`;

    return NextResponse.json({ success: true, skills: updatedSkills });
  } catch (error) {
    console.error('Failed to update skills:', error);
    return NextResponse.json({ error: 'Failed to update skills' }, { status: 500 });
  }
}
