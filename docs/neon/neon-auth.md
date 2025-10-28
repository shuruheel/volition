# Neon Auth

Neon Auth provides built-in authentication for your applications, integrated directly with your Neon Postgres database. It's based on Clerk and offers a seamless authentication experience.

## Overview

Neon Auth combines:
- **Clerk Authentication**: Industry-leading auth platform
- **Postgres Integration**: User data stored in your Neon database
- **Row-Level Security**: Built-in RLS policies for multi-tenant apps
- **Automatic Sync**: User data automatically synced to your database

## Quick Start

### 1. Install Dependencies

```bash
npm install @clerk/nextjs @neondatabase/serverless
```

### 2. Set Up Clerk

1. Create a Clerk account at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy your API keys

### 3. Configure Environment Variables

```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Neon Database
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
```

### 4. Set Up Neon Auth in Next.js

```typescript
// middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
```

```typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

### 5. Create Database Schema

```sql
-- Users table (synced from Clerk)
CREATE TABLE users (
  id TEXT PRIMARY KEY, -- Clerk user ID
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Example: User data table with RLS
CREATE TABLE user_data (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data
CREATE POLICY user_data_policy ON user_data
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', TRUE)::TEXT);
```

## Syncing Users to Database

### Set Up Clerk Webhook

1. Go to Clerk Dashboard → Webhooks
2. Add endpoint: `https://your-app.com/api/webhooks/clerk`
3. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy the signing secret

```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Missing CLERK_WEBHOOK_SECRET');
  }

  // Get headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', { status: 400 });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as any;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error: Verification failed', { status: 400 });
  }

  // Handle the event
  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    await sql`
      INSERT INTO users (id, email, first_name, last_name, image_url)
      VALUES (
        ${id},
        ${email_addresses[0]?.email_address},
        ${first_name},
        ${last_name},
        ${image_url}
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        image_url = EXCLUDED.image_url,
        updated_at = CURRENT_TIMESTAMP
    `;
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;
    await sql`DELETE FROM users WHERE id = ${id}`;
  }

  return new Response('Success', { status: 200 });
}
```

## Protecting Routes

### Server Components

```typescript
// app/dashboard/page.tsx
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <div>
      <h1>Welcome, {user.firstName}!</h1>
      <p>Email: {user.emailAddresses[0].emailAddress}</p>
    </div>
  );
}
```

### Client Components

```typescript
// app/profile/page.tsx
'use client';

import { useUser } from '@clerk/nextjs';

export default function ProfilePage() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!isSignedIn) {
    return <div>Please sign in</div>;
  }

  return (
    <div>
      <h1>Profile</h1>
      <p>Name: {user.firstName} {user.lastName}</p>
      <p>Email: {user.emailAddresses[0].emailAddress}</p>
    </div>
  );
}
```

### API Routes

```typescript
// app/api/user-data/route.ts
import { auth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await sql`
    SELECT * FROM user_data
    WHERE user_id = ${userId}
  `;

  return Response.json(data);
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const result = await sql`
    INSERT INTO user_data (user_id, data)
    VALUES (${userId}, ${JSON.stringify(body)})
    RETURNING *
  `;

  return Response.json(result[0]);
}
```

## Row-Level Security (RLS)

Implement multi-tenant isolation with Postgres RLS.

### Set Up RLS Policies

```sql
-- Enable RLS on tables
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY user_isolation_policy ON user_data
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', TRUE)::TEXT);

CREATE POLICY document_isolation_policy ON documents
  FOR ALL
  USING (owner_id = current_setting('app.current_user_id', TRUE)::TEXT);

-- Policy for shared data
CREATE POLICY shared_documents_policy ON documents
  FOR SELECT
  USING (
    owner_id = current_setting('app.current_user_id', TRUE)::TEXT
    OR shared_with @> ARRAY[current_setting('app.current_user_id', TRUE)::TEXT]
  );
```

### Execute Queries with RLS

```typescript
import { auth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';

async function queryWithRLS<T>(
  query: string,
  params: any[] = []
): Promise<T[]> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  const sql = neon(process.env.DATABASE_URL!);

  // Set the user context
  await sql`SELECT set_config('app.current_user_id', ${userId}, TRUE)`;

  // Execute the query
  const result = await sql(query, params);

  return result as T[];
}

// Usage
const userDocs = await queryWithRLS(
  'SELECT * FROM documents ORDER BY created_at DESC'
);
```

## Authentication UI Components

### Sign In/Sign Up Pages

```typescript
// app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn />
    </div>
  );
}
```

```typescript
// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignUp />
    </div>
  );
}
```

### User Button

```typescript
// components/user-button.tsx
'use client';

import { UserButton } from '@clerk/nextjs';

export function UserNav() {
  return (
    <div className="flex items-center gap-4">
      <UserButton afterSignOutUrl="/" />
    </div>
  );
}
```

### Protected Layout

```typescript
// app/(protected)/layout.tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return <>{children}</>;
}
```

## User Metadata

### Store Additional User Data

```typescript
import { clerkClient } from '@clerk/nextjs/server';

// Update user metadata
await clerkClient.users.updateUser(userId, {
  publicMetadata: {
    role: 'admin',
    onboarded: true,
  },
  privateMetadata: {
    stripeCustomerId: 'cus_123',
  },
});

// Read user metadata
const user = await clerkClient.users.getUser(userId);
console.log(user.publicMetadata);
```

### Sync Metadata to Database

```sql
-- Add metadata columns
ALTER TABLE users ADD COLUMN metadata JSONB DEFAULT '{}'::JSONB;
```

```typescript
// Update webhook handler to sync metadata
if (eventType === 'user.updated') {
  const { id, public_metadata, private_metadata } = evt.data;

  await sql`
    UPDATE users
    SET metadata = ${JSON.stringify({ public_metadata, private_metadata })}
    WHERE id = ${id}
  `;
}
```

## Role-Based Access Control (RBAC)

```typescript
// lib/rbac.ts
import { auth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function hasRole(role: string): Promise<boolean> {
  const { userId } = await auth();

  if (!userId) return false;

  const user = await sql`
    SELECT metadata->>'public_metadata'->>'role' as role
    FROM users
    WHERE id = ${userId}
  `;

  return user[0]?.role === role;
}

export async function requireRole(role: string) {
  const hasRequiredRole = await hasRole(role);

  if (!hasRequiredRole) {
    throw new Error('Unauthorized: Insufficient permissions');
  }
}

// Usage
export async function GET() {
  await requireRole('admin');
  // Admin-only logic
}
```

## Session Management

```typescript
// lib/session.ts
import { auth, currentUser } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function getSession() {
  const { userId, sessionId } = await auth();
  const user = await currentUser();

  return {
    userId,
    sessionId,
    user,
  };
}

export async function trackSession() {
  const { userId, sessionId } = await auth();

  if (!userId) return;

  await sql`
    INSERT INTO sessions (id, user_id, created_at)
    VALUES (${sessionId}, ${userId}, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET
      last_active = CURRENT_TIMESTAMP
  `;
}
```

## Best Practices

1. **Always Validate User**: Check `userId` in API routes
   ```typescript
   const { userId } = await auth();
   if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
   ```

2. **Use RLS for Data Isolation**: Let Postgres enforce access control
   ```sql
   ALTER TABLE data ENABLE ROW LEVEL SECURITY;
   ```

3. **Sync Users to Database**: Keep local user data in sync
   ```typescript
   // Use webhooks to sync user data
   ```

4. **Store Sensitive Data Securely**: Use Clerk's privateMetadata
   ```typescript
   privateMetadata: { stripeCustomerId: '...' }
   ```

5. **Implement RBAC**: Use roles for permission management
   ```typescript
   await requireRole('admin');
   ```

## Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Neon Auth Guide](https://neon.com/docs/guides/neon-auth)
- [Postgres RLS](https://neon.com/docs/guides/neon-authorize)
- [Next.js Authentication](https://nextjs.org/docs/authentication)

---

**Need Help?** Join the [Neon Discord Community](https://discord.gg/92vNTzKDGp) for authentication support.

