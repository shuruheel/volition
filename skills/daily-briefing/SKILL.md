---
name: Daily Intelligence Briefing
id: daily-briefing
description: Monitor configured sources and deliver a morning briefing email.
tools: [google, firecrawl, supermemory]
triggers: [heartbeat]
---

## Skill: Daily Intelligence Briefing
When this skill is active during a heartbeat run:
1. Read knowledge.md for the list of topics and sources to monitor
2. Research each topic using firecrawlResearch for the latest developments
3. Check for new emails related to monitored topics
4. Synthesize findings into a structured briefing:
   - Top headlines and developments
   - Key insights and analysis
   - Action items or decisions needed
5. Send the briefing via email to the user
6. Store the briefing in knowledge.md for future reference
