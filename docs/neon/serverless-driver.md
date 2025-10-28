# Neon Serverless Driver

The Neon serverless driver is a low-latency Postgres driver for JavaScript and TypeScript that allows you to query data from serverless and edge environments over HTTP or WebSockets instead of TCP.

## Overview

Traditional Postgres drivers use TCP connections, which can be slow and resource-intensive in serverless environments. The Neon serverless driver solves this by:

- **HTTP/WebSocket Protocol**: Faster connection establishment
- **Built-in Pooling**: No need for external connection poolers
- **Edge Compatible**: Works in Vercel Edge, Cloudflare Workers, Deno Deploy
- **Low Latency**: Optimized for serverless cold starts
- **TypeScript-First**: Full type safety and IntelliSense support

## Installation

```bash
npm install @neondatabase/serverless
```

Or using other package managers:

```bash
# pnpm
pnpm add @neondatabase/serverless

# yarn
yarn add @neondatabase/serverless

# bun
bun add @neondatabase/serverless
```

## Basic Usage

### Simple Queries (HTTP)

The simplest way to use the driver is with the `neon` function, which uses HTTP:

```typescript
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Simple query
const result = await sql`SELECT version()`;
console.log(result);
// [{ version: 'PostgreSQL 16.0 on x86_64-pc-linux-gnu...' }]
```

### Parameterized Queries

The driver automatically escapes parameters:

```typescript
const email = 'alice@example.com';
const users = await sql`
  SELECT * FROM users 
  WHERE email = ${email}
`;
```

### Multiple Queries

```typescript
// Execute multiple queries in sequence
const result1 = await sql`SELECT * FROM users`;
const result2 = await sql`SELECT * FROM posts`;

console.log('Users:', result1);
console.log('Posts:', result2);
```

## WebSocket Connection

For better performance, especially in edge environments, use WebSocket connections:

### Node.js

```typescript
import { neon, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket
neonConfig.webSocketConstructor = ws;

const sql = neon(process.env.DATABASE_URL!);

const result = await sql`SELECT * FROM users`;
```

### Edge Runtime (Vercel, Cloudflare)

```typescript
import { neon, neonConfig } from '@neondatabase/serverless';

// WebSocket is available globally in edge runtimes
// No need to configure webSocketConstructor

const sql = neon(process.env.DATABASE_URL!);

export const runtime = 'edge'; // Vercel Edge

export async function GET() {
  const users = await sql`SELECT * FROM users`;
  return Response.json(users);
}
```

## Connection Pooling

For applications that need connection pooling (multiple concurrent queries), use the `Pool` class:

```typescript
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getUser(id: number) {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  } finally {
    client.release(); // Always release the client back to the pool
  }
}
```

### Pool Configuration

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30s
  connectionTimeoutMillis: 10000, // Return error after 10s if can't connect
});
```

## Transaction Support

### Using the Pool

```typescript
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function transferMoney(fromId: number, toId: number, amount: number) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Deduct from sender
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, fromId]
    );
    
    // Add to receiver
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toId]
    );
    
    await client.query('COMMIT');
    console.log('Transfer successful');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transfer failed, rolled back:', error);
    throw error;
  } finally {
    client.release();
  }
}
```

### Using the sql Function (HTTP)

Transactions with the HTTP-based `sql` function:

```typescript
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function updateWithTransaction() {
  // Start transaction
  await sql`BEGIN`;
  
  try {
    await sql`UPDATE users SET credits = credits - 100 WHERE id = 1`;
    await sql`UPDATE users SET credits = credits + 100 WHERE id = 2`;
    
    // Commit transaction
    await sql`COMMIT`;
  } catch (error) {
    // Rollback on error
    await sql`ROLLBACK`;
    throw error;
  }
}
```

## Advanced Configuration

### Custom Fetch Options

Control timeout and other fetch options:

```typescript
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!, {
  fetchOptions: {
    timeout: 10000, // 10 second timeout
  },
});
```

### Full Options

```typescript
import { neon, NeonConfig } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!, {
  // Fetch options for HTTP requests
  fetchOptions: {
    timeout: 10000,
  },
  
  // Enable query result caching (experimental)
  fetchEndpoint: 'https://custom-proxy.example.com',
  
  // Custom fetch function
  fetchFunction: fetch,
  
  // Specify array mode for results
  arrayMode: false,
  
  // Include full result metadata
  fullResults: false,
});
```

### Array Mode

Return results as arrays instead of objects for better performance:

```typescript
const sql = neon(process.env.DATABASE_URL!, { arrayMode: true });

const result = await sql`SELECT id, name FROM users LIMIT 2`;
console.log(result);
// [
//   [1, 'Alice'],
//   [2, 'Bob']
// ]
```

### Full Results Mode

Get complete result metadata:

```typescript
const sql = neon(process.env.DATABASE_URL!, { fullResults: true });

const result = await sql`SELECT * FROM users LIMIT 1`;
console.log(result);
// {
//   rows: [{ id: 1, name: 'Alice' }],
//   fields: [
//     { name: 'id', dataTypeID: 23 },
//     { name: 'name', dataTypeID: 1043 }
//   ],
//   rowCount: 1,
//   command: 'SELECT'
// }
```

## Environment-Specific Usage

### Next.js App Router

```typescript
// app/api/users/route.ts
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const users = await sql`SELECT * FROM users`;
  return Response.json(users);
}

export async function POST(request: Request) {
  const { email, name } = await request.json();
  
  const result = await sql`
    INSERT INTO users (email, name)
    VALUES (${email}, ${name})
    RETURNING *
  `;
  
  return Response.json(result[0]);
}
```

### Next.js Edge Runtime

```typescript
// app/api/edge/route.ts
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const users = await sql`SELECT * FROM users LIMIT 10`;
  return Response.json(users);
}
```

### Vercel Serverless Functions

```typescript
// api/users.ts
import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const sql = neon(process.env.DATABASE_URL!);

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const users = await sql`SELECT * FROM users`;
  return response.json(users);
}
```

### Cloudflare Workers

```typescript
import { neon } from '@neondatabase/serverless';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const sql = neon(env.DATABASE_URL);
    const users = await sql`SELECT * FROM users`;
    
    return new Response(JSON.stringify(users), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
```

### Deno

```typescript
import { neon } from 'npm:@neondatabase/serverless';

const sql = neon(Deno.env.get('DATABASE_URL')!);

Deno.serve(async (req) => {
  const users = await sql`SELECT * FROM users`;
  return new Response(JSON.stringify(users), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## Performance Optimization

### Connection Reuse

Reuse the `sql` function across requests:

```typescript
// ✅ Good: Create once, reuse many times
const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const users = await sql`SELECT * FROM users`;
  return Response.json(users);
}
```

```typescript
// ❌ Bad: Creating new connection every request
export async function GET() {
  const sql = neon(process.env.DATABASE_URL!); // Don't do this!
  const users = await sql`SELECT * FROM users`;
  return Response.json(users);
}
```

### Use Prepared Statements

For queries executed multiple times:

```typescript
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getUsersByRole(role: string) {
  const client = await pool.connect();
  try {
    // Use parameterized queries (automatically prepared)
    const result = await client.query(
      'SELECT * FROM users WHERE role = $1',
      [role]
    );
    return result.rows;
  } finally {
    client.release();
  }
}
```

### Batch Operations

Execute multiple operations efficiently:

```typescript
const sql = neon(process.env.DATABASE_URL!);

// Insert multiple rows at once
async function insertMultipleUsers(users: Array<{ email: string; name: string }>) {
  const values = users.map((u, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
  const params = users.flatMap(u => [u.email, u.name]);
  
  return await sql`
    INSERT INTO users (email, name)
    VALUES ${sql.unsafe(values)}
  `.apply(null, params);
}
```

## Error Handling

### Basic Error Handling

```typescript
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function getUser(id: number) {
  try {
    const result = await sql`SELECT * FROM users WHERE id = ${id}`;
    return result[0];
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Failed to fetch user');
  }
}
```

### Specific Error Handling

```typescript
import { DatabaseError } from '@neondatabase/serverless';

async function createUser(email: string, name: string) {
  try {
    const result = await sql`
      INSERT INTO users (email, name)
      VALUES (${email}, ${name})
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    if (error instanceof DatabaseError) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        throw new Error('Email already exists');
      }
    }
    throw error;
  }
}
```

## TypeScript Support

### Type-Safe Queries

```typescript
interface User {
  id: number;
  email: string;
  name: string;
  created_at: Date;
}

const sql = neon<User>(process.env.DATABASE_URL!);

// Result is typed as User[]
const users: User[] = await sql`SELECT * FROM users`;
```

### Generic Query Types

```typescript
type QueryResult<T> = T[];

async function query<T>(queryString: string): Promise<QueryResult<T>> {
  const sql = neon<T>(process.env.DATABASE_URL!);
  return await sql`${sql.unsafe(queryString)}`;
}

// Usage
interface Post {
  id: number;
  title: string;
  content: string;
}

const posts = await query<Post>('SELECT * FROM posts');
```

## Best Practices

1. **Reuse Connections**: Create the `sql` function once and reuse it
2. **Use Parameterized Queries**: Always use `${}` for dynamic values
3. **Enable WebSocket**: Better performance in edge environments
4. **Set Timeouts**: Configure appropriate timeouts for your use case
5. **Handle Errors**: Implement proper error handling and retries
6. **Close Connections**: Always release pool clients after use
7. **Monitor Performance**: Track query times and optimize slow queries
8. **Use Connection Pooling**: For applications with concurrent queries
9. **Type Your Queries**: Use TypeScript for type safety
10. **Test Edge Cases**: Ensure proper handling of NULL values and errors

## Troubleshooting

### Connection Timeout

```typescript
// Increase timeout
const sql = neon(process.env.DATABASE_URL!, {
  fetchOptions: { timeout: 30000 }, // 30 seconds
});
```

### WebSocket Issues

```typescript
// Check WebSocket configuration
import { neonConfig } from '@neondatabase/serverless';

// Verify WebSocket is configured (Node.js)
if (typeof WebSocket === 'undefined') {
  import('ws').then(ws => {
    neonConfig.webSocketConstructor = ws.default;
  });
}
```

### Pool Exhaustion

```typescript
// Increase pool size
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 50, // Increase from default 10
});
```

## Resources

- [Neon Serverless Driver GitHub](https://github.com/neondatabase/serverless)
- [npm Package](https://www.npmjs.com/package/@neondatabase/serverless)
- [Connection Pooling Guide](https://neon.com/docs/connect/connection-pooling)
- [Edge Functions Guide](https://neon.com/docs/serverless/serverless-driver)

---

**Need Help?** Join the [Neon Discord Community](https://discord.gg/92vNTzKDGp) for support.

