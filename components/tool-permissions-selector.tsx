"use client"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Globe, Search, Network, Mail, Phone, Calendar, FileText, Terminal, Brain, Send } from "lucide-react"

const ICON_MAP = {
  Globe,
  Search,
  Network,
  Mail,
  Phone,
  Calendar,
  FileText,
  Terminal,
  Brain,
  Send,
}

// Available tools for agents
const AVAILABLE_TOOLS = [
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT-5.2 model for text generation and reasoning',
    icon: 'Terminal',
    category: 'AI Models',
    sensitive: false,
  },
  {
    id: 'firecrawl',
    label: 'Firecrawl Research',
    description: 'Search and scrape the web via Firecrawl (preferred for research)',
    icon: 'Search',
    category: 'Research',
    sensitive: false,
  },
  {
    id: 'supermemory',
    label: 'Supermemory',
    description: 'Long-term memory and knowledge graph storage',
    icon: 'Brain',
    category: 'Memory',
    sensitive: false,
  },
  {
    id: 'browser',
    label: 'Browser Use',
    description: 'Web automation, scraping, and browser tasks',
    icon: 'Globe',
    category: 'Automation',
    sensitive: false,
  },
  {
    id: 'twilio',
    label: 'Twilio Voice',
    description: 'Make outbound phone calls with AI',
    icon: 'Phone',
    category: 'Communication',
    sensitive: true,
  },
  {
    id: 'google',
    label: 'Google (Gmail + Calendar)',
    description: 'Send/search emails and manage calendar events. Requires HITL approval for sends and event creation.',
    icon: 'Mail',
    category: 'Communication',
    sensitive: true,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    description: 'Send and receive messages via Telegram bot',
    icon: 'Send',
    category: 'Communication',
    sensitive: false,
  },
]

// Group tools by category
const TOOL_CATEGORIES = Array.from(
  new Set(AVAILABLE_TOOLS.map((tool) => tool.category))
).map((category) => ({
  name: category,
  tools: AVAILABLE_TOOLS.filter((tool) => tool.category === category),
}))

interface ToolPermissionsSelectorProps {
  selectedTools: string[]
  onToolsChange: (tools: string[]) => void
}

export function ToolPermissionsSelector({ selectedTools, onToolsChange }: ToolPermissionsSelectorProps) {
  const handleToolToggle = (toolId: string) => {
    if (selectedTools.includes(toolId)) {
      onToolsChange(selectedTools.filter((t) => t !== toolId))
    } else {
      onToolsChange([...selectedTools, toolId])
    }
  }

  const hasSensitiveTools = AVAILABLE_TOOLS.some(
    (tool) => tool.sensitive && selectedTools.includes(tool.id)
  )

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Tool Permissions</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Select which tools this agent can access. Sensitive tools require extra care.
        </p>
      </div>

      <div className="space-y-4">
        {TOOL_CATEGORIES.map((category) => (
          <div key={category.name} className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {category.name}
            </h4>
            <div className="space-y-2 pl-2 border-l-2 border-border">
              {category.tools.map((tool) => {
                const Icon = ICON_MAP[tool.icon as keyof typeof ICON_MAP]
                const isEnabled = selectedTools.includes(tool.id)
                const isDisabled = tool.disabled || false

                return (
                  <div
                    key={tool.id}
                    className={`flex items-start justify-between gap-3 py-2 ${
                      isDisabled ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2 flex-1">
                      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{tool.label}</span>
                          {tool.sensitive && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-orange-500/10 text-orange-500 border-orange-500/20"
                            >
                              Sensitive
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{tool.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => handleToolToggle(tool.id)}
                      disabled={isDisabled}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {hasSensitiveTools && (
        <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
          <p className="text-xs text-orange-600 dark:text-orange-400">
            ⚠️ This agent has access to sensitive tools. Ensure your system prompt includes appropriate safety
            guidelines and human-in-the-loop requirements.
          </p>
        </div>
      )}
    </div>
  )
}
