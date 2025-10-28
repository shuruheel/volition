# Connection Guide

Learn how to connect to your Neon Postgres database from any application using various methods and tools.

## Connection String Format

Neon provides a standard PostgreSQL connection string:

```
postgresql://[user]:[password]@[endpoint]/[database]?[parameters]
```

### Components

- **user**: Database role (username)
- **password**: Role password
- **endpoint**: Compute endpoint hostname (e.g., `ep-cool-name-123456.us-east-2.aws.neon.tech`)
- **database**: Database name (default: `neondb`)
- **parameters**: Connection parameters (e.g., `sslmode=require`)

### Example

```
postgresql://alex:AbC123dEf@ep-cool-waterfall-12345678.us-east-2.aws.neon.tech/neondb?sslmode=require
```

## Connection Types

### 1. Direct Connection (Unpooled)

Best for:
- Long-running applications
- Database migrations
- Admin tasks
- Local development

```typescript
import { Client } from 'pg';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();
const result = await client.query('SELECT version()');
console.log(result.rows[0]);
await client.end();
```

### 2. Pooled Connection (PgBouncer)

Best for:
- Serverless functions
- High connection count applications
- Edge deployments

Add `?pgbouncer=true` to your connection string:

```
postgresql://user:pass@host/db?sslmode=require&pgbouncer=true
```

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_POOLED,
});

const result = await pool.query('SELECT NOW()');
console.log(result.rows[0]);
```

### 3. HTTP/WebSocket (Neon Serverless Driver)

Best for:
- Edge functions
- Ultra-low latency requirements
- WebAssembly environments

```typescript
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const result = await sql`SELECT version()`;
console.log(result[0]);
```

## Connection Methods by Platform

### Node.js

#### Using node-postgres (pg)

```bash
npm install pg
```

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function getUsers() {
  const { rows } = await pool.query('SELECT * FROM users LIMIT 10');
  return rows;
}
```

#### Using Neon Serverless Driver

```bash
npm install @neondatabase/serverless
```

```typescript
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function getUsers() {
  return await sql`SELECT * FROM users LIMIT 10`;
}
```

### Next.js

#### App Router (Server Components)

```typescript
// app/users/page.tsx
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export default async function UsersPage() {
  const users = await sql`SELECT * FROM users`;
  
  return (
    <div>
      {users.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

#### API Routes

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

#### Edge Runtime

```typescript
// app/api/edge/route.ts
import { neon } from '@neondatabase/serverless';

export const runtime = 'edge';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const data = await sql`SELECT COUNT(*) as count FROM users`;
  return Response.json(data[0]);
}
```

### Vercel

#### Environment Variables

Add to your Vercel project:

1. Go to Project Settings → Environment Variables
2. Add `DATABASE_URL` with your Neon connection string
3. Optionally add `DATABASE_URL_POOLED` for pooled connections

```bash
# .env.local
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
DATABASE_URL_POOLED="postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require&pgbouncer=true"
```

#### Automatic Integration

Install the Neon Vercel Integration:

1. Visit [https://vercel.com/integrations/neon](https://vercel.com/integrations/neon)
2. Click "Add Integration"
3. Select your Vercel project
4. Neon will automatically:
   - Create a database branch for each preview deployment
   - Set environment variables
   - Delete branches when previews are deleted

### Cloudflare Workers

```typescript
import { neon } from '@neondatabase/serverless';

interface Env {
  DATABASE_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const sql = neon(env.DATABASE_URL);
    const users = await sql`SELECT * FROM users LIMIT 10`;
    
    return new Response(JSON.stringify(users), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
```

### Deno

```typescript
import { Client } from 'https://deno.land/x/postgres/mod.ts';
// or
import { neon } from 'npm:@neondatabase/serverless';

// Using Deno Postgres
const client = new Client(Deno.env.get('DATABASE_URL'));
await client.connect();
const result = await client.queryObject('SELECT * FROM users');
await client.end();

// Using Neon Serverless Driver
const sql = neon(Deno.env.get('DATABASE_URL')!);
const users = await sql`SELECT * FROM users`;
```

### Python

```bash
pip install psycopg2-binary
# or
pip install asyncpg
```

#### Using psycopg2

```python
import psycopg2
import os

conn = psycopg2.connect(os.environ['DATABASE_URL'])
cursor = conn.cursor()

cursor.execute('SELECT * FROM users LIMIT 10')
users = cursor.fetchall()

cursor.close()
conn.close()
```

#### Using asyncpg

```python
import asyncpg
import os

async def get_users():
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    users = await conn.fetch('SELECT * FROM users LIMIT 10')
    await conn.close()
    return users
```

### Ruby on Rails

```ruby
# config/database.yml
production:
  adapter: postgresql
  url: <%= ENV['DATABASE_URL'] %>
  pool: 5
  timeout: 5000
```

### Go

```bash
go get github.com/lib/pq
```

```go
package main

import (
    "database/sql"
    "fmt"
    "os"
    
    _ "github.com/lib/pq"
)

func main() {
    db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
    if err != nil {
        panic(err)
    }
    defer db.Close()
    
    rows, err := db.Query("SELECT id, name FROM users LIMIT 10")
    if err != nil {
        panic(err)
    }
    defer rows.Close()
    
    for rows.Next() {
        var id int
        var name string
        if err := rows.Scan(&id, &name); err != nil {
            panic(err)
        }
        fmt.Printf("ID: %d, Name: %s\n", id, name)
    }
}
```

## ORM Integration

### Prisma

```bash
npm install prisma @prisma/client
npx prisma init
```

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String
}
```

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log(users);
}

main();
```

### Drizzle ORM

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

```typescript
// src/db/schema.ts
import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
});
```

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { users } from './schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Query
const allUsers = await db.select().from(users);

// Insert
await db.insert(users).values({
  email: 'new@example.com',
  name: 'New User',
});
```

### TypeORM

```bash
npm install typeorm @nestjs/typeorm pg
```

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,
    }),
  ],
})
export class AppModule {}
```

### Kysely

```bash
npm install kysely pg
```

```typescript
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

interface Database {
  users: {
    id: number;
    email: string;
    name: string;
  };
}

const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
});

const users = await db.selectFrom('users').selectAll().execute();
```

## Connection Pooling

### Built-in Pooling with node-postgres

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle clients after 30s
  connectionTimeoutMillis: 10000, // Return error after 10s
});

// Recommended: Use pool.query() for simple queries
const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [1]);

// Use pool.connect() for transactions
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO users (email) VALUES ($1)', ['test@example.com']);
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

### PgBouncer (Neon's Built-in Pooler)

Enable by adding `?pgbouncer=true`:

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL + '?pgbouncer=true',
  // Lower connection limits when using PgBouncer
  max: 10,
});
```

#### PgBouncer Limitations

When using PgBouncer, be aware of these limitations:

- No prepared statements across connections
- No advisory locks
- No LISTEN/NOTIFY
- No SET commands that persist
- No temporary tables

## SSL Configuration

Neon requires SSL connections. Always include `sslmode=require`:

```typescript
// Using connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL + '?sslmode=require',
});

// Using connection object
const pool = new Pool({
  host: 'ep-cool-name-123456.us-east-2.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'alex',
  password: 'AbC123dEf',
  ssl: { rejectUnauthorized: false },
});
```

## Connection Troubleshooting

### Connection Timeout

```typescript
// Increase timeout
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000, // 10 seconds
});
```

### Too Many Connections

```typescript
// Use pooled connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL + '?pgbouncer=true',
  max: 10, // Limit pool size
});

// Always release clients
const client = await pool.connect();
try {
  await client.query('SELECT * FROM users');
} finally {
  client.release(); // Critical!
}
```

### SSL Errors

```typescript
// Allow self-signed certificates
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
```

## Best Practices

1. **Use Environment Variables**: Never hard-code connection strings
   ```typescript
   const sql = neon(process.env.DATABASE_URL!);
   ```

2. **Connection Pooling**: Reuse connections for better performance
   ```typescript
   // ✅ Create pool once
   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
   
   // ❌ Don't create pool per request
   async function handler() {
     const pool = new Pool({ ... }); // Don't do this!
   }
   ```

3. **Release Connections**: Always release pool clients
   ```typescript
   const client = await pool.connect();
   try {
     await client.query('...');
   } finally {
     client.release(); // Always release
   }
   ```

4. **Use Prepared Statements**: Prevent SQL injection
   ```typescript
   // ✅ Good: Parameterized query
   await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
   
   // ❌ Bad: String concatenation
   await pool.query(`SELECT * FROM users WHERE id = ${userId}`);
   ```

5. **Handle Errors**: Implement proper error handling
   ```typescript
   try {
     await pool.query('...');
   } catch (error) {
     console.error('Database error:', error);
     throw new Error('Failed to query database');
   }
   ```

6. **Monitor Connections**: Track active connections
   ```typescript
   console.log('Total clients:', pool.totalCount);
   console.log('Idle clients:', pool.idleCount);
   console.log('Waiting clients:', pool.waitingCount);
   ```

## Resources

- [Neon Connection Documentation](https://neon.com/docs/connect/connect-from-any-app)
- [Serverless Driver Guide](./serverless-driver.md)
- [Connection Pooling](https://neon.com/docs/connect/connection-pooling)
- [Troubleshooting](https://neon.com/docs/connect/troubleshooting)

---

**Need Help?** Join the [Neon Discord Community](https://discord.gg/92vNTzKDGp) for connection support.

