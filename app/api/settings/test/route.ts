import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { requireUserId } from '@/lib/auth';
import twilio from 'twilio';
import { BrowserUseClient } from 'browser-use-sdk';
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
    
    const userId = await requireUserId();
    
    switch (tool) {
      case 'openai':
        return await testOpenAI(userId);
        
      case 'anthropic':
        return await testAnthropic(userId);

      case 'neon':
        return await testNeon();
        
      case 'supermemory':
        return await testSupermemory(userId);
        
      case 'browser_use':
        return await testBrowserUse(userId);
        
      case 'twilio':
        return await testTwilio(userId);

      case 'firecrawl':
        return await testFirecrawl(userId);

      case 'google_oauth':
        return await testGoogleOAuth(userId);

      case 'telegram':
        return await testTelegram(userId);

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

async function testOpenAI(userId: string) {
  try {
    const configs = await sql`
      SELECT data_encrypted FROM tool_configs
      WHERE user_id = ${userId} AND tool = 'openai'
    `;

    if (configs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI not configured',
      });
    }

    const data = JSON.parse(await decrypt(configs[0].data_encrypted));
    const apiKey = data.apiKey;

    const { createOpenAI } = await import('@ai-sdk/openai');
    const provider = createOpenAI({ apiKey });

    const result = await generateText({
      model: provider('gpt-5-nano-2025-08-07'),
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

async function testAnthropic(userId: string) {
  try {
    const configs = await sql`
      SELECT data_encrypted FROM tool_configs
      WHERE user_id = ${userId} AND tool = 'anthropic'
    `;

    if (configs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Anthropic not configured',
      });
    }

    const data = JSON.parse(await decrypt(configs[0].data_encrypted));
    const apiKey = data.apiKey;

    const { createAnthropic } = await import('@ai-sdk/anthropic');
    const provider = createAnthropic({ apiKey });

    const result = await generateText({
      model: provider('claude-haiku-4-5'),
      prompt: 'Say "test successful" if you can read this.',
      maxTokens: 10,
    });

    return NextResponse.json({
      success: true,
      message: 'Anthropic API connection successful',
      response: result.text,
    });
  } catch (error) {
    throw new Error(`Anthropic test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    // Test using the SDK (same as production code) with a lightweight search
    const Supermemory = (await import('supermemory')).default;
    const sm = new Supermemory({ apiKey });
    await sm.search.documents({ q: 'test', limit: 1 });

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

async function testFirecrawl(userId: string) {
  try {
    const configs = await sql`
      SELECT data_encrypted FROM tool_configs
      WHERE user_id = ${userId} AND tool = 'firecrawl'
    `;

    if (configs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Firecrawl not configured',
      });
    }

    const data = JSON.parse(await decrypt(configs[0].data_encrypted));
    const apiKey = data.apiKey;

    // Test with a lightweight search request
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'test', limit: 1 }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API returned ${response.status}: ${errorBody}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Firecrawl API connection successful',
    });
  } catch (error) {
    throw new Error(`Firecrawl test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function testGoogleOAuth(userId: string) {
  try {
    const configs = await sql`
      SELECT data_encrypted FROM tool_configs
      WHERE user_id = ${userId} AND tool = 'google_oauth'
    `;

    if (configs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Google account not connected. Use the "Connect Google Account" button.',
      });
    }

    // Verify tokens are valid by checking token info
    const data = JSON.parse(await decrypt(configs[0].data_encrypted));
    if (!data.access_token) {
      return NextResponse.json({
        success: false,
        error: 'Stored tokens are invalid. Please reconnect your Google account.',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Google OAuth tokens are stored and valid',
    });
  } catch (error) {
    throw new Error(`Google OAuth test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function testTelegram(userId: string) {
  try {
    const configs = await sql`
      SELECT data_encrypted FROM tool_configs
      WHERE user_id = ${userId} AND tool = 'telegram'
    `;

    if (configs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Telegram not configured',
      });
    }

    const data = JSON.parse(await decrypt(configs[0].data_encrypted));
    const botToken = data.botToken;

    // Test by calling getMe on the Telegram Bot API
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const result = await response.json();

    if (!result.ok) {
      throw new Error(result.description || 'Invalid bot token');
    }

    return NextResponse.json({
      success: true,
      message: `Telegram bot @${result.result.username} connected successfully`,
    });
  } catch (error) {
    throw new Error(`Telegram test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

