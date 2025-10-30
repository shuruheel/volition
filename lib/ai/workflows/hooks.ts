import { defineHook } from 'workflow';

/**
 * Workflow hooks for human-in-the-loop interactions
 * Each hook pauses the workflow until an external event resumes it
 */

// User input hook - for agent questions requiring text answers
export const userInputHook = defineHook<{
  answer: string;
  activityId: string;
}>();

// Phone call approval hook - for approving outbound calls
export const phoneCallHook = defineHook<{
  approved: boolean;
  activityId: string;
}>();

// Email approval hook - for approving email sends (future)
export const emailApprovalHook = defineHook<{
  approved: boolean;
  modifications?: string;
  activityId: string;
}>();

// Generic activity approval hook - for other pending activities
export const activityApprovalHook = defineHook<{
  approved: boolean;
  activityId: string;
}>();

