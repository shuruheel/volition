/**
 * Tool registry — assembles available tools based on agent config.
 * Tools use raw OpenAI function call format (JSON Schema with `parameters` key).
 */

import type { ToolDefinition, ToolHandler, ToolModule, ToolContext } from './types';

// Core tools (always available)
import { logActivity } from './core/log-activity';
import { askUser } from './core/ask-user';
import { sendMessage } from './core/send-message';
import { spawnSubAgent } from './core/spawn-sub-agent';
import { checkSubAgent } from './core/check-sub-agent';

// Research tools (requires 'firecrawl')
import { startResearchSession } from './research/start-session';
import { planResearchQueries } from './research/plan-queries';
import { firecrawlResearch } from './research/firecrawl-research';
import { completeResearchSession } from './research/complete-session';

// Memory tools (requires 'google' + auth)
import { readMemory } from './memory/read-memory';
import { updateMemory } from './memory/update-memory';
import { appendMemory } from './memory/append-memory';
import { searchMemory } from './memory/search-memory';

// Google tools (requires 'google')
import { sendEmail } from './google/send-email';
import { searchEmails } from './google/search-emails';
import { createCalendarEvent } from './google/create-calendar-event';
import { listCalendarEvents } from './google/list-calendar-events';

// Browser tools (requires 'browser')
import { browserTask } from './browser/browser-task';

// Telegram tools (requires 'telegram')
import { sendTelegramMessage } from './telegram/send-telegram-message';

const ALL_TOOLS: ToolModule[] = [
  // Core (always available)
  logActivity,
  askUser,
  sendMessage,
  spawnSubAgent,
  checkSubAgent,
  // Research (requires 'firecrawl')
  startResearchSession,
  planResearchQueries,
  firecrawlResearch,
  completeResearchSession,
  // Memory (requires 'google' + auth)
  readMemory,
  updateMemory,
  appendMemory,
  searchMemory,
  // Google (requires 'google')
  sendEmail,
  searchEmails,
  createCalendarEvent,
  listCalendarEvents,
  // Browser (requires 'browser')
  browserTask,
  // Telegram (requires 'telegram')
  sendTelegramMessage,
];

/**
 * Collect tools available for the given agent configuration.
 * Returns tool definitions (for LLM) and a handler map (for execution).
 */
export function collectTools(
  enabledTools: string[],
  userId?: string | null
): {
  definitions: ToolDefinition[];
  handlers: Map<string, ToolHandler>;
} {
  const definitions: ToolDefinition[] = [];
  const handlers = new Map<string, ToolHandler>();
  const enabledSet = new Set(enabledTools);

  for (const tool of ALL_TOOLS) {
    // Check tool group requirements
    if (tool.requires && tool.requires.length > 0) {
      const hasAll = tool.requires.every((req) => enabledSet.has(req));
      if (!hasAll) continue;
    }

    // Check auth requirement
    if (tool.requiresAuth && !userId) continue;

    definitions.push(tool.definition);
    handlers.set(tool.definition.function.name, tool.handler);
  }

  return { definitions, handlers };
}

export type { ToolDefinition, ToolHandler, ToolModule, ToolContext };
