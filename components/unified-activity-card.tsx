"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Activity } from "@/lib/db"
import { useState } from "react"
import {
  FileText,
  Mail,
  Phone,
  Calendar,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface UnifiedActivityCardProps {
  activity: Activity
  agentName: string
  onApprove?: (activityId: string) => void | Promise<void>
  onReject?: (activityId: string) => void | Promise<void>
  onModify?: (activityId: string, payload: any) => void | Promise<void>
}

// Activity type icons and colors
const ACTIVITY_CONFIG = {
  research: {
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    label: 'Research',
  },
  email_sent: {
    icon: Mail,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    label: 'Email Sent',
  },
  phone_call: {
    icon: Phone,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    label: 'Phone Call',
  },
  post_call_summary: {
    icon: Phone,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/20',
    label: 'Call Summary',
  },
  calendar_event_added: {
    icon: Calendar,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    label: 'Calendar Event',
  },
  calendar_event_modified: {
    icon: Calendar,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/20',
    label: 'Calendar Updated',
  },
  webpage_viewed: {
    icon: Globe,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/20',
    label: 'Webpage Viewed',
  },
  journal_read: {
    icon: FileText,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100 dark:bg-pink-900/20',
    label: 'Journal Entry',
  },
  user_input: {
    icon: FileText,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100 dark:bg-gray-900/20',
    label: 'Agent Question',
  },
}

// Status icons and colors
const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    label: 'Pending Approval',
  },
  approved: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-100 dark:bg-green-900/20',
    label: 'Approved',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-blue-600',
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    label: 'Completed',
  },
  rejected: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-100 dark:bg-red-900/20',
    label: 'Rejected',
  },
}

export function UnifiedActivityCard({
  activity,
  agentName,
  onApprove,
  onReject,
  onModify,
}: UnifiedActivityCardProps) {
  const typeConfig = ACTIVITY_CONFIG[activity.type] || {
    icon: FileText,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-900/20',
    label: activity.type,
  }

  const statusConfig = STATUS_CONFIG[activity.status]
  const TypeIcon = typeConfig.icon
  const StatusIcon = statusConfig.icon

  const isPending = activity.status === 'pending'

  // Render activity-specific content
  const renderActivityContent = () => {
    const payload = activity.payload || {}

    switch (activity.type) {
      case 'research':
        return (
          <div className="space-y-2">
            {payload.title && <p className="font-medium">{payload.title}</p>}
            {payload.description && (
              <p className="text-sm text-muted-foreground">{payload.description}</p>
            )}
            {Array.isArray(payload.links) && payload.links.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Links</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {payload.links.slice(0, 5).map((link: string, idx: number) => (
                    <li key={idx}>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {payload.url && (
              <a
                href={payload.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                View Source →
              </a>
            )}
          </div>
        )

      case 'email_sent':
        return (
          <div className="space-y-2">
            <p className="font-medium">To: {payload.to || 'Unknown'}</p>
            {payload.subject && <p className="text-sm font-medium">{payload.subject}</p>}
            {payload.preview && (
              <p className="text-sm text-muted-foreground line-clamp-2">{payload.preview}</p>
            )}
          </div>
        )

      case 'phone_call':
        return (
          <div className="space-y-2">
            <p className="font-medium">Call to: {payload.to_number || payload.toNumber || 'Unknown'}</p>
            {payload.duration && (
              <p className="text-sm text-muted-foreground">Duration: {payload.duration}s</p>
            )}
            {payload.context && (
              <p className="text-sm text-muted-foreground">{payload.context}</p>
            )}
          </div>
        )

      case 'post_call_summary':
        return (
          <div className="space-y-2">
            <p className="font-medium">Call Summary</p>
            {payload.summary && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{payload.summary}</p>
              </div>
            )}
            {payload.keyPoints && Array.isArray(payload.keyPoints) && payload.keyPoints.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">Key Points:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {payload.keyPoints.map((point: string, idx: number) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
            {payload.duration && (
              <p className="text-xs text-muted-foreground">Duration: {payload.duration}s</p>
            )}
          </div>
        )

      case 'calendar_event_added':
      case 'calendar_event_modified':
        return (
          <div className="space-y-2">
            {payload.title && <p className="font-medium">{payload.title}</p>}
            {payload.start && (
              <p className="text-sm text-muted-foreground">
                {new Date(payload.start).toLocaleString()}
              </p>
            )}
            {payload.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{payload.description}</p>
            )}
          </div>
        )

      case 'webpage_viewed':
        return (
          <div className="space-y-2">
            {payload.title && <p className="font-medium">{payload.title}</p>}
            {payload.url && (
              <a
                href={payload.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline truncate block"
              >
                {payload.url}
              </a>
            )}
          </div>
        )

      case 'journal_read':
        return (
          <div className="space-y-2">
            {payload.title && <p className="font-medium">{payload.title}</p>}
            {payload.content && (
              <p className="text-sm text-muted-foreground line-clamp-3">{payload.content}</p>
            )}
          </div>
        )

      case 'user_input': {
        const [answer, setAnswer] = useState('')
        const question = payload.question || 'The agent is asking for more information.'
        const hasAnswer = typeof payload.answer === 'string' && payload.answer.length > 0
        return (
          <div className="space-y-3">
            <p className="text-sm">{question}</p>
            {hasAnswer ? (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Your answer:</span> {payload.answer}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  className="flex-1 border rounded px-2 py-1 text-sm bg-transparent"
                  placeholder="Type your answer..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                />
                <Button
                  size="sm"
                  disabled={!answer.trim()}
                  onClick={async () => {
                    if (!answer.trim()) return
                    // Modify payload to include answer, then approve
                    await onModify?.(activity.id, { ...payload, answer: answer.trim() })
                    await onApprove?.(activity.id)
                  }}
                >
                  Send
                </Button>
              </div>
            )}
          </div>
        )
      }

      default:
        return (
          <div>
            <p className="text-sm text-muted-foreground">
              {payload.description || payload.title || 'Activity completed'}
            </p>
          </div>
        )
    }
  }

  return (
    <Card className="border-border hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg ${typeConfig.bgColor}`}>
              <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-base">{typeConfig.label}</CardTitle>
                <Badge variant="outline" className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
                {activity.type === 'research' && activity.payload?.source === 'firecrawl' && (
                  <Badge variant="outline" className="bg-cyan-100 dark:bg-cyan-900/20 text-cyan-700 border-0">
                    Firecrawl
                  </Badge>
                )}
                {activity.priority && activity.priority === 'high' && (
                  <Badge variant="outline" className="bg-red-100 dark:bg-red-900/20 text-red-600 border-0">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    High Priority
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {agentName} • {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderActivityContent()}

        {isPending && (onApprove || onReject) && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
            {onApprove && (
              <Button size="sm" onClick={() => onApprove(activity.id)}>
                Approve
              </Button>
            )}
            {onReject && (
              <Button size="sm" variant="outline" onClick={() => onReject(activity.id)}>
                Reject
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
