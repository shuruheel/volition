import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { AgentActivity } from "@/lib/mock-data"
import { formatDistanceToNow } from "date-fns"
import { FileText, Globe, Mail, Brain, CheckCircle } from "lucide-react"

interface ActivityFeedProps {
  activities: AgentActivity[]
}

const activityIcons = {
  task_completed: CheckCircle,
  website_visited: Globe,
  paper_processed: FileText,
  email_sent: Mail,
  reasoning_added: Brain,
}

const activityColors = {
  task_completed: "text-green-500",
  website_visited: "text-blue-500",
  paper_processed: "text-purple-500",
  email_sent: "text-yellow-500",
  reasoning_added: "text-pink-500",
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.type]
              const colorClass = activityColors[activity.type]
              return (
                <div key={activity.id} className="flex gap-3">
                  <div className={`mt-0.5 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
