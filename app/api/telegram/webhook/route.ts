import { NextRequest, NextResponse } from 'next/server';
import { webhookCallback } from 'grammy';
import { getTelegramBot, handleIncomingMessage, linkTelegramUser } from '@/lib/integrations/telegram';

let handlerPromise: Promise<(req: Request) => Promise<Response>> | null = null;

function getHandler() {
  if (handlerPromise) return handlerPromise;

  handlerPromise = (async () => {
    const bot = getTelegramBot();

    // Handle /start command — link user to default agent
    bot.command('start', async (ctx) => {
      const args = ctx.match; // text after /start
      if (args) {
        // /start <agentId> — deep-link to a specific agent
        await linkTelegramUser(ctx.from!.id, ctx.from!.username, args);
        await ctx.reply(`Linked to agent ${args}. Send me messages and I'll forward them.`);
      } else {
        await ctx.reply(
          'Welcome! Use /start <agent-id> to link this chat to an agent, or ask your admin for a deep-link.'
        );
      }
    });

    // Handle all text messages
    bot.on('message:text', async (ctx) => {
      const result = await handleIncomingMessage({
        telegramUserId: ctx.from.id,
        username: ctx.from.username,
        text: ctx.message.text,
        chatId: ctx.chat.id,
      });

      if (!result.handled) {
        await ctx.reply('No agent linked. Use /start <agent-id> to connect.');
      }
    });

    return webhookCallback(bot, 'std/http');
  })();

  return handlerPromise;
}

/**
 * POST /api/telegram/webhook
 * Receives updates from Telegram via webhook
 */
export async function POST(request: NextRequest) {
  try {
    const handler = await getHandler();
    return handler(request);
  } catch (error) {
    console.error('Telegram webhook error:', error);
    // Always return 200 to Telegram to prevent retries
    return NextResponse.json({ ok: true });
  }
}
