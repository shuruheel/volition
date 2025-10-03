"use client"

import { useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { useAgentUpdates } from "@/hooks/use-agent-updates"

interface NotificationToastProps {
  agentId?: string
}

export function NotificationToast({ agentId }: NotificationToastProps) {
  const { toast } = useToast()
  const updates = useAgentUpdates(agentId)

  useEffect(() => {
    if (updates.length > 0) {
      const latestUpdate = updates[updates.length - 1]

      const titles = {
        status_change: "Agent Status Changed",
        new_activity: "New Activity",
        metric_update: "Metrics Updated",
      }

      const descriptions = {
        status_change: "Agent status has been updated",
        new_activity: "Agent completed a new task",
        metric_update: "Agent metrics have been refreshed",
      }

      toast({
        title: titles[latestUpdate.type],
        description: descriptions[latestUpdate.type],
      })
    }
  }, [updates, toast])

  return null
}
