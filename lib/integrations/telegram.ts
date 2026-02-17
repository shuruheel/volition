import { Bot } from 'grammy';
import { sql } from '@/lib/db';

let _bot: Bot | null = null;

/**
 * Get or create the singleton Telegram Bot instance
 */
export function getTelegramBot(): Bot {
  if (_bot) return _bot;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set');
  }

  _bot = new Bot(token);
  return _bot;
}

/**
 * Send a message to a Telegram chat
 */
export async function sendTelegramMessage(params: {
  chatId: number | string;
  text: string;
  parseMode?: 'HTML' | 'MarkdownV2';
}) {
  const bot = getTelegramBot();
  const result = await bot.api.sendMessage(params.chatId, params.text, {
    parse_mode: params.parseMode,
  });
  return {
    messageId: result.message_id,
    chatId: result.chat.id,
    date: result.date,
  };
}

/**
 * Link a Telegram user to an agent
 */
export async function linkTelegramUser(
  telegramUserId: number,
  username: string | undefined,
  agentId: string
) {
  await sql`
    INSERT INTO telegram_users (telegram_user_id, telegram_username, agent_id)
    VALUES (${telegramUserId}, ${username ?? null}, ${agentId})
    ON CONFLICT (telegram_user_id)
    DO UPDATE SET
      telegram_username = ${username ?? null},
      agent_id = ${agentId}
  `;
}

/**
 * Find the agent linked to a Telegram user
 */
export async function findLinkedAgent(telegramUserId: number) {
  const rows = await sql`
    SELECT agent_id FROM telegram_users
    WHERE telegram_user_id = ${telegramUserId}
  `;
  return rows[0]?.agent_id || null;
}

/**
 * Handle an incoming Telegram message: log it as an activity on the linked agent
 */
export async function handleIncomingMessage(ctx: {
  telegramUserId: number;
  username?: string;
  text: string;
  chatId: number;
}) {
  const agentId = await findLinkedAgent(ctx.telegramUserId);
  if (!agentId) {
    return { handled: false, reason: 'No linked agent' };
  }

  // Log as user_message activity
  await sql`
    INSERT INTO activities (agent_id, type, status, payload)
    VALUES (
      ${agentId},
      'telegram_message_received',
      'completed',
      ${JSON.stringify({
        telegramUserId: ctx.telegramUserId,
        username: ctx.username,
        text: ctx.text,
        chatId: ctx.chatId,
      })}
    )
  `;

  return { handled: true, agentId };
}
