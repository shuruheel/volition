import { NextRequest, NextResponse } from 'next/server';
import { webhookCallback } from 'grammy';
import { getTelegramBot, handleIncomingMessage, linkTelegramUser } from '@/lib/integrations/telegram';
import { sql } from '@/lib/db';

let handlerPromise: Promise<(req: Request) => Promise<Response>> | null = null;

function getHandler() {
  if (handlerPromise) return handlerPromise;

  handlerPromise = (async () => {
    const bot = getTelegramBot();

    // Handle /start command — link user to agent (with validation)
    bot.command('start', async (ctx) => {
      const agentId = ctx.match; // text after /start
      if (agentId) {
        // Validate: agent must exist, be enabled, and have Telegram tool enabled
        const rows = await sql`
          SELECT id, enabled, tools FROM agents WHERE id = ${agentId}
        `;
        if (rows.length === 0) {
          await ctx.reply('Agent not found. Please check the link and try again.');
          return;
        }
        const agent = rows[0] as any;
        if (!agent.enabled) {
          await ctx.reply('This agent is currently disabled. Ask the owner to enable it first.');
          return;
        }
        const tools: string[] = Array.isArray(agent.tools) ? agent.tools : [];
        if (!tools.includes('telegram')) {
          await ctx.reply('This agent does not have Telegram enabled. Ask the owner to enable the Telegram tool.');
          return;
        }

        await linkTelegramUser(ctx.from!.id, ctx.from!.username, agentId);
        await ctx.reply(`Linked to agent. Send me messages and I'll forward them.`);
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
