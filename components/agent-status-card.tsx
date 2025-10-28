"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

export interface AgentStatus {
  agentId: string
  status: 'idle' | 'active' | 'error'
  currentStep: number
  totalSteps: number
  currentActivity: string | null
  currentTool: string | null
  lastUpdate: string
}

interface AgentStatusCardProps {
  agentId: string
  refreshInterval?: number // ms, default 2000
}

export function AgentStatusCard({ agentId, refreshInterval = 2000 }: AgentStatusCardProps) {
  const [status, setStatus] = useState<AgentStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/agents/${agentId}/status`)
        if (response.ok) {
          const data = await response.json()
          setStatus(data)
        }
      } catch (error) {
        console.error('Failed to fetch agent status:', error)
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchStatus()

    // Poll for updates
    const interval = setInterval(fetchStatus, refreshInterval)

    return () => clearInterval(interval)
  }, [agentId, refreshInterval])

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Agent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return null
  }

  const statusConfig = {
    idle: {
      icon: CheckCircle2,
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      label: "Idle",
    },
    active: {
      icon: Loader2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      label: "Active",
      animate: true,
    },
    error: {
      icon: AlertCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      label: "Error",
    },
  }

  const config = statusConfig[status.status]
  const Icon = config.icon

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Agent Activity
          </span>
          <Badge variant="outline" className={`${config.bgColor} ${config.color} border-0`}>
            <Icon className={`h-3 w-3 mr-1 ${config.animate ? 'animate-spin' : ''}`} />
            {config.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current Activity */}
        {status.currentActivity && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Current Task</p>
            <p className="text-sm font-medium">{status.currentActivity}</p>
          </div>
        )}

        {/* Current Tool */}
        {status.currentTool && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Using Tool</p>
            <Badge variant="secondary" className="text-xs">
              {status.currentTool}
            </Badge>
          </div>
        )}

        {/* Progress */}
        {status.status === 'active' && status.totalSteps > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="text-xs font-medium">
                {status.currentStep} / {status.totalSteps}
              </p>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(status.currentStep / status.totalSteps) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Idle State */}
        {status.status === 'idle' && !status.currentActivity && (
          <p className="text-sm text-muted-foreground">
            No active tasks. Click the play button to start the agent.
          </p>
        )}

        {/* Last Update */}
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date(status.lastUpdate).toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  )
}

