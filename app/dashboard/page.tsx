"use client"

import { useEffect, useState } from "react"
import type { Agent } from "@/lib/db"
import { CreateAgentDialog } from "@/components/create-agent-dialog"
import { UnifiedActivityCard } from "@/components/unified-activity-card"
import { ChatDrawer } from "@/components/chat-drawer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, Play, Pause, Trash2, TrendingUp, AlertCircle, DollarSign, Zap, Mail, Phone } from "lucide-react"
import type { Activity } from "@/lib/db"

// Activity types to display in feed (excluding high-frequency noise)
const INCLUDED_ACTIVITY_TYPES = [
  'research',
  'email_sent',
  'phone_call',
  'post_call_summary',
  'calendar_event_added',
  'calendar_event_modified',
  'webpage_viewed',
  'journal_read',
]

interface KeyMetrics {
  totalSpend: number
  activeTasks: number
  pendingApprovals: number
  memoriesAdded: number
  actionsDone: number
  emailsSent: number
  callsMade: number
}

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [metrics, setMetrics] = useState<KeyMetrics>({
    totalSpend: 0,
    activeTasks: 0,
    pendingApprovals: 0,
    memoriesAdded: 0,
    actionsDone: 0,
    emailsSent: 0,
    callsMade: 0,
  })
  const [loading, setLoading] = useState(true)

  // Fetch agents
  useEffect(() => {
    fetch('/api/agents')
      .then((res) => res.json())
      .then((data) => setAgents(data))
      .catch((error) => console.error('Failed to fetch agents:', error))
  }, [])

  // Fetch activities with filtering
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedAgentId) {
      params.set('agentId', selectedAgentId)
    }
    params.set('types', INCLUDED_ACTIVITY_TYPES.join(','))
    params.set('limit', '50')

    fetch(`/api/activities?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setActivities(data))
      .catch((error) => console.error('Failed to fetch activities:', error))
  }, [selectedAgentId])

  // Fetch metrics
  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedAgentId) {
      params.set('agentId', selectedAgentId)
    }

    setLoading(true)
    fetch(`/api/metrics/key?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setMetrics(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Failed to fetch metrics:', error)
        setLoading(false)
      })
  }, [selectedAgentId])

  const handleCreateAgent = async (name: string, prompt: string, tools: string[]) => {
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, prompt, tools }),
      })
      
      if (!response.ok) throw new Error('Failed to create agent')
      
      const newAgent = await response.json()
      setAgents([...agents, newAgent])
    } catch (error) {
      console.error('Failed to create agent:', error)
    }
  }

  const handleToggleStatus = async (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId)
    if (!agent) return
    
    const newStatus = agent.status === 'active' ? 'idle' : 'active'
    
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (!response.ok) throw new Error('Failed to update agent')
      
      const updatedAgent = await response.json()
      setAgents(agents.map((a) => (a.id === agentId ? updatedAgent : a)))
    } catch (error) {
      console.error('Failed to toggle agent status:', error)
    }
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return
    
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) throw new Error('Failed to delete agent')
      
      setAgents(agents.filter((agent) => agent.id !== agentId))
      if (selectedAgentId === agentId) {
        setSelectedAgentId(null)
      }
    } catch (error) {
      console.error('Failed to delete agent:', error)
    }
  }

  const handleApproveActivity = async (activityId: string) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/approve`, {
        method: 'POST',
      })
      
      if (!response.ok) throw new Error('Failed to approve activity')
      
      const updatedActivity = await response.json()
      setActivities(activities.map((a) => (a.id === activityId ? updatedActivity : a)))
    } catch (error) {
      console.error('Failed to approve activity:', error)
    }
  }

  const handleRejectActivity = async (activityId: string) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/reject`, {
        method: 'POST',
      })
      
      if (!response.ok) throw new Error('Failed to reject activity')
      
      const updatedActivity = await response.json()
      setActivities(activities.map((a) => (a.id === activityId ? updatedActivity : a)))
    } catch (error) {
      console.error('Failed to reject activity:', error)
    }
  }

  const handleModifyActivity = async (activityId: string, payload: any) => {
    try {
      const response = await fetch(`/api/activities/${activityId}/modify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      })
      
      if (!response.ok) throw new Error('Failed to modify activity')
      
      const updatedActivity = await response.json()
      setActivities(activities.map((a) => (a.id === activityId ? updatedActivity : a)))
    } catch (error) {
      console.error('Failed to modify activity:', error)
    }
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
                <p className="text-2xl font-bold">{loading ? '...' : `$${metrics.totalSpend.toFixed(2)}`}</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <p className="text-xs font-medium text-muted-foreground">Active Tasks</p>
                </div>
                <p className="text-2xl font-bold">{loading ? '...' : metrics.activeTasks}</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-gradient-to-br from-orange-500/10 to-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <p className="text-xs font-medium text-muted-foreground">Pending Approvals</p>
                </div>
                <p className="text-2xl font-bold">{loading ? '...' : metrics.pendingApprovals}</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-4 w-4 text-purple-600" />
                  <p className="text-xs font-medium text-muted-foreground">Memories Added</p>
                </div>
                <p className="text-2xl font-bold">{loading ? '...' : metrics.memoriesAdded}</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  <p className="text-xs font-medium text-muted-foreground">Actions Done</p>
                </div>
                <p className="text-2xl font-bold">{loading ? '...' : metrics.actionsDone}</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-gradient-to-br from-blue-500/10 to-cyan-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <p className="text-xs font-medium text-muted-foreground">Emails Sent</p>
                </div>
                <p className="text-2xl font-bold">{loading ? '...' : metrics.emailsSent}</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-gradient-to-br from-purple-500/10 to-pink-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Phone className="h-4 w-4 text-purple-600" />
                  <p className="text-xs font-medium text-muted-foreground">Calls Made</p>
                </div>
                <p className="text-2xl font-bold">{loading ? '...' : metrics.callsMade}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Activity Feed</h2>
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => {
                const agent = agents.find((a) => a.id === activity.agent_id)
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
                <p className="text-muted-foreground">
                  {loading ? 'Loading activities...' : 'No recent activity'}
                </p>
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
