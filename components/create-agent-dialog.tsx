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

interface CreateAgentDialogProps {
  onCreateAgent: (name: string, prompt: string, tools: string[]) => void | Promise<void>
}

export function CreateAgentDialog({ onCreateAgent }: CreateAgentDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [prompt, setPrompt] = useState("")
  const [selectedTools, setSelectedTools] = useState<string[]>(['openai', 'supermemory'])
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (name.trim() && prompt.trim()) {
      setLoading(true)
      try {
        await onCreateAgent(name, prompt, selectedTools)
        // Reset form
        setName("")
        setPrompt("")
        setSelectedTools(['openai', 'supermemory'])
        setOpen(false)
      } catch (error) {
        console.error('Failed to create agent:', error)
      } finally {
        setLoading(false)
      }
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
              placeholder="e.g., You are a helpful research assistant that can search the web, store information in memory, and provide insights."
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
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || !prompt.trim() || loading}>
            {loading ? 'Creating...' : 'Create Agent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
