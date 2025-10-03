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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import { ToolPermissionsSelector } from "./tool-permissions-selector"
import type { AgentTool } from "@/lib/auth"

interface CreateAgentDialogProps {
  onCreateAgent: (name: string, prompt: string, tools: AgentTool[]) => void
}

export function CreateAgentDialog({ onCreateAgent }: CreateAgentDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [prompt, setPrompt] = useState("")
  const [selectedTools, setSelectedTools] = useState<AgentTool[]>(["browser", "search", "neo4j"])

  const handleCreate = () => {
    if (name.trim() && prompt.trim()) {
      onCreateAgent(name, prompt, selectedTools)
      setName("")
      setPrompt("")
      setSelectedTools(["browser", "search", "neo4j"])
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Give your agent a name, describe what you want it to do, and select which tools it can access.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input
              id="name"
              placeholder="e.g., Research Agent Alpha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prompt">Agent Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="e.g., Research latest developments in AI safety and summarize key findings from academic papers"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="bg-secondary border-border min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              Describe the task or goal for this agent. Be specific about what you want it to accomplish.
            </p>
          </div>
          <div className="grid gap-2">
            <ToolPermissionsSelector selectedTools={selectedTools} onToolsChange={setSelectedTools} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || !prompt.trim() || selectedTools.length === 0}>
            Create Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
