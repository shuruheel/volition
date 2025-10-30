# Idempotency

Idempotency is a property of an operation that ensures it can be safely retried without producing duplicate side effects.

In distributed systems (calling external APIs), it is not always possible to ensure an operation has only been performed once just by seeing if it succeeds. Consider a payment API that charges the user $10, but due to network failures, the confirmation response is lost. When the step retries (because the previous attempt was considered a failure), it will charge the user again.

To prevent this, many external APIs support idempotency keys. An idempotency key is a unique identifier for an operation that can be used to deduplicate requests.

---

## The Core Pattern: Use the Step ID as Your Idempotency Key

Every step invocation has a stable `stepId` that stays the same across retries. Use it as the idempotency key when calling third-party APIs.

```typescript
import { getStepMetadata } from "workflow";

async function chargeUser(userId: string, amount: number) {
  "use step";

  const { stepId } = getStepMetadata();

  // Example: Stripe-style idempotency key
  // This guarantees only one charge is created even if the step retries
  await stripe.charges.create(
    {
      amount,
      currency: "usd",
      customer: userId,
    },
    {
      idempotencyKey: stepId, 
    }
  );
}
```

### Why This Works

* **Stable across retries**: `stepId` does not change between attempts.
* **Globally unique per step**: Fulfills the uniqueness requirement for an idempotency key.

---

## Best Practices

* **Always provide idempotency keys to external side effects that are not idempotent** inside steps (payments, emails, SMS, queues).
* **Prefer `stepId` as your key**; it is stable across retries and unique per step.
* **Keep keys deterministic**; avoid including timestamps or attempt counters.
* **Handle 409/conflict responses** gracefully; treat them as success if the prior attempt completed.

---

## Real-World Examples

### Sending Emails with Idempotency

```typescript
import { getStepMetadata } from "workflow";

async function sendWelcomeEmail(userEmail: string) {
  "use step";

  const { stepId } = getStepMetadata();

  await emailService.send({
    to: userEmail,
    subject: "Welcome!",
    body: "Thanks for signing up.",
    idempotencyKey: stepId, // Prevents duplicate emails on retry
  });
}
```

### Creating Database Records

```typescript
import { getStepMetadata } from "workflow";

async function createUserRecord(userData: UserData) {
  "use step";

  const { stepId } = getStepMetadata();

  // Use stepId as a unique constraint or check for existing record
  const existingUser = await db.users.findOne({ idempotencyKey: stepId });
  
  if (existingUser) {
    return existingUser; // Already created, return existing
  }

  return await db.users.create({
    ...userData,
    idempotencyKey: stepId,
  });
}
```

### Calling Payment APIs

```typescript
import { getStepMetadata } from "workflow";

async function processPayment(orderId: string, amount: number) {
  "use step";

  const { stepId } = getStepMetadata();

  try {
    const charge = await stripe.charges.create(
      {
        amount,
        currency: "usd",
        metadata: { orderId },
      },
      {
        idempotencyKey: stepId,
      }
    );
    return charge;
  } catch (error) {
    // Stripe returns 409 if idempotency key was already used
    if (error.statusCode === 409) {
      // Fetch the original charge result
      return await stripe.charges.retrieve(error.charge);
    }
    throw error;
  }
}
```

---

## When Idempotency Keys Are Not Needed

Not all operations require explicit idempotency keys:

- **Idempotent by nature**: GET requests, database reads
- **Already handled by the API**: Some APIs automatically deduplicate based on request parameters
- **Retriable without side effects**: Operations that can be safely repeated

---

## Common Pitfalls

### ❌ Using Non-Deterministic Keys

```typescript
// BAD: timestamp changes on each retry
const idempotencyKey = `${userId}-${Date.now()}`;
```

### ❌ Not Handling Conflict Responses

```typescript
// BAD: treating 409 as a failure
await api.call({ idempotencyKey: stepId });
// Should check for 409 and treat as success
```

### ✅ Correct Pattern

```typescript
import { getStepMetadata } from "workflow";

async function safeApiCall() {
  "use step";

  const { stepId } = getStepMetadata();
  
  try {
    return await api.call({ idempotencyKey: stepId });
  } catch (error) {
    if (error.statusCode === 409) {
      // Previous attempt succeeded, retrieve result
      return await api.getResult(stepId);
    }
    throw error;
  }
}
```

---

## Key Takeaways

- Use `stepId` from `getStepMetadata()` as your idempotency key for external API calls
- Idempotency prevents duplicate side effects when steps retry
- Handle 409/conflict responses gracefully
- Keep idempotency keys deterministic and stable across retries
- Not all operations need explicit idempotency keys

## Related Documentation

- [Errors & Retrying](./05-errors-and-retries.md)
- [Workflows and Steps](./02-workflows-and-steps.md)

## Reference

- [Workflow DevKit Idempotency Documentation](https://useworkflow.dev/docs/foundations/idempotency)

