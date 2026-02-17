"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, Mail, Brain, Clock } from "lucide-react"

interface AgentStats {
  totalRuns: number
  emailsSent: number
  memoriesStored: number
  avgStepsPerRun: number
}

interface AgentAnalyticsProps {
  agentId: string
}

export function AgentAnalytics({ agentId }: AgentAnalyticsProps) {
  const [stats, setStats] = useState<AgentStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/agents/${agentId}/analytics`)
      .then(r => r.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [agentId])

  if (loading || !stats) return null

  const items = [
    { label: 'Total Runs', value: stats.totalRuns, icon: Zap, color: 'text-yellow-600' },
    { label: 'Emails Sent', value: stats.emailsSent, icon: Mail, color: 'text-blue-600' },
    { label: 'Memories', value: stats.memoriesStored, icon: Brain, color: 'text-purple-600' },
    { label: 'Avg Steps/Run', value: stats.avgStepsPerRun.toFixed(1), icon: Clock, color: 'text-green-600' },
  ]

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">AGENT ANALYTICS</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {items.map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <div>
                <p className="text-lg font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
