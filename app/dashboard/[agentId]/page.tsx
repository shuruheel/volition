"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import type { Agent } from "@/lib/auth"
import { Sidebar } from "@/components/sidebar"
import { MetricCard } from "@/components/metric-card"
import { ActivityFeed } from "@/components/activity-feed"
import { MetricsChart } from "@/components/metrics-chart"
import { MOCK_AGENTS, getAgentMetrics, getAgentActivities } from "@/lib/mock-data"
import { Globe, FileText, Brain, Mail, MailOpen, Users, CheckCircle, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { LiveStatusIndicator } from "@/components/live-status-indicator"
import { NotificationToast } from "@/components/notification-toast"
import { Toaster } from "@/components/ui/toaster"

export default function AgentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const agentId = params.agentId as string

  const [agent, setAgent] = useState<Agent | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      router.push("/login")
      return
    }

    const foundAgent = MOCK_AGENTS.find((a) => a.id === agentId)
    if (foundAgent) {
      setAgent(foundAgent)
    } else {
      router.push("/dashboard")
    }
  }, [router, agentId])

  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date())
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  if (!agent) {
    return null
  }

  const metrics = getAgentMetrics(agentId)
  const activities = getAgentActivities(agentId)

  const statusColors = {
    active: "bg-green-500/10 text-green-500 border-green-500/20",
    idle: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    paused: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    error: "bg-red-500/10 text-red-500 border-red-500/20",
  }

  const chartData = [
    { name: "Websites", value: metrics.websitesVisited },
    { name: "Papers", value: metrics.papersProcessed },
    { name: "Reasoning", value: metrics.reasoningChains },
    { name: "Emails Sent", value: metrics.emailsSent },
    { name: "Emails Read", value: metrics.emailsRead },
    { name: "Contacts", value: metrics.humansContacted },
  ]

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Button variant="ghost" className="mb-4 gap-2" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </Button>

          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-semibold text-foreground">{agent.name}</h1>
                <Badge variant="outline" className={statusColors[agent.status]}>
                  {agent.status}
                </Badge>
                <LiveStatusIndicator />
              </div>
              <p className="text-muted-foreground capitalize">{agent.type} Agent</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              title="Websites Visited"
              value={metrics.websitesVisited}
              icon={Globe}
              description="Last 24 hours"
            />
            <MetricCard
              title="Papers Processed"
              value={metrics.papersProcessed}
              icon={FileText}
              description="Last 24 hours"
            />
            <MetricCard
              title="Reasoning Chains"
              value={metrics.reasoningChains}
              icon={Brain}
              description="Added to graph"
            />
            <MetricCard
              title="Tasks Completed"
              value={metrics.tasksCompleted}
              icon={CheckCircle}
              description="Last 24 hours"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard title="Emails Sent" value={metrics.emailsSent} icon={Mail} description="Last 24 hours" />
            <MetricCard title="Emails Read" value={metrics.emailsRead} icon={MailOpen} description="Last 24 hours" />
            <MetricCard
              title="Humans Contacted"
              value={metrics.humansContacted}
              icon={Users}
              description="Last 24 hours"
            />
            <MetricCard
              title="Active Time"
              value={`${Math.floor(metrics.activeTime / 60)}h ${metrics.activeTime % 60}m`}
              icon={Clock}
              description="Last 24 hours"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <MetricsChart data={chartData} title="Activity Overview" />
            <ActivityFeed activities={activities} />
          </div>
        </div>
      </main>
      <NotificationToast agentId={agentId} />
      <Toaster />
    </div>
  )
}
