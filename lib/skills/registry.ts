/**
 * Skills registry — loads built-in skill definitions.
 * Skills are prompt templates injected into the agent's system prompt.
 */

import type { Skill } from './types';

const BUILTIN_SKILLS: Skill[] = [
  {
    id: 'email-digest',
    name: 'Email Digest',
    description: 'Summarize unread emails, highlight action items, and flag urgent messages.',
    tools: ['google'],
    triggers: ['heartbeat'],
    instructions: `## Skill: Email Digest
When this skill is active during a heartbeat run:
1. Search for unread emails from the last 24 hours using searchEmails
2. Categorize them: urgent, action-required, informational, low-priority
3. Create a concise digest summary with key action items
4. If any emails require immediate attention, flag them and ask the user
5. Log the digest as a completed activity`,
  },
  {
    id: 'calendar-summary',
    name: 'Calendar Summary',
    description: 'Daily calendar briefing with meeting prep notes.',
    tools: ['google'],
    triggers: ['heartbeat'],
    instructions: `## Skill: Calendar Summary
When this skill is active during a heartbeat run:
1. List today's calendar events using listCalendarEvents
2. For each meeting, note: time, attendees, topic
3. If any meetings are in the next 2 hours, highlight them
4. Suggest preparation notes for upcoming meetings
5. Send a summary via email if the user has configured email delivery`,
  },
  {
    id: 'outreach-campaign',
    name: 'Outreach Campaign',
    description: 'Automated personalized email outreach with research-backed personalization.',
    tools: ['google', 'firecrawl', 'supermemory'],
    triggers: ['manual', 'heartbeat'],
    instructions: `## Skill: Outreach Campaign
When this skill is active:
1. Read your knowledge.md memory file for the target list and campaign context
2. For each prospect that hasn't been contacted:
   a. Research them using firecrawlResearch (company, role, recent news)
   b. Draft a personalized email referencing specific findings
   c. Use sendEmail with HITL approval — the user must approve each email
3. After sending, update knowledge.md with the outreach status
4. Track responses by searching for reply emails in subsequent runs
5. Never send more than 5 outreach emails per run to avoid spam behavior`,
  },
  {
    id: 'job-application',
    name: 'Job Application Prep',
    description: 'Research companies, tailor resume talking points, draft cover letters.',
    tools: ['google', 'firecrawl', 'supermemory'],
    triggers: ['manual', 'heartbeat'],
    instructions: `## Skill: Job Application Prep
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
6. Update knowledge.md with researched companies and application status`,
  },
  {
    id: 'daily-briefing',
    name: 'Daily Intelligence Briefing',
    description: 'Monitor configured sources and deliver a morning briefing email.',
    tools: ['google', 'firecrawl', 'supermemory'],
    triggers: ['heartbeat'],
    instructions: `## Skill: Daily Intelligence Briefing
When this skill is active during a heartbeat run:
1. Read knowledge.md for the list of topics and sources to monitor
2. Research each topic using firecrawlResearch for the latest developments
3. Check for new emails related to monitored topics
4. Synthesize findings into a structured briefing:
   - Top headlines and developments
   - Key insights and analysis
   - Action items or decisions needed
5. Send the briefing via email to the user
6. Store the briefing in knowledge.md for future reference`,
  },
  {
    id: 'research-deep-dive',
    name: 'Research Deep Dive',
    description: 'Multi-session comprehensive research on a topic with progressive knowledge building.',
    tools: ['firecrawl', 'supermemory'],
    triggers: ['manual'],
    instructions: `## Skill: Research Deep Dive
When this skill is active:
1. Read knowledge.md for existing research on the topic
2. Identify knowledge gaps and unexplored angles
3. Conduct 3-5 research sessions, each exploring a different facet:
   - Use planResearchQueries to get optimized queries
   - Execute firecrawlResearch for each query
   - Synthesize findings after each session
4. After all sessions, create a comprehensive research report
5. Update knowledge.md with the full research findings
6. Ask the user if they want to explore any specific aspect deeper`,
  },
];

/**
 * Get all available skills
 */
export function getAllSkills(): Skill[] {
  return BUILTIN_SKILLS;
}

/**
 * Get a skill by ID
 */
export function getSkillById(id: string): Skill | undefined {
  return BUILTIN_SKILLS.find((s) => s.id === id);
}

/**
 * Get skills by IDs (for loading an agent's enabled skills)
 */
export function getSkillsByIds(ids: string[]): Skill[] {
  return BUILTIN_SKILLS.filter((s) => ids.includes(s.id));
}
