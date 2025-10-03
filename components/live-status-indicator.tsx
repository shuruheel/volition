"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Activity } from "lucide-react"

export function LiveStatusIndicator() {
  const [isLive, setIsLive] = useState(true)

  useEffect(() => {
    // Simulate connection status
    const interval = setInterval(() => {
      setIsLive(Math.random() > 0.1) // 90% uptime simulation
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  return (
    <Badge
      variant="outline"
      className={
        isLive ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
      }
    >
      <Activity className="h-3 w-3 mr-1" />
      {isLive ? "Live" : "Reconnecting..."}
    </Badge>
  )
}
