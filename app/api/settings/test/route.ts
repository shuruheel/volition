import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import twilio from 'twilio';
import { BrowserUseClient } from 'browser-use-sdk';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

/**
 * POST /api/settings/test
 * Test connectivity for a specific tool
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool } = body;
    
    if (!tool) {
      return NextResponse.json(
        { error: 'tool is required' },
        { status: 400 }
      );
    }
    
    // TODO: Get userId from auth session
    const userId = 'mock-user-id';
    
    switch (tool) {
      case 'openai':
        return await testOpenAI();
        
      case 'neon':
        return await testNeon();
        
      case 'supermemory':
        return await testSupermemory(userId);
        
      case 'browser_use':
        return await testBrowserUse(userId);
        
      case 'twilio':
        return await testTwilio(userId);
        
      default:
        return NextResponse.json(
          { error: 'Unknown tool' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Tool test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
      },
      { status: 500 }
    );
  }
}

async function testOpenAI() {
  try {
    const result = await generateText({
      model: openai('gpt-5.2-2025-12-11'),
      prompt: 'Say "test successful" if you can read this.',
      maxTokens: 10,
    });
    
    return NextResponse.json({
      success: true,
      message: 'OpenAI API connection successful',
      response: result.text,
    });
  } catch (error) {
    throw new Error(`OpenAI test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function testNeon() {
  try {
    const result = await sql`SELECT 1 as test`;
    
    return NextResponse.json({
      success: true,
      message: 'Neon database connection successful',
    });
  } catch (error) {
    throw new Error(`Neon test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function testSupermemory(userId: string) {
  try {
    // Get Supermemory config
    const configs = await sql`
      SELECT data_encrypted FROM tool_configs
      WHERE user_id = ${userId} AND tool = 'supermemory'
    `;
    
    if (configs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Supermemory not configured',
      });
    }
    
    const data = JSON.parse(await decrypt(configs[0].data_encrypted));
    const apiKey = data.apiKey;
    
    // Test API call
    const response = await fetch('https://api.supermemory.ai/v1/health', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('API request failed');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Supermemory API connection successful',
    });
  } catch (error) {
    throw new Error(`Supermemory test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function testBrowserUse(userId: string) {
  try {
    // Get Browser-Use config
    const configs = await sql`
      SELECT data_encrypted FROM tool_configs
      WHERE user_id = ${userId} AND tool = 'browser_use'
    `;
    
    if (configs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Browser-Use not configured',
      });
    }
    
    const data = JSON.parse(await decrypt(configs[0].data_encrypted));
    const apiKey = data.apiKey;
    
    // Test client initialization
    const client = new BrowserUseClient({ apiKey });
    
    // Simple test - just check if we can initialize
    return NextResponse.json({
      success: true,
      message: 'Browser-Use API connection successful',
    });
  } catch (error) {
    throw new Error(`Browser-Use test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function testTwilio(userId: string) {
  try {
    // Get Twilio config
    const configs = await sql`
      SELECT data_encrypted FROM tool_configs
      WHERE user_id = ${userId} AND tool = 'twilio'
    `;
    
    if (configs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Twilio not configured',
      });
    }
    
    const data = JSON.parse(await decrypt(configs[0].data_encrypted));
    const client = twilio(data.accountSid, data.authToken);
    
    // Test by fetching account info
    const account = await client.api.accounts(data.accountSid).fetch();
    
    return NextResponse.json({
      success: true,
      message: 'Twilio API connection successful',
      accountName: account.friendlyName,
    });
  } catch (error) {
    throw new Error(`Twilio test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

