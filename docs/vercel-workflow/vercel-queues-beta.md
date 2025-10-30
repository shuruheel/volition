# Vercel Queues is now in Limited Beta

**Date**: Jun 25, 2025

**Read time**: 1 min

Vercel Queues is a message queue service built for Vercel applications, now in Limited Beta.

## Overview

Vercel Queues lets you offload work by sending tasks to a queue, where they'll be processed in the background. This means users don't have to wait for slow operations to finish during a request, and your app can handle retries and failures more reliably.

Under the hood, Vercel Queues uses an append-only log to store messages and ensures tasks such as AI video processing, sending emails, or updating external services are persisted and never lost.

## Key Features

Key features of Vercel Queues:

- **Background Processing**: Offload long-running tasks to background workers
- **Reliable Delivery**: Messages are persisted in an append-only log and never lost
- **Automatic Retries**: Built-in retry logic for failed tasks
- **Simple API**: Easy-to-use interface for sending and receiving messages

## Example Usage

```typescript
import { send, receive } from "@vercel/queue";

await send("topic", { message: "Hello World!" });

await receive("topic", "consumer", (m) => {
  console.log(m.message); // Logs "Hello World!"
});
```

An example of sending and receiving messages with a queue.

## Getting Started

Sign up for the Vercel Community and express your interest in participating. We'll be in touch soon.

## Use Cases

Vercel Queues is ideal for:

- AI video processing
- Sending emails
- Updating external services
- Any long-running background task

---

Source: https://vercel.com/changelog/vercel-queues-is-now-in-limited-beta


