import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';

/**
 * GET /api/settings/tools
 * Get tool configurations (masked)
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Get userId from auth session
    const userId = 'mock-user-id';
    
    const configs = await sql`
      SELECT id, tool, created_at, updated_at
      FROM tool_configs
      WHERE user_id = ${userId}
    `;
    
    // Return tool list with masked values
    const tools = configs.map((config: any) => ({
      id: config.id,
      tool: config.tool,
      configured: true,
      createdAt: config.created_at,
      updatedAt: config.updated_at,
    }));
    
    return NextResponse.json(tools);
  } catch (error) {
    console.error('Failed to fetch tool configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tool configurations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/tools
 * Create or update tool configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool, data } = body;
    
    if (!tool || !data) {
      return NextResponse.json(
        { error: 'tool and data are required' },
        { status: 400 }
      );
    }
    
    // Validate tool name
    const validTools = ['openai', 'neon', 'firecrawl', 'supermemory', 'browser_use', 'twilio', 'google_oauth', 'telegram'];
    if (!validTools.includes(tool)) {
      return NextResponse.json(
        { error: 'Invalid tool name' },
        { status: 400 }
      );
    }
    
    // TODO: Get userId from auth session
    const userId = 'mock-user-id';
    
    // Encrypt sensitive data
    const encryptedData = await encrypt(JSON.stringify(data));
    
    // Upsert configuration
    const result = await sql`
      INSERT INTO tool_configs (user_id, tool, data_encrypted)
      VALUES (${userId}, ${tool}, ${encryptedData})
      ON CONFLICT (user_id, tool)
      DO UPDATE SET
        data_encrypted = ${encryptedData},
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, tool, created_at, updated_at
    `;
    
    return NextResponse.json({
      id: result[0].id,
      tool: result[0].tool,
      configured: true,
      updatedAt: result[0].updated_at,
    });
  } catch (error) {
    console.error('Failed to save tool config:', error);
    return NextResponse.json(
      { error: 'Failed to save tool configuration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/tools/:tool
 * Delete tool configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tool = searchParams.get('tool');
    
    if (!tool) {
      return NextResponse.json(
        { error: 'tool parameter is required' },
        { status: 400 }
      );
    }
    
    // TODO: Get userId from auth session
    const userId = 'mock-user-id';
    
    await sql`
      DELETE FROM tool_configs
      WHERE user_id = ${userId} AND tool = ${tool}
    `;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete tool config:', error);
    return NextResponse.json(
      { error: 'Failed to delete tool configuration' },
      { status: 500 }
    );
  }
}

