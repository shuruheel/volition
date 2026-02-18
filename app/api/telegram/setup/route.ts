import { NextResponse } from 'next/server';
import { requireUserId } from '@/lib/auth';
import { getTelegramBot } from '@/lib/integrations/telegram';

/**
 * POST /api/telegram/setup
 * Register the webhook URL with Telegram (authenticated)
 */
export async function POST() {
  try {
    await requireUserId();
    const bot = getTelegramBot();
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram/webhook`;

    await bot.api.setWebhook(webhookUrl);

    return NextResponse.json({
      success: true,
      webhookUrl,
    });
  } catch (error) {
    console.error('Failed to set up Telegram webhook:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set up webhook' },
      { status: 500 }
    );
  }
}
