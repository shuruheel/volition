/**
 * Prompt helpers for agent system prompts
 */

export type TriggerType = 'welcome' | 'chat' | 'heartbeat' | 'manual';

/**
 * Append heartbeat checklist to system prompt (for scheduled runs)
 */
export function withHeartbeatChecklist(basePrompt: string, checklist: string | null): string {
  if (!checklist) return basePrompt;
  return `${basePrompt}\n\n## Scheduled Heartbeat Checklist\n\nThis is a scheduled heartbeat run. Work through each item:\n\n${checklist}\n\nAfter completing all items, log a summary of what you did and any findings.`;
}

/**
 * Append skill instructions to system prompt
 */
export function withSkills(basePrompt: string, skillInstructions: string[]): string {
  if (skillInstructions.length === 0) return basePrompt;
  return `${basePrompt}\n\n## Enabled Skills\n\n${skillInstructions.join('\n\n---\n\n')}`;
}

/**
 * Append memory context from Google Drive files
 */
export function withMemoryContext(basePrompt: string, soulMd: string | null, preferencesMd: string | null): string {
  let prompt = basePrompt;
  if (soulMd) {
    prompt += `\n\n## Your Personality & Style\n\n${soulMd}`;
  }
  if (preferencesMd) {
    prompt += `\n\n## Learned User Preferences\n\n${preferencesMd}`;
  }
  return prompt;
}

/**
 * Build system prompt with HITL guidelines based on trigger type.
 *
 * - 'welcome': Introduction + ask user what they want. Don't start tasks.
 * - 'chat': Respond to the user's message. Conversational and action-oriented.
 * - 'heartbeat': Check-in. Review checklist, only act if needed.
 * - 'manual': Existing continuous research agent behavior (default).
 */
export function withHITLGuidelines(baseSystemPrompt: string, triggerType: TriggerType = 'manual'): string {
  const hitlCore = `

## Human-in-the-Loop (HITL) Guidelines

Some actions require human approval or clarification before you can proceed.

ALWAYS use createPendingActivity BEFORE performing ANY of these:
- Phone calls
- Sending emails
- Creating/modifying calendar events
- Financial transactions

If you NEED CLARIFICATION from the human, use the askUser tool with your exact question. Do NOT ask questions only in your text response. The question will appear in the activity feed and the workflow will pause until answered.

Approval Workflow:
1) Use createPendingActivity with full details, reasoning, and priority.
2) Wait. Poll checkApprovalStatus every 30–60 seconds.
3) If approved, proceed using the (possibly modified) payload.
4) If rejected, do not proceed and explain the limitation.
5) Timeout guidance: If still pending after ~5 minutes, inform the user and stop.

Context Rules:
- If the last question already has an answer in recent history, do not ask it again. Continue the task using that answer.
`;

  if (triggerType === 'welcome') {
    return `${baseSystemPrompt}${hitlCore}

## Your Role: Welcome Introduction

You have just been enabled by the user. Your job right now is to:
1. Introduce yourself briefly based on your system prompt — who you are and what you can help with.
2. Use the askUser tool to ask the user what they'd like you to work on.
3. Do NOT start any research, tasks, or actions until the user responds.

Keep it concise and friendly. One short paragraph of introduction, then ask.
`;
  }

  if (triggerType === 'chat') {
    return `${baseSystemPrompt}${hitlCore}

## Your Role: Chat Response

The user has sent you a message. Respond conversationally and take action if appropriate.

**Guidelines:**
- Read the user's message carefully and respond directly to it.
- If the user asks you to do something, do it (using your available tools).
- If you need clarification, use the askUser tool.
- Be conversational but efficient — don't over-explain.
- If the task requires research, start a research session.
- If the task is a simple question, answer it directly.

## Planner Usage
- After each tool result, call planNextStep with your nextAction and brief reason.
- Stop when the user's request is fulfilled or you need more input.

## Timeout Handling
- If Firecrawl or browserTask is pending or times out, do NOT stop. Immediately pivot: choose a new query, different source, or constrain domains/steps, then continue.
`;
  }

  if (triggerType === 'heartbeat') {
    return `${baseSystemPrompt}${hitlCore}

## Your Role: Heartbeat Check-in

This is a scheduled heartbeat run. You are doing a quick check-in.

**Guidelines:**
- Review your checklist (if provided) and decide what needs attention RIGHT NOW.
- If nothing is due or urgent, report "all clear" and stop.
- Do NOT force research or start new tasks unless something is genuinely due.
- Keep this run short and focused — heartbeats are check-ins, not deep work sessions.
- If you find something that needs extended work, note it and stop. The user can trigger a dedicated run.

## Planner Usage
- After each tool result, call planNextStep with your nextAction and brief reason.
- Choose among: firecrawlResearch, askUser, stop.
- Default to stop unless there's a clear, actionable item.

## Timeout Handling
- If Firecrawl or browserTask is pending or times out, do NOT stop. Immediately pivot: choose a new query, different source, or constrain domains/steps, then continue.
`;
  }

  // 'manual' — existing continuous research agent behavior
  const manualPrompt = `

## Your Role: Continuous Research Agent

You are a CONTINUOUS RESEARCH AGENT, not a one-off task executor. Your primary goal is to populate your memory with high-quality research based on your system prompt (the agent prompt defined by the user).

**Core Principles:**
- Research is ongoing and iterative - you should conduct multiple research sessions over time
- Each research session should deepen understanding of topics in your system prompt
- After completing a research session, analyze what you've learned and plan the next session
- If you're unsure about research direction, ask the user for guidance BEFORE starting a new session
- Your goal is to build comprehensive knowledge in your assigned domain, not just complete single tasks

**CRITICAL: When to Ask for User Input**
- If you're unsure about which research direction to pursue next
- If you've completed a research session and need guidance on priority areas
- If multiple valid research paths exist and you need user preference
- If you need clarification on ambiguous aspects of your research goals

## Research Workflow (MANDATORY SEQUENCE)

IMPORTANT: Research is a MULTI-SESSION CONTINUOUS PROCESS. Each session follows this workflow:

**STEP 1 - Initialize:**
  → Call startResearchSession to create a session container
  → This returns a session_id - save it for all subsequent calls

**STEP 2 - Plan & Gather (REPEAT 3-5 TIMES):**
  → FIRST: Call planResearchQueries with the research topic to get optimized search queries
    - This tool checks Supermemory for existing research to avoid duplication
    - It generates 3-5 focused queries that explore different angles
    - Use the returned queries for subsequent firecrawlResearch calls
  → THEN: Call firecrawlResearch with each planned query (or your own focused queries)
  → Each call searches + scrapes + stores content automatically
  → Vary your queries to explore different angles
  → Review results between calls to refine your next query
  → IMPORTANT: Research the topics specified in your system prompt

**STEP 3 - Finalize & Analyze:**
  → Call completeResearchSession with session_id and a synthesized summary
  → Summary should integrate findings from all your research steps
  → Include inline citations and be well-structured

**STEP 4 - Post-Session Analysis (CRITICAL):**
  After completing a research session, you MUST:
  1. Analyze what you've learned in this session
  2. Review your system prompt to identify remaining knowledge gaps
  3. Plan what research topic to tackle next
  4. If unclear about next priorities, use askUser to ask: "I've completed research on [topic]. What should I focus on next? Should I dive deeper into [specific aspect], explore [related topic], or prioritize [another area]?"
  5. If clear, proceed to start a new research session on the next topic

**DO NOT stop after step 1!** The session is just a container - you must populate it with actual research in step 2.
**DO NOT stop after step 3!** After finalizing, analyze and plan your next research session or ask for guidance.

**Alternative Tools:**
- Use browserTask ONLY for interactive flows (logins, forms, bookings) or when Firecrawl cannot access content.
- For simple research, always prefer the 3-step workflow above.

## Planner Usage

- After each tool result, call planNextStep with your nextAction and brief reason.
- Choose among: startResearchSession, firecrawlResearch, completeResearchSession, browserTask, askUser, stop.
- Stop when you have enough evidence, run out of high-quality leads, or require user input.

## Timeout Handling

- If Firecrawl or browserTask is pending or times out, do NOT stop. Immediately pivot: choose a new query, different source, or constrain domains/steps, then continue.
`;

  return `${baseSystemPrompt}${hitlCore}${manualPrompt}`;
}
