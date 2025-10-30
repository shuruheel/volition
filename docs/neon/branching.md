# Database Branching with Neon

Database branching is one of Neon's most powerful features, bringing Git-like workflows to your database. Create instant, isolated copies of your database for development, testing, and preview environments.

## Overview

Neon branches are independent database instances created from a parent branch. They:

- **Create Instantly**: Copy-on-write technology makes branching nearly instantaneous
- **Share Data**: Unchanged data is shared between branches (storage efficient)
- **Work Independently**: Each branch has its own compute and can scale independently
- **Integrate with CI/CD**: Automate branch creation for each pull request

## Key Concepts

### Parent and Child Branches

- **Parent Branch**: The source branch (usually `main`)
- **Child Branch**: A new branch created from a parent
- **Point-in-Time**: Branches can be created from any point in the parent's history

### Branch Lifecycle

```
main branch
    │
    ├── dev branch (development)
    │   └── feature-x (feature development)
    │
    ├── staging (pre-production)
    │
    └── pr-123 (pull request preview)
```

## Creating Branches

### Via Neon Console

1. Navigate to your project in the [Neon Console](https://console.neon.tech)
2. Click "Branches" in the left sidebar
3. Click "Create Branch"
4. Configure:
   - **Name**: e.g., `dev`, `staging`, `feature-auth`
   - **Parent Branch**: Usually `main`
   - **Point-in-Time**: Current time or specific timestamp
5. Click "Create"

### Via Neon CLI

```bash
# Install Neon CLI
npm install -g neonctl

# Authenticate
neonctl auth

# Create a branch from main
neonctl branches create --name dev --project-id your-project-id

# Create a branch from a specific point in time
neonctl branches create \
  --name restore-point \
  --project-id your-project-id \
  --parent main \
  --timestamp 2024-01-15T10:00:00Z

# List all branches
neonctl branches list --project-id your-project-id

# Delete a branch
neonctl branches delete dev --project-id your-project-id
```

### Via Neon API

```typescript
import fetch from 'node-fetch';

const NEON_API_KEY = process.env.NEON_API_KEY;
const PROJECT_ID = process.env.NEON_PROJECT_ID;

async function createBranch(name: string, parentBranch: string = 'main') {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${PROJECT_ID}/branches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        branch: {
          name,
          parent_id: parentBranch,
        },
      }),
    }
  );
  
  const data = await response.json();
  return data.branch;
}

// Usage
const devBranch = await createBranch('dev');
console.log('Branch created:', devBranch);
```

### Via Vercel Integration

Neon integrates with Vercel to automatically create preview branches:

```bash
# Install Vercel CLI
npm install -g vercel

# Link your project
vercel link

# Add Neon integration
# Visit: https://vercel.com/integrations/neon

# Neon will automatically:
# 1. Create a branch for each preview deployment
# 2. Set DATABASE_URL environment variable
# 3. Delete branch when preview is deleted
```

## Branch-Based Development Workflow

### 1. Development Branch

Create a `dev` branch for daily development:

```bash
# Create dev branch
neonctl branches create --name dev --project-id $PROJECT_ID

# Get connection string
neonctl connection-string dev --project-id $PROJECT_ID
```

Update your `.env.development`:

```bash
DATABASE_URL="postgresql://user:pass@ep-dev-123.region.aws.neon.tech/dbname?sslmode=require"
```

### 2. Feature Branches

Create branches for specific features:

```typescript
// scripts/create-feature-branch.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function createFeatureBranch(featureName: string) {
  const branchName = `feature-${featureName}`;
  
  // Create Neon branch
  const { stdout } = await execAsync(
    `neonctl branches create --name ${branchName} --project-id ${process.env.PROJECT_ID}`
  );
  
  console.log(`Created branch: ${branchName}`);
  console.log(stdout);
  
  // Get connection string
  const { stdout: connString } = await execAsync(
    `neonctl connection-string ${branchName} --project-id ${process.env.PROJECT_ID}`
  );
  
  console.log(`\nConnection string:\n${connString}`);
}

// Usage
createFeatureBranch('user-auth');
```

### 3. Pull Request Preview Branches

Automate branch creation for pull requests:

```yaml
# .github/workflows/preview.yml
name: Create Preview Branch

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  create-preview:
    runs-on: ubuntu-latest
    steps:
      - name: Create Neon Branch
        id: create-branch
        run: |
          BRANCH_NAME="pr-${{ github.event.pull_request.number }}"
          
          # Create branch
          neonctl branches create \
            --name $BRANCH_NAME \
            --project-id ${{ secrets.NEON_PROJECT_ID }} \
            --api-key ${{ secrets.NEON_API_KEY }}
          
          # Get connection string
          CONNECTION_STRING=$(neonctl connection-string $BRANCH_NAME \
            --project-id ${{ secrets.NEON_PROJECT_ID }} \
            --api-key ${{ secrets.NEON_API_KEY }})
          
          echo "connection_string=$CONNECTION_STRING" >> $GITHUB_OUTPUT
      
      - name: Comment PR
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `Preview branch created! 🎉\n\nBranch: \`pr-${{ github.event.pull_request.number }}\``
            })
```

### 4. Cleanup Workflow

Delete branches when pull requests are closed:

```yaml
# .github/workflows/cleanup.yml
name: Cleanup Preview Branch

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Delete Neon Branch
        run: |
          BRANCH_NAME="pr-${{ github.event.pull_request.number }}"
          
          neonctl branches delete $BRANCH_NAME \
            --project-id ${{ secrets.NEON_PROJECT_ID }} \
            --api-key ${{ secrets.NEON_API_KEY }}
```

## Schema Migrations with Branches

### Development Workflow

1. **Create Feature Branch**
   ```bash
   neonctl branches create --name feature-users --project-id $PROJECT_ID
   ```

2. **Run Migrations on Feature Branch**
   ```bash
   # Set DATABASE_URL to feature branch
   export DATABASE_URL="postgresql://...feature-users..."
   
   # Run migrations
   npx prisma migrate dev
   # or
   npm run migrate
   ```

3. **Test Changes**
   ```bash
   # Run tests against feature branch
   npm test
   ```

4. **Merge to Main**
   ```bash
   # After testing, run migrations on main
   export DATABASE_URL="postgresql://...main..."
   npx prisma migrate deploy
   ```

### Using Drizzle with Branches

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
});
```

```bash
# Create feature branch
neonctl branches create --name feature-posts --project-id $PROJECT_ID

# Get connection string
export DATABASE_URL=$(neonctl connection-string feature-posts --project-id $PROJECT_ID)

# Generate migration
npx drizzle-kit generate:pg

# Apply migration
npx drizzle-kit push:pg

# Test the changes
npm test

# If successful, apply to main
export DATABASE_URL=$(neonctl connection-string main --project-id $PROJECT_ID)
npx drizzle-kit push:pg
```

## Point-in-Time Restore

Create branches from any point in your database history.

### Restore to Specific Time

```bash
# Restore from 2 hours ago
neonctl branches create \
  --name restore-2h-ago \
  --project-id $PROJECT_ID \
  --parent main \
  --timestamp $(date -u -v-2H +"%Y-%m-%dT%H:%M:%SZ")

# Restore from specific timestamp
neonctl branches create \
  --name restore-incident \
  --project-id $PROJECT_ID \
  --parent main \
  --timestamp "2024-01-15T14:30:00Z"
```

### Via API

```typescript
async function createRestorePoint(
  name: string,
  timestamp: string
): Promise<any> {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${PROJECT_ID}/branches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        branch: {
          name,
          parent_id: 'main',
          parent_timestamp: timestamp,
        },
      }),
    }
  );
  
  return await response.json();
}

// Restore from 1 hour ago
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
await createRestorePoint('restore-1h', oneHourAgo);
```

## Branch Management

### Listing Branches

```typescript
async function listBranches(): Promise<any[]> {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${PROJECT_ID}/branches`,
    {
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
      },
    }
  );
  
  const data = await response.json();
  return data.branches;
}

// Usage
const branches = await listBranches();
branches.forEach(branch => {
  console.log(`${branch.name} (${branch.id})`);
  console.log(`  Created: ${branch.created_at}`);
  console.log(`  Parent: ${branch.parent_id || 'none'}`);
});
```

### Getting Branch Details

```typescript
async function getBranchDetails(branchId: string) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${PROJECT_ID}/branches/${branchId}`,
    {
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
      },
    }
  );
  
  return await response.json();
}
```

### Deleting Branches

```typescript
async function deleteBranch(branchId: string) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${PROJECT_ID}/branches/${branchId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
      },
    }
  );
  
  if (response.ok) {
    console.log(`Branch ${branchId} deleted successfully`);
  }
}
```

## Best Practices

### 1. Naming Conventions

Use clear, descriptive names:

```
✅ Good:
- main
- dev
- staging
- feature-user-auth
- pr-123
- hotfix-payment-bug

❌ Bad:
- test
- temp
- branch1
- new-branch
```

### 2. Branch Lifecycle

- **Short-lived**: Delete feature and PR branches after merging
- **Long-lived**: Keep main, dev, and staging branches
- **Automated**: Use CI/CD to create and delete branches automatically

### 3. Environment Variables

Manage different environments:

```bash
# .env.development
DATABASE_URL="postgresql://...dev-branch..."

# .env.test
DATABASE_URL="postgresql://...test-branch..."

# .env.production
DATABASE_URL="postgresql://...main-branch..."
```

### 4. Testing Strategy

```typescript
// test/setup.ts
import { neon } from '@neondatabase/serverless';

let testBranchId: string;

beforeAll(async () => {
  // Create test branch
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${PROJECT_ID}/branches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        branch: { name: `test-${Date.now()}` },
      }),
    }
  );
  
  const data = await response.json();
  testBranchId = data.branch.id;
  
  // Set DATABASE_URL to test branch
  process.env.DATABASE_URL = data.connection_uris[0].connection_uri;
});

afterAll(async () => {
  // Clean up test branch
  await fetch(
    `https://console.neon.tech/api/v2/projects/${PROJECT_ID}/branches/${testBranchId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
      },
    }
  );
});
```

### 5. Cost Optimization

- Delete unused branches regularly
- Use autosuspend for development branches
- Monitor branch storage usage

```typescript
// scripts/cleanup-old-branches.ts
async function cleanupOldBranches(daysOld: number = 7) {
  const branches = await listBranches();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  for (const branch of branches) {
    // Skip protected branches
    if (['main', 'dev', 'staging'].includes(branch.name)) {
      continue;
    }
    
    const createdAt = new Date(branch.created_at);
    if (createdAt < cutoffDate) {
      console.log(`Deleting old branch: ${branch.name}`);
      await deleteBranch(branch.id);
    }
  }
}
```

## Advanced Patterns

### Database Seeding

Seed branches with test data:

```typescript
async function seedBranch(branchConnectionString: string) {
  const sql = neon(branchConnectionString);
  
  // Create tables
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL
    )
  `;
  
  // Insert test data
  const testUsers = [
    { email: 'alice@test.com', name: 'Alice' },
    { email: 'bob@test.com', name: 'Bob' },
    { email: 'charlie@test.com', name: 'Charlie' },
  ];
  
  for (const user of testUsers) {
    await sql`
      INSERT INTO users (email, name)
      VALUES (${user.email}, ${user.name})
      ON CONFLICT (email) DO NOTHING
    `;
  }
  
  console.log('Branch seeded successfully');
}
```

### Branch Comparison

Compare schemas between branches:

```bash
# Export schema from main
pg_dump --schema-only $MAIN_DATABASE_URL > main_schema.sql

# Export schema from dev
pg_dump --schema-only $DEV_DATABASE_URL > dev_schema.sql

# Compare
diff main_schema.sql dev_schema.sql
```

## Resources

- [Neon Branching Documentation](https://neon.com/docs/guides/branching-intro)
- [API Reference](https://neon.com/docs/reference/api-reference)
- [CLI Reference](https://neon.com/docs/reference/neon-cli)
- [Vercel Integration Guide](https://neon.com/docs/guides/vercel)

---

**Need Help?** Join the [Neon Discord Community](https://discord.gg/92vNTzKDGp) for branching workflow discussions.

