"use client"

import { useEffect, useState } from "react"

interface AgentUpdate {
  type: "status_change" | "new_activity" | "metric_update"
  agentId: string
  data: any
}

export function useAgentUpdates(agentId?: string) {
  const [updates, setUpdates] = useState<AgentUpdate[]>([])

  useEffect(() => {
    // Simulate real-time updates with polling
    const interval = setInterval(() => {
      // Randomly generate updates
      if (Math.random() > 0.7) {
        const updateTypes: AgentUpdate["type"][] = ["status_change", "new_activity", "metric_update"]
        const randomType = updateTypes[Math.floor(Math.random() * updateTypes.length)]

        const newUpdate: AgentUpdate = {
          type: randomType,
          agentId: agentId || "1",
          data: {
            timestamp: new Date(),
            message: `Simulated ${randomType} update`,
          },
        }

        setUpdates((prev) => [...prev.slice(-9), newUpdate])
      }
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [agentId])

  return updates
}
