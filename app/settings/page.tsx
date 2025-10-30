"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Brain, Globe, Phone, Mail, Database, Key, CheckCircle2, XCircle, Loader2 } from "lucide-react"

interface ToolConfig {
  id: string
  tool: string
  configured: boolean
  createdAt?: string
  updatedAt?: string
}

const TOOL_DEFINITIONS = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o and other OpenAI models for text generation',
    icon: Brain,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'sk-...' },
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
  {
    id: 'neon',
    name: 'Neon Database',
    description: 'Serverless Postgres database connection',
    icon: Database,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100 dark:bg-teal-900/20',
    fields: [
      { name: 'databaseUrl', label: 'Database URL', type: 'password', placeholder: 'postgresql://...' },
    ],
    info: 'Usually configured via environment variables',
  },
]

export default function SettingsPage() {
  const [configs, setConfigs] = useState<ToolConfig[]>([])
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({})
  const [testing, setTesting] = useState<{ [key: string]: boolean }>({})
  const [testResults, setTestResults] = useState<{ [key: string]: { success: boolean; message?: string } }>({})
  const [formData, setFormData] = useState<{ [key: string]: any }>({})

  useEffect(() => {
    fetchConfigs()
  }, [])

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

  const handleSave = async (toolId: string) => {
    setLoading({ ...loading, [toolId]: true })
    
    try {
      const response = await fetch('/api/settings/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: toolId,
          data: formData[toolId] || {},
        }),
      })

      if (!response.ok) throw new Error('Failed to save configuration')

      await fetchConfigs()
      setFormData({ ...formData, [toolId]: {} }) // Clear form after save
      alert('Configuration saved successfully!')
    } catch (error) {
      console.error('Failed to save tool config:', error)
      alert('Failed to save configuration. Please try again.')
    } finally {
      setLoading({ ...loading, [toolId]: false })
    }
  }

  const handleTest = async (toolId: string) => {
    setTesting({ ...testing, [toolId]: true })
    setTestResults({ ...testResults, [toolId]: { success: false } })

    try {
      const response = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolId }),
      })

      const result = await response.json()

      if (result.success) {
        setTestResults({
          ...testResults,
          [toolId]: { success: true, message: result.message || 'Connection successful!' },
        })
      } else {
        setTestResults({
          ...testResults,
          [toolId]: { success: false, message: result.error || 'Connection failed' },
        })
      }
    } catch (error) {
      setTestResults({
        ...testResults,
        [toolId]: { success: false, message: 'Failed to test connection' },
      })
    } finally {
      setTesting({ ...testing, [toolId]: false })
    }
  }

  const updateFormData = (toolId: string, field: string, value: string) => {
    setFormData({
      ...formData,
      [toolId]: {
        ...(formData[toolId] || {}),
        [field]: value,
      },
    })
  }

  const isConfigured = (toolId: string) => {
    return configs.some((config) => config.tool === toolId && config.configured)
  }

  return (
    <div className="min-h-screen bg-background pb-[80px]">
      <div className="container mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Configure API keys and credentials for tool integrations
          </p>
        </div>

        <div className="space-y-4">
          {TOOL_DEFINITIONS.map((tool) => {
            const ToolIcon = tool.icon
            const configured = isConfigured(tool.id)
            const testResult = testResults[tool.id]

            return (
              <Card key={tool.id} className="border-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${tool.bgColor}`}>
                        <ToolIcon className={`h-5 w-5 ${tool.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle>{tool.name}</CardTitle>
                          {configured && (
                            <Badge variant="outline" className="bg-green-100 dark:bg-green-900/20 text-green-600 border-0">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Configured
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="mt-1">{tool.description}</CardDescription>
                        {tool.info && (
                          <p className="text-xs text-muted-foreground mt-1">ℹ️ {tool.info}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tool.fields.map((field) => (
                      <div key={field.name} className="space-y-2">
                        <Label htmlFor={`${tool.id}-${field.name}`}>{field.label}</Label>
                        <Input
                          id={`${tool.id}-${field.name}`}
                          type={field.type}
                          placeholder={field.placeholder}
                          value={formData[tool.id]?.[field.name] || ''}
                          onChange={(e) => updateFormData(tool.id, field.name, e.target.value)}
                          className="bg-secondary border-border"
                        />
                      </div>
                    ))}

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleSave(tool.id)}
                        disabled={loading[tool.id] || !formData[tool.id]}
                      >
                        {loading[tool.id] ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Key className="h-4 w-4 mr-2" />
                            Save Configuration
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTest(tool.id)}
                        disabled={!configured || testing[tool.id]}
                      >
                        {testing[tool.id] ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          'Test Connection'
                        )}
                      </Button>
                    </div>

                    {testResult && (
                      <div
                        className={`p-3 rounded-lg flex items-start gap-2 ${
                          testResult.success
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {testResult.success ? (
                          <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 mt-0.5 shrink-0" />
                        )}
                        <p className="text-sm">{testResult.message}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card className="mt-6 border-yellow-500/20 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-yellow-600 dark:text-yellow-400">Security Note</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              • API keys are encrypted using AES-GCM before being stored in the database
            </p>
            <p>
              • Keys are never exposed to the client-side and are only used in server-side API routes
            </p>
            <p>
              • For production deployments, consider using environment variables for additional security
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
