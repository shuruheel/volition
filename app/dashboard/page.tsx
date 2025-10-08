"use client"

import { useEffect, useState } from "react"
import type { Agent } from "@/lib/auth"
import { CreateAgentDialog } from "@/components/create-agent-dialog"
import { UnifiedActivityCard } from "@/components/unified-activity-card"
import { ChatDrawer } from "@/components/chat-drawer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, Play, Pause, Trash2, TrendingUp, AlertCircle, CheckCircle2, DollarSign } from "lucide-react"
import { MOCK_AGENTS, getUnifiedActivities, getAgentMetrics, type UnifiedActivity } from "@/lib/mock-data"

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [activities, setActivities] = useState<UnifiedActivity[]>([])

  useEffect(() => {
    const unifiedActivities = getUnifiedActivities(selectedAgentId || undefined)
    setActivities(unifiedActivities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()))
  }, [selectedAgentId, agents])

  const calculateKeyMetrics = () => {
    const relevantAgents = selectedAgentId ? agents.filter((a) => a.id === selectedAgentId) : agents

    let totalSpend = 0
    let activeTasks = 0
    let pendingApprovals = 0
    let nodesAdded24h = 0
    let actionsCompleted24h = 0
    let totalErrors = 0

    relevantAgents.forEach((agent) => {
      const metrics = getAgentMetrics(agent.id)
      totalSpend += metrics.apiCost
      if (agent.status === "active") activeTasks++
      totalErrors += metrics.errorsEncountered

      const agentActivities = selectedAgentId ? activities : activities.filter((a) => a.agentId === agent.id)

      const last24h = Date.now() - 24 * 60 * 60 * 1000
      agentActivities.forEach((activity) => {
        if (activity.status === "pending") pendingApprovals++
        if (activity.createdAt.getTime() > last24h) {
          if (activity.status === "completed") actionsCompleted24h++
          if (activity.type === "research" && activity.data.subgraph) {
            nodesAdded24h += activity.data.subgraph.nodesAdded || 0
          }
        }
      })
    })

    const successRate =
      actionsCompleted24h + pendingApprovals > 0
        ? Math.round((actionsCompleted24h / (actionsCompleted24h + pendingApprovals + totalErrors)) * 100)
        : 100

    return {
      totalSpend,
      activeTasks,
      pendingApprovals,
      nodesAdded24h,
      actionsCompleted24h,
      successRate,
      totalErrors,
    }
  }

  const keyMetrics = calculateKeyMetrics()

  const handleCreateAgent = (name: string, prompt: string) => {
    const newAgent: Agent = {
      id: String(agents.length + 1),
      name,
      prompt,
      status: "idle",
      createdAt: new Date(),
      lastActive: new Date(),
    }
    setAgents([...agents, newAgent])
  }

  const handleToggleStatus = (agentId: string) => {
    setAgents(
      agents.map((agent) =>
        agent.id === agentId
          ? { ...agent, status: agent.status === "active" ? "paused" : "active", lastActive: new Date() }
          : agent,
      ),
    )
  }

  const handleDeleteAgent = (agentId: string) => {
    setAgents(agents.filter((agent) => agent.id !== agentId))
    if (selectedAgentId === agentId) {
      setSelectedAgentId(null)
    }
  }

  const handleApproveActivity = (activityId: string) => {
    setActivities(activities.map((a) => (a.id === activityId ? { ...a, status: "approved" as const } : a)))
  }

  const handleRejectActivity = (activityId: string) => {
    setActivities(activities.map((a) => (a.id === activityId ? { ...a, status: "rejected" as const } : a)))
  }

  const handleModifyActivity = (activityId: string, data: any) => {
    setActivities(activities.map((a) => (a.id === activityId ? { ...a, data } : a)))
  }

  const handleLogout = () => {
    window.location.reload()
  }

  const statusColors = {
    active: "bg-green-500",
    idle: "bg-gray-500",
    paused: "bg-yellow-500",
    error: "bg-red-500",
  }

  return (
    <div className="min-h-screen bg-background pb-[420px]">
      {/* Top bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">Agent Dashboard</h1>
                <p className="text-xs text-muted-foreground">AI Management & Monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CreateAgentDialog onCreateAgent={handleCreateAgent} />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Agent list */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">YOUR AGENTS</h2>
            <Button
              variant={selectedAgentId === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedAgentId(null)}
            >
              All
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {agents.map((agent) => (
              <Card
                key={agent.id}
                className={`min-w-[280px] cursor-pointer transition-all ${
                  selectedAgentId === agent.id ? "border-primary" : "border-border hover:border-primary/50"
                }`}
                onClick={() => setSelectedAgentId(agent.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">{agent.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{agent.prompt}</p>
                    </div>
                    <div className={`h-2 w-2 rounded-full ${statusColors[agent.status]} shrink-0 mt-1`} />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleStatus(agent.id)
                      }}
                    >
                      {agent.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteAgent(agent.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">KEY METRICS (LAST 24 HOURS)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Card className="border-border bg-gradient-to-br from-green-500/10 to-emerald-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <p className="text-xs font-medium text-muted-foreground">Total Spend</p>
                </div>
                <p className="text-2xl font-bold">${keyMetrics.totalSpend.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <p className="text-xs font-medium text-muted-foreground">Active Tasks</p>
                </div>
                <p className="text-2xl font-bold">{keyMetrics.activeTasks}</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-gradient-to-br from-orange-500/10 to-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <p className="text-xs font-medium text-muted-foreground">Pending Approvals</p>
                </div>
                <p className="text-2xl font-bold">{keyMetrics.pendingApprovals}</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Nodes Added</p>
                <p className="text-2xl font-bold">{keyMetrics.nodesAdded24h}</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Actions Done</p>
                <p className="text-2xl font-bold">{keyMetrics.actionsCompleted24h}</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-gradient-to-br from-green-500/10 to-teal-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <p className="text-xs font-medium text-muted-foreground">Success Rate</p>
                </div>
                <p className="text-2xl font-bold">{keyMetrics.successRate}%</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-gradient-to-br from-red-500/10 to-rose-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-xs font-medium text-muted-foreground">Errors</p>
                </div>
                <p className="text-2xl font-bold text-red-500">{keyMetrics.totalErrors}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Activity Feed</h2>
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => {
                const agent = agents.find((a) => a.id === activity.agentId)
                return (
                  <UnifiedActivityCard
                    key={activity.id}
                    activity={activity}
                    agentName={agent?.name || "Unknown Agent"}
                    onApprove={handleApproveActivity}
                    onReject={handleRejectActivity}
                    onModify={handleModifyActivity}
                  />
                )
              })}
            </div>
          ) : (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No recent activity</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Chat drawer */}
      <ChatDrawer agents={agents} />
    </div>
  )
}
