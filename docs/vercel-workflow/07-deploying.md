# Deploying Workflows

## Overview

Workflows can run on any infrastructure through **Worlds**. A World is an adapter responsible for handling workflow storage, queuing, authentication, and streaming through a given backend.

⚠️ **Note:** This section is experimental and subject to change. Share feedback on [GitHub](https://github.com/vercel/workflow/discussions).

---

## What are Worlds?

A **World** connects workflows to the infrastructure that powers them. Think of it as the "environment" where your workflows live and execute.

The World interface abstracts away the differences between local development and production deployments, allowing the same workflow code to run seamlessly across different environments.

---

## Default Behavior

Worlds are **automatically configured** depending on the scenario:

### 1. Local Development

**Automatically uses: Embedded World**
- Filesystem-based backend
- Stores data in `.workflow-data/` directory
- No configuration needed
- Perfect for development and testing

### 2. Vercel Deployments

**Automatically uses: Vercel World**
- Production-ready backend
- Integrated with Vercel's infrastructure
- No special console configuration needed
- Just deploy your code and it works ✅

### 3. Other Platforms

For other platforms, you can explicitly set configuration through environment variables. Reference the documentation for the appropriate world for configuration details.

---

## Built-in Worlds

Workflow DevKit ships with two world implementations:

### Embedded World

**Purpose:** Filesystem-based backend for local development

**Features:**
- ✅ Stores data in `.workflow-data/` directory
- ✅ No external dependencies
- ✅ Fast and simple
- ✅ Perfect for testing

**When it's used:** Automatically in local development (`npm run dev`)

**Configuration:** None needed

**Location:**
```
your-project/
├── .next/
│   └── workflow-data/    # Workflow data stored here
├── app/
├── lib/
└── ...
```

⚠️ **Important:** Add `.workflow-data/` to `.gitignore`:
```
# .gitignore
.next/
.workflow-data/
```

### Vercel World

**Purpose:** Production-ready backend for Vercel deployments

**Features:**
- ✅ Integrated with Vercel's infrastructure
- ✅ Automatic scaling
- ✅ Persistent storage
- ✅ Observable in Vercel Dashboard
- ✅ No console configuration needed

**When it's used:** Automatically when deployed to Vercel

**Configuration:** None needed - works out of the box

**Dashboard:** View in Vercel Dashboard → Observability → Workflows

---

## Building a Custom World

On top of the default Worlds, you can build new world implementations for custom infrastructure:

### Use Cases

- 🗄️ Database backends (PostgreSQL, MySQL, MongoDB, etc.)
- ☁️ Cloud providers (AWS, GCP, Azure, etc.)
- 📨 Custom queue systems
- 🔧 Third-party platforms

### Required Interfaces

To build a custom world, implement the `World` interface with these components:

#### 1. Storage
**Purpose:** Persisting workflow runs, steps, hooks, and metadata

**Methods:**
- `saveRun()` - Persist workflow run
- `getRun()` - Retrieve workflow run
- `updateRun()` - Update run status
- `saveStep()` - Persist step execution
- `getStep()` - Retrieve step result

#### 2. Queue
**Purpose:** Enqueuing and processing workflow steps asynchronously

**Methods:**
- `enqueue()` - Add step to execution queue
- `dequeue()` - Get next step to process
- `acknowledge()` - Mark step as completed

#### 3. AuthProvider
**Purpose:** Handling authentication for API access

**Methods:**
- `authenticate()` - Validate credentials
- `authorize()` - Check permissions
- `getToken()` - Retrieve access token

#### 4. Streamer
**Purpose:** Managing readable and writable streams

**Methods:**
- `createReadable()` - Create stream for workflow output
- `createWritable()` - Create stream for workflow input
- `pipe()` - Connect streams

### Example Structure

```typescript
import { World, Storage, Queue, AuthProvider, Streamer } from 'workflow'

export class MyCustomWorld implements World {
  storage: Storage
  queue: Queue
  auth: AuthProvider
  streamer: Streamer
  
  constructor(config: MyWorldConfig) {
    this.storage = new MyStorage(config.db)
    this.queue = new MyQueue(config.redis)
    this.auth = new MyAuth(config.apiKey)
    this.streamer = new MyStreamer()
  }
  
  // Implement required methods...
}
```

See the [World API Reference](https://useworkflow.dev/docs/deploying/world) for complete implementation details.

---

## Using a Third-Party World

For custom backends and third-party world implementations:

### Installation

```bash
# Example: Using a community PostgreSQL world
pnpm add @workflow/world-postgresql
```

### Configuration

Each world may require specific environment variables:

```bash
# .env.local

# PostgreSQL World example
WORKFLOW_WORLD=postgresql
DATABASE_URL=postgresql://...
WORKFLOW_QUEUE_URL=redis://...
```

### Usage

```bash
# Inspect workflows using custom backend
npx workflow inspect runs --backend @workflow/world-postgresql
```

Refer to the specific world's documentation for configuration details.

---

## Deployment Checklist

### Before Deploying

- [ ] `withWorkflow()` wrapper in `next.config.mjs`
- [ ] Using `start()` from `workflow/api` (not direct calls)
- [ ] No `fetch()` calls to own API routes
- [ ] Environment variables configured
- [ ] `.workflow-data/` in `.gitignore`

### After Deploying

- [ ] Test workflow starts successfully
- [ ] Verify steps execute correctly
- [ ] Check hooks pause/resume properly
- [ ] Monitor Vercel Dashboard → Observability
- [ ] Test restart resilience (if applicable)

---

## Environment-Specific Configuration

### Development

```bash
# .env.local
NODE_ENV=development

# Embedded World is used automatically
# No additional config needed
```

### Preview (Vercel)

```bash
# Automatically uses Vercel World
# No configuration needed
```

### Production (Vercel)

```bash
# Automatically uses Vercel World
# No configuration needed

# Optional: Custom scaling
WORKFLOW_MAX_CONCURRENCY=10
WORKFLOW_TIMEOUT=300000
```

---

## Observability Across Environments

The [Observability tools](./06-observability.md) (CLI and Web UI) can connect to any world backend:

### Local Development

```bash
# Default - connects to local environment
npx workflow inspect runs --web
```

### Remote Environments

```bash
# Inspect production workflows on Vercel
npx workflow inspect runs --backend @workflow/world-vercel

# Inspect custom backend
npx workflow inspect runs --backend @workflow/world-postgresql
```

---

## Migration Between Worlds

### From Embedded to Vercel

**No code changes needed!** Just deploy to Vercel:

```bash
vercel deploy
```

Workflows automatically switch from Embedded World to Vercel World.

### From Vercel to Custom World

1. Install custom world package
2. Set environment variables
3. Update configuration
4. Deploy with new settings

### Data Migration

⚠️ **Important:** Workflow data (runs, steps) is **not automatically migrated** between worlds.

**Options:**
1. **Fresh start** - Start with clean slate (recommended)
2. **Manual export/import** - Use CLI to export/import data
3. **Custom migration script** - Write script to transfer data

---

## Best Practices

### 1. Use Vercel World for Production

Unless you have specific requirements, Vercel World is the recommended production backend:
- ✅ Zero configuration
- ✅ Built-in observability
- ✅ Automatic scaling
- ✅ Integrated with Vercel platform

### 2. Test in Preview Environment

```bash
# Deploy to preview branch
git push origin feature/new-workflow

# Vercel automatically deploys preview
# Test workflows in preview before production
```

### 3. Monitor Performance

```bash
# After deployment, monitor in Vercel Dashboard
# Observability → Workflows → Performance
```

### 4. Handle Errors Gracefully

```typescript
export async function robustWorkflow(data: any) {
  "use workflow"
  
  try {
    return await processData(data)
  } catch (error) {
    // Log error for observability
    console.error('[Workflow] Error:', error)
    
    // Update database or send alert
    await notifyError(error)
    
    // Rethrow to mark workflow as failed
    throw error
  }
}
```

---

## Troubleshooting

### Workflows not executing in production

**Symptoms:** Workflow starts but doesn't execute

**Check:**
1. ✅ `withWorkflow()` in `next.config.mjs`
2. ✅ Using `start()` from `workflow/api`
3. ✅ No direct workflow function calls
4. ✅ Environment variables set correctly
5. ✅ Check Vercel function logs

### World configuration errors

**Symptoms:** "World not found" or configuration errors

**Solutions:**
1. Verify world package is installed
2. Check environment variables are set
3. Ensure world name is correct
4. Review world-specific documentation

### Data not persisting

**Symptoms:** Workflow data lost after restart

**Check:**
1. Using correct world for environment
2. Storage configuration is valid
3. Database/storage backend is accessible
4. No errors in storage logs

---

## Learn More

- [Embedded World](https://useworkflow.dev/docs/deploying/world/embedded-world) - Local development backend
- [Vercel World](https://useworkflow.dev/docs/deploying/world/vercel-world) - Production backend for Vercel
- [World API Reference](https://useworkflow.dev/docs/deploying/world) - Building custom worlds
- [Observability](./06-observability.md) - Inspecting workflow data

---

## Summary

**Key Takeaways:**

✅ **Vercel deployments work automatically** - No console configuration needed
✅ **Local development works automatically** - Uses Embedded World  
✅ **Same code, different environments** - Worlds abstract the infrastructure
✅ **Custom worlds possible** - Build for any backend

**Recommended Setup:**
- Development: Embedded World (automatic)
- Production: Vercel World (automatic)
- Custom: Only if you have specific requirements

---

## References

- [Official Documentation](https://useworkflow.dev/docs/deploying)
- [Vercel Deployment Docs](https://vercel.com/docs)
- [World API Reference](https://useworkflow.dev/docs/deploying/world)

