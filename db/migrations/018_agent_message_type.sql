-- Migration 018: Add 'agent_message' to activities.type CHECK constraint
-- Also adds 'telegram_message_sent' which is used by the Telegram tool handler

ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_type_check;

ALTER TABLE public.activities
  ADD CONSTRAINT activities_type_check
  CHECK (type IN (
    'research',
    'email_sent',
    'phone_call',
    'post_call_summary',
    'phone_call_summary',
    'calendar_event_added',
    'calendar_event_modified',
    'webpage_viewed',
    'journal_read',
    'task_completed',
    'agent_stopped',
    'user_input',
    'user_message',
    'agent_message',
    'telegram_message_sent'
  ));
