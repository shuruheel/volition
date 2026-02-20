import type { ToolModule, ToolContext } from '../types';
import { sql } from '@/lib/db';
import { logActivityStep } from '../../workflows/steps';

export const sendTelegramMessage: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'sendTelegramMessage',
      description: 'Send a message to a linked Telegram user. If chatId is not provided, looks up the linked chat from telegram_users table.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Message text to send' },
          chatId: { type: 'number', description: 'Telegram chat ID (optional — auto-resolved from linked users if omitted)' },
          parseMode: { type: 'string', enum: ['HTML', 'MarkdownV2'], description: 'Message format (optional)' },
        },
        required: ['text'],
        additionalProperties: false,
      },
    },
  },
  requires: ['telegram'],
  async handler(args: any, context: ToolContext) {
    try {
      const { sendTelegramMessage: tgSend, resolveTelegramToken } = await import('@/lib/integrations/telegram');

      let chatId = args.chatId;
      if (!chatId) {
        const rows = await sql`
          SELECT telegram_user_id FROM telegram_users
          WHERE agent_id = ${context.agentId}
          LIMIT 1
        `;
        if (rows.length === 0) {
          return { success: false, error: 'No Telegram user linked to this agent. User must /start the bot first.' };
        }
        chatId = rows[0].telegram_user_id;
      }

      const botToken = await resolveTelegramToken(context.userId);
      const tgResult = await tgSend({ chatId, text: args.text, parseMode: args.parseMode, botToken });

      await logActivityStep(context.agentId, 'telegram_message_sent', {
        chatId,
        text: args.text,
        messageId: tgResult.messageId,
      });

      return { success: true, ...tgResult };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Failed to send Telegram message' };
    }
  },
};
