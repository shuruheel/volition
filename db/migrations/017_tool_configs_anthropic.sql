-- Migration 017: Add 'anthropic' to tool_configs CHECK constraint
-- The app validates 'anthropic' as a valid tool name in settings/tools/route.ts
-- but the DB constraint from migration 008 didn't include it, causing insert failures.

ALTER TABLE public.tool_configs DROP CONSTRAINT IF EXISTS tool_configs_tool_check;

ALTER TABLE public.tool_configs
  ADD CONSTRAINT tool_configs_tool_check
  CHECK (tool IN ('openai', 'anthropic', 'neon', 'firecrawl', 'supermemory', 'browser_use', 'twilio', 'google_oauth', 'telegram'));
