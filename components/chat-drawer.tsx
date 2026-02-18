"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, X, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Agent } from "@/lib/auth"
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: "user" | "agent"
  content: string
  timestamp: Date
  agentId?: string
}

interface ChatDrawerProps {
  agents: Agent[]
  triggerAgentId?: string | null
}

export function ChatDrawer({ agents, triggerAgentId }: ChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  // SSE stream for activities → build chat messages
  useEffect(() => {
    if (!(isOpen && selectedAgentId)) return
    let closed = false
    type ActivityLite = { id: string; type: string; status: string; created_at: string; payload?: Record<string, unknown> }

    // Maintain a local set of message ids to avoid duplicates on incremental updates
    const seenIds = new Set<string>()
    const emitFrom = (items: ActivityLite[]) => {
      const msgs: Message[] = items
        .sort((a: ActivityLite, b: ActivityLite) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .flatMap((a: ActivityLite) => {
          if (a.type === 'user_input') {
            const payload = (a.payload ?? {}) as Record<string, unknown>
            const question = typeof payload.question === 'string' ? payload.question : 'The agent is asking for more information.'
            const out: Message[] = []
            if (!seenIds.has(a.id)) {
              seenIds.add(a.id)
              out.push({ id: a.id, role: 'agent', content: question, timestamp: new Date(a.created_at) })
            }
            if (a.status !== 'pending' && typeof payload.answer === 'string' && payload.answer.length > 0) {
              const ansId = a.id + ':answer'
              if (!seenIds.has(ansId)) {
                seenIds.add(ansId)
                out.push({ id: ansId, role: 'user', content: payload.answer, timestamp: new Date(a.created_at) })
              }
            }
            return out
          }
          if (a.type === 'user_message') {
            const payload = (a.payload ?? {}) as Record<string, unknown>
            const content = typeof payload.content === 'string' ? payload.content : ''
            if (!content) return []
            if (seenIds.has(a.id)) return []
            seenIds.add(a.id)
            return [{ id: a.id, role: 'user', content, timestamp: new Date(a.created_at) }]
          }
          if (a.type === 'agent_message') {
            const payload = (a.payload ?? {}) as Record<string, unknown>
            const content = typeof payload.content === 'string' ? payload.content : ''
            if (!content) return []
            if (seenIds.has(a.id)) return []
            seenIds.add(a.id)
            return [{ id: a.id, role: 'agent' as const, content, timestamp: new Date(a.created_at) }]
          }
          if (a.type === 'research' && (a.payload as Record<string, unknown> | undefined)?.chatAck) {
            const payload = (a.payload ?? {}) as Record<string, unknown>
            const content = typeof payload.content === 'string' ? payload.content : 'Okay, proceeding.'
            if (seenIds.has(a.id)) return []
            seenIds.add(a.id)
            return [{ id: a.id, role: 'agent', content, timestamp: new Date(a.created_at) }]
          }
          if (a.type === 'post_call_summary') {
            const payload = (a.payload ?? {}) as Record<string, unknown>
            const content = typeof payload.summary === 'string' ? payload.summary : 'Call summary'
            if (seenIds.has(a.id)) return []
            seenIds.add(a.id)
            return [{ id: a.id, role: 'agent', content, timestamp: new Date(a.created_at) }]
          }
          return []
        })
      if (msgs.length > 0) {
        setMessages(prev => {
          const existing = new Set(prev.map(m => m.id))
          const merged = [...prev]
          for (const m of msgs) {
            if (!existing.has(m.id)) merged.push(m)
          }
          // Sort by timestamp to keep order stable
          merged.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
          return merged
        })
      }
    }

    // Prime with an initial snapshot (no loop)
    ;(async () => {
      const types = ['user_input','user_message','agent_message','research','post_call_summary']
      const params = new URLSearchParams({ agentId: selectedAgentId, types: types.join(','), limit: '100' })
      const res = await fetch(`/api/activities?${params.toString()}`)
      const items: ActivityLite[] = await res.json()
      if (!closed) emitFrom(items)
    })()

    // Open SSE
    const types = ['user_input','user_message','agent_message','research','post_call_summary']
    const es = new EventSource(`/api/activities/stream?agentId=${encodeURIComponent(selectedAgentId)}&types=${encodeURIComponent(types.join(','))}&intervalMs=2000`)
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (Array.isArray(data?.items)) emitFrom(data.items)
      } catch {}
    }
    es.onerror = () => {
      es.close()
      // let the effect recreate on next render, or user can toggle drawer
    }

    return () => { closed = true; es.close() }
  }, [isOpen, selectedAgentId])

  // External trigger: open drawer for a specific agent when a pending question appears
  useEffect(() => {
    if (triggerAgentId) {
      setTimeout(() => {
        setSelectedAgentId(triggerAgentId)
        setIsOpen(true)
      }, 0)
    }
  }, [triggerAgentId])

  const handleSend = async () => {
    if (!input.trim() || !selectedAgentId) return
    const content = input.trim()
    setInput("")

    // If there's a pending user_input, answer it (modify + approve)
    try {
      const params = new URLSearchParams({ agentId: selectedAgentId, types: 'user_input', status: 'pending', limit: '1' })
      const pendingRes = await fetch(`/api/activities?${params.toString()}`)
      const pending = await pendingRes.json()
      const latest = Array.isArray(pending) && pending[0]
      if (latest) {
        const newPayload = { ...(latest.payload || {}), answer: content }
        await fetch(`/api/activities/${latest.id}/modify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: newPayload }),
        })
        await fetch(`/api/activities/${latest.id}/approve`, { method: 'POST' })
        return
      }
    } catch {
      // fall through to message creation
    }

    // Otherwise, send as a chat message (stores + triggers workflow if agent is enabled)
    await fetch(`/api/agents/${selectedAgentId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
  }

  return (
    <>
      {/* Floating chat button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
          size="icon"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {/* Chat drawer */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-2xl transition-transform duration-300 z-50",
          isOpen ? "translate-y-0" : "translate-y-full",
        )}
        style={{ height: "400px" }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Chat with Agents</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Agent selector */}
          <div className="flex gap-2 p-3 border-b border-border overflow-x-auto">
            {agents.map((agent) => (
              <Button
                key={agent.id}
                variant={selectedAgentId === agent.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAgentId(agent.id)}
                className="shrink-0"
              >
                {agent.name}
              </Button>
            ))}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p>Select an agent and start chatting</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2",
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                      )}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={selectedAgentId ? "Type a message..." : "Select an agent first"}
                disabled={!selectedAgentId}
                className="bg-secondary border-border"
              />
              <Button onClick={handleSend} disabled={!input.trim() || !selectedAgentId}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
