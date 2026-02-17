"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Clock, Zap } from "lucide-react"

interface HeartbeatIndicatorProps {
  agentId: string
}

interface Schedule {
  enabled: boolean
  interval_minutes: number
  next_run_at: string | null
  last_run_at: string | null
}

export function HeartbeatIndicator({ agentId }: HeartbeatIndicatorProps) {
  const [schedule, setSchedule] = useState<Schedule | null>(null)

  useEffect(() => {
    fetch(`/api/agents/${agentId}/schedule`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.enabled) setSchedule(data)
      })
      .catch(() => {})
  }, [agentId])

  if (!schedule) return null

  const nextRun = schedule.next_run_at ? new Date(schedule.next_run_at) : null
  const now = new Date()
  const minutesUntil = nextRun ? Math.max(0, Math.round((nextRun.getTime() - now.getTime()) / 60000)) : null

  return (
    <Badge variant="outline" className="gap-1 text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
      <Zap className="h-3 w-3" />
      {minutesUntil !== null ? (
        minutesUntil === 0 ? "Running soon" : `Next in ${minutesUntil}m`
      ) : (
        `Every ${schedule.interval_minutes}m`
      )}
    </Badge>
  )
}
