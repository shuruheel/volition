"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { UnifiedActivity } from "@/lib/mock-data"
import { ResearchActivityCard } from "./research-activity-card"
import { EmailActivityCard } from "./email-activity-card"
import { PhoneActivityCard } from "./phone-activity-card"
import { CalendarActivityCard } from "./calendar-activity-card"
import { FinancialActivityCard } from "./financial-activity-card"
import { FileText, Video, ImageIcon, Mail, Clock, ExternalLink, CheckCircle2, ArrowRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface UnifiedActivityCardProps {
  activity: UnifiedActivity
  agentName: string
  onApprove?: (activityId: string) => void
  onReject?: (activityId: string) => void
  onModify?: (activityId: string, data: any) => void
}

export function UnifiedActivityCard({ activity, agentName, onApprove, onReject, onModify }: UnifiedActivityCardProps) {
  // For activities that need HITL, use existing specialized components
  if (activity.type === "research" && activity.status === "pending") {
    return (
      <ResearchActivityCard
        activity={{
          id: activity.id,
          agentId: activity.agentId,
          type: "research",
          status: activity.status,
          priority: activity.priority!,
          createdAt: activity.createdAt,
          data: activity.data,
        }}
        agentName={agentName}
        onApprove={onApprove}
        onReject={onReject}
        onModify={onModify}
      />
    )
  }

  if (activity.type === "email_sent" && activity.status === "pending") {
    return (
      <EmailActivityCard
        activity={{
          id: activity.id,
          agentId: activity.agentId,
          type: "email",
          status: activity.status,
          priority: activity.priority!,
          createdAt: activity.createdAt,
          data: activity.data,
        }}
        agentName={agentName}
        onApprove={onApprove}
        onReject={onReject}
        onModify={onModify}
      />
    )
  }

  if (activity.type === "phone_call" && activity.status === "pending") {
    return (
      <PhoneActivityCard
        activity={{
          id: activity.id,
          agentId: activity.agentId,
          type: "phone",
          status: activity.status,
          priority: activity.priority!,
          createdAt: activity.createdAt,
          data: activity.data,
        }}
        agentName={agentName}
        onApprove={onApprove}
        onReject={onReject}
        onModify={onModify}
      />
    )
  }

  if (
    (activity.type === "calendar_event_added" || activity.type === "calendar_event_modified") &&
    activity.status === "pending"
  ) {
    return (
      <CalendarActivityCard
        activity={{
          id: activity.id,
          agentId: activity.agentId,
          type: "calendar",
          status: activity.status,
          priority: activity.priority!,
          createdAt: activity.createdAt,
          data: activity.data,
        }}
        agentName={agentName}
        onApprove={onApprove}
        onReject={onReject}
        onModify={onModify}
      />
    )
  }

  if (activity.type === "financial" && activity.status === "pending") {
    return (
      <FinancialActivityCard
        activity={{
          id: activity.id,
          agentId: activity.agentId,
          type: "financial",
          status: activity.status,
          priority: activity.priority!,
          createdAt: activity.createdAt,
          data: activity.data,
        }}
        agentName={agentName}
        onApprove={onApprove}
        onReject={onReject}
        onModify={onModify}
      />
    )
  }

  // For completed activities, show simple summary cards
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getActivityIcon(activity.type)}
            <div>
              <CardTitle className="text-base">{getActivityTitle(activity.type)}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">{agentName}</p>
                <span className="text-xs text-muted-foreground">•</span>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
          {activity.status === "completed" && (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>{renderActivityContent(activity)}</CardContent>
    </Card>
  )
}

function getActivityIcon(type: UnifiedActivity["type"]) {
  const iconClass = "h-5 w-5"
  switch (type) {
    case "video_watched":
      return <Video className={iconClass} />
    case "image_seen":
      return <ImageIcon className={iconClass} />
    case "email_read":
      return <Mail className={iconClass} />
    case "research":
      return <FileText className={iconClass} />
    default:
      return <Clock className={iconClass} />
  }
}

function getActivityTitle(type: UnifiedActivity["type"]) {
  switch (type) {
    case "video_watched":
      return "Video Watched"
    case "image_seen":
      return "Image Analyzed"
    case "email_read":
      return "Email Read"
    case "research":
      return "Research Completed"
    default:
      return "Activity"
  }
}

function renderActivityContent(activity: UnifiedActivity) {
  const data = activity.data

  switch (activity.type) {
    case "video_watched":
      return (
        <div className="space-y-3">
          <div>
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:underline flex items-center gap-1"
            >
              {data.title}
              <ExternalLink className="h-3 w-3" />
            </a>
            <p className="text-xs text-muted-foreground mt-1">Duration: {Math.floor(data.duration / 60)} minutes</p>
          </div>
          <p className="text-sm text-muted-foreground">{data.summary}</p>
          {data.keyPoints && data.keyPoints.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2">Key Points:</p>
              <ul className="space-y-1">
                {data.keyPoints.map((point: string, idx: number) => (
                  <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )

    case "image_seen":
      return (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">{data.description}</p>
            <p className="text-xs text-muted-foreground mt-1">Context: {data.context}</p>
          </div>
          {data.insights && data.insights.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2">Insights:</p>
              <ul className="space-y-1">
                {data.insights.map((insight: string, idx: number) => (
                  <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )

    case "email_read":
      return (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">{data.subject}</p>
            <p className="text-xs text-muted-foreground mt-1">From: {data.from}</p>
          </div>
          <p className="text-sm text-muted-foreground">{data.summary}</p>
          {data.keyPoints && data.keyPoints.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2">Key Points:</p>
              <ul className="space-y-1">
                {data.keyPoints.map((point: string, idx: number) => (
                  <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                    <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.nextSteps && (
            <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
              <p className="text-xs font-medium mb-1">Next Steps:</p>
              <p className="text-xs text-muted-foreground">{data.nextSteps}</p>
            </div>
          )}
        </div>
      )

    case "research":
      return (
        <div className="space-y-2">
          <p className="text-sm font-medium">{data.subgraph.title}</p>
          <p className="text-sm text-muted-foreground">{data.subgraph.description}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{data.subgraph.nodesAdded} nodes added</span>
            <span>•</span>
            <span>{data.subgraph.relationshipsAdded} relationships</span>
          </div>
        </div>
      )

    default:
      return <p className="text-sm text-muted-foreground">Activity completed</p>
  }
}
