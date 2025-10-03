"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TOOL_CATEGORIES, PERMISSION_TEMPLATES, type AgentTool, type ToolPermissionTemplate } from "@/lib/auth"
import { Globe, Search, Network, Mail, Phone, Calendar, FileText, Terminal, Wallet, AlertTriangle } from "lucide-react"

const ICON_MAP = {
  Globe,
  Search,
  Network,
  Mail,
  Phone,
  Calendar,
  FileText,
  Terminal,
  Wallet,
}

interface ToolPermissionsSelectorProps {
  selectedTools: AgentTool[]
  onToolsChange: (tools: AgentTool[]) => void
}

export function ToolPermissionsSelector({ selectedTools, onToolsChange }: ToolPermissionsSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("research")

  const handleTemplateSelect = (template: ToolPermissionTemplate) => {
    setSelectedTemplate(template.id)
    if (template.id !== "custom") {
      onToolsChange(template.tools)
    }
  }

  const handleToolToggle = (toolId: AgentTool) => {
    setSelectedTemplate("custom")
    if (selectedTools.includes(toolId)) {
      onToolsChange(selectedTools.filter((t) => t !== toolId))
    } else {
      onToolsChange([...selectedTools, toolId])
    }
  }

  const hasSensitiveTools = TOOL_CATEGORIES.some((category) =>
    category.tools.some((tool) => tool.sensitive && selectedTools.includes(tool.id)),
  )

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Permission Templates</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {PERMISSION_TEMPLATES.map((template) => (
            <Button
              key={template.id}
              variant={selectedTemplate === template.id ? "default" : "outline"}
              className="h-auto flex-col items-start p-3 text-left"
              onClick={() => handleTemplateSelect(template)}
            >
              <span className="font-medium text-sm">{template.name}</span>
              <span className="text-xs text-muted-foreground font-normal mt-1">{template.description}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Tool Access</Label>
        {TOOL_CATEGORIES.map((category) => (
          <div key={category.name} className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground">{category.name}</h4>
            <div className="space-y-2 pl-2 border-l-2 border-border">
              {category.tools.map((tool) => {
                const Icon = ICON_MAP[tool.icon as keyof typeof ICON_MAP]
                const isEnabled = selectedTools.includes(tool.id)

                return (
                  <div key={tool.id} className="flex items-start justify-between gap-3 py-2">
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
                    <Switch checked={isEnabled} onCheckedChange={() => handleToolToggle(tool.id)} />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {hasSensitiveTools && (
        <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-orange-500">
            <span className="font-medium">Sensitive tools enabled.</span> This agent will have access to tools that can
            send emails, make calls, or execute system commands. All actions will require your approval.
          </div>
        </div>
      )}
    </div>
  )
}
