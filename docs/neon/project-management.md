# Project Management

Learn how to manage Neon projects, databases, branches, and compute resources through the console, CLI, and API.

## Overview

A Neon project is the top-level container for your databases, containing:
- **Branches**: Database instances (main, dev, feature branches)
- **Databases**: PostgreSQL databases within branches
- **Roles**: Database users with specific permissions
- **Compute Endpoints**: Postgres compute instances
- **Connection Strings**: URIs for connecting to databases

## Creating Projects

### Via Neon Console

1. Go to [console.neon.tech](https://console.neon.tech)
2. Click "New Project"
3. Configure:
   - **Name**: Project name (e.g., "my-agent-dashboard")
   - **Region**: Choose closest to your users
   - **Postgres Version**: Select version (16 recommended)
   - **Compute Size**: Select tier (Free, Launch, Scale, Business)
4. Click "Create Project"

### Via Neon CLI

```bash
# Install CLI
npm install -g neonctl

# Authenticate
neonctl auth

# Create project
neonctl projects create \
  --name my-agent-dashboard \
  --region-id aws-us-east-2 \
  --pg-version 16

# List projects
neonctl projects list

# Get project details
neonctl projects get <project-id>
```

### Via API

```typescript
async function createProject(name: string, region: string = 'aws-us-east-2') {
  const response = await fetch('https://console.neon.tech/api/v2/projects', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      project: {
        name,
        region_id: region,
        pg_version: 16,
      },
    }),
  });

  const data = await response.json();
  return data.project;
}

// Usage
const project = await createProject('my-agent-dashboard');
console.log('Project ID:', project.id);
console.log('Connection string:', project.connection_uri);
```

## Managing Branches

### Create Branch

```bash
# Via CLI
neonctl branches create \
  --name dev \
  --project-id <project-id>

# With point-in-time restore
neonctl branches create \
  --name restore-point \
  --project-id <project-id> \
  --parent main \
  --timestamp '2024-01-15T10:00:00Z'
```

```typescript
// Via API
async function createBranch(
  projectId: string,
  name: string,
  parentBranch: string = 'main'
) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
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

  return await response.json();
}
```

### List Branches

```bash
# Via CLI
neonctl branches list --project-id <project-id>
```

```typescript
// Via API
async function listBranches(projectId: string) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
      },
    }
  );

  const data = await response.json();
  return data.branches;
}
```

### Delete Branch

```bash
# Via CLI
neonctl branches delete <branch-id> --project-id <project-id>
```

```typescript
// Via API
async function deleteBranch(projectId: string, branchId: string) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
      },
    }
  );

  return response.ok;
}
```

## Managing Databases

### Create Database

```bash
# Via CLI
neonctl databases create \
  --name myapp_db \
  --branch-id <branch-id> \
  --project-id <project-id>
```

```typescript
// Via API
async function createDatabase(
  projectId: string,
  branchId: string,
  databaseName: string
) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/databases`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        database: {
          name: databaseName,
          owner_name: 'neondb_owner',
        },
      }),
    }
  );

  return await response.json();
}
```

### List Databases

```bash
# Via CLI
neonctl databases list \
  --branch-id <branch-id> \
  --project-id <project-id>
```

```typescript
// Via API
async function listDatabases(projectId: string, branchId: string) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/databases`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
      },
    }
  );

  const data = await response.json();
  return data.databases;
}
```

### Delete Database

```bash
# Via CLI
neonctl databases delete <database-name> \
  --branch-id <branch-id> \
  --project-id <project-id>
```

## Managing Roles (Users)

### Create Role

```bash
# Via CLI
neonctl roles create \
  --name app_user \
  --branch-id <branch-id> \
  --project-id <project-id>
```

```typescript
// Via API
async function createRole(
  projectId: string,
  branchId: string,
  roleName: string
) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/roles`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: {
          name: roleName,
        },
      }),
    }
  );

  return await response.json();
}
```

### Reset Password

```bash
# Via CLI
neonctl roles reset-password <role-name> \
  --branch-id <branch-id> \
  --project-id <project-id>
```

```typescript
// Via API
async function resetPassword(
  projectId: string,
  branchId: string,
  roleName: string,
  newPassword: string
) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/roles/${roleName}/reset_password`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: newPassword,
      }),
    }
  );

  return await response.json();
}
```

## Compute Management

### Configure Autoscaling

```bash
# Via CLI
neonctl set-compute \
  --branch-id <branch-id> \
  --project-id <project-id> \
  --min 0.25 \
  --max 2
```

```typescript
// Via API
async function configureCompute(
  projectId: string,
  branchId: string,
  endpointId: string,
  minCU: number = 0.25,
  maxCU: number = 2
) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/endpoints/${endpointId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: {
          autoscaling_limit_min_cu: minCU,
          autoscaling_limit_max_cu: maxCU,
        },
      }),
    }
  );

  return await response.json();
}
```

### Enable/Disable Autosuspend

```typescript
async function configureAutosuspend(
  projectId: string,
  branchId: string,
  endpointId: string,
  enabled: boolean,
  delaySeconds: number = 300 // 5 minutes
) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/endpoints/${endpointId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: {
          suspend_timeout_seconds: enabled ? delaySeconds : 0,
        },
      }),
    }
  );

  return await response.json();
}
```

## Connection Strings

### Get Connection String

```bash
# Via CLI
neonctl connection-string \
  --branch-id <branch-id> \
  --project-id <project-id> \
  --database-name myapp_db \
  --role-name app_user

# Pooled connection
neonctl connection-string \
  --branch-id <branch-id> \
  --project-id <project-id> \
  --pooled
```

```typescript
// Via API
async function getConnectionString(
  projectId: string,
  branchId: string,
  databaseName: string = 'neondb',
  pooled: boolean = false
) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
      },
    }
  );

  const data = await response.json();
  const endpoint = data.branch.endpoints[0];

  return pooled
    ? endpoint.connection_uri_pooled
    : endpoint.connection_uri;
}
```

## Monitoring and Metrics

### Get Project Metrics

```typescript
async function getProjectMetrics(
  projectId: string,
  startTime: string,
  endTime: string
) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/metrics?` +
    `start_time=${startTime}&end_time=${endTime}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
      },
    }
  );

  return await response.json();
}

// Usage
const now = new Date();
const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

const metrics = await getProjectMetrics(
  'project-id',
  oneDayAgo.toISOString(),
  now.toISOString()
);
```

### Monitor Connections

```sql
-- Current connections
SELECT
  datname,
  usename,
  application_name,
  client_addr,
  state,
  query
FROM pg_stat_activity
WHERE datname IS NOT NULL;

-- Connection count by database
SELECT
  datname,
  COUNT(*) as connections
FROM pg_stat_activity
WHERE datname IS NOT NULL
GROUP BY datname;

-- Long-running queries
SELECT
  pid,
  now() - query_start AS duration,
  query
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '5 minutes'
ORDER BY duration DESC;
```

### Database Size

```sql
-- Database sizes
SELECT
  pg_database.datname,
  pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

## Automation Scripts

### Automated Branch Cleanup

```typescript
// scripts/cleanup-branches.ts
import fetch from 'node-fetch';

const NEON_API_KEY = process.env.NEON_API_KEY!;
const PROJECT_ID = process.env.NEON_PROJECT_ID!;

async function cleanupOldBranches(daysOld: number = 7) {
  // Get all branches
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${PROJECT_ID}/branches`,
    {
      headers: { 'Authorization': `Bearer ${NEON_API_KEY}` },
    }
  );

  const data = await response.json();
  const branches = data.branches;

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

      await fetch(
        `https://console.neon.tech/api/v2/projects/${PROJECT_ID}/branches/${branch.id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${NEON_API_KEY}` },
        }
      );
    }
  }
}

cleanupOldBranches(7);
```

### Daily Backup

```typescript
// scripts/backup.ts
async function createBackupBranch() {
  const timestamp = new Date().toISOString().split('T')[0];
  const branchName = `backup-${timestamp}`;

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
          name: branchName,
          parent_id: 'main',
        },
      }),
    }
  );

  const data = await response.json();
  console.log(`Created backup branch: ${branchName}`);
  return data.branch;
}

createBackupBranch();
```

### Monitor Storage Usage

```typescript
// scripts/monitor-storage.ts
async function monitorStorage() {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${PROJECT_ID}`,
    {
      headers: { 'Authorization': `Bearer ${NEON_API_KEY}` },
    }
  );

  const data = await response.json();
  const project = data.project;

  console.log('Project:', project.name);
  console.log('Storage (GB):', (project.storage_size / (1024 ** 3)).toFixed(2));
  console.log('Branches:', project.branch_count);

  // Alert if storage exceeds threshold
  const threshold = 10 * 1024 ** 3; // 10 GB
  if (project.storage_size > threshold) {
    console.warn('⚠️ Storage threshold exceeded!');
    // Send alert (email, Slack, etc.)
  }
}

monitorStorage();
```

## Best Practices

1. **Use Descriptive Names**: Name projects, branches, and databases clearly
   ```typescript
   // ✅ Good
   const project = await createProject('production-api');
   const branch = await createBranch(projectId, 'feature-user-auth');

   // ❌ Bad
   const project = await createProject('project1');
   const branch = await createBranch(projectId, 'test');
   ```

2. **Implement Branch Lifecycle**: Clean up old branches regularly
   ```typescript
   // Run daily cleanup
   await cleanupOldBranches(7); // Delete branches older than 7 days
   ```

3. **Monitor Resource Usage**: Track storage and compute metrics
   ```typescript
   const metrics = await getProjectMetrics(projectId, startTime, endTime);
   ```

4. **Automate Common Tasks**: Use scripts for repetitive operations
   ```bash
   # Automate backups
   crontab -e
   # 0 2 * * * node /path/to/backup.ts
   ```

5. **Secure API Keys**: Store in environment variables, never in code
   ```bash
   # .env
   NEON_API_KEY=your-api-key
   NEON_PROJECT_ID=your-project-id
   ```

6. **Use Branches for Development**: Isolate development from production
   ```typescript
   // Create feature branch for development
   const featureBranch = await createBranch(projectId, 'feature-new-api');
   ```

## Troubleshooting

### Project Creation Fails

```typescript
// Check if region is valid
const validRegions = [
  'aws-us-east-1',
  'aws-us-east-2',
  'aws-us-west-2',
  'aws-eu-central-1',
  'aws-ap-southeast-1',
];

if (!validRegions.includes(region)) {
  console.error('Invalid region');
}
```

### Connection String Not Working

```bash
# Verify branch and database exist
neonctl branches list --project-id <project-id>
neonctl databases list --branch-id <branch-id> --project-id <project-id>

# Test connection
psql "postgresql://user:pass@host/db?sslmode=require"
```

### High Storage Usage

```sql
-- Find large tables
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- Vacuum and analyze
VACUUM ANALYZE;
```

## Resources

- [Neon API Reference](./api-reference.md)
- [Branching Guide](./branching.md)
- [CLI Reference](https://neon.com/docs/reference/neon-cli)
- [API Documentation](https://neon.com/docs/reference/api-reference)

---

**Need Help?** Join the [Neon Discord Community](https://discord.gg/92vNTzKDGp) for project management support.

