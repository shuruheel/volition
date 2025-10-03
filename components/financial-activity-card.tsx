"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, DollarSign, AlertTriangle } from "lucide-react"
import type { RecentActivity, FinancialActivity } from "@/lib/mock-data"

interface FinancialActivityCardProps {
  activity: RecentActivity
  onApprove?: (activityId: string) => void
  onReject?: (activityId: string) => void
  onModify?: (activityId: string, data: any) => void
}

export function FinancialActivityCard({ activity, onApprove, onReject }: FinancialActivityCardProps) {
  const data = activity.data as FinancialActivity
  const confidenceColor =
    data.confidence >= 0.8 ? "text-green-500" : data.confidence >= 0.6 ? "text-yellow-500" : "text-red-500"

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
        <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
        <p className="text-xs text-orange-500">Financial transaction requires approval</p>
      </div>

      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">${data.amount.toFixed(2)}</span>
            </div>
            <Badge variant="outline" className="mb-2 capitalize">
              {data.transactionType}
            </Badge>
            <p className="text-sm text-muted-foreground">To: {data.recipient}</p>
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
        <p className="text-xs font-medium text-muted-foreground mb-2">TRANSACTION DESCRIPTION</p>
        <p className="text-sm leading-relaxed">{data.description}</p>
      </div>

      {activity.status === "pending" && (
        <div className="flex gap-2 pt-2">
          <Button onClick={() => onApprove?.(activity.id)} className="flex-1">
            <Check className="h-4 w-4 mr-1" />
            Approve Transaction
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
