"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Check, X, Edit2, Trash2, Plus, GripVertical } from "lucide-react"
import type { RecentActivity, EmailActivity, EmailParagraph } from "@/lib/mock-data"

interface EmailActivityCardProps {
  activity: RecentActivity
  onApprove?: (activityId: string) => void
  onReject?: (activityId: string) => void
  onModify?: (activityId: string, data: any) => void
}

export function EmailActivityCard({ activity, onApprove, onReject, onModify }: EmailActivityCardProps) {
  const data = activity.data as EmailActivity
  const [isEditing, setIsEditing] = useState(false)
  const [paragraphs, setParagraphs] = useState<EmailParagraph[]>(data.paragraphs)
  const [editingParagraphId, setEditingParagraphId] = useState<string | null>(null)

  const handleRemoveParagraph = (paragraphId: string) => {
    setParagraphs(paragraphs.filter((p) => p.id !== paragraphId))
  }

  const handleAddParagraph = () => {
    const newParagraph: EmailParagraph = {
      id: `ep-new-${Date.now()}`,
      content: "",
      order: paragraphs.length + 1,
    }
    setParagraphs([...paragraphs, newParagraph])
    setEditingParagraphId(newParagraph.id)
  }

  const handleUpdateParagraph = (paragraphId: string, content: string) => {
    setParagraphs(paragraphs.map((p) => (p.id === paragraphId ? { ...p, content } : p)))
  }

  const handleSaveModifications = () => {
    onModify?.(activity.id, { ...data, paragraphs })
    setIsEditing(false)
    setEditingParagraphId(null)
  }

  const confidenceColor =
    data.confidence >= 0.8 ? "text-green-500" : data.confidence >= 0.6 ? "text-yellow-500" : "text-red-500"

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">To: {data.to}</p>
            <h3 className="font-semibold text-base">{data.subject}</h3>
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">EMAIL CONTENT</p>
          {activity.status === "pending" && !isEditing && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
        </div>

        <div className="space-y-3 p-4 bg-card rounded-lg border border-border">
          {paragraphs.map((paragraph, index) => (
            <div key={paragraph.id} className="group relative">
              {isEditing && (
                <div className="absolute -left-8 top-2 flex flex-col gap-1">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                </div>
              )}
              {editingParagraphId === paragraph.id ? (
                <Textarea
                  value={paragraph.content}
                  onChange={(e) => handleUpdateParagraph(paragraph.id, e.target.value)}
                  onBlur={() => setEditingParagraphId(null)}
                  autoFocus
                  className="min-h-[80px]"
                />
              ) : (
                <div
                  className={`text-sm leading-relaxed ${isEditing ? "cursor-pointer hover:bg-secondary/50 p-2 rounded" : ""}`}
                  onClick={() => isEditing && setEditingParagraphId(paragraph.id)}
                >
                  {paragraph.content}
                </div>
              )}
              {isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveParagraph(paragraph.id)}
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              )}
            </div>
          ))}

          {isEditing && (
            <Button variant="outline" size="sm" onClick={handleAddParagraph} className="w-full bg-transparent">
              <Plus className="h-3 w-3 mr-1" />
              Add Paragraph
            </Button>
          )}
        </div>
      </div>

      {activity.status === "pending" && (
        <div className="flex gap-2 pt-2">
          {isEditing ? (
            <>
              <Button onClick={handleSaveModifications} className="flex-1">
                <Check className="h-4 w-4 mr-1" />
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setParagraphs(data.paragraphs)
                  setEditingParagraphId(null)
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => onApprove?.(activity.id)} className="flex-1">
                <Check className="h-4 w-4 mr-1" />
                Approve & Send
              </Button>
              <Button variant="outline" onClick={() => onReject?.(activity.id)} className="flex-1">
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
