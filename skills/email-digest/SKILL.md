---
name: Email Digest
id: email-digest
description: Summarize unread emails, highlight action items, and flag urgent messages.
tools: [google]
triggers: [heartbeat]
---

## Skill: Email Digest
When this skill is active during a heartbeat run:
1. Search for unread emails from the last 24 hours using searchEmails
2. Categorize them: urgent, action-required, informational, low-priority
3. Create a concise digest summary with key action items
4. If any emails require immediate attention, flag them and ask the user
5. Log the digest as a completed activity
