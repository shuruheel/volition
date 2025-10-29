# Workflows and Steps

## Overview

Workflows (a.k.a. _durable functions_) are a programming model for building long-running, stateful application logic that can maintain their execution state across restarts, failures, or user events.

Unlike traditional serverless functions that lose all state when they terminate, workflows persist their progress and can resume exactly where they left off.

## Two Fundamental Entities

1. **Workflow Functions** - Orchestrate/organize steps
2. **Step Functions** - Carry out the actual work

---

## Workflow Functions

**Directive:** `"use workflow"`

### Purpose

Workflow functions define the entrypoint of a workflow and organize how step functions are called.

### Characteristics

- ✅ Runs in sandboxed environment (limited Node.js access)
- ✅ All step results persisted to event log
- ✅ Must be **deterministic** (replayed multiple times)
- ❌ No full JavaScript runtime
- ❌ Limited npm packages

### Think of It As...

Less like a full JavaScript runtime, more like "stitching together" various steps using:
- Conditionals (`if/else`)
- Loops (`for/while`)
- Try/catch handlers
- `Promise.all`
- Other language primitives

### Example

```typescript
export async function processOrderWorkflow(orderId: string) {
  "use workflow"
  
  // Orchestrate multiple steps
  const order = await fetchOrder(orderId)
  const payment = await chargePayment(order)
  
  return { orderId, status: 'completed' }
}
```

### Determinism

The workflow code gets re-run multiple times during its lifecycle. Each time, it uses an event log to resume to the correct spot.

**The sandboxed environment ensures determinism:**
- `Math.random` is fixed (same value across replays)
- `Date` constructors are fixed (same timestamp across replays)
- You are safe to use these without worrying

---

## Step Functions

**Directive:** `"use step"`

### Purpose

Step functions perform the actual work in a workflow and have full runtime access.

### Characteristics

- ✅ Full Node.js runtime and npm package access
- ✅ Automatic retry on errors (default: 3 attempts)
- ✅ Results persisted for replay
- ✅ Can be called outside workflows (runs as normal function)

### Example

```typescript
async function chargePayment(order: Order) {
  "use step"
  
  // Full Node.js access - use any npm package
  const stripe = new Stripe(process.env.STRIPE_KEY)
  
  const charge = await stripe.charges.create({
    amount: order.total,
    currency: 'usd',
    source: order.paymentToken
  })
  
  return { chargeId: charge.id }
}
```

### Retry Behavior

By default, steps have a maximum of 3 retry attempts before they fail and propagate the error to the workflow.

See [Errors & Retrying](./05-errors-and-retries.md) for customization.

### Using Steps Outside Workflows

Steps can be called outside workflows - they'll run as normal functions:

```typescript
async function updateUser(userId: string) {
  "use step"
  await db.insert(...)
}

// Used inside a workflow
export async function userOnboardingWorkflow(userId: string) {
  "use workflow"
  await updateUser(userId)
  // ... more steps
}

// Used directly outside a workflow
export async function POST() {
  await updateUser("123")
  // ... more logic
}
```

⚠️ **Warning:** When called outside a workflow:
- No retry semantics
- Not observable
- Workflow-specific functions like `getStepMetadata()` will throw errors

---

## Suspension and Resumption

Workflow functions can automatically suspend while waiting on asynchronous work. While suspended:
- Workflow state is stored via event log
- No compute resources are used
- Workflow resumes when work completes

### Ways a Workflow Can Suspend

1. **Waiting on a step function** - Workflow yields while step runs
2. **Using `sleep()`** - Pause for fixed duration
3. **Awaiting webhook** - Resume when external system sends data

### Example

```typescript
import { sleep, createWebhook } from 'workflow'

export async function documentReviewProcess(userId: string) {
  "use workflow"
  
  await sleep("1 month") // Sleep suspends without consuming resources
  
  // Create a webhook for external workflow resumption
  const webhook = createWebhook()
  
  // Send the webhook url to some external service or in an email
  await sendHumanApprovalEmail("Click this link to accept the review", webhook.url)
  
  const data = await webhook // The workflow suspends till the URL is called
  
  console.log("Document reviewed!")
}
```

---

## Writing Workflows

### Basic Structure

The simplest workflow consists of a workflow function and one or more step functions:

```typescript
// Workflow function (orchestrates the steps)
export async function greetingWorkflow(name: string) {
  "use workflow"
  
  const message = await greet(name)
  return { message }
}

// Step function (does the actual work)
async function greet(name: string) {
  "use step"
  
  // Access Node.js APIs
  const message = `Hello ${name} at ${new Date().toISOString()}`
  console.log(message)
  return message
}
```

### Project Structure

For larger projects, organize workflows and steps:

```
workflows/
├── userOnboarding/
│   ├── index.ts          # Workflow function
│   └── steps.ts          # Step functions
├── aiVideoGeneration/
│   ├── index.ts
│   └── steps/
│       ├── transcribeUpload.ts
│       ├── generateVideo.ts
│       └── notifyUser.ts
└── shared/               # Common steps used by multiple workflows
    ├── validateInput.ts
    └── logActivity.ts
```

**Benefits of splitting files:**
- Easier to navigate
- Avoids bundler bugs
- Clear separation of concerns

---

## Key Differences: Workflow vs Step

| Aspect | Workflow | Step |
|--------|----------|------|
| **Directive** | `"use workflow"` | `"use step"` |
| **Purpose** | Orchestrate steps | Execute business logic |
| **Runtime** | Sandboxed (limited) | Full Node.js |
| **NPM Packages** | Limited | All packages |
| **Retry** | N/A | Automatic (3 attempts) |
| **Determinism** | Required | Not required |
| **Suspension** | Can suspend | Runs to completion |
| **State** | Persisted via event log | Results persisted |

---

## Best Practices

### 1. Keep Workflows Simple

Workflows should be thin orchestrators. Move complex logic into steps.

✅ **Good:**
```typescript
export async function orderWorkflow(orderId: string) {
  "use workflow"
  
  const order = await fetchOrder(orderId)
  const payment = await processPayment(order)
  await sendReceipt(order, payment)
  
  return { success: true }
}
```

❌ **Bad:**
```typescript
export async function orderWorkflow(orderId: string) {
  "use workflow"
  
  // Too much logic in workflow function
  const db = new Database()
  const order = await db.query("SELECT * FROM orders WHERE id = ?", [orderId])
  const stripe = new Stripe(process.env.STRIPE_KEY)
  // ... lots more logic
}
```

### 2. Make Steps Idempotent

Steps may be retried. Ensure they're safe to run multiple times:

```typescript
async function createOrder(orderId: string) {
  "use step"
  
  // Check if order already exists (idempotent)
  const existing = await db.findOrder(orderId)
  if (existing) return existing
  
  return await db.createOrder(orderId)
}
```

### 3. Use Clear Step Names

Step names appear in observability dashboards. Use descriptive names:

✅ `async function sendWelcomeEmail(...)`
❌ `async function doThing(...)`

### 4. Handle Errors in Steps

Let steps throw errors for retries. Use `FatalError` for intentional failures:

```typescript
import { FatalError } from 'workflow'

async function validateEmail(email: string) {
  "use step"
  
  if (!email.includes('@')) {
    // Don't retry - this is a bad input
    throw new FatalError('Invalid email format')
  }
  
  // This will be retried
  const result = await callExternalAPI(email)
  return result
}
```

---

## References

- [Official Documentation](https://useworkflow.dev/docs/foundations/workflows-and-steps)
- [Starting Workflows](./03-starting-workflows.md)
- [Errors & Retrying](./05-errors-and-retries.md)

