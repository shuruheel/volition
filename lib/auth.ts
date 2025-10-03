// Mock authentication utilities
export interface User {
  id: string
  email: string
  name: string
}

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
      {
        id: "browser",
        label: "Browser Use",
        description: "Browse websites and scrape content",
        icon: "Globe",
        sensitive: false,
      },
      {
        id: "search",
        label: "Web Search",
        description: "Search the web for information",
        icon: "Search",
        sensitive: false,
      },
      {
        id: "neo4j",
        label: "Knowledge Graph",
        description: "Read and write to Neo4j knowledge graph",
        icon: "Network",
        sensitive: false,
      },
    ],
  },
  {
    name: "Communication",
    tools: [
      {
        id: "email",
        label: "Email",
        description: "Send and read emails",
        icon: "Mail",
        sensitive: true,
      },
      {
        id: "phone",
        label: "Phone",
        description: "Make phone calls",
        icon: "Phone",
        sensitive: true,
      },
      {
        id: "calendar",
        label: "Calendar",
        description: "View and modify calendar events",
        icon: "Calendar",
        sensitive: true,
      },
    ],
  },
  {
    name: "System",
    tools: [
      {
        id: "filesystem",
        label: "File System",
        description: "Read and write files",
        icon: "FileText",
        sensitive: true,
      },
      {
        id: "terminal",
        label: "Terminal",
        description: "Execute system commands",
        icon: "Terminal",
        sensitive: true,
      },
    ],
  },
  {
    name: "Financial",
    tools: [
      {
        id: "wallet",
        label: "Wallet",
        description: "Make financial transactions",
        icon: "Wallet",
        sensitive: true,
      },
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
  {
    id: "research",
    name: "Research Only",
    description: "Safe for research tasks without system or communication access",
    tools: ["browser", "search", "neo4j"],
  },
  {
    id: "communication",
    name: "Communication",
    description: "Email, phone, and calendar access for outreach tasks",
    tools: ["browser", "search", "neo4j", "email", "phone", "calendar"],
  },
  {
    id: "full",
    name: "Full Access",
    description: "All tools enabled - use with caution",
    tools: ["browser", "search", "email", "phone", "calendar", "filesystem", "terminal", "wallet", "neo4j"],
  },
  {
    id: "custom",
    name: "Custom",
    description: "Select specific tools manually",
    tools: [],
  },
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

// Mock user storage
const MOCK_USERS: User[] = [{ id: "1", email: "demo@example.com", name: "Demo User" }]

export function login(email: string, password: string): User | null {
  // Mock authentication - in production, this would validate against a real backend
  const user = MOCK_USERS.find((u) => u.email === email)
  if (user && password === "demo") {
    return user
  }
  return null
}

export function signup(email: string, password: string, name: string): User {
  // Mock signup - in production, this would create a real user
  const newUser: User = {
    id: String(MOCK_USERS.length + 1),
    email,
    name,
  }
  MOCK_USERS.push(newUser)
  return newUser
}

export function getCurrentUser(): User | null {
  // Mock - in production, this would check session/token
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("user")
    return userStr ? JSON.parse(userStr) : null
  }
  return null
}

export function setCurrentUser(user: User | null) {
  if (typeof window !== "undefined") {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user))
    } else {
      localStorage.removeItem("user")
    }
  }
}

export function logout() {
  setCurrentUser(null)
}
