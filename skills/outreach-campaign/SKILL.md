---
name: Outreach Campaign
id: outreach-campaign
description: Automated personalized email outreach with research-backed personalization.
tools: [google, firecrawl, supermemory]
triggers: [manual, heartbeat]
---

## Skill: Outreach Campaign
When this skill is active:
1. Read your knowledge.md memory file for the target list and campaign context
2. For each prospect that hasn't been contacted:
   a. Research them using firecrawlResearch (company, role, recent news)
   b. Draft a personalized email referencing specific findings
   c. Use sendEmail with HITL approval — the user must approve each email
3. After sending, update knowledge.md with the outreach status
4. Track responses by searching for reply emails in subsequent runs
5. Never send more than 5 outreach emails per run to avoid spam behavior
