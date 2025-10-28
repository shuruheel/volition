import { tool } from 'ai';
import { z } from 'zod';

/**
 * Check approval status for a previously created pending activity.
 */
export const checkApprovalTool = tool({
  description:
    "Check if a pending activity has been approved, rejected, or is still pending. If approved, use the returned payload.",
  inputSchema: z.object({
    activityId: z.string(),
  }),
  execute: async ({ activityId }) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/activities/${activityId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch activity status: ${response.statusText}`);
      }

      const activity = await response.json();

      return {
        success: true,
        activity_id: activityId,
        status: activity.status as 'pending' | 'approved' | 'rejected' | 'completed',
        payload: activity.payload,
        message:
          activity.status === 'pending'
            ? 'Still pending. Check again in ~30 seconds.'
            : activity.status === 'approved'
              ? 'Approved. Proceed with the action using the payload.'
              : activity.status === 'rejected'
                ? 'Rejected. Do not proceed.'
                : 'Completed.',
      };
    } catch (error) {
      console.error('Check approval error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to check approval status',
      };
    }
  },
});


