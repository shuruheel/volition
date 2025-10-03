"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Settings } from "lucide-react"
import { ToolPermissionsSelector } from "./tool-permissions-selector"
import type { AgentTool } from "@/lib/auth"

interface EditToolsDialogProps {
  agentName: string
  currentTools: AgentTool[]
  onSave: (tools: AgentTool[]) => void
}

export function EditToolsDialog({ agentName, currentTools, onSave }: EditToolsDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedTools, setSelectedTools] = useState<AgentTool[]>(currentTools)

  const handleSave = () => {
    onSave(selectedTools)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit Tools">
          <Settings className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Tool Permissions</DialogTitle>
          <DialogDescription>
            Manage which tools {agentName} can access. Changes take effect immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ToolPermissionsSelector selectedTools={selectedTools} onToolsChange={setSelectedTools} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={selectedTools.length === 0}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
