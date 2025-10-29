# Vercel Workflow

Vercel Workflow is a fully managed platform built on top of the open-source Workflow Development Kit (WDK), a TypeScript framework for building apps and AI agents that can pause, resume, and maintain state.

With Workflow, Vercel manages the infrastructure for you so you can focus on writing business logic. Vercel Functions execute your workflow and step code, Vercel Queues enqueue and execute those routes with reliability, and managed persistence stores all state and event logs in an optimized database.

This means your functions are:

- **Resumable**: Pause for minutes or months, then resume from the exact point.
- **Durable**: Survive deployments and crashes with deterministic replays.
- **Observable**: Use built-in logs, metrics, and tracing and view them in your Vercel dashboard.
- **Idiomatic**: Write async/await JavaScript with two directives. No YAML or state machines.

## Getting started

Install the WDK package:

```bash
pnpm i workflow
```

Start writing your own workflows by following the Workflow DevKit getting started guide.

## Concepts

Workflow introduces two directives that turn ordinary async functions into durable workflows. You write async/await code as usual, and the framework handles queues, retry logic, and state persistence automatically.

### Workflow

A workflow is a stateful function that coordinates multi-step logic over time. The `'use workflow'` directive marks a function as durable, which means it remembers its progress and can resume exactly where it left off, even after pausing, restarting, or deploying new code.

Use a workflow when your logic needs to pause, resume, or span minutes to months:

```typescript
export async function aiContentWorkflow(topic: string) {
  'use workflow';
 
  const draft = await generateDraft(topic);
 
  const summary = await summarizeDraft(draft);
 
  return { draft, summary };
}
```

Under the hood, the workflow function compiles into a route that orchestrates execution. All inputs and outputs are recorded in an event log. If a deploy or crash happens, the system replays execution deterministically from where it stopped.

### Step

A step is a stateless function that runs a unit of durable work inside a workflow. The `'use step'` directive marks a function as a step, which gives it built-in retries and makes it survive failures like network errors or process crashes.

Use a step when calling external APIs or performing isolated operations:

```typescript
async function generateDraft(topic: string) {
  'use step';
 
  const draft = await aiGenerate({
    prompt: `Write a blog post about ${topic}`,
  });
 
  return draft;
}
 
async function summarizeDraft(draft: string) {
  'use step';
 
  const summary = await aiSummarize({ text: draft });
 
  if (Math.random() < 0.3) {
    throw new Error('Transient AI provider error');
  }
 
  return summary;
}
```

Each step compiles into an isolated API route. While the step executes, the workflow suspends without consuming resources. When the step completes, the workflow resumes automatically right where it left off.

### Sleep

Sleep pauses a workflow for a specified duration without consuming compute resources. This is useful when you need to wait for hours or days before continuing, like delaying a follow-up email or waiting to issue a reward.

Use sleep to delay execution without keeping any infrastructure running:

```typescript
import { sleep } from 'workflow';
 
export async function aiRefineWorkflow(draftId: string) {
  'use workflow';
 
  const draft = await fetchDraft(draftId);
 
  await sleep('7 days'); // Wait 7 days to gather more signals; no resources consumed
 
  const refined = await refineDraft(draft);
 
  return { draftId, refined };
}
```

During sleep, no resources are consumed. The workflow simply pauses and resumes when the time expires.

### Hook

A hook lets a workflow wait for external events such as user actions, webhooks, or third-party API responses. This is useful for human-in-the-loop workflows where you need to pause until someone approves, confirms, or provides input.

Use hooks to pause execution until external data arrives:

```typescript
import { defineHook } from 'workflow';
 
// Human approval for AI-generated drafts
const approvalHook = defineHook<{
  decision: 'approved' | 'changes';
  notes?: string;
}>();
 
export async function aiApprovalWorkflow(topic: string) {
  'use workflow';
 
  const draft = await generateDraft(topic);
 
  // Wait for human approval events
  const events = approvalHook.create({
    token: 'draft-123',
  });
 
  for await (const event of events) {
    if (event.decision === 'approved') {
      await publishDraft(draft);
      break;
    } else {
      const revised = await refineDraft(draft, event.notes);
      await publishDraft(revised);
      break;
    }
  }
}
```

```typescript
// Resume the workflow when an approval is received
export async function POST(req: Request) {
  const data = await req.json();
 
  await approvalHook.resume('draft-123', {
    decision: data.decision,
    notes: data.notes,
  });
 
  return new Response('OK');
}
```

When a hook receives data, the workflow resumes automatically. No polling, message queues, or manual state management required.

## Observability

Every step, input, output, pause, and error inside a workflow is recorded in an event log. You can track runs in real time, trace failures, and analyze performance without writing extra code.

To view the event log, go to your Vercel dashboard and navigate to Observability, then Workflows.

## Pricing

During the beta period, Workflow observability is free for all plans. Advance notice will be given before any charges begin when Workflow goes to General Availability (GA).

Workflow pricing is divided into two resources:

- **Workflow Storage**: The amount of data stored in the managed persistence layer for workflow state.
- **Workflow Steps**: Individual units of durable work executed inside a workflow.

All resources are billed based on usage with each plan having an included allotment.

The pricing for each resource is based on the region from which requests to your site come.

Functions invoked by Workflows continue to be charged at the existing compute rates. We encourage you to use Fluid compute with Workflow.

## More resources

- [Workflow Development Kit (WDK)](https://vercel.com/docs/workflow/wdk)
- [Stateful Slack bots with Vercel Workflow Guide](https://vercel.com/guides/stateful-slack-bots-with-vercel-workflow)

---

Source: https://vercel.com/docs/workflow

