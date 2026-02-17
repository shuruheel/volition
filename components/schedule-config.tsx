"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ScheduleConfigProps {
  value: {
    enabled: boolean
    interval_minutes: number
    checklist: string
  }
  onChange: (value: ScheduleConfigProps["value"]) => void
}

const INTERVAL_OPTIONS = [
  { value: "5", label: "Every 5 minutes" },
  { value: "15", label: "Every 15 minutes" },
  { value: "30", label: "Every 30 minutes" },
  { value: "60", label: "Every hour" },
  { value: "360", label: "Every 6 hours" },
  { value: "720", label: "Every 12 hours" },
  { value: "1440", label: "Every 24 hours" },
]

const DEFAULT_CHECKLIST = `- [ ] Check inbox for new emails, summarize urgent ones
- [ ] Review today's calendar for upcoming meetings
- [ ] Check for pending approvals that need attention
- [ ] Send daily briefing email with findings`

export function ScheduleConfig({ value, onChange }: ScheduleConfigProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Enable Heartbeat Schedule</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Agent runs automatically on a schedule
          </p>
        </div>
        <Switch
          checked={value.enabled}
          onCheckedChange={(enabled) => onChange({ ...value, enabled })}
        />
      </div>

      {value.enabled && (
        <>
          <div className="space-y-2">
            <Label className="text-sm">Run Interval</Label>
            <Select
              value={String(value.interval_minutes)}
              onValueChange={(v) => onChange({ ...value, interval_minutes: parseInt(v) })}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVAL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Checklist (Markdown)</Label>
            <Textarea
              placeholder={DEFAULT_CHECKLIST}
              value={value.checklist}
              onChange={(e) => onChange({ ...value, checklist: e.target.value })}
              className="bg-secondary border-border min-h-[120px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              The agent will work through these items on each scheduled run.
              Use markdown checkboxes for task items.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
