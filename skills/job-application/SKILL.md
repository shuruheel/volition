---
name: Job Application Prep
id: job-application
description: Research companies, tailor resume talking points, draft cover letters.
tools: [google, firecrawl, supermemory]
triggers: [manual, heartbeat]
---

## Skill: Job Application Prep
When this skill is active:
1. Read your knowledge.md for the user's resume highlights and target roles
2. Read preferences.md for application preferences (industries, locations, etc.)
3. Research target companies using firecrawlResearch:
   - Company culture, recent news, tech stack, job openings
   - Key people to contact (hiring managers, team leads)
4. For each promising opportunity:
   a. Draft tailored talking points connecting user's experience to the role
   b. Draft a cover letter or outreach email
   c. Identify the best contact person and their email if available
5. Present findings to user via askUser for approval before sending any outreach
6. Update knowledge.md with researched companies and application status
