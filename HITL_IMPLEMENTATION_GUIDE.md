# 🛠️ Human-in-the-Loop (HITL) Implementation Guide

This document provides **code examples** and **implementation steps** to complete the HITL workflow.

---

## 🎯 Goal

Enable agents to request human approval before performing sensitive actions (phone calls, emails, calendar events, financial transactions).

---

## 📝 Step 1: Create `createPendingActivity` Tool

**File**: `lib/ai/tools/create-pending-activity.ts`

```typescript
import { tool } from 'ai';
import { z } from 'zod';

/**
 * Tool for agents to create pending activities that require human approval
 * 
 * The agent MUST wait for approval before proceeding with the action.
 */
export const createPendingActivityTool = tool({
  description: `Create a pending activity that requires human approval before proceeding.
  
  Use this tool BEFORE performing ANY of these actions:
  - Making phone calls
  - Sending emails
  - Creating/modifying calendar events
  - Initiating financial transactions
  
  After calling this tool, you MUST use checkApprovalStatus to wait for user approval.
  DO NOT proceed with the action until it is approved.`,
  
  parameters: z.object({
    type: z.enum([
      'phone_call',
      'email_sent',
      'calendar_event_added',
      'calendar_event_modified',
      'financial'
    ]).describe('Type of activity requiring approval'),
    
    payload: z.record(z.any()).describe('Activity details (e.g., phone number, email content, event details)'),
    
    reasoning: z.string().describe('Explain WHY this action is needed and what you hope to accomplish'),
    
    priority: z.enum(['low', 'medium', 'high', 'urgent'])
      .default('medium')
      .describe('Priority level for user attention'),
  }),
  
  execute: async ({ type, payload, reasoning, priority }, { experimental_context }) => {
    try {
      // Extract agent_id from context
      const context = experimental_context as { agentId?: string };
      const agentId = context?.agentId;

      if (!agentId) {
        throw new Error('Agent ID not found in context');
      }

      // Call the activities API endpoint to create pending activity
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          type,
          status: 'pending', // This is the key - it's pending, not completed
          priority,
          payload: {
            ...payload,
            reasoning, // Include reasoning in payload for UI display
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create pending activity: ${error}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        activity_id: result.id,
        message: `Pending activity created. ID: ${result.id}. You must now wait for user approval before proceeding. Use checkApprovalStatus tool to check status.`,
        status: 'pending',
      };
    } catch (error) {
      console.error('Create pending activity error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to create pending activity. Cannot proceed without approval mechanism.',
      };
    }
  },
});
```

---

## 📝 Step 2: Create `checkApprovalStatus` Tool

**File**: `lib/ai/tools/check-approval.ts`

```typescript
import { tool } from 'ai';
import { z } from 'zod';

/**
 * Tool for agents to check if a pending activity has been approved/rejected/modified
 */
export const checkApprovalTool = tool({
  description: `Check the approval status of a pending activity.
  
  Use this tool after creating a pending activity with createPendingActivity.
  You MUST poll this tool until you get a status other than 'pending'.
  
  Statuses:
  - pending: User has not responded yet. Wait and check again.
  - approved: User approved. You may proceed with the action.
  - rejected: User rejected. DO NOT proceed. Explain to user why you cannot complete this action.
  - modified: User approved but modified the details. Use the updated payload.`,
  
  parameters: z.object({
    activityId: z.string().describe('ID of the pending activity to check (returned from createPendingActivity)'),
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
        status: activity.status, // pending | approved | rejected
        payload: activity.payload, // May have been modified by user
        message: activity.status === 'pending'
          ? 'Still waiting for user approval. Check again in 30 seconds.'
          : activity.status === 'approved'
            ? 'Activity approved! You may proceed with the action using the provided payload.'
            : activity.status === 'rejected'
              ? 'Activity rejected. DO NOT proceed with this action. Inform the user.'
              : 'Unknown status',
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
```

---

## 📝 Step 3: Create GET endpoint for single activity

**File**: `app/api/activities/[id]/route.ts` (if it doesn't exist)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Activity } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/activities/:id
 * Fetch a single activity by ID
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
    const activities = await sql<Activity[]>`
      SELECT * FROM activities WHERE id = ${id}
    `;
    
    if (activities.length === 0) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(activities[0]);
  } catch (error) {
    console.error('Failed to fetch activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}
```

---

## 📝 Step 4: Add Tools to Agent

**File**: `lib/ai/agent.ts`

```typescript
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { supermemoryTools } from '@supermemory/tools/ai-sdk';
import { browserTaskTool } from './tools/browser-task';
import { logActivityTool } from './tools/log-activity';
import { createPendingActivityTool } from './tools/create-pending-activity'; // NEW
import { checkApprovalTool } from './tools/check-approval'; // NEW
import type { Agent } from '../db';

// ... existing code ...

export function createAgentTools(agent: Agent) {
  const tools: Record<string, any> = {};
  
  // Add tools based on agent's enabled tools
  if (agent.tools.includes('supermemory') || agent.tools.includes('neo4j')) {
    const supermemoryApiKey = process.env.SUPERMEMORY_API_KEY;
    if (supermemoryApiKey) {
      const memoryTools = supermemoryTools(supermemoryApiKey);
      Object.assign(tools, memoryTools);
    }
  }
  
  if (agent.tools.includes('browser')) {
    tools.browserTask = browserTaskTool;
  }
  
  // Always include activity logging
  tools.logActivity = logActivityTool;
  
  // Always include HITL tools
  tools.createPendingActivity = createPendingActivityTool; // NEW
  tools.checkApprovalStatus = checkApprovalTool; // NEW
  
  return tools;
}
```

---

## 📝 Step 5: Update Agent System Prompts

**Example Prompt Template**:

```markdown
You are an AI agent designed to help with [TASK DESCRIPTION].

## Available Tools
- browserTask: Browse websites and extract information
- logActivity: Log completed activities to your activity feed
- createPendingActivity: Request human approval for sensitive actions
- checkApprovalStatus: Check if a pending activity has been approved
- [other tools based on permissions]

## Human-in-the-Loop (HITL) Guidelines

**CRITICAL**: Some actions require human approval before you can proceed.

### Actions Requiring Approval

You MUST use `createPendingActivity` tool BEFORE performing ANY of these:
1. **Phone calls** - Any outbound calls to humans
2. **Sending emails** - Any email drafts to be sent
3. **Calendar events** - Creating or modifying calendar entries
4. **Financial transactions** - Any payments, subscriptions, or purchases

### Approval Workflow

When you need to perform a sensitive action:

1. **Create Pending Activity**
   ```
   Use createPendingActivity tool with:
   - type: "phone_call" | "email_sent" | "calendar_event_added" | "financial"
   - payload: Complete details of the action
   - reasoning: Clear explanation of WHY this is needed
   - priority: How urgent is this?
   ```

2. **Wait for Approval**
   - After calling createPendingActivity, you will receive an activity_id
   - You MUST NOT proceed until approved
   - Use checkApprovalStatus tool to poll for status
   - Check every 30-60 seconds

3. **Handle Response**
   - **If approved**: Proceed with the action using the payload
   - **If modified**: Use the UPDATED payload provided by the user
   - **If rejected**: DO NOT proceed. Explain to the user why you cannot complete the task
   - **If timeout**: After 5 minutes of pending, inform the user and ask them to check their approvals

### Example: Phone Call Flow

```
Step 1: Decide to call someone
- You: "I need to call John Doe to discuss partnership"

Step 2: Request approval
- Use createPendingActivity({
    type: "phone_call",
    payload: {
      contactName: "John Doe",
      contactPhone: "+1-555-1234",
      purpose: "Discuss partnership opportunities",
      instructionParagraphs: [...]
    },
    reasoning: "John expressed interest in our product. A call would...",
    priority: "medium"
  })
- Receive: { activity_id: "abc123", status: "pending" }

Step 3: Wait for approval
- Use checkApprovalStatus({ activityId: "abc123" })
- If status === "pending": Wait 30 seconds, check again
- If status === "approved": Proceed to step 4
- If status === "rejected": Stop and explain why you can't call

Step 4: Make the call (only if approved)
- Now use Twilio integration or relevant tool
- Log the outcome with logActivity
```

### Important Reminders

- **Never skip approval** for sensitive actions
- **Always explain your reasoning** when requesting approval
- **Handle rejections gracefully** - don't argue, just explain the limitation
- **Use modified payloads** if the user changes details
- **Be patient** - humans need time to review and approve

## Your Mission

[SPECIFIC TASK INSTRUCTIONS GO HERE]

Remember: You are powerful but must respect human oversight for sensitive actions.
```

---

## 📝 Step 6: Implement Polling Logic in Agent Execution

**Option A: Simple Polling (Inline)**

The agent itself handles polling by using the `checkApprovalStatus` tool repeatedly:

```typescript
// Agent will naturally do this if prompted correctly:
// 1. Call createPendingActivity
// 2. Get activity_id
// 3. Call checkApprovalStatus(activity_id)
// 4. If pending, think "I should wait and check again"
// 5. Call checkApprovalStatus(activity_id) again
// ... repeat until approved/rejected
```

**Option B: Server-Side Polling (Advanced)**

Modify `executeAgentTask` to detect pending activities and pause:

```typescript
// lib/ai/agent.ts

export async function executeAgentTask(
  config: AgentConfig,
  prompt: string,
  onUpdate?: (update: AgentStatusUpdate) => void
) {
  const { agent, maxSteps = 20 } = config;
  const tools = createAgentTools(agent);
  
  try {
    let currentStep = 0;
    let pendingActivityId: string | null = null;
    
    const result = await generateText({
      model: openai('gpt-4o'),
      system: agent.prompt,
      prompt,
      tools,
      maxSteps,
      
      onStepFinish: async ({ text, toolCalls, toolResults, finishReason, usage }) => {
        currentStep++;
        
        console.log(`Agent ${agent.id} - Step ${currentStep}/${maxSteps} completed`);
        
        // Check if agent created a pending activity
        toolCalls.forEach((toolCall, index) => {
          if (toolCall.toolName === 'createPendingActivity') {
            const result = toolResults[index]?.result;
            if (result && result.success && result.activity_id) {
              pendingActivityId = result.activity_id;
              console.log(`Agent waiting for approval on activity: ${pendingActivityId}`);
            }
          }
        });
        
        // If waiting for approval, update status
        if (pendingActivityId) {
          onUpdate?.({
            type: 'text',
            stepNumber: currentStep,
            text: `Waiting for user approval on activity ${pendingActivityId}`,
            timestamp: new Date(),
          });
        }
        
        // Emit step update
        onUpdate?.({
          type: 'step',
          stepNumber: currentStep,
          timestamp: new Date(),
        });
        
        // Emit tool call updates
        toolCalls.forEach((toolCall, index) => {
          onUpdate?.({
            type: 'tool_call',
            stepNumber: currentStep,
            toolName: toolCall.toolName,
            toolInput: toolCall.args,
            toolResult: toolResults[index]?.result,
            timestamp: new Date(),
          });
        });
        
        // Emit text update
        if (text) {
          onUpdate?.({
            type: 'text',
            stepNumber: currentStep,
            text,
            timestamp: new Date(),
          });
        }
      },
    });
    
    return {
      text: result.text,
      steps: result.steps,
      usage: result.usage,
    };
  } catch (error) {
    console.error('Agent execution error:', error);
    onUpdate?.({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
    });
    throw error;
  }
}
```

---

## 📝 Step 7: Update UI to Show "Waiting for Approval"

**File**: `components/agent-status-card.tsx`

Already supports this! Just ensure the status update includes:

```typescript
await updateAgentStatus(agent.id, {
  status: 'active', // or 'paused' if you want a different state
  currentActivity: 'Waiting for user approval',
  currentTool: 'createPendingActivity',
  currentStep,
  totalSteps: maxSteps,
});
```

---

## 🧪 Testing Workflow

### Test 1: Phone Call Approval

1. **Create test agent**:
   ```typescript
   {
     name: "Sales Agent",
     prompt: "[Use the template above with phone call example]",
     tools: ["phone", "createPendingActivity", "checkApprovalStatus"]
   }
   ```

2. **Start agent** with task: "Call John Doe at +1-555-1234 to discuss partnership"

3. **Expected behavior**:
   - Agent creates pending activity (type: phone_call)
   - Agent status shows "Waiting for user approval"
   - Activity appears in dashboard with approval UI
   - User clicks "Approve"
   - Agent resumes and proceeds with Twilio call

4. **Verify**:
   ```sql
   -- Check activities table
   SELECT * FROM activities WHERE type = 'phone_call' ORDER BY created_at DESC LIMIT 5;
   
   -- Check agent status
   SELECT * FROM agent_status WHERE agent_id = 'your-agent-id';
   ```

### Test 2: Email Rejection

1. Create agent, start with task: "Send email to cto@example.com"
2. Agent requests approval
3. User clicks "Reject"
4. Agent should explain: "I cannot send this email as you rejected the request"

### Test 3: Modified Payload

1. Agent requests to call "+1-555-1234"
2. User modifies phone number to "+1-555-9999"
3. Agent should use the modified number

---

## 🚨 Edge Cases to Handle

1. **Timeout**: User doesn't respond for 5+ minutes
   - Agent should check time elapsed
   - After timeout, log a message: "Pending approval timed out"
   - Set agent to idle

2. **Multiple Pending Activities**: Agent creates 2+ pending activities
   - Each should be tracked separately
   - Agent should check all before proceeding

3. **Approval During Agent Stop**: User stops agent while waiting
   - Clear pending activities or mark as cancelled
   - Don't resume automatically

4. **Modified Payload Validation**: User changes critical fields
   - Agent should validate modified payload
   - If invalid, request clarification

---

## ✅ Success Checklist

- [ ] `createPendingActivityTool` created and added to agent tools
- [ ] `checkApprovalTool` created and added to agent tools
- [ ] Agent prompts include HITL guidelines
- [ ] `GET /api/activities/:id` endpoint exists
- [ ] Agent execution detects pending activities
- [ ] Status card shows "Waiting for approval"
- [ ] Approval flow tested end-to-end
- [ ] Rejection handling tested
- [ ] Payload modification tested
- [ ] Timeout handling implemented

---

**Next**: Test with a simple phone call scenario and iterate!

