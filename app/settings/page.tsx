"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Brain, Globe, Phone, Key, CheckCircle2, XCircle, Loader2, Calendar, Send, Search, AlertCircle, Database, ArrowLeft, ChevronDown, Save, Clock, User } from "lucide-react"
import Link from "next/link"

interface ToolConfig {
  id: string
  tool: string
  configured: boolean
  decryptionError?: boolean
  maskedData?: Record<string, string>
  createdAt?: string
  updatedAt?: string
}

interface ToolField {
  name: string
  label: string
  type: string
  placeholder: string
}

interface ModelOption {
  id: string
  name: string
}

interface ToolDefinition {
  id: string
  name: string
  description: string
  icon: typeof Brain
  color: string
  bgColor: string
  fields: ToolField[]
  oauth?: boolean
  models?: ModelOption[]
}

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-5.2, GPT-5, and GPT-5 Mini for text generation',
    icon: Brain,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...' },
    ],
    models: [
      { id: 'gpt-5.2-2025-12-11', name: 'GPT-5.2' },
      { id: 'gpt-5-mini-2025-08-07', name: 'GPT-5 Mini' },
      { id: 'gpt-5-2025-08-07', name: 'GPT-5' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude Opus 4.6, Sonnet 4.6, and Haiku 4.5',
    icon: Brain,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-ant-...' },
    ],
    models: [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
    ],
  },
  {
    id: 'google_oauth',
    name: 'Google (Gmail + Calendar)',
    description: 'Send/search emails and manage calendar events via Google APIs',
    icon: Calendar,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    fields: [],
    oauth: true,
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    description: 'Web search and scraping for agent research',
    icon: Search,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/20',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'fc-...' },
    ],
  },
  {
    id: 'supermemory',
    name: 'Supermemory',
    description: 'Graph memory and long-term context for agents',
    icon: Database,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sm_...' },
    ],
  },
  {
    id: 'browser_use',
    name: 'Browser-Use Cloud',
    description: 'AI-powered browser automation and web scraping',
    icon: Globe,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'bu_...' },
    ],
  },
  {
    id: 'telegram',
    name: 'Telegram Bot',
    description: 'Send and receive messages via Telegram bot',
    icon: Send,
    color: 'text-sky-600',
    bgColor: 'bg-sky-100 dark:bg-sky-900/20',
    fields: [
      { name: 'botToken', label: 'Bot Token', type: 'password', placeholder: '123456:ABC-DEF...' },
    ],
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'Voice calls with OpenAI Realtime API integration',
    icon: Phone,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    fields: [
      { name: 'accountSid', label: 'Account SID', type: 'text', placeholder: 'AC...' },
      { name: 'authToken', label: 'Auth Token', type: 'password', placeholder: '...' },
      { name: 'phoneNumber', label: 'Phone Number', type: 'text', placeholder: '+1...' },
    ],
  },
]

const MODEL_OPTIONS = [
  { provider: 'openai', id: 'gpt-5.2-2025-12-11', name: 'GPT-5.2 (OpenAI)' },
  { provider: 'openai', id: 'gpt-5-mini-2025-08-07', name: 'GPT-5 Mini (OpenAI)' },
  { provider: 'openai', id: 'gpt-5-2025-08-07', name: 'GPT-5 (OpenAI)' },
  { provider: 'anthropic', id: 'claude-opus-4-6', name: 'Claude Opus 4.6 (Anthropic)' },
  { provider: 'anthropic', id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6 (Anthropic)' },
  { provider: 'anthropic', id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5 (Anthropic)' },
]

type SettingsTab = 'identity' | 'heartbeat' | 'model' | 'tools'

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<SettingsTab>('identity')

  // Agent state
  const [agent, setAgent] = useState<any>(null)
  const [soulPrompt, setSoulPrompt] = useState("")
  const [agentName, setAgentName] = useState("")
  const [savingAgent, setSavingAgent] = useState(false)

  // Heartbeat state
  const [schedule, setSchedule] = useState<any>(null)
  const [heartbeatInterval, setHeartbeatInterval] = useState("60")
  const [heartbeatChecklist, setHeartbeatChecklist] = useState("")
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(false)
  const [activeHoursStart, setActiveHoursStart] = useState("08:00")
  const [activeHoursEnd, setActiveHoursEnd] = useState("23:00")
  const [savingHeartbeat, setSavingHeartbeat] = useState(false)

  // Model state
  const [modelProvider, setModelProvider] = useState("openai")
  const [modelId, setModelId] = useState("gpt-5.2-2025-12-11")
  const [savingModel, setSavingModel] = useState(false)

  // Tool configs
  const [configs, setConfigs] = useState<ToolConfig[]>([])
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({})
  const [testing, setTesting] = useState<{ [key: string]: boolean }>({})
  const [testResults, setTestResults] = useState<{ [key: string]: { success: boolean; message?: string } }>({})
  const [formData, setFormData] = useState<{ [key: string]: any }>({})
  const [oauthBanner, setOauthBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  // Fetch agent + schedule + tool configs
  useEffect(() => {
    fetch('/api/agent').then(r => r.json()).then(data => {
      if (data?.id) {
        setAgent(data)
        setSoulPrompt(data.prompt || '')
        setAgentName(data.name || '')
        setModelProvider(data.model_provider || 'openai')
        setModelId(data.model_id || 'gpt-5.2-2025-12-11')

        // Fetch schedule
        fetch(`/api/agents/${data.id}/schedule`).then(r => r.json()).then(sched => {
          if (sched && !sched.error) {
            setSchedule(sched)
            setHeartbeatInterval(String(sched.interval_minutes || 60))
            setHeartbeatChecklist(sched.checklist || '')
            setHeartbeatEnabled(sched.enabled ?? false)
            setActiveHoursStart(sched.active_hours_start || '08:00')
            setActiveHoursEnd(sched.active_hours_end || '23:00')
          }
        }).catch(() => {})
      }
    }).catch(() => {})

    fetchConfigs()

    const googleStatus = searchParams.get('google')
    if (googleStatus === 'connected') {
      setOauthBanner({ type: 'success', message: 'Google account connected successfully!' })
      window.history.replaceState({}, '', '/settings')
    } else if (googleStatus === 'error') {
      const reason = searchParams.get('reason') || 'unknown'
      const messages: Record<string, string> = {
        access_denied: 'Google account connection was cancelled.',
        no_code: 'No authorization code received from Google.',
        token_exchange_failed: 'Failed to exchange authorization code for tokens.',
        missing_credentials: 'Google OAuth is not configured on the server.',
      }
      setOauthBanner({ type: 'error', message: messages[reason] || `Google connection failed: ${reason}` })
      window.history.replaceState({}, '', '/settings')
    }
  }, [searchParams])

  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/settings/tools')
      if (response.ok) {
        const data = await response.json()
        setConfigs(data)
      }
    } catch (error) {
      console.error('Failed to fetch tool configs:', error)
    }
  }

  const handleSaveAgent = async () => {
    if (!agent) return
    setSavingAgent(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: agentName, prompt: soulPrompt }),
      })
      if (res.ok) {
        const updated = await res.json()
        setAgent(updated)
      }
    } catch (error) {
      console.error('Failed to save agent:', error)
    }
    setSavingAgent(false)
  }

  const handleSaveHeartbeat = async () => {
    if (!agent) return
    setSavingHeartbeat(true)
    try {
      await fetch(`/api/agents/${agent.id}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_type: 'interval',
          interval_minutes: parseInt(heartbeatInterval) || 60,
          checklist: heartbeatChecklist,
          enabled: heartbeatEnabled,
          active_hours_start: activeHoursStart,
          active_hours_end: activeHoursEnd,
        }),
      })
    } catch (error) {
      console.error('Failed to save heartbeat:', error)
    }
    setSavingHeartbeat(false)
  }

  const handleSaveModel = async () => {
    if (!agent) return
    setSavingModel(true)
    try {
      const selected = MODEL_OPTIONS.find(m => m.id === modelId)
      const res = await fetch('/api/agent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_provider: selected?.provider || modelProvider,
          model_id: modelId,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setAgent(updated)
      }
    } catch (error) {
      console.error('Failed to save model:', error)
    }
    setSavingModel(false)
  }

  const handleSaveTool = async (toolId: string) => {
    setLoading({ ...loading, [toolId]: true })
    try {
      const response = await fetch('/api/settings/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolId, data: formData[toolId] || {} }),
      })
      if (!response.ok) throw new Error('Failed to save configuration')
      await fetchConfigs()
      setFormData({ ...formData, [toolId]: {} })
    } catch (error) {
      console.error('Failed to save tool config:', error)
    } finally {
      setLoading({ ...loading, [toolId]: false })
    }
  }

  const handleTest = async (toolId: string) => {
    setTesting({ ...testing, [toolId]: true })
    setTestResults({ ...testResults, [toolId]: undefined as any })
    try {
      const response = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolId }),
      })
      const result = await response.json()
      setTestResults({
        ...testResults,
        [toolId]: result.success
          ? { success: true, message: result.message || 'Connection successful!' }
          : { success: false, message: result.error || 'Connection failed' },
      })
    } catch {
      setTestResults({ ...testResults, [toolId]: { success: false, message: 'Failed to test connection' } })
    } finally {
      setTesting({ ...testing, [toolId]: false })
    }
  }

  const updateFormData = (toolId: string, field: string, value: string) => {
    setFormData({ ...formData, [toolId]: { ...(formData[toolId] || {}), [field]: value } })
  }

  const getConfig = (toolId: string) => configs.find((c) => c.tool === toolId && c.configured)
  const getToolEntry = (toolId: string) => configs.find((c) => c.tool === toolId)
  const isConfigured = (toolId: string) => !!getConfig(toolId)
  const hasDecryptionError = (toolId: string) => !!getToolEntry(toolId)?.decryptionError

  const handleSelectTool = (toolId: string) => {
    setSelectedToolId(toolId)
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const selectedTool = TOOL_DEFINITIONS.find(t => t.id === selectedToolId)

  const TABS: { id: SettingsTab; label: string; icon: typeof Brain }[] = [
    { id: 'identity', label: 'Agent Identity', icon: User },
    { id: 'heartbeat', label: 'Heartbeat', icon: Clock },
    { id: 'model', label: 'Model', icon: Brain },
    { id: 'tools', label: 'Integrations', icon: Key },
  ]

  return (
    <div className="min-h-screen bg-background pb-[80px]">
      <div className="container mx-auto px-6 py-6 max-w-3xl">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-1 -ml-2">
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold mb-1">Settings</h1>
        </div>

        {oauthBanner && (
          <div className={`mb-4 p-4 rounded-lg flex items-start gap-3 ${oauthBanner.type === 'success' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
            {oauthBanner.type === 'success' ? <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" /> : <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />}
            <p className="text-sm">{oauthBanner.message}</p>
            <button onClick={() => setOauthBanner(null)} className="ml-auto text-sm underline opacity-70 hover:opacity-100">Dismiss</button>
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Identity tab */}
        {activeTab === 'identity' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Agent Identity (SOUL.md)</CardTitle>
                <CardDescription>Define your agent's personality, capabilities, and system prompt.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agent-name">Agent Name</Label>
                  <Input
                    id="agent-name"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="My Assistant"
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="soul-prompt">System Prompt</Label>
                  <textarea
                    id="soul-prompt"
                    value={soulPrompt}
                    onChange={(e) => setSoulPrompt(e.target.value)}
                    placeholder="You are a helpful AI assistant..."
                    rows={12}
                    className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is injected as the agent's system prompt. Memory files (soul.md, preferences.md) from Google Drive are appended automatically.
                  </p>
                </div>
                <Button onClick={handleSaveAgent} disabled={savingAgent} size="sm">
                  {savingAgent ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save</>}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Heartbeat tab */}
        {activeTab === 'heartbeat' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Heartbeat Schedule</CardTitle>
                <CardDescription>Configure when and how often your agent checks in automatically.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Label htmlFor="hb-enabled" className="flex items-center gap-2 cursor-pointer">
                    <input
                      id="hb-enabled"
                      type="checkbox"
                      checked={heartbeatEnabled}
                      onChange={(e) => setHeartbeatEnabled(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Enable heartbeat</span>
                  </Label>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hb-interval">Interval (minutes)</Label>
                    <Input
                      id="hb-interval"
                      type="number"
                      min="5"
                      max="1440"
                      value={heartbeatInterval}
                      onChange={(e) => setHeartbeatInterval(e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hb-start">Active from</Label>
                    <Input
                      id="hb-start"
                      type="time"
                      value={activeHoursStart}
                      onChange={(e) => setActiveHoursStart(e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hb-end">Active until</Label>
                    <Input
                      id="hb-end"
                      type="time"
                      value={activeHoursEnd}
                      onChange={(e) => setActiveHoursEnd(e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hb-checklist">Checklist</Label>
                  <textarea
                    id="hb-checklist"
                    value={heartbeatChecklist}
                    onChange={(e) => setHeartbeatChecklist(e.target.value)}
                    placeholder="- Check unread emails&#10;- Review today's calendar&#10;- Monitor tracked topics"
                    rows={6}
                    className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                  />
                  <p className="text-xs text-muted-foreground">
                    Markdown checklist the agent reviews each heartbeat. You can also use a heartbeat.md file in Google Drive to override this.
                  </p>
                </div>
                <Button onClick={handleSaveHeartbeat} disabled={savingHeartbeat} size="sm">
                  {savingHeartbeat ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save</>}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Model tab */}
        {activeTab === 'model' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Model Selection</CardTitle>
                <CardDescription>Choose which LLM provider and model your agent uses.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="model-select">Model</Label>
                  <div className="relative">
                    <select
                      id="model-select"
                      value={modelId}
                      onChange={(e) => {
                        const selected = MODEL_OPTIONS.find(m => m.id === e.target.value)
                        if (selected) {
                          setModelId(selected.id)
                          setModelProvider(selected.provider)
                        }
                      }}
                      className="w-full h-9 rounded-md border border-border bg-secondary px-3 py-1 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {MODEL_OPTIONS.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Make sure you have the corresponding API key configured in the Integrations tab.
                  </p>
                </div>
                <Button onClick={handleSaveModel} disabled={savingModel} size="sm">
                  {savingModel ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save</>}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tools/Integrations tab */}
        {activeTab === 'tools' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TOOL_DEFINITIONS.map((tool) => {
                const ToolIcon = tool.icon
                const configured = isConfigured(tool.id)
                const decryptError = hasDecryptionError(tool.id)
                const isSelected = selectedToolId === tool.id

                return (
                  <button
                    key={tool.id}
                    onClick={() => handleSelectTool(tool.id)}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : decryptError
                          ? 'border-yellow-500/50 hover:border-yellow-500 hover:bg-yellow-500/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    {configured && (
                      <div className="absolute top-1.5 right-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      </div>
                    )}
                    {decryptError && (
                      <div className="absolute top-1.5 right-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
                      </div>
                    )}
                    <div className={`p-1.5 rounded-md ${tool.bgColor}`}>
                      <ToolIcon className={`h-4 w-4 ${tool.color}`} />
                    </div>
                    <span className="text-xs font-medium leading-tight">{tool.name}</span>
                  </button>
                )
              })}
            </div>

            {selectedTool && (() => {
              const ToolIcon = selectedTool.icon
              const configured = isConfigured(selectedTool.id)
              const decryptError = hasDecryptionError(selectedTool.id)
              const config = getConfig(selectedTool.id)
              const testResult = testResults[selectedTool.id]

              return (
                <div ref={detailRef}>
                  <Card className={`border-border ${configured ? 'border-green-500/30 bg-green-500/[0.02]' : ''}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${selectedTool.bgColor}`}>
                            <ToolIcon className={`h-5 w-5 ${selectedTool.color}`} />
                          </div>
                          <div>
                            <CardTitle>{selectedTool.name}</CardTitle>
                            <CardDescription className="mt-1">{selectedTool.description}</CardDescription>
                          </div>
                        </div>
                        {configured ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 shrink-0">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">Connected</span>
                          </div>
                        ) : decryptError ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 shrink-0">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">Re-entry needed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground shrink-0">
                            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                            <span className="text-xs font-medium">Not configured</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {decryptError && (
                          <div className="p-3 rounded-lg flex items-start gap-2 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
                            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                            <div className="text-sm">
                              <p className="font-medium">Encryption key mismatch</p>
                              <p>The stored credentials cannot be decrypted. This usually means the encryption key changed. Please re-enter your API key and save again.</p>
                            </div>
                          </div>
                        )}
                        {selectedTool.oauth ? (
                          <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" onClick={() => window.location.href = '/api/auth/google'} disabled={configured}>
                                {configured ? <><CheckCircle2 className="h-4 w-4 mr-2" />Connected</> : <><Key className="h-4 w-4 mr-2" />Connect Google Account</>}
                              </Button>
                              {configured && (
                                <Button size="sm" variant="outline" onClick={() => handleTest(selectedTool.id)} disabled={testing[selectedTool.id]}>
                                  {testing[selectedTool.id] ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing...</> : 'Test Connection'}
                                </Button>
                              )}
                            </div>
                            {testResult && (
                              <div className={`p-3 rounded-lg flex items-start gap-2 ${testResult.success ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                                {testResult.success ? <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" /> : <XCircle className="h-5 w-5 mt-0.5 shrink-0" />}
                                <p className="text-sm">{testResult.message}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            {selectedTool.fields.map((field) => {
                              const maskedValue = config?.maskedData?.[field.name]
                              const hasInput = !!(formData[selectedTool.id]?.[field.name])
                              return (
                                <div key={field.name} className="space-y-2">
                                  <Label htmlFor={`${selectedTool.id}-${field.name}`}>{field.label}</Label>
                                  <Input
                                    id={`${selectedTool.id}-${field.name}`}
                                    type={field.type}
                                    placeholder={maskedValue || field.placeholder}
                                    value={formData[selectedTool.id]?.[field.name] || ''}
                                    onChange={(e) => updateFormData(selectedTool.id, field.name, e.target.value)}
                                    className={`bg-secondary border-border ${maskedValue && !hasInput ? 'placeholder:text-foreground/50' : ''}`}
                                  />
                                </div>
                              )
                            })}
                            <div className="flex flex-wrap gap-2 pt-2">
                              <Button size="sm" onClick={() => handleSaveTool(selectedTool.id)} disabled={loading[selectedTool.id] || !formData[selectedTool.id]}>
                                {loading[selectedTool.id] ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Key className="h-4 w-4 mr-2" />{configured ? 'Update' : 'Save Configuration'}</>}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleTest(selectedTool.id)} disabled={!configured || testing[selectedTool.id]}>
                                {testing[selectedTool.id] ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Testing...</> : 'Test Connection'}
                              </Button>
                            </div>
                            {testResult && (
                              <div className={`p-3 rounded-lg flex items-start gap-2 ${testResult.success ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                                {testResult.success ? <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" /> : <XCircle className="h-5 w-5 mt-0.5 shrink-0" />}
                                <p className="text-sm">{testResult.message}</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })()}

            {!selectedTool && (
              <Card className="border-border border-dashed">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground text-sm">Select an integration above to configure it</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Card className="mt-6 border-yellow-500/20 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-600 dark:text-yellow-400">Security</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>API keys are encrypted using AES-GCM before being stored in the database.</p>
            <p>Keys are never exposed to the client and are only used in server-side API routes.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
