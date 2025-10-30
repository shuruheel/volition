# Errors & Retrying

## Overview

By default, errors thrown inside steps are automatically retried. Workflow DevKit provides two custom error types to control retry behavior:
- `FatalError` - Skip retries for intentional errors
- `RetryableError` - Customize retry delay

---

## Default Retrying

By default, **steps retry up to 3 times** on arbitrary errors.

### Example

```typescript
async function callApi(endpoint: string) {
  "use step"
  
  const response = await fetch(endpoint)
  
  if (response.status >= 500) {
    // Any uncaught error gets retried
    throw new Error("Uncaught exceptions get retried!")
  }
  
  return response.json()
}
```

### Customize Max Retries

```typescript
async function callApi(endpoint: string) {
  "use step"
  
  const response = await fetch(endpoint)
  
  if (response.status >= 500) {
    throw new Error("Uncaught exceptions get retried!")
  }
  
  return response.json()
}

callApi.maxRetries = 5 // Set a custom number of retries
```

### Retry Timing

Steps get enqueued immediately after the failure (instant retry by default).

⚠️ **Warning:** When a retried step performs external side effects (payments, emails, API writes), ensure those calls are **idempotent** to avoid duplicate side effects. See [Idempotency](https://useworkflow.dev/docs/foundations/idempotency).

---

## Intentional Errors (Skip Retries)

When your step needs to intentionally throw an error and **skip retrying**, throw a `FatalError`:

```typescript
import { FatalError } from "workflow"

async function callApi(endpoint: string) {
  "use step"
  
  const response = await fetch(endpoint)
  
  if (response.status >= 500) {
    // Any uncaught error gets retried
    throw new Error("Uncaught exceptions get retried!")
  }
  
  if (response.status === 404) {
    // Fatal error - don't retry
    throw new FatalError("Resource not found. Skipping retries.")
  }
  
  return response.json()
}
```

**Use `FatalError` when:**
- ❌ Invalid input data (won't change on retry)
- ❌ Resource not found (won't exist on retry)
- ❌ Permission denied (won't change on retry)
- ❌ Business logic violations

**Don't use `FatalError` when:**
- ✅ Network timeouts (might work on retry)
- ✅ Rate limits (will work after delay)
- ✅ Temporary service issues (might recover)

---

## Customize Retry Behavior

Use `RetryableError` to customize the delay before retry:

```typescript
import { FatalError, RetryableError } from "workflow"

async function callApi(endpoint: string) {
  "use step"
  
  const response = await fetch(endpoint)
  
  if (response.status >= 500) {
    throw new Error("Uncaught exceptions get retried!")
  }
  
  if (response.status === 404) {
    throw new FatalError("Resource not found. Skipping retries.")
  }
  
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After")
    // Delay the retry until after a timeout
    throw new RetryableError("Too many requests. Retrying...", {
      retryAfter: parseInt(retryAfter), // seconds
    })
  }
  
  return response.json()
}
```

**Common use cases:**
- ⏱️ **Rate limiting** - Respect `Retry-After` headers
- 📈 **Exponential backoff** - Increase delay with each attempt
- 🔄 **API cooldowns** - Wait for API rate limit reset

---

## Advanced Example: Exponential Backoff

Combine everything with `getStepMetadata` for sophisticated retry logic:

```typescript
import { FatalError, RetryableError, getStepMetadata } from "workflow"

async function callApi(endpoint: string) {
  "use step"
  
  const metadata = getStepMetadata()
  
  const response = await fetch(endpoint)
  
  if (response.status >= 500) {
    // Exponential backoffs: 1s, 4s, 9s, 16s, 25s
    throw new RetryableError("Backing off...", {
      retryAfter: metadata.attempt ** 2,
    })
  }
  
  if (response.status === 404) {
    throw new FatalError("Resource not found. Skipping retries.")
  }
  
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After")
    // Delay the retry until after a timeout
    throw new RetryableError("Too many requests. Retrying...", {
      retryAfter: parseInt(retryAfter),
    })
  }
  
  return response.json()
}

callApi.maxRetries = 5
```

**Key points:**
- `metadata.attempt` gives you the current attempt number (1-indexed)
- Use it to implement exponential backoff: `attempt ** 2`
- Combine with `maxRetries` for full control

---

## Rolling Back Failed Steps

When a workflow fails partway through, it can leave the system in an inconsistent state. A common pattern is **rollbacks** (a.k.a. Saga pattern):

For each successful step, record a corresponding rollback action. If a later step fails, run the rollbacks in reverse order.

### Guidelines

1. ✅ Make rollbacks steps as well (durable, benefit from retries)
2. ✅ Ensure rollbacks are [idempotent](https://useworkflow.dev/docs/foundations/idempotency)
3. ✅ Only enqueue a rollback after its forward step succeeds

### Example: Order Processing Saga

```typescript
// Forward steps
async function reserveInventory(orderId: string) {
  "use step"
  // ... call inventory service to reserve ...
}

async function chargePayment(orderId: string) {
  "use step"
  // ... charge the customer ...
}

// Rollback steps
async function releaseInventory(orderId: string) {
  "use step"
  // ... undo inventory reservation ...
}

async function refundPayment(orderId: string) {
  "use step"
  // ... refund the charge ...
}

export async function placeOrderSaga(orderId: string) {
  "use workflow"
  
  const rollbacks: Array<() => Promise<void>> = []
  
  try {
    await reserveInventory(orderId)
    rollbacks.push(() => releaseInventory(orderId))
    
    await chargePayment(orderId)
    rollbacks.push(() => refundPayment(orderId))
    
    // ... more steps & rollbacks ...
  } catch (e) {
    // Run rollbacks in reverse order
    for (const rollback of rollbacks.reverse()) {
      await rollback()
    }
    // Rethrow so the workflow records the failure after rollbacks
    throw e
  }
}
```

**How it works:**
1. Execute forward step (e.g., `reserveInventory`)
2. If successful, push rollback function to array
3. Execute next forward step (e.g., `chargePayment`)
4. If any step fails, run all rollbacks in reverse order
5. Rethrow error to mark workflow as failed

---

## Error Handling Patterns

### Pattern 1: Service-Specific Errors

```typescript
async function callStripeAPI(amount: number) {
  "use step"
  
  try {
    const charge = await stripe.charges.create({ amount })
    return charge
  } catch (error) {
    // Stripe-specific error handling
    if (error.type === 'card_error') {
      throw new FatalError('Card declined')
    }
    
    if (error.type === 'rate_limit_error') {
      throw new RetryableError('Rate limited', { retryAfter: 60 })
    }
    
    // Unknown error - retry
    throw error
  }
}
```

### Pattern 2: Validation Before Expensive Operations

```typescript
async function processOrder(order: Order) {
  "use step"
  
  // Validate first (cheap operation)
  if (!order.email.includes('@')) {
    throw new FatalError('Invalid email - will not process')
  }
  
  if (order.total < 0) {
    throw new FatalError('Invalid order total - will not process')
  }
  
  // Now do expensive operations (with retry)
  const payment = await chargeCard(order.payment)
  const shipment = await createShipment(order.items)
  
  return { payment, shipment }
}
```

### Pattern 3: Circuit Breaker (Future Enhancement)

```typescript
// Track failures across runs
let consecutiveFailures = 0

async function callUnreliableAPI(endpoint: string) {
  "use step"
  
  // Circuit breaker: stop trying if too many failures
  if (consecutiveFailures > 10) {
    throw new FatalError('Circuit breaker open - service is down')
  }
  
  try {
    const response = await fetch(endpoint)
    consecutiveFailures = 0 // Reset on success
    return response.json()
  } catch (error) {
    consecutiveFailures++
    throw error // Retry
  }
}
```

---

## Best Practices

### 1. Be Specific with FatalError

```typescript
// ❌ Too generic
throw new FatalError('Failed')

// ✅ Clear and actionable
throw new FatalError('Invalid email format: missing @ symbol')
```

### 2. Log Retry Attempts

```typescript
async function callAPI(endpoint: string) {
  "use step"
  
  const metadata = getStepMetadata()
  console.log(`[Attempt ${metadata.attempt}] Calling ${endpoint}`)
  
  const response = await fetch(endpoint)
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }
  
  return response.json()
}
```

### 3. Set Appropriate Max Retries

```typescript
// Quick operations - fewer retries
async function checkCache(key: string) {
  "use step"
  // ...
}
checkCache.maxRetries = 2

// Critical operations - more retries
async function chargePayment(orderId: string) {
  "use step"
  // ...
}
chargePayment.maxRetries = 5

// Idempotent operations - many retries
async function sendNotification(userId: string) {
  "use step"
  // ...
}
sendNotification.maxRetries = 10
```

### 4. Make Rollbacks Idempotent

```typescript
async function releaseInventory(orderId: string) {
  "use step"
  
  // Check if already released (idempotent)
  const reservation = await db.getReservation(orderId)
  if (!reservation) {
    console.log('Inventory already released')
    return
  }
  
  await db.releaseReservation(orderId)
}
```

---

## Summary

| Error Type | Retry? | Use When |
|------------|--------|----------|
| `Error` | ✅ Yes (up to maxRetries) | Transient failures, network issues |
| `FatalError` | ❌ No | Invalid input, business logic violations |
| `RetryableError` | ✅ Yes (with delay) | Rate limits, cooldowns, backoff |

**Key Takeaways:**
- Default behavior: 3 automatic retries
- Use `FatalError` for validation errors
- Use `RetryableError` for rate limits
- Implement rollbacks for multi-step transactions
- Make operations idempotent when possible

---

## References

- [Official Documentation](https://useworkflow.dev/docs/foundations/errors-and-retries)
- [FatalError API](https://useworkflow.dev/docs/api-reference/workflow/fatal-error)
- [RetryableError API](https://useworkflow.dev/docs/api-reference/workflow/retryable-error)
- [getStepMetadata API](https://useworkflow.dev/docs/api-reference/workflow/get-step-metadata)

