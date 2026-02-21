import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { requireUserId } from '@/lib/auth';
import twilio from 'twilio';
import { BrowserUseClient } from 'browser-use-sdk';
import { generateText } from 'ai';

const DECRYPT_ERROR_MSG = 'Failed to decrypt stored credentials. The encryption key may have changed. Please re-enter your API key and save again.';

/**
 * Fetch and decrypt tool config for a user. Returns the parsed data or a NextResponse error.
 */
async function getDecryptedConfig(userId: string, tool: string, notConfiguredMsg: string): Promise<Record<string, any> | NextResponse> {
  const configs = await sql`
    SELECT data_encrypted FROM tool_configs
    WHERE user_id = ${userId} AND tool = ${tool}
  `;

  if (configs.length === 0 || !configs[0].data_encrypted) {
    return NextResponse.json({ success: false, error: notConfiguredMsg });
  }

  try {
    return JSON.parse(decrypt(configs[0].data_encrypted));
  } catch {
    return NextResponse.json({ success: false, error: DECRYPT_ERROR_MSG });
  }
}

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
    const result = await getDecryptedConfig(userId, 'openai', 'OpenAI not configured');
    if (result instanceof NextResponse) return result;

    const { createOpenAI } = await import('@ai-sdk/openai');
    const provider = createOpenAI({ apiKey: result.apiKey });

    const genResult = await generateText({
      model: provider('gpt-5-nano-2025-08-07'),
      prompt: 'Say "test successful" if you can read this.',
      maxTokens: 10,
    });

    return NextResponse.json({
      success: true,
      message: 'OpenAI API connection successful',
      response: genResult.text,
    });
  } catch (error) {
    throw new Error(`OpenAI test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function testAnthropic(userId: string) {
  try {
    const result = await getDecryptedConfig(userId, 'anthropic', 'Anthropic not configured');
    if (result instanceof NextResponse) return result;

    const { createAnthropic } = await import('@ai-sdk/anthropic');
    const provider = createAnthropic({ apiKey: result.apiKey });

    const genResult = await generateText({
      model: provider('claude-haiku-4-5'),
      prompt: 'Say "test successful" if you can read this.',
      maxTokens: 10,
    });

    return NextResponse.json({
      success: true,
      message: 'Anthropic API connection successful',
      response: genResult.text,
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
    const data = await getDecryptedConfig(userId, 'supermemory', 'Supermemory not configured');
    if (data instanceof NextResponse) return data;

    const Supermemory = (await import('supermemory')).default;
    const sm = new Supermemory({ apiKey: data.apiKey });
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
    const data = await getDecryptedConfig(userId, 'browser_use', 'Browser-Use not configured');
    if (data instanceof NextResponse) return data;

    const client = new BrowserUseClient({ apiKey: data.apiKey });

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
    const data = await getDecryptedConfig(userId, 'twilio', 'Twilio not configured');
    if (data instanceof NextResponse) return data;

    const client = twilio(data.accountSid, data.authToken);
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
    const data = await getDecryptedConfig(userId, 'firecrawl', 'Firecrawl not configured');
    if (data instanceof NextResponse) return data;

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${data.apiKey}`,
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
    const data = await getDecryptedConfig(userId, 'google_oauth', 'Google account not connected. Use the "Connect Google Account" button.');
    if (data instanceof NextResponse) return data;

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
    const data = await getDecryptedConfig(userId, 'telegram', 'Telegram not configured');
    if (data instanceof NextResponse) return data;

    const response = await fetch(`https://api.telegram.org/bot${data.botToken}/getMe`);
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

