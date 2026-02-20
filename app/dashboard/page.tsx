"use client"

import { useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import type { Agent } from "@/lib/db"
import { UnifiedActivityCard } from "@/components/unified-activity-card"
import { ChatDrawer } from "@/components/chat-drawer"
import { AgentStatusCard } from "@/components/agent-status-card"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { HeartbeatIndicator } from "@/components/heartbeat-indicator"
import { Brain, Play, Pause, Settings, LogOut, Sparkles, MessageSquare } from "lucide-react"
import Link from "next/link"
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
  'user_input',
]

export default function DashboardPage() {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [chatTriggerAgentId, setChatTriggerAgentId] = useState<string | null>(null)
  const [lastPendingQuestionId, setLastPendingQuestionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch single agent
  useEffect(() => {
    fetch('/api/agent')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.id) {
          setAgent(data)
        }
        setLoading(false)
      })
      .catch((error) => {
        console.error('Failed to fetch agent:', error)
        setLoading(false)
      })
  }, [])

  // Activities: initial load + SSE updates
  useEffect(() => {
    if (!agent) return

    const params = new URLSearchParams()
    params.set('agentId', agent.id)
    params.set('types', INCLUDED_ACTIVITY_TYPES.join(','))
    params.set('limit', '50')

    let closed = false
    fetch(`/api/activities?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => { if (!closed) setActivities(data) })
      .catch((error) => console.error('Failed to fetch activities:', error))

    const esParams = new URLSearchParams()
    esParams.set('agentId', agent.id)
    esParams.set('types', INCLUDED_ACTIVITY_TYPES.join(','))
    const es = new EventSource(`/api/activities/stream?${esParams.toString()}&intervalMs=3000`)
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        const items = Array.isArray(data?.items) ? data.items : []
        if (items.length === 0) return
        setActivities((prev) => {
          const existing = new Set(prev.map((a: any) => a.id))
          const merged = [...prev]
          for (const a of items) {
            if (!existing.has(a.id)) merged.unshift(a)
          }
          return merged.slice(0, 50)
        })
      } catch {}
    }
    es.onerror = () => es.close()
    return () => { closed = true; es.close() }
  }, [agent])

  const handleToggleStatus = async () => {
    if (!agent) return

    const isEnabling = !agent.enabled
    const endpoint = isEnabling ? 'start' : 'stop'

    try {
      const response = await fetch(`/api/agents/${agent.id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update agent')
      }

      const { agent: updatedAgent } = await response.json()
      setAgent(updatedAgent)
    } catch (error) {
      console.error('Failed to toggle agent status:', error)
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

  // Auto-open chat on pending question
  useEffect(() => {
    const latestPending = activities
      .filter((a) => a.type === 'user_input' && a.status === 'pending')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    if (latestPending && latestPending.id !== lastPendingQuestionId) {
      setChatTriggerAgentId(latestPending.agent_id)
      setLastPendingQuestionId(latestPending.id)
    }
  }, [activities, lastPendingQuestionId])

  const getStatusDisplay = (a: Agent) => {
    if (a.status === 'error') return { color: 'bg-red-500', label: 'Error', pulse: false }
    if (!a.enabled) return { color: 'bg-gray-500', label: 'Disabled', pulse: false }
    if (a.status === 'active') return { color: 'bg-green-500', label: 'Running...', pulse: true }
    return { color: 'bg-blue-500', label: 'Listening...', pulse: false }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const status = agent ? getStatusDisplay(agent) : null

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
                <h1 className="font-semibold text-lg">{agent?.name || 'Volition'}</h1>
                {agent && status && (
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${status.color} ${status.pulse ? 'animate-pulse' : ''}`} />
                    <span className="text-xs text-muted-foreground">{status.label}</span>
                    {agent && <HeartbeatIndicator agentId={agent.id} />}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {agent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleStatus}
                >
                  {agent.enabled ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                  <span className="text-xs">{agent.enabled ? 'Disable' : 'Enable'}</span>
                </Button>
              )}
              <Link href="/skills">
                <Button variant="outline" size="sm" className="gap-1">
                  <Sparkles className="h-4 w-4" />
                  Skills
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" size="sm" className="gap-1">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Agent status card */}
        {agent && (
          <div className="mb-6">
            <AgentStatusCard agentId={agent.id} />
          </div>
        )}

        {/* Quick config: enabled skills */}
        {agent && Array.isArray(agent.skills) && agent.skills.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Active skills:</span>
              {agent.skills.map((s: string) => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Activity feed */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Activity Feed</h2>
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => (
                <UnifiedActivityCard
                  key={activity.id}
                  activity={activity}
                  agentName={agent?.name || "Assistant"}
                  onApprove={handleApproveActivity}
                  onReject={handleRejectActivity}
                  onModify={handleModifyActivity}
                />
              ))}
            </div>
          ) : (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {agent ? 'No recent activity. Enable your agent to get started.' : 'Loading...'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Chat drawer */}
      {agent && (
        <ChatDrawer agents={[agent]} triggerAgentId={chatTriggerAgentId} />
      )}
    </div>
  )
}
