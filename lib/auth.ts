/**
 * Full NextAuth config with database callbacks.
 * NOT edge-safe — used only in API routes and server components.
 * For middleware, see auth.config.ts.
 */
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { sql } from '@/lib/db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user, account }) {
      if (!account || !user.email) return false;

      try {
        // Upsert user in database
        await sql`
          INSERT INTO users (email, name, google_id, avatar_url)
          VALUES (${user.email}, ${user.name || ''}, ${account.providerAccountId}, ${user.image || null})
          ON CONFLICT (email)
          DO UPDATE SET
            name = COALESCE(NULLIF(${user.name || ''}, ''), users.name),
            google_id = ${account.providerAccountId},
            avatar_url = COALESCE(${user.image || null}, users.avatar_url)
        `;

        // Store Google OAuth tokens for Gmail/Calendar/Drive access
        if (account.access_token) {
          const { encrypt } = await import('@/lib/crypto');
          const tokens = {
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
            scope: account.scope,
            token_type: account.token_type,
          };
          const encrypted = encrypt(JSON.stringify(tokens));

          // Get the user's DB ID
          const rows = await sql`SELECT id FROM users WHERE email = ${user.email}`;
          const userId = rows[0]?.id;
          if (userId) {
            await sql`
              INSERT INTO tool_configs (user_id, tool, data_encrypted)
              VALUES (${userId}, 'google_oauth', ${encrypted})
              ON CONFLICT (user_id, tool)
              DO UPDATE SET data_encrypted = ${encrypted}, updated_at = NOW()
            `;
          }
        }
      } catch (error) {
        console.error('[auth] Failed to upsert user:', error);
        if (process.env.NODE_ENV === 'production') return false;
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user?.email) {
        try {
          const rows = await sql`SELECT id FROM users WHERE email = ${user.email}`;
          if (rows[0]) {
            token.userId = rows[0].id;
          }
        } catch {
          // Fallback
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});

/**
 * Get the current user's database ID from a request context.
 * Returns null if not authenticated.
 */
export async function getUserId(): Promise<string | null> {
  const session = await auth();
  return (session?.user?.id as string) || null;
}

/**
 * Require authentication. Throws if not authenticated.
 */
export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  if (!userId) {
    throw new Error('Authentication required');
  }
  return userId;
}

// ── Legacy type exports (used by components) ──

export type AgentTool =
  | "browser"
  | "search"
  | "email"
  | "phone"
  | "calendar"
  | "filesystem"
  | "terminal"
  | "wallet"
  | "neo4j"

export interface ToolCategory {
  name: string
  tools: {
    id: AgentTool
    label: string
    description: string
    icon: string
    sensitive: boolean
  }[]
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    name: "Research",
    tools: [
      { id: "browser", label: "Browser Use", description: "Browse websites and scrape content", icon: "Globe", sensitive: false },
      { id: "search", label: "Web Search", description: "Search the web for information", icon: "Search", sensitive: false },
      { id: "neo4j", label: "Knowledge Graph", description: "Read and write to Neo4j knowledge graph", icon: "Network", sensitive: false },
    ],
  },
  {
    name: "Communication",
    tools: [
      { id: "email", label: "Email", description: "Send and read emails", icon: "Mail", sensitive: true },
      { id: "phone", label: "Phone", description: "Make phone calls", icon: "Phone", sensitive: true },
      { id: "calendar", label: "Calendar", description: "View and modify calendar events", icon: "Calendar", sensitive: true },
    ],
  },
  {
    name: "System",
    tools: [
      { id: "filesystem", label: "File System", description: "Read and write files", icon: "FileText", sensitive: true },
      { id: "terminal", label: "Terminal", description: "Execute system commands", icon: "Terminal", sensitive: true },
    ],
  },
  {
    name: "Financial",
    tools: [
      { id: "wallet", label: "Wallet", description: "Make financial transactions", icon: "Wallet", sensitive: true },
    ],
  },
]

export interface ToolPermissionTemplate {
  id: string
  name: string
  description: string
  tools: AgentTool[]
}

export const PERMISSION_TEMPLATES: ToolPermissionTemplate[] = [
  { id: "research", name: "Research Only", description: "Safe for research tasks", tools: ["browser", "search", "neo4j"] },
  { id: "communication", name: "Communication", description: "Email, phone, and calendar access", tools: ["browser", "search", "neo4j", "email", "phone", "calendar"] },
  { id: "full", name: "Full Access", description: "All tools enabled", tools: ["browser", "search", "email", "phone", "calendar", "filesystem", "terminal", "wallet", "neo4j"] },
  { id: "custom", name: "Custom", description: "Select specific tools manually", tools: [] },
]

export interface Agent {
  id: string
  name: string
  prompt: string
  type?: string
  status: "active" | "idle" | "paused" | "error"
  createdAt: Date
  lastActive: Date
  tools: AgentTool[]
}

// Legacy stubs (no longer used for real auth)
export function getCurrentUser() { return null; }
export function setCurrentUser(_user: any) {}
export function login(_email: string, _password: string) { return null; }
export function signup(_email: string, _password: string, _name: string) { return null as any; }
export function logout() {}
