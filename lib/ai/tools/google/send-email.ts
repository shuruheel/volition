import type { ToolModule, ToolContext } from '../types';
import { createPendingActivityStep, updateAgentStatusStep } from '../../workflows/steps';

export const sendEmail: ToolModule = {
  definition: {
    type: 'function',
    function: {
      name: 'sendEmail',
      description: 'Send an email via Gmail. Requires HITL approval — the workflow will pause until the user approves.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Email subject line' },
          body: { type: 'string', description: 'Email body (HTML supported)' },
          cc: { type: 'string', description: 'CC email address (optional)' },
          bcc: { type: 'string', description: 'BCC email address (optional)' },
        },
        required: ['to', 'subject', 'body'],
        additionalProperties: false,
      },
    },
  },
  requires: ['google'],
  async handler(args: any, context: ToolContext) {
    await createPendingActivityStep(
      context.agentId,
      'email_sent',
      'high',
      { to: args.to, subject: args.subject, body: args.body, cc: args.cc, bcc: args.bcc }
    );

    await updateAgentStatusStep(context.agentId, {
      status: 'active',
      currentActivity: `Waiting for approval to send email to ${args.to}`,
      currentTool: 'sendEmail',
    });

    context.state.awaitingHumanInput = true;
    return { success: true, message: 'Email queued for approval.' };
  },
};
