---
name: Calendar Summary
id: calendar-summary
description: Daily calendar briefing with meeting prep notes.
tools: [google]
triggers: [heartbeat]
---

## Skill: Calendar Summary
When this skill is active during a heartbeat run:
1. List today's calendar events using listCalendarEvents
2. For each meeting, note: time, attendees, topic
3. If any meetings are in the next 2 hours, highlight them
4. Suggest preparation notes for upcoming meetings
5. Send a summary via email if the user has configured email delivery
