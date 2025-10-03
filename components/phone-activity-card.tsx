"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Check, X, Edit2, Trash2, Plus, Phone } from "lucide-react"
import type { RecentActivity, PhoneActivity, InstructionParagraph } from "@/lib/mock-data"

interface PhoneActivityCardProps {
  activity: RecentActivity
  onApprove?: (activityId: string) => void
  onReject?: (activityId: string) => void
  onModify?: (activityId: string, data: any) => void
}

export function PhoneActivityCard({ activity, onApprove, onReject, onModify }: PhoneActivityCardProps) {
  const data = activity.data as PhoneActivity
  const [isEditing, setIsEditing] = useState(false)
  const [paragraphs, setParagraphs] = useState<InstructionParagraph[]>(data.instructionParagraphs)
  const [editingParagraphId, setEditingParagraphId] = useState<string | null>(null)

  const handleRemoveParagraph = (paragraphId: string) => {
    setParagraphs(paragraphs.filter((p) => p.id !== paragraphId))
  }

  const handleAddParagraph = () => {
    const newParagraph: InstructionParagraph = {
      id: `ip-new-${Date.now()}`,
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
    onModify?.(activity.id, { ...data, instructionParagraphs: paragraphs })
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
            <div className="flex items-center gap-2 mb-1">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">{data.contactName}</p>
              <span className="text-xs text-muted-foreground">{data.contactPhone}</span>
            </div>
            <p className="text-sm text-muted-foreground">{data.purpose}</p>
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
          <p className="text-xs font-medium text-muted-foreground">CALL INSTRUCTIONS</p>
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
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0 mt-1">
                  {index + 1}
                </Badge>
                <div className="flex-1">
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
                </div>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveParagraph(paragraph.id)}
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {isEditing && (
            <Button variant="outline" size="sm" onClick={handleAddParagraph} className="w-full bg-transparent">
              <Plus className="h-3 w-3 mr-1" />
              Add Instruction
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
                  setParagraphs(data.instructionParagraphs)
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
                Approve Call
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
