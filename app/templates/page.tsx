"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Mail, Search, Briefcase, Newspaper, Brain, Zap } from "lucide-react"
import Link from "next/link"

interface AgentTemplate {
  id: string
  name: string
  description: string
  prompt: string
  tools: string[]
  skills: string[]
  icon: any
  color: string
  bgColor: string
  schedule?: {
    interval_minutes: number
    checklist: string
  }
}

const TEMPLATES: AgentTemplate[] = [
  {
    id: 'email-manager',
    name: 'Email Manager',
    description: 'Triage your inbox, draft responses, and schedule meetings automatically.',
    prompt: `You are an email management assistant. Your job is to:
1. Monitor the user's inbox for new emails
2. Categorize emails by urgency and type (action-required, informational, low-priority)
3. Draft responses for routine emails (meeting confirmations, simple questions)
4. Flag urgent emails that need the user's direct attention
5. Schedule meetings when email threads suggest one is needed
Always get user approval before sending any email or creating calendar events.`,
    tools: ['openai', 'google', 'supermemory'],
    skills: ['email-digest', 'calendar-summary'],
    icon: Mail,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    schedule: {
      interval_minutes: 30,
      checklist: '- [ ] Check inbox for new emails\n- [ ] Categorize and summarize urgent messages\n- [ ] Draft responses for routine emails\n- [ ] Check calendar for scheduling conflicts',
    },
  },
  {
    id: 'research-assistant',
    name: 'Research Assistant',
    description: 'Deep research on any topic with progressive knowledge building across sessions.',
    prompt: `You are a thorough research assistant. Your job is to:
1. Research topics assigned by the user using web search and scraping
2. Build comprehensive knowledge over multiple research sessions
3. Store findings in memory for future reference
4. Synthesize research into clear, actionable summaries
5. Identify knowledge gaps and suggest areas for deeper exploration
Focus on quality over quantity. Cite sources and distinguish facts from opinions.`,
    tools: ['openai', 'firecrawl', 'supermemory'],
    skills: ['research-deep-dive'],
    icon: Search,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20',
  },
  {
    id: 'outreach-agent',
    name: 'Outreach Agent',
    description: 'Research prospects, draft personalized emails, and manage outreach campaigns.',
    prompt: `You are an outreach campaign agent. Your job is to:
1. Read your knowledge.md for the target audience and campaign context
2. Research each prospect (company, role, recent news, common connections)
3. Draft highly personalized outreach emails referencing specific findings
4. Get user approval before sending each email
5. Track responses and follow up on engaged prospects
6. Never send more than 5 outreach emails per run
Always personalize — generic templates get ignored. Reference specific details about the recipient.`,
    tools: ['openai', 'google', 'firecrawl', 'supermemory'],
    skills: ['outreach-campaign'],
    icon: Briefcase,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    schedule: {
      interval_minutes: 120,
      checklist: '- [ ] Check for replies to previous outreach\n- [ ] Research next batch of prospects\n- [ ] Draft personalized emails for approval\n- [ ] Update outreach status in knowledge.md',
    },
  },
  {
    id: 'daily-briefing',
    name: 'Daily Briefing',
    description: 'Morning intelligence briefing from your configured sources, delivered via email.',
    prompt: `You are a daily intelligence briefing agent. Your job is to:
1. Read knowledge.md for topics and sources to monitor
2. Research the latest developments on each topic
3. Check for relevant new emails
4. Synthesize everything into a structured morning briefing
5. Send the briefing via email to the user
Structure: Top headlines, key insights, action items, and a forward-looking section.`,
    tools: ['openai', 'google', 'firecrawl', 'supermemory'],
    skills: ['daily-briefing'],
    icon: Newspaper,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/20',
    schedule: {
      interval_minutes: 1440, // daily
      checklist: '- [ ] Research latest developments on monitored topics\n- [ ] Check emails for relevant updates\n- [ ] Synthesize into structured briefing\n- [ ] Send briefing email to user',
    },
  },
  {
    id: 'job-hunter',
    name: 'Job Hunter',
    description: 'Monitor job listings, research companies, prepare applications, and manage outreach.',
    prompt: `You are a job search assistant. Your job is to:
1. Read knowledge.md for the user's resume highlights and target roles
2. Read preferences.md for job preferences (industries, locations, salary range)
3. Research target companies: culture, tech stack, recent news, open positions
4. Identify the right people to contact (hiring managers, team leads)
5. Draft tailored cover letters and outreach emails
6. Get user approval before any outreach
7. Track application status and follow up on promising leads
Focus on quality applications over volume. Tailor every message to the specific role and company.`,
    tools: ['openai', 'google', 'firecrawl', 'supermemory'],
    skills: ['job-application', 'outreach-campaign'],
    icon: Zap,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    schedule: {
      interval_minutes: 360, // every 6 hours
      checklist: '- [ ] Search for new job listings matching preferences\n- [ ] Research new companies and contacts\n- [ ] Draft outreach for promising opportunities\n- [ ] Check for replies to previous outreach\n- [ ] Update application tracking in knowledge.md',
    },
  },
]

export default function TemplatesPage() {
  const router = useRouter()
  const [creating, setCreating] = useState<string | null>(null)

  const handleUseTemplate = async (template: AgentTemplate) => {
    setCreating(template.id)
    try {
      // Create the agent
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name,
          prompt: template.prompt,
          tools: template.tools,
        }),
      })

      if (!res.ok) throw new Error('Failed to create agent')
      const agent = await res.json()

      // Enable skills
      for (const skillId of template.skills) {
        await fetch('/api/skills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: agent.id, skillId, enabled: true }),
        })
      }

      // Create schedule if template has one
      if (template.schedule) {
        await fetch(`/api/agents/${agent.id}/schedule`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schedule_type: 'interval',
            interval_minutes: template.schedule.interval_minutes,
            checklist: template.schedule.checklist,
            enabled: true,
          }),
        })
      }

      router.push('/dashboard')
    } catch (err) {
      console.error('Failed to create agent from template:', err)
    } finally {
      setCreating(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Dashboard
              </Button>
            </Link>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">Agent Templates</h1>
              <p className="text-xs text-muted-foreground">Start with a pre-configured agent for common use cases</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEMPLATES.map(template => {
            const Icon = template.icon
            const isCreating = creating === template.id

            return (
              <Card key={template.id} className="border-border hover:border-primary/50 transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`h-10 w-10 rounded-lg ${template.bgColor} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${template.color}`} />
                    </div>
                  </div>
                  <CardTitle className="text-base mt-2">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Tools */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Tools</p>
                    <div className="flex gap-1 flex-wrap">
                      {template.tools.map(tool => (
                        <Badge key={tool} variant="secondary" className="text-xs">{tool}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Skills */}
                  {template.skills.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Skills</p>
                      <div className="flex gap-1 flex-wrap">
                        {template.skills.map(skill => (
                          <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Schedule */}
                  {template.schedule && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Schedule</p>
                      <Badge variant="outline" className="text-xs">
                        Every {template.schedule.interval_minutes >= 60
                          ? `${template.schedule.interval_minutes / 60}h`
                          : `${template.schedule.interval_minutes}m`}
                      </Badge>
                    </div>
                  )}

                  <Button
                    className="w-full mt-2"
                    onClick={() => handleUseTemplate(template)}
                    disabled={isCreating}
                  >
                    {isCreating ? 'Creating...' : 'Use Template'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
