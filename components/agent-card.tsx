"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Agent } from "@/lib/auth"
import {
  Activity,
  Pause,
  Play,
  Trash2,
  Globe,
  Search,
  Network,
  Mail,
  Phone,
  Calendar,
  FileText,
  Terminal,
  Wallet,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { EditToolsDialog } from "./edit-tools-dialog"
import { useEffect, useState } from "react"

const TOOL_ICONS = {
  browser: Globe,
  search: Search,
  neo4j: Network,
  email: Mail,
  phone: Phone,
  calendar: Calendar,
  filesystem: FileText,
  terminal: Terminal,
  wallet: Wallet,
}

interface AgentCardProps {
  agent: Agent
  onSelect: (agent: Agent) => void
  onToggleStatus: (agentId: string) => void
  onDelete: (agentId: string) => void
  onUpdateTools: (agentId: string, tools: Agent["tools"]) => void
}

export function AgentCard({ agent, onSelect, onToggleStatus, onDelete, onUpdateTools }: AgentCardProps) {
  const [currentActivity, setCurrentActivity] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch(`/api/agents/${agent.id}/status`)
        if (!mounted) return
        if (res.ok) {
          const s = await res.json()
          setCurrentActivity(s?.currentActivity || null)
        }
      } catch {}
    }
    load()
    const t = setInterval(load, 2000)
    return () => { mounted = false; clearInterval(t) }
  }, [agent.id])
  const statusColors = {
    active: "bg-green-500/10 text-green-500 border-green-500/20",
    idle: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    paused: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    error: "bg-red-500/10 text-red-500 border-red-500/20",
  }

  return (
    <Card
      className="border-border hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => onSelect(agent)}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1 flex-1">
          <CardTitle className="text-base font-medium">{agent.name}</CardTitle>
          <p className="text-xs text-muted-foreground capitalize">{agent.type || "research"} Agent</p>
        </div>
        <Badge variant="outline" className={statusColors[agent.status]}>
          {agent.status}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1 mb-3">
          {agent.tools.map((tool) => {
            const Icon = TOOL_ICONS[tool]
            return (
              <Badge key={tool} variant="secondary" className="text-xs gap-1">
                <Icon className="h-3 w-3" />
                {tool}
              </Badge>
            )
          })}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3 w-3" />
            <span>{currentActivity ? currentActivity : formatDistanceToNow(agent.lastActive, { addSuffix: true })}</span>
          </div>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <EditToolsDialog
              agentName={agent.name}
              currentTools={agent.tools}
              onSave={(tools) => onUpdateTools(agent.id, tools)}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => onToggleStatus(agent.id)}
              title={agent.status === "active" ? "Pause" : "Resume"}
            >
              {agent.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={() => onDelete(agent.id)}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
