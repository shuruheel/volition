# Neon API Reference

Complete reference for the Neon API, allowing programmatic management of projects, branches, databases, and more.

## Overview

The Neon API provides full control over your Neon infrastructure:

- **Base URL**: `https://console.neon.tech/api/v2`
- **Authentication**: Bearer token (API key)
- **Format**: JSON
- **Rate Limits**: 100 requests per minute (Free), higher for paid plans

## Authentication

### Get API Key

1. Go to [console.neon.tech](https://console.neon.tech)
2. Click on your profile → Account Settings
3. Navigate to API Keys
4. Click "Generate new API key"
5. Copy and store securely

### Using API Key

```typescript
const NEON_API_KEY = process.env.NEON_API_KEY;

const response = await fetch('https://console.neon.tech/api/v2/projects', {
  headers: {
    'Authorization': `Bearer ${NEON_API_KEY}`,
    'Content-Type': 'application/json',
  },
});
```

## Projects

### List Projects

```typescript
async function listProjects() {
  const response = await fetch('https://console.neon.tech/api/v2/projects', {
    headers: {
      'Authorization': `Bearer ${NEON_API_KEY}`,
    },
  });

  const data = await response.json();
  return data.projects;
}
```

**Response**:
```json
{
  "projects": [
    {
      "id": "proj_abc123",
      "name": "my-project",
      "region_id": "aws-us-east-2",
      "created_at": "2024-01-01T00:00:00Z",
      "pg_version": 16,
      "store_passwords": true,
      "branch_count": 3,
      "database_count": 2,
      "storage_size": 1073741824
    }
  ]
}
```

### Create Project

```typescript
async function createProject(
  name: string,
  regionId: string = 'aws-us-east-2',
  pgVersion: number = 16
) {
  const response = await fetch('https://console.neon.tech/api/v2/projects', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NEON_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      project: {
        name,
        region_id: regionId,
        pg_version: pgVersion,
      },
    }),
  });

  return await response.json();
}
```

**Request Body**:
```json
{
  "project": {
    "name": "my-project",
    "region_id": "aws-us-east-2",
    "pg_version": 16
  }
}
```

### Get Project

```typescript
async function getProject(projectId: string) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}`,
    {
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
      },
    }
  );

  return await response.json();
}
```

### Update Project

```typescript
async function updateProject(projectId: string, name: string) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project: { name },
      }),
    }
  );

  return await response.json();
}
```

### Delete Project

```typescript
async function deleteProject(projectId: string) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
      },
    }
  );

  return response.ok;
}
```

## Branches

### List Branches

```typescript
async function listBranches(projectId: string) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches`,
    {
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
      },
    }
  );

  const data = await response.json();
  return data.branches;
}
```

### Create Branch

```typescript
async function createBranch(
  projectId: string,
  name: string,
  parentId?: string,
  parentTimestamp?: string
) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        branch: {
          name,
          parent_id: parentId,
          parent_timestamp: parentTimestamp,
        },
      }),
    }
  );

  return await response.json();
}
```

**Request Body (Point-in-Time Restore)**:
```json
{
  "branch": {
    "name": "restore-point",
    "parent_id": "br-main-123",
    "parent_timestamp": "2024-01-15T10:00:00Z"
  }
}
```

### Get Branch

```typescript
async function getBranch(projectId: string, branchId: string) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}`,
    {
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
      },
    }
  );

  return await response.json();
}
```

### Delete Branch

```typescript
async function deleteBranch(projectId: string, branchId: string) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
      },
    }
  );

  return response.ok;
}
```

## Databases

### List Databases

```typescript
async function listDatabases(projectId: string, branchId: string) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/databases`,
    {
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
      },
    }
  );

  const data = await response.json();
  return data.databases;
}
```

### Create Database

```typescript
async function createDatabase(
  projectId: string,
  branchId: string,
  name: string,
  ownerName: string = 'neondb_owner'
) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/databases`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        database: {
          name,
          owner_name: ownerName,
        },
      }),
    }
  );

  return await response.json();
}
```

### Delete Database

```typescript
async function deleteDatabase(
  projectId: string,
  branchId: string,
  databaseName: string
) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/databases/${databaseName}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
      },
    }
  );

  return response.ok;
}
```

## Roles (Users)

### List Roles

```typescript
async function listRoles(projectId: string, branchId: string) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/roles`,
    {
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
      },
    }
  );

  const data = await response.json();
  return data.roles;
}
```

### Create Role

```typescript
async function createRole(
  projectId: string,
  branchId: string,
  name: string
) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/roles`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: { name },
      }),
    }
  );

  return await response.json();
}
```

### Reset Role Password

```typescript
async function resetRolePassword(
  projectId: string,
  branchId: string,
  roleName: string,
  password?: string
) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/roles/${roleName}/reset_password`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password, // Optional: auto-generate if not provided
      }),
    }
  );

  return await response.json();
}
```

### Delete Role

```typescript
async function deleteRole(
  projectId: string,
  branchId: string,
  roleName: string
) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/roles/${roleName}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
      },
    }
  );

  return response.ok;
}
```

## Endpoints (Compute)

### List Endpoints

```typescript
async function listEndpoints(projectId: string, branchId: string) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/endpoints`,
    {
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
      },
    }
  );

  const data = await response.json();
  return data.endpoints;
}
```

### Update Endpoint (Configure Autoscaling)

```typescript
async function updateEndpoint(
  projectId: string,
  branchId: string,
  endpointId: string,
  config: {
    minCU?: number;
    maxCU?: number;
    suspendTimeout?: number;
  }
) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/endpoints/${endpointId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: {
          autoscaling_limit_min_cu: config.minCU,
          autoscaling_limit_max_cu: config.maxCU,
          suspend_timeout_seconds: config.suspendTimeout,
        },
      }),
    }
  );

  return await response.json();
}
```

### Start/Stop Endpoint

```typescript
async function startEndpoint(
  projectId: string,
  branchId: string,
  endpointId: string
) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/endpoints/${endpointId}/start`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
      },
    }
  );

  return await response.json();
}

async function stopEndpoint(
  projectId: string,
  branchId: string,
  endpointId: string
) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branchId}/endpoints/${endpointId}/suspend`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
      },
    }
  );

  return await response.json();
}
```

## Operations

### Get Operations List

```typescript
async function listOperations(projectId: string, limit: number = 10) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/operations?limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
      },
    }
  );

  const data = await response.json();
  return data.operations;
}
```

### Get Operation Status

```typescript
async function getOperation(projectId: string, operationId: string) {
  const response = await fetch(
    `https://console.neon.tech/api/v2/projects/${projectId}/operations/${operationId}`,
    {
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
      },
    }
  );

  return await response.json();
}
```

## Error Handling

### Error Response Format

```json
{
  "message": "Error message",
  "code": "error_code"
}
```

### Common Error Codes

- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists or conflict
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Error Handling Example

```typescript
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(`https://console.neon.tech/api/v2${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${NEON_API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error (${response.status}): ${error.message}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Usage
try {
  const projects = await apiCall('/projects');
  console.log(projects);
} catch (error) {
  console.error('Failed to fetch projects:', error);
}
```

## Rate Limiting

### Rate Limit Headers

```typescript
const response = await fetch('https://console.neon.tech/api/v2/projects', {
  headers: { 'Authorization': `Bearer ${NEON_API_KEY}` },
});

console.log('Rate limit:', response.headers.get('X-RateLimit-Limit'));
console.log('Remaining:', response.headers.get('X-RateLimit-Remaining'));
console.log('Reset:', response.headers.get('X-RateLimit-Reset'));
```

### Retry Logic

```typescript
async function apiCallWithRetry<T>(
  endpoint: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`https://console.neon.tech/api/v2${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${NEON_API_KEY}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : 1000 * (i + 1);
        console.log(`Rate limited. Retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${error.message}`);
      }

      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }

  throw new Error('Max retries reached');
}
```

## SDK and Helper Libraries

### TypeScript Helper Class

```typescript
class NeonAPI {
  private apiKey: string;
  private baseUrl = 'https://console.neon.tech/api/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.message}`);
    }

    return await response.json();
  }

  async listProjects() {
    return this.request('/projects');
  }

  async createProject(name: string, region: string = 'aws-us-east-2') {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify({
        project: { name, region_id: region, pg_version: 16 },
      }),
    });
  }

  async createBranch(projectId: string, name: string) {
    return this.request(`/projects/${projectId}/branches`, {
      method: 'POST',
      body: JSON.stringify({ branch: { name } }),
    });
  }

  // Add more methods as needed
}

// Usage
const neon = new NeonAPI(process.env.NEON_API_KEY!);
const projects = await neon.listProjects();
```

## Resources

- [Official API Documentation](https://neon.com/docs/reference/api-reference)
- [Neon CLI](https://neon.com/docs/reference/neon-cli)
- [Project Management Guide](./project-management.md)
- [API Status](https://neonstatus.com)

---

**Need Help?** Join the [Neon Discord Community](https://discord.gg/92vNTzKDGp) for API support.

