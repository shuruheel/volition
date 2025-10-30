"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Activity } from "@/lib/db"
import { useState } from "react"
import { cn } from "@/lib/utils"
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
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import ReactMarkdown from 'react-markdown'

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
    label: 'Question',
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
            {(payload.summary || payload.description) && (
              <div className="prose prose-invert max-w-none text-sm prose-p:my-4 prose-headings:mt-6 prose-headings:mb-3 prose-ul:my-4 prose-ol:my-4 prose-li:my-2">
                <ReactMarkdown
                  components={{
                    p: ({ node, ...props }) => <p className="my-4 leading-relaxed" {...props} />,
                    h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-6 mb-3 text-foreground" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-5 mb-2 text-foreground" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-base font-semibold mt-4 mb-2 text-foreground" {...props} />,
                    ul: ({ node, ...props }) => <ul className="my-4 space-y-2 list-disc pl-6" {...props} />,
                    ol: ({ node, ...props }) => <ol className="my-4 space-y-2 list-decimal pl-6" {...props} />,
                    li: ({ node, ...props }) => <li className="my-2" {...props} />,
                  }}
                >
                  {String(payload.summary || payload.description)}
                </ReactMarkdown>
              </div>
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
        const [isExpanded, setIsExpanded] = useState(false)
        const question = payload.question || 'The agent is asking for more information.'
        const hasAnswer = typeof payload.answer === 'string' && payload.answer.length > 0
        
        // Check if content is long enough to need collapsing (roughly 17 lines = ~1000 chars)
        const isLongContent = question.length > 1000
        
        return (
          <div className="space-y-3">
            <div className="relative">
              <div 
                className={cn(
                  "prose prose-sm prose-invert max-w-none prose-headings:font-bold prose-headings:text-foreground prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:my-3 prose-ul:my-3 prose-li:my-1 prose-a:text-blue-400 prose-a:underline prose-strong:text-foreground prose-code:text-blue-300",
                  !isExpanded && isLongContent && "max-h-[400px] overflow-hidden"
                )}
              >
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-6 mb-3 text-foreground" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-5 mb-2 text-foreground" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-base font-semibold mt-4 mb-2 text-foreground" {...props} />,
                    p: ({ node, ...props }) => <p className="my-3 leading-relaxed" {...props} />,
                    ul: ({ node, ...props }) => <ul className="my-3 space-y-1 list-disc pl-6" {...props} />,
                    ol: ({ node, ...props }) => <ol className="my-3 space-y-1 list-decimal pl-6" {...props} />,
                    li: ({ node, children, ...props }) => {
                      // Convert numbered list items starting with keywords to headings
                      const text = String(children)
                      if (text.match(/^(Executive summary|Key techniques|Advanced reasoning|Evaluation)/i)) {
                        return <h3 className="text-base font-semibold mt-4 mb-2 text-foreground list-none -ml-6">{children}</h3>
                      }
                      return <li className="my-1" {...props}>{children}</li>
                    },
                    a: ({ node, ...props }) => <a className="text-blue-400 hover:text-blue-300 underline break-words" target="_blank" rel="noopener noreferrer" {...props} />,
                    code: ({ node, inline, ...props }: any) => 
                      inline 
                        ? <code className="bg-gray-800 px-1 py-0.5 rounded text-sm text-blue-300" {...props} />
                        : <code className="block bg-gray-800 p-2 rounded my-2 text-sm overflow-x-auto" {...props} />,
                  }}
                >
                  {String(question)}
                </ReactMarkdown>
              </div>
              
              {/* Fade overlay when collapsed */}
              {!isExpanded && isLongContent && (
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-card to-transparent pointer-events-none" />
              )}
            </div>
            
            {/* Show more/less button */}
            {isLongContent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show more
                  </>
                )}
              </Button>
            )}
            {hasAnswer ? (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Your answer:</span> {payload.answer}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    className="flex-1 border rounded px-2 py-1 text-sm bg-transparent"
                    placeholder="Type your answer..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && answer.trim()) {
                        onModify?.(activity.id, { ...payload, answer: answer.trim() })
                        onApprove?.(activity.id)
                      }
                    }}
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      // Reject the question - agent will end work session
                      await onReject?.(activity.id)
                    }}
                  >
                    End Work Session
                  </Button>
                </div>
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

        {isPending && (onApprove || onReject) && activity.type !== 'user_input' && (
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
