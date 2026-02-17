"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Brain, Mail, Calendar, Search, Briefcase, Newspaper, BookOpen, Zap, ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Agent } from "@/lib/db"

interface Skill {
  id: string
  name: string
  description: string
  tools: string[]
  triggers: ('heartbeat' | 'manual')[]
  instructions: string
}

const SKILL_ICONS: Record<string, any> = {
  'email-digest': Mail,
  'calendar-summary': Calendar,
  'outreach-campaign': Briefcase,
  'job-application': Search,
  'daily-briefing': Newspaper,
  'research-deep-dive': BookOpen,
}

const SKILL_COLORS: Record<string, { text: string; bg: string }> = {
  'email-digest': { text: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' },
  'calendar-summary': { text: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
  'outreach-campaign': { text: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/20' },
  'job-application': { text: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/20' },
  'daily-briefing': { text: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/20' },
  'research-deep-dive': { text: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/20' },
}

const TOOL_LABELS: Record<string, string> = {
  google: 'Google (Gmail + Calendar)',
  firecrawl: 'Firecrawl (Web Research)',
  supermemory: 'Supermemory (Memory)',
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [agentSkills, setAgentSkills] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/skills').then(r => r.json()),
      fetch('/api/agents').then(r => r.json()),
    ]).then(([skillsData, agentsData]) => {
      setSkills(skillsData)
      setAgents(agentsData)
      if (agentsData.length > 0) {
        setSelectedAgentId(agentsData[0].id)
        setAgentSkills(agentsData[0].skills || [])
      }
      setLoading(false)
    }).catch(err => {
      console.error('Failed to load skills/agents:', err)
      setLoading(false)
    })
  }, [])

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId)
    const agent = agents.find(a => a.id === agentId)
    setAgentSkills(agent?.skills || [])
  }

  const handleToggleSkill = async (skillId: string) => {
    if (!selectedAgentId) return
    const enabled = !agentSkills.includes(skillId)
    setToggling(skillId)

    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgentId, skillId, enabled }),
      })
      if (!res.ok) throw new Error('Failed to toggle skill')
      const data = await res.json()
      setAgentSkills(data.skills)
      // Update local agents state
      setAgents(prev => prev.map(a =>
        a.id === selectedAgentId ? { ...a, skills: data.skills } : a
      ))
    } catch (err) {
      console.error('Failed to toggle skill:', err)
    } finally {
      setToggling(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading skills...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Dashboard
                </Button>
              </Link>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">Skills Marketplace</h1>
                <p className="text-xs text-muted-foreground">Enable pre-built capabilities for your agents</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Agent selector */}
        {agents.length > 0 ? (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">SELECT AGENT</h2>
            <div className="flex gap-2 flex-wrap">
              {agents.map(agent => (
                <Button
                  key={agent.id}
                  variant={selectedAgentId === agent.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSelectAgent(agent.id)}
                >
                  <Brain className="h-3 w-3 mr-1" />
                  {agent.name}
                  {(agent.skills?.length || 0) > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {agent.skills.length}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <Card className="mb-6">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-2">No agents yet. Create an agent first to enable skills.</p>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Skills grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map(skill => {
            const Icon = SKILL_ICONS[skill.id] || Zap
            const colors = SKILL_COLORS[skill.id] || { text: 'text-primary', bg: 'bg-primary/10' }
            const isEnabled = agentSkills.includes(skill.id)
            const isToggling = toggling === skill.id

            return (
              <Card
                key={skill.id}
                className={`transition-all ${isEnabled ? 'border-primary shadow-sm' : 'border-border hover:border-primary/50'}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`h-10 w-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${colors.text}`} />
                    </div>
                    <Button
                      size="sm"
                      variant={isEnabled ? "default" : "outline"}
                      disabled={!selectedAgentId || isToggling}
                      onClick={() => handleToggleSkill(skill.id)}
                    >
                      {isToggling ? 'Updating...' : isEnabled ? 'Enabled' : 'Enable'}
                    </Button>
                  </div>
                  <CardTitle className="text-base mt-2">{skill.name}</CardTitle>
                  <CardDescription>{skill.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Required tools */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Required Tools</p>
                      <div className="flex gap-1 flex-wrap">
                        {skill.tools.map(tool => (
                          <Badge key={tool} variant="secondary" className="text-xs">
                            {TOOL_LABELS[tool] || tool}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Triggers */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Triggers</p>
                      <div className="flex gap-1">
                        {skill.triggers.map(trigger => (
                          <Badge key={trigger} variant="outline" className="text-xs">
                            {trigger === 'heartbeat' ? 'Scheduled (Heartbeat)' : 'Manual'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
