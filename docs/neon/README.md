# Neon - Serverless Postgres Documentation

## Overview

[Neon](https://neon.com/docs/introduction) is a serverless Postgres platform designed to help you build reliable and scalable applications faster. Neon separates compute and storage to offer modern developer features such as **autoscaling**, **branching**, **instant restore**, and more.

### Key Features

- **Serverless Architecture**: Automatic scaling based on traffic with scale-to-zero capability
- **Database Branching**: Git-like branching for databases, perfect for development and testing
- **Instant Restores**: Recover terabytes of data in seconds
- **Connection Pooling**: Handle thousands of concurrent connections efficiently
- **Bottomless Storage**: Copy-on-write storage architecture for efficient data management
- **AI-Ready**: Built-in support for pgvector and AI embeddings

### Why Choose Neon?

1. **Cost-Effective**: Pay only for what you use with autoscaling and scale-to-zero
2. **Developer Experience**: Modern workflows with branching, instant provisioning, and API-first design
3. **Production Ready**: SOC 2, ISO 27001, GDPR, and HIPAA compliant
4. **AI-Native**: Purpose-built for modern AI applications with vector search and embeddings

## Documentation Structure

This folder contains comprehensive guides for integrating Neon into your application:

- **[Getting Started](./getting-started.md)** - Sign up, create projects, and basic setup
- **[Connection Guide](./connection-guide.md)** - Connect to Neon from any application
- **[Serverless Driver](./serverless-driver.md)** - Low-latency database driver over HTTP/WebSocket
- **[Database Branching](./branching.md)** - Git-like workflows for your database
- **[AI Integration](./ai-integration.md)** - AI concepts, embeddings, and vector search
- **[Neon Auth](./neon-auth.md)** - Built-in authentication for your applications
- **[pgvector Extension](./pgvector.md)** - Vector similarity search for AI applications
- **[Project Management](./project-management.md)** - Manage projects, databases, and resources
- **[API Reference](./api-reference.md)** - Programmatic access to Neon

## Quick Start

### 1. Sign Up

Create a free Neon account at [https://console.neon.tech/signup](https://console.neon.tech/signup). The Free plan includes:
- 10 GB storage
- Shared compute resources
- Unlimited projects
- Instant provisioning

### 2. Create a Project

```bash
# Using the Neon CLI
npm install -g neonctl
neonctl projects create --name my-app

# Or use the web console
# Visit https://console.neon.tech
```

### 3. Connect to Your Database

```javascript
// Node.js with @neondatabase/serverless
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const data = await sql`SELECT version()`;
console.log(data);
```

### 4. Environment Variables

```bash
# .env
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
```

## Integration Examples

### Next.js + Neon

```typescript
// app/api/users/route.ts
import { neon } from '@neondatabase/serverless';

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);
  const users = await sql`SELECT * FROM users LIMIT 10`;
  return Response.json(users);
}
```

### Node.js + Neon

```javascript
// server.js
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getUsers() {
  const { rows } = await pool.query('SELECT * FROM users');
  return rows;
}
```

### TypeScript + Drizzle ORM

```typescript
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const users = await db.select().from(usersTable);
```

## Key Concepts

### Compute and Storage Separation

Neon's architecture separates compute (Postgres) from storage, enabling:
- Independent scaling of compute and storage
- Instant database branching
- Cost-effective resource management
- Scale-to-zero for inactive databases

### Branching Workflow

Create branches for:
- **Development**: Isolated environments with production data
- **Testing**: Run tests without affecting production
- **Previews**: Deploy preview environments with dedicated databases
- **Hotfixes**: Quickly create fix branches from production state

### Autoscaling

Neon automatically adjusts compute resources based on:
- Active connections
- Query load
- Resource utilization
- Configured min/max limits

## Best Practices

### Connection Management

1. **Use Connection Pooling**: Especially for serverless functions
   ```javascript
   import { Pool } from '@neondatabase/serverless';
   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
   ```

2. **Enable WebSocket for Serverless**: Better performance in edge environments
   ```javascript
   import { neonConfig } from '@neondatabase/serverless';
   neonConfig.webSocketConstructor = WebSocket;
   ```

3. **Set Appropriate Timeouts**:
   ```javascript
   const sql = neon(process.env.DATABASE_URL, {
     fetchOptions: { timeout: 10000 }
   });
   ```

### Security

1. **Store Credentials Securely**: Use environment variables
2. **Enable SSL**: Always use `sslmode=require`
3. **Use IAM Roles**: When deploying on AWS
4. **Rotate Passwords**: Regular rotation via API or console
5. **Enable IP Allowlist**: Restrict access to known IPs

### Performance Optimization

1. **Use Prepared Statements**: Reduce query parsing overhead
2. **Enable Connection Pooling**: Reuse connections efficiently
3. **Index Strategy**: Create appropriate indexes for queries
4. **Query Optimization**: Use EXPLAIN to analyze query plans
5. **Caching**: Implement application-level caching for frequently accessed data

### Cost Optimization

1. **Configure Autoscaling**: Set appropriate min/max compute limits
2. **Enable Scale-to-Zero**: For development and staging
3. **Use Branches Wisely**: Clean up unused branches
4. **Monitor Usage**: Track compute and storage metrics
5. **Optimize Queries**: Reduce query execution time

## Environment Variables

Essential environment variables for your application:

```bash
# Primary database connection
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"

# Pooled connection (recommended for serverless)
DATABASE_URL_POOLED="postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require&pgbouncer=true"

# Unpooled connection (for migrations and admin tasks)
DATABASE_URL_UNPOOLED="postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"

# Neon API key (for programmatic access)
NEON_API_KEY="your-api-key"
```

## Common Use Cases

### AI Agents

- Store agent state and conversation history
- Vector search for RAG (Retrieval-Augmented Generation)
- User profiles and personalization data
- Session management and context

### Serverless Applications

- Auto-scale with traffic patterns
- Scale-to-zero during idle periods
- Fast cold starts with connection pooling
- Global edge deployment support

### Multi-Tenant Applications

- Database per tenant isolation
- Efficient resource sharing
- Instant tenant provisioning
- Centralized management via API

### Dev/Test Environments

- Production-like data in development
- Isolated testing environments
- Fast environment provisioning
- Branch-based workflows

## Resources

### Official Documentation
- [Neon Documentation](https://neon.com/docs/introduction)
- [API Reference](https://neon.com/docs/reference/api-reference)
- [CLI Reference](https://neon.com/docs/reference/neon-cli)
- [Changelog](https://neon.com/docs/changelog)

### Community
- [Discord Community](https://discord.gg/92vNTzKDGp)
- [GitHub Repository](https://github.com/neondatabase/neon)
- [Community Guides](https://neon.com/guides)
- [PostgreSQL Tutorial](https://neon.com/postgresql/tutorial)

### Support
- [Support Portal](https://neon.com/docs/introduction/support)
- [Status Page](https://neonstatus.com/)
- [Trust Center](https://trust.neon.com)
- [Security](https://neon.com/security)

### Compliance
- SOC 2 Type II Certified
- ISO 27001 & 27701 Certified
- GDPR & CCPA Compliant
- HIPAA Compliant (Business and Enterprise plans)

## Next Steps

1. **Explore Integration Guides**: Review specific integration docs for your stack
2. **Set Up Branching**: Implement branching workflows for development
3. **Enable Monitoring**: Set up alerts and monitoring for your databases
4. **Optimize Performance**: Review query performance and indexing strategies
5. **Scale Your Application**: Configure autoscaling for production workloads

---

**Need Help?** Join the [Neon Discord Community](https://discord.gg/92vNTzKDGp) or check out the [support documentation](https://neon.com/docs/introduction/support).

