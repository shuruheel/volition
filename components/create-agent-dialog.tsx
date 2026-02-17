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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from "lucide-react"
import { ToolPermissionsSelector } from "./tool-permissions-selector"
import { ScheduleConfig } from "./schedule-config"
import { ModelSelector } from "./model-selector"

interface ScheduleData {
  enabled: boolean
  interval_minutes: number
  checklist: string
}

interface CreateAgentDialogProps {
  onCreateAgent: (
    name: string,
    prompt: string,
    tools: string[],
    schedule?: ScheduleData,
    modelProvider?: string,
    modelId?: string
  ) => void | Promise<void>
}

export function CreateAgentDialog({ onCreateAgent }: CreateAgentDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [prompt, setPrompt] = useState("")
  const [selectedTools, setSelectedTools] = useState<string[]>(['openai', 'supermemory'])
  const [schedule, setSchedule] = useState<ScheduleData>({
    enabled: false,
    interval_minutes: 60,
    checklist: "",
  })
  const [modelProvider, setModelProvider] = useState("openai")
  const [modelId, setModelId] = useState("")
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (name.trim() && prompt.trim()) {
      setLoading(true)
      try {
        await onCreateAgent(
          name,
          prompt,
          selectedTools,
          schedule.enabled ? schedule : undefined,
          modelProvider,
          modelId || undefined
        )
        // Reset form
        setName("")
        setPrompt("")
        setSelectedTools(['openai', 'supermemory'])
        setSchedule({ enabled: false, interval_minutes: 60, checklist: "" })
        setModelProvider("openai")
        setModelId("")
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
            Give your agent a name, describe what you want it to do, and configure how it runs.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="basics" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="model">Model</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>
          <TabsContent value="basics" className="space-y-4 mt-4">
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
          </TabsContent>
          <TabsContent value="model" className="mt-4">
            <ModelSelector
              provider={modelProvider}
              modelId={modelId}
              onProviderChange={setModelProvider}
              onModelChange={setModelId}
            />
          </TabsContent>
          <TabsContent value="tools" className="mt-4">
            <ToolPermissionsSelector selectedTools={selectedTools} onToolsChange={setSelectedTools} />
          </TabsContent>
          <TabsContent value="schedule" className="mt-4">
            <ScheduleConfig value={schedule} onChange={setSchedule} />
          </TabsContent>
        </Tabs>
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
