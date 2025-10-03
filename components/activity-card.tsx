"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { RecentActivity } from "@/lib/mock-data"
import { ResearchActivityCard } from "./research-activity-card"
import { EmailActivityCard } from "./email-activity-card"
import { PhoneActivityCard } from "./phone-activity-card"
import { CalendarActivityCard } from "./calendar-activity-card"
import { FinancialActivityCard } from "./financial-activity-card"

interface ActivityCardProps {
  activity: RecentActivity
  agentName: string
  onApprove?: (activityId: string) => void
  onReject?: (activityId: string) => void
  onModify?: (activityId: string, data: any) => void
}

export function ActivityCard({ activity, agentName, onApprove, onReject, onModify }: ActivityCardProps) {
  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    approved: "bg-green-500/10 text-green-500 border-green-500/20",
    rejected: "bg-red-500/10 text-red-500 border-red-500/20",
    completed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  }

  const priorityColors = {
    low: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    medium: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    urgent: "bg-red-500/10 text-red-500 border-red-500/20",
  }

  const renderActivityContent = () => {
    switch (activity.type) {
      case "research":
        return <ResearchActivityCard activity={activity} />
      case "email":
        return <EmailActivityCard activity={activity} onApprove={onApprove} onReject={onReject} onModify={onModify} />
      case "phone":
        return <PhoneActivityCard activity={activity} onApprove={onApprove} onReject={onReject} onModify={onModify} />
      case "calendar":
        return (
          <CalendarActivityCard activity={activity} onApprove={onApprove} onReject={onReject} onModify={onModify} />
        )
      case "financial":
        return (
          <FinancialActivityCard activity={activity} onApprove={onApprove} onReject={onReject} onModify={onModify} />
        )
    }
  }

  return (
    <Card className="border-border hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="capitalize">
              {activity.type}
            </Badge>
            <Badge variant="outline" className={statusColors[activity.status]}>
              {activity.status}
            </Badge>
            <Badge variant="outline" className={priorityColors[activity.priority]}>
              {activity.priority}
            </Badge>
            <Badge variant="outline">{agentName}</Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(activity.createdAt, { addSuffix: true })}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>{renderActivityContent()}</CardContent>
    </Card>
  )
}
