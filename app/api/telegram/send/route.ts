import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { sendTelegramMessage, resolveTelegramToken } from '@/lib/integrations/telegram';

/**
 * POST /api/telegram/send
 * Send a message to a Telegram chat (authenticated)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = await request.json();
    const { chatId, text, parseMode } = body;

    if (!chatId || !text) {
      return NextResponse.json(
        { error: 'chatId and text are required' },
        { status: 400 }
      );
    }

    const botToken = await resolveTelegramToken(userId);
    const result = await sendTelegramMessage({ chatId, text, parseMode, botToken });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send message' },
      { status: 500 }
    );
  }
}
