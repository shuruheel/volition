# Getting Started with Neon

This guide will help you get up and running with Neon, a serverless Postgres platform.

## Prerequisites

- A Neon account (sign up at [console.neon.tech](https://console.neon.tech/signup))
- Node.js 18+ (for JavaScript/TypeScript projects)
- Basic knowledge of PostgreSQL

## Step 1: Sign Up and Create Your First Project

### Sign Up

1. Visit [https://console.neon.tech/signup](https://console.neon.tech/signup)
2. Sign up with GitHub, Google, or email
3. Verify your email address (if using email signup)

### Create a Project

After signing up, you'll be prompted to create your first project:

1. **Project Name**: Give your project a descriptive name (e.g., "my-agent-dashboard")
2. **Region**: Choose a region close to your users or application
   - US East (Ohio) - `us-east-2`
   - US West (Oregon) - `us-west-2`
   - Europe (Frankfurt) - `eu-central-1`
   - Asia Pacific (Singapore) - `ap-southeast-1`
3. **Postgres Version**: Select the latest version (default is recommended)
4. **Compute Size**: Choose your compute tier
   - Free Tier: Shared compute (0.25 vCPU)
   - Launch: 0.25 - 4 vCPU
   - Scale: 0.25 - 8 vCPU
   - Business: Custom

### Understanding Your Project

A Neon project contains:
- **Branches**: Git-like branches for your database (starts with `main`)
- **Databases**: PostgreSQL databases (default: `neondb`)
- **Roles**: Database users (default: your username)
- **Compute Endpoints**: Postgres compute instances

## Step 2: Get Your Connection String

After creating a project, you'll receive a connection string:

```
postgresql://username:password@ep-cool-name-12345678.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Connection String Components

- `username`: Your database role (user)
- `password`: Randomly generated secure password
- `ep-cool-name-12345678`: Your compute endpoint
- `us-east-2.aws.neon.tech`: Region and cloud provider
- `neondb`: Default database name
- `sslmode=require`: SSL encryption (always required)

### Save Your Connection String

Store it securely in your `.env` file:

```bash
# .env
DATABASE_URL="postgresql://username:password@ep-cool-name-12345678.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

**Important**: Never commit your `.env` file to version control!

```bash
# .gitignore
.env
.env.local
.env.*.local
```

## Step 3: Install the Neon Serverless Driver

### For Node.js/Next.js Projects

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

### Why Use the Neon Serverless Driver?

- **Low Latency**: Connects over HTTP/WebSocket instead of TCP
- **Edge Compatible**: Works in Vercel Edge, Cloudflare Workers, etc.
- **Connection Pooling**: Built-in pooling for serverless environments
- **Type-Safe**: Full TypeScript support

## Step 4: Connect and Run Your First Query

### Basic Connection (HTTP)

```typescript
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function testConnection() {
  const result = await sql`SELECT version()`;
  console.log('Connected to Postgres:', result[0].version);
}

testConnection();
```

### Using Connection Pooling

For applications with multiple concurrent queries:

```typescript
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getUsers() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM users LIMIT 10');
    return result.rows;
  } finally {
    client.release();
  }
}
```

### WebSocket Connection (Recommended for Edge)

For better performance in edge environments:

```typescript
import { neon, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket (Node.js)
neonConfig.webSocketConstructor = ws;

const sql = neon(process.env.DATABASE_URL!);

async function query() {
  const result = await sql`SELECT NOW()`;
  return result;
}
```

## Step 5: Create Your First Table

### Using SQL

```typescript
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function createUsersTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  console.log('Users table created successfully');
}

createUsersTable();
```

### Insert Data

```typescript
async function insertUser(email: string, name: string) {
  const result = await sql`
    INSERT INTO users (email, name)
    VALUES (${email}, ${name})
    RETURNING *
  `;
  return result[0];
}

// Usage
const newUser = await insertUser('alice@example.com', 'Alice');
console.log('Created user:', newUser);
```

### Query Data

```typescript
async function getUsers() {
  const users = await sql`
    SELECT id, email, name, created_at
    FROM users
    ORDER BY created_at DESC
  `;
  return users;
}

// Usage
const allUsers = await getUsers();
console.log('All users:', allUsers);
```

## Step 6: Use an ORM (Optional)

### Drizzle ORM

```bash
npm install drizzle-orm
npm install -D drizzle-kit
```

Define your schema:

```typescript
// schema.ts
import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

Use it in your application:

```typescript
// db.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { users } from './schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Query
const allUsers = await db.select().from(users);

// Insert
await db.insert(users).values({
  email: 'bob@example.com',
  name: 'Bob',
});
```

### Prisma

```bash
npm install prisma @prisma/client
npx prisma init
```

Update `schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  createdAt DateTime @default(now()) @map("created_at")

  @@map("users")
}
```

Generate and use:

```bash
npx prisma generate
npx prisma db push
```

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Query
const users = await prisma.user.findMany();

// Insert
const newUser = await prisma.user.create({
  data: {
    email: 'charlie@example.com',
    name: 'Charlie',
  },
});
```

## Step 7: Explore Advanced Features

### Database Branching

Create a branch for development:

```bash
# Using Neon CLI
neonctl branches create --name dev --project-id your-project-id

# Or via API
curl -X POST https://console.neon.tech/api/v2/projects/{project_id}/branches \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"branch": {"name": "dev"}}'
```

### Enable Autoscaling

Configure compute autoscaling in the Neon Console:
1. Go to your project settings
2. Click on "Compute"
3. Set min and max compute units
4. Enable autosuspend for inactive periods

### Connection Pooling

Use PgBouncer for connection pooling:

```bash
# Add pgbouncer=true to your connection string
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&pgbouncer=true"
```

### Monitor Your Database

View metrics in the Neon Console:
- Query performance
- Connection count
- Storage usage
- Compute usage
- Query logs

## Troubleshooting

### Connection Issues

**Problem**: "Connection timed out"
- **Solution**: Check your internet connection and firewall settings
- **Solution**: Verify the connection string is correct
- **Solution**: Ensure SSL is enabled (`sslmode=require`)

**Problem**: "Authentication failed"
- **Solution**: Verify your password is correct
- **Solution**: Check if the role (user) exists
- **Solution**: Reset password in Neon Console if needed

### Performance Issues

**Problem**: Slow queries
- **Solution**: Add appropriate indexes
- **Solution**: Use EXPLAIN to analyze query plans
- **Solution**: Enable connection pooling
- **Solution**: Increase compute resources

**Problem**: Too many connections
- **Solution**: Use connection pooling (PgBouncer)
- **Solution**: Close connections properly
- **Solution**: Use the serverless driver with HTTP mode

## Next Steps

Now that you're set up with Neon, explore these guides:

1. **[Connection Guide](./connection-guide.md)** - Learn about different connection methods
2. **[Serverless Driver](./serverless-driver.md)** - Deep dive into the Neon serverless driver
3. **[Database Branching](./branching.md)** - Implement Git-like workflows for your database
4. **[AI Integration](./ai-integration.md)** - Add vector search and embeddings
5. **[Neon Auth](./neon-auth.md)** - Implement authentication for your app

## Resources

- [Neon Documentation](https://neon.com/docs/introduction)
- [API Reference](https://neon.com/docs/reference/api-reference)
- [CLI Reference](https://neon.com/docs/reference/neon-cli)
- [Discord Community](https://discord.gg/92vNTzKDGp)
- [GitHub Examples](https://github.com/neondatabase/examples)

---

**Need Help?** Join the [Neon Discord Community](https://discord.gg/92vNTzKDGp) for support from the team and community.

