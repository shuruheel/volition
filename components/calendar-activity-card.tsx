"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, Calendar, Clock, Users } from "lucide-react"
import { format } from "date-fns"
import type { RecentActivity, CalendarActivity } from "@/lib/mock-data"

interface CalendarActivityCardProps {
  activity: RecentActivity
  onApprove?: (activityId: string) => void
  onReject?: (activityId: string) => void
  onModify?: (activityId: string, data: any) => void
}

export function CalendarActivityCard({ activity, onApprove, onReject }: CalendarActivityCardProps) {
  const data = activity.data as CalendarActivity
  const confidenceColor =
    data.confidence >= 0.8 ? "text-green-500" : data.confidence >= 0.6 ? "text-yellow-500" : "text-red-500"

  const duration = Math.round((data.endTime.getTime() - data.startTime.getTime()) / (1000 * 60))

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-base mb-2">{data.title}</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>{format(data.startTime, "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span>
                  {format(data.startTime, "h:mm a")} - {format(data.endTime, "h:mm a")} ({duration} min)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3" />
                <span>{data.attendees.join(", ")}</span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className={confidenceColor}>
            {Math.round(data.confidence * 100)}% confidence
          </Badge>
        </div>
      </div>

      <div className="p-3 bg-secondary/50 rounded-lg border border-border">
        <p className="text-xs text-muted-foreground mb-1">Agent Reasoning:</p>
        <p className="text-sm text-foreground">{data.reasoning}</p>
      </div>

      <div className="p-4 bg-card rounded-lg border border-border">
        <p className="text-xs font-medium text-muted-foreground mb-2">MEETING DESCRIPTION</p>
        <p className="text-sm leading-relaxed">{data.description}</p>
      </div>

      {activity.status === "pending" && (
        <div className="flex gap-2 pt-2">
          <Button onClick={() => onApprove?.(activity.id)} className="flex-1">
            <Check className="h-4 w-4 mr-1" />
            Approve & Schedule
          </Button>
          <Button variant="outline" onClick={() => onReject?.(activity.id)} className="flex-1">
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
        </div>
      )}
    </div>
  )
}
