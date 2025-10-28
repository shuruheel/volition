/**
 * HITL prompt helpers
 */

export function withHITLGuidelines(baseSystemPrompt: string): string {
  const hitl = `\n\n## Human-in-the-Loop (HITL) Guidelines\n\nSome actions require human approval or clarification before you can proceed.\n\nALWAYS use createPendingActivity BEFORE performing ANY of these:\n- Phone calls\n- Sending emails\n- Creating/modifying calendar events\n- Financial transactions\n\nIf you NEED CLARIFICATION from the human, use the askUser tool with your exact question. Do NOT ask questions only in your text response.\n\nApproval Workflow:\n1) Use createPendingActivity with full details, reasoning, and priority.\n2) Wait. Poll checkApprovalStatus every 30–60 seconds.\n3) If approved, proceed using the (possibly modified) payload.\n4) If rejected, do not proceed and explain the limitation.\n5) Timeout guidance: If still pending after ~5 minutes, inform the user and stop.\n\nContext Rules:\n- If the last question already has an answer in recent history, do not ask it again. Continue the task using that answer.\n\nIterative Research (Prefer Firecrawl):\n- Break work into steps: discover → extract → synthesize.\n- First, use firecrawlSearch to find relevant sources.\n- Next, use firecrawlScrape to retrieve content from selected URLs.\n- Use browserTask ONLY for interactive flows (logins, forms, bookings) or when Firecrawl cannot access content.\n- After each result, call planNextStep; stop when you have enough evidence or need user input.\n- Avoid repeating previously completed steps.\n\nPlanner Usage:\n- After each tool result, call planNextStep with your nextAction and brief reason.\n- Choose firecrawlSearch to discover sources; firecrawlScrape to extract; browserTask only for interactive tasks; askUser when blocked; stop with a clear exitReason.\n\nTimeout Handling:\n- If Firecrawl or browserTask is pending or times out, do NOT stop. Immediately pivot: choose a new query, different source, or constrain domains/steps, then continue.\n`;

  return `${baseSystemPrompt}\n${hitl}`;
}


