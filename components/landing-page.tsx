"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import {
  Brain,
  Shield,
  Zap,
  Search,
  Mail,
  Calendar,
  MessageSquare,
  Globe,
  Phone,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Clock,
  GitBranch,
  Lock,
  Database,
  FileText,
  AlertCircle,
  XCircle,
} from "lucide-react"

function GradientOrb({ className }: { className?: string }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`}
    />
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient,
}: {
  icon: any
  title: string
  description: string
  gradient: string
}) {
  return (
    <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04]">
      <div
        className={`inline-flex rounded-xl p-3 ${gradient} mb-4`}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/50 leading-relaxed">{description}</p>
    </div>
  )
}

function IntegrationPill({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/70">
      <Icon className={`h-4 w-4 ${color}`} />
      {label}
    </div>
  )
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-white/40">{label}</div>
    </div>
  )
}

function WorkflowStep({
  number,
  title,
  description,
  active,
}: {
  number: number
  title: string
  description: string
  active: boolean
}) {
  return (
    <div
      className={`relative flex gap-4 p-4 rounded-xl transition-all duration-500 ${
        active
          ? "bg-white/[0.06] border border-white/[0.1]"
          : "opacity-50"
      }`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
          active
            ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
            : "bg-white/[0.06] text-white/40"
        }`}
      >
        {number}
      </div>
      <div>
        <h4 className="font-medium text-white text-sm">{title}</h4>
        <p className="text-xs text-white/40 mt-0.5">{description}</p>
      </div>
    </div>
  )
}

/** Mock activity card for the landing page demo */
function MockActivityCard({
  type,
  visible,
}: {
  type: "email" | "research" | "calendar" | "question"
  visible: boolean
}) {
  const configs = {
    email: {
      icon: Mail,
      iconColor: "text-green-400",
      iconBg: "bg-green-500/10",
      label: "Email Draft",
      statusLabel: "Pending Approval",
      statusColor: "text-amber-400",
      statusBg: "bg-amber-500/10",
      StatusIcon: Clock,
      agent: "Research Assistant",
      time: "2 min ago",
      content: (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">To:</span>
            <span className="text-sm text-white/70">team@company.com</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Subject:</span>
            <span className="text-sm text-white/80 font-medium">Q4 Market Analysis Findings</span>
          </div>
          <p className="text-sm text-white/40 leading-relaxed">
            Hi team, attached are the key findings from my competitive analysis. Three emerging trends worth discussing...
          </p>
        </div>
      ),
      actions: true,
    },
    research: {
      icon: FileText,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10",
      label: "Research",
      statusLabel: "Completed",
      statusColor: "text-blue-400",
      statusBg: "bg-blue-500/10",
      StatusIcon: CheckCircle2,
      agent: "Research Assistant",
      time: "5 min ago",
      content: (
        <div className="space-y-2">
          <p className="text-sm font-medium text-white/80">Competitive Landscape Analysis</p>
          <p className="text-sm text-white/40 leading-relaxed">
            Scraped 8 sources across 3 queries. Stored findings in knowledge.md and synced to semantic memory.
          </p>
          <div className="flex gap-1.5 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">Firecrawl</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">3 queries</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">8 sources</span>
          </div>
        </div>
      ),
      actions: false,
    },
    calendar: {
      icon: Calendar,
      iconColor: "text-orange-400",
      iconBg: "bg-orange-500/10",
      label: "Calendar Event",
      statusLabel: "Pending Approval",
      statusColor: "text-amber-400",
      statusBg: "bg-amber-500/10",
      StatusIcon: Clock,
      agent: "Email Manager",
      time: "just now",
      content: (
        <div className="space-y-2">
          <p className="text-sm font-medium text-white/80">Strategy Review Meeting</p>
          <p className="text-sm text-white/50">Tomorrow, 2:00 PM - 3:00 PM</p>
          <p className="text-sm text-white/40">
            Follow-up on competitive analysis findings with product and marketing leads.
          </p>
        </div>
      ),
      actions: true,
    },
    question: {
      icon: MessageSquare,
      iconColor: "text-violet-400",
      iconBg: "bg-violet-500/10",
      label: "Question",
      statusLabel: "Awaiting Response",
      statusColor: "text-amber-400",
      statusBg: "bg-amber-500/10",
      StatusIcon: Clock,
      agent: "Research Assistant",
      time: "1 min ago",
      content: (
        <div className="space-y-3">
          <p className="text-sm text-white/70 leading-relaxed">
            I found 3 interesting angles for the competitive analysis. Which should I prioritize?
          </p>
          <div className="space-y-1.5 pl-0.5">
            <p className="text-sm text-white/50">1. Pricing strategy comparison</p>
            <p className="text-sm text-white/50">2. Feature gap analysis</p>
            <p className="text-sm text-white/50">3. Market positioning shifts</p>
          </div>
          <div className="flex gap-2 pt-1">
            <div className="flex-1 h-8 rounded-lg border border-white/[0.1] bg-white/[0.03] flex items-center px-3">
              <span className="text-xs text-white/30">Type your answer...</span>
            </div>
            <div className="h-8 px-3 rounded-lg bg-white/[0.08] flex items-center">
              <span className="text-xs text-white/40">Send</span>
            </div>
          </div>
        </div>
      ),
      actions: false,
    },
  }

  const c = configs[type]
  const Icon = c.icon
  const StatusIcon = c.StatusIcon

  return (
    <div
      className={`rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden transition-all duration-700 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${c.iconBg}`}>
            <Icon className={`h-4 w-4 ${c.iconColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-semibold text-white">{c.label}</span>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${c.statusBg} ${c.statusColor}`}>
                <StatusIcon className="h-3 w-3" />
                {c.statusLabel}
              </span>
            </div>
            <p className="text-xs text-white/30">{c.agent} &middot; {c.time}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">{c.content}</div>

      {/* HITL Actions */}
      {c.actions && (
        <div className="px-4 pb-3 pt-2 border-t border-white/[0.06] flex gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium cursor-default">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approve
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] text-white/40 text-xs font-medium cursor-default">
            <XCircle className="h-3.5 w-3.5" />
            Reject
          </div>
        </div>
      )}
    </div>
  )
}

export function LandingPage() {
  const [activeStep, setActiveStep] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Cycle through workflow steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 5)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Which cards to show based on active step
  const showResearch = activeStep >= 1
  const showEmail = activeStep >= 2
  const showQuestion = activeStep >= 3
  const showCalendar = activeStep >= 4

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Background effects */}
      <GradientOrb className="w-[600px] h-[600px] bg-violet-600 -top-48 -left-48" />
      <GradientOrb className="w-[500px] h-[500px] bg-indigo-600 top-1/3 -right-32" />
      <GradientOrb className="w-[400px] h-[400px] bg-fuchsia-600 bottom-0 left-1/3" />

      {/* Subtle grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Nav */}
      <nav className="relative z-50 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Volition</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/shuruheel/volition"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/50 hover:text-white transition-colors px-3 py-1.5"
            >
              GitHub
            </a>
            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="text-sm font-medium bg-white text-black px-4 py-2 rounded-lg hover:bg-white/90 transition-colors"
            >
              Start
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl">
            <div
              className={`inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-sm text-white/60 mb-8 transition-all duration-700 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              Open-source AI agent orchestration
            </div>

            <h1
              className={`text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 transition-all duration-700 delay-100 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              AI agents{" "}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
                you can trust
              </span>
            </h1>

            <p
              className={`text-lg text-white/50 max-w-xl mb-10 leading-relaxed transition-all duration-700 delay-200 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              Agents that research, email, and schedule on your behalf — surfacing every action
              in a live activity feed with typed cards you can approve, reject, or answer
              before anything goes out.
            </p>

            <div
              className={`flex flex-wrap gap-4 mb-12 transition-all duration-700 delay-300 ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <button
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/20"
              >
                Get started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <a
                href="https://github.com/shuruheel/volition"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-white/[0.1] hover:border-white/[0.2] text-white/70 hover:text-white font-medium px-6 py-3 rounded-xl transition-all duration-200"
              >
                <GitBranch className="h-4 w-4" />
                View source
              </a>
            </div>

            {/* Hero feature pills */}
            <div
              className={`flex flex-wrap gap-3 transition-all duration-700 delay-[400ms] ${
                mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <div className="flex items-center gap-2 text-sm text-white/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-400/60" />
                Live activity feed
              </div>
              <div className="flex items-center gap-2 text-sm text-white/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-400/60" />
                Human-in-the-loop approval
              </div>
              <div className="flex items-center gap-2 text-sm text-white/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-400/60" />
                Typed activity cards
              </div>
              <div className="flex items-center gap-2 text-sm text-white/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-400/60" />
                Persistent memory
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* See it in action — activity feed + HITL */}
      <section className="relative z-10 pb-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl font-semibold mb-3">See it in action</h2>
              <p className="text-white/40 text-sm mb-8">
                Every agent action flows through your activity feed as a typed card.
                Sensitive actions pause for your approval — nothing goes out without your OK.
              </p>
              <div className="space-y-2">
                <WorkflowStep
                  number={1}
                  title="Enable your agent"
                  description="Introduces itself and asks what you need"
                  active={activeStep === 0}
                />
                <WorkflowStep
                  number={2}
                  title="Research appears in your feed"
                  description="Typed cards show what was scraped, stored, and learned"
                  active={activeStep === 1}
                />
                <WorkflowStep
                  number={3}
                  title="Email draft needs your approval"
                  description="Agent pauses — you approve, edit, or reject before it sends"
                  active={activeStep === 2}
                />
                <WorkflowStep
                  number={4}
                  title="Agent asks a question"
                  description="Chat drawer opens, you answer inline, agent continues"
                  active={activeStep === 3}
                />
                <WorkflowStep
                  number={5}
                  title="Calendar event proposed"
                  description="Review the details, then approve or reject"
                  active={activeStep === 4}
                />
              </div>
            </div>

            {/* Live activity feed preview */}
            <div className="relative">
              <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d14] overflow-hidden shadow-2xl shadow-black/40">
                {/* Feed header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                  <span className="text-sm font-medium text-white/70">Activity Feed</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-white/30">Live</span>
                  </div>
                </div>

                {/* Stacked activity cards */}
                <div className="p-3 space-y-2.5 max-h-[480px] overflow-hidden">
                  <MockActivityCard type="research" visible={showResearch} />
                  <MockActivityCard type="email" visible={showEmail} />
                  <MockActivityCard type="question" visible={showQuestion} />
                  <MockActivityCard type="calendar" visible={showCalendar} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core features */}
      <section className="relative z-10 py-24 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-3">Everything agents need</h2>
            <p className="text-white/40 max-w-lg">
              Not just another chatbot wrapper. Volition provides the infrastructure
              for agents that run autonomously, remember everything, and respect your authority.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={Zap}
              title="Durable Execution"
              description="Vercel Workflow gives each step automatic retries and resumability. If a step fails at 2 AM, it picks up where it left off."
              gradient="bg-gradient-to-br from-amber-500/80 to-orange-600/80"
            />
            <FeatureCard
              icon={Shield}
              title="Human-in-the-Loop"
              description="Typed activity cards for every action. Emails, calendar events, and calls all pause for your approval. You stay in control."
              gradient="bg-gradient-to-br from-emerald-500/80 to-green-600/80"
            />
            <FeatureCard
              icon={Database}
              title="Persistent Memory"
              description="Dynamic memory files stored in your Google Drive. Agents remember personality, preferences, knowledge, and journal entries across sessions."
              gradient="bg-gradient-to-br from-violet-500/80 to-purple-600/80"
            />
            <FeatureCard
              icon={Search}
              title="Semantic Memory Search"
              description="Agents semantically search across all their memory files using Supermemory. No more digging through giant files to find relevant context."
              gradient="bg-gradient-to-br from-blue-500/80 to-cyan-600/80"
            />
            <FeatureCard
              icon={Clock}
              title="Background Heartbeats"
              description="Agents check in on configurable schedules. They review their task list, act if needed, and report all-clear if not. No wasted cycles."
              gradient="bg-gradient-to-br from-pink-500/80 to-rose-600/80"
            />
            <FeatureCard
              icon={Lock}
              title="Multi-User Security"
              description="Per-user encrypted API keys, ownership checks on every API route, Google Drive isolation. Your data never leaks to other users."
              gradient="bg-gradient-to-br from-indigo-500/80 to-blue-600/80"
            />
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="relative z-10 py-24 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Connects to your stack</h2>
            <p className="text-white/40 max-w-lg mx-auto">
              Every integration supports per-user encrypted API keys. Configure once in Settings,
              your agents handle the rest.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <IntegrationPill icon={Brain} label="OpenAI" color="text-green-400" />
            <IntegrationPill icon={Brain} label="Anthropic" color="text-orange-400" />
            <IntegrationPill icon={Search} label="Firecrawl" color="text-amber-400" />
            <IntegrationPill icon={Database} label="Supermemory" color="text-purple-400" />
            <IntegrationPill icon={Mail} label="Gmail" color="text-red-400" />
            <IntegrationPill icon={Calendar} label="Google Calendar" color="text-blue-400" />
            <IntegrationPill icon={Database} label="Google Drive" color="text-yellow-400" />
            <IntegrationPill icon={MessageSquare} label="Telegram" color="text-sky-400" />
            <IntegrationPill icon={Globe} label="Browser-Use" color="text-cyan-400" />
            <IntegrationPill icon={Phone} label="Twilio" color="text-rose-400" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 py-20 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatBlock value="17+" label="Workflow tools" />
            <StatBlock value="6" label="Built-in skills" />
            <StatBlock value="5" label="Agent templates" />
            <StatBlock value="10" label="Integrations" />
          </div>
        </div>
      </section>

      {/* Templates preview */}
      <section className="relative z-10 py-24 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-3">Start in seconds</h2>
            <p className="text-white/40 max-w-lg">
              Pre-built agent templates with tools, skills, and schedules already configured.
              Enable and go.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                name: "Research Assistant",
                description: "Deep multi-session research on any topic. Plans queries, scrapes the web, stores findings in semantic memory.",
                tools: ["Firecrawl", "Supermemory", "Drive"],
              },
              {
                name: "Email Manager",
                description: "Triages inbox, drafts responses, schedules meetings. Checks in every 30 minutes.",
                tools: ["Gmail", "Calendar", "Drive"],
              },
              {
                name: "Outreach Agent",
                description: "Researches prospects, crafts personalized outreach emails. Runs on a 2-hour heartbeat.",
                tools: ["Firecrawl", "Gmail", "Drive"],
              },
              {
                name: "Daily Briefing",
                description: "Morning intelligence briefing from configured sources. Delivered daily via email.",
                tools: ["Firecrawl", "Gmail", "Drive"],
              },
              {
                name: "Job Hunter",
                description: "Monitors job listings, researches companies, prepares applications. 6-hour heartbeat.",
                tools: ["Firecrawl", "Gmail", "Drive"],
              },
            ].map((template) => (
              <div
                key={template.name}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.12] transition-colors"
              >
                <h3 className="font-semibold text-white mb-2">{template.name}</h3>
                <p className="text-sm text-white/40 mb-4 leading-relaxed">
                  {template.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {template.tools.map((tool) => (
                    <span
                      key={tool}
                      className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-white/50"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to put AI to work?
          </h2>
          <p className="text-white/40 mb-8 max-w-lg mx-auto">
            Deploy your own instance in minutes. Open-source, self-hostable, and built for teams
            that need agents they can actually trust.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/20"
            >
              Start building
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <a
              href="https://github.com/shuruheel/volition"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/[0.1] hover:border-white/[0.2] text-white/70 hover:text-white font-medium px-8 py-3.5 rounded-xl transition-all duration-200"
            >
              <GitBranch className="h-4 w-4" />
              Star on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/30 text-sm">
            <Brain className="h-4 w-4" />
            Volition
          </div>
          <div className="flex items-center gap-6 text-sm text-white/30">
            <a
              href="https://github.com/shuruheel/volition"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/60 transition-colors"
            >
              GitHub
            </a>
            <span>MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
