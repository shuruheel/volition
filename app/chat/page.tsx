"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { Sidebar } from "@/components/sidebar"
import { ChatMessage } from "@/components/chat-message"
import { ChatInput } from "@/components/chat-input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface AgentLite { id: string; name: string; status: 'idle'|'active'|'paused'|'error' }

interface Message {
  id: string
  role: "user" | "agent"
  content: string
  timestamp: Date
}

export default function ChatPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<AgentLite[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      router.push("/login")
    }
  }, [router])

  // Load agents
  useEffect(() => {
    fetch('/api/agents')
      .then(res => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.agents || [])
        setAgents(list)
        if (!selectedAgentId && list[0]?.id) setSelectedAgentId(list[0].id)
      })
      .catch(console.error)
  }, [])

  // Poll activities to build messages
  useEffect(() => {
    if (!selectedAgentId) return
    let mounted = true

    const load = async () => {
      const types = ['user_input','user_message','agent_message','post_call_summary']
      const params = new URLSearchParams({ agentId: selectedAgentId, types: types.join(','), limit: '100' })
      const res = await fetch(`/api/activities?${params.toString()}`)
      const items = await res.json()
      if (!mounted) return
      const msgs: Message[] = items
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .flatMap((a: any) => {
          if (a.type === 'user_input') {
            const out: Message[] = [{
              id: a.id,
              role: 'agent',
              content: a.payload?.question || 'The agent is asking for more information.',
              timestamp: new Date(a.created_at),
            }]
            if (a.status !== 'pending' && a.payload?.answer) {
              out.push({ id: a.id+':answer', role: 'user', content: a.payload.answer, timestamp: new Date(a.created_at) })
            }
            return out
          }
          if (a.type === 'user_message') {
            return [{ id: a.id, role: 'user', content: a.payload?.content || '', timestamp: new Date(a.created_at) }]
          }
          if (a.type === 'agent_message') {
            const content = a.payload?.content || ''
            if (!content) return []
            return [{ id: a.id, role: 'agent' as const, content, timestamp: new Date(a.created_at) }]
          }
          // show research only when flagged as chat acknowledgement
          if (a.type === 'research' && a.payload?.chatAck) {
            const content = a.payload?.content || 'Okay, proceeding.'
            return [{ id: a.id, role: 'agent', content, timestamp: new Date(a.created_at) }]
          }
          if (a.type === 'post_call_summary') {
            const content = a.payload?.summary || 'Call summary'
            return [{ id: a.id, role: 'agent', content, timestamp: new Date(a.created_at) }]
          }
          return []
        })
      setMessages(msgs)
      setIsTyping(false)
    }

    load()
    const t = setInterval(load, 3000)
    return () => { mounted = false; clearInterval(t) }
  }, [selectedAgentId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async (content: string) => {
    if (!selectedAgentId) return
    setIsTyping(true)
    try {
      // Try to answer latest pending user_input by modify + approve
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
      } else {
        // Send as a chat message (stores + triggers workflow if agent is enabled)
        await fetch(`/api/agents/${selectedAgentId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })
      }
    } finally {
      setIsTyping(false)
    }
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId)

  const statusColors = {
    active: "bg-green-500/10 text-green-500 border-green-500/20",
    idle: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    paused: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    error: "bg-red-500/10 text-red-500 border-red-500/20",
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="p-8 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Chat with Agent</h1>
              <p className="text-muted-foreground mt-1">Interact with your AI agents in real-time</p>
            </div>
            <div className="flex items-center gap-3">
              {selectedAgent && (
                <Badge variant="outline" className={statusColors[selectedAgent.status]}>
                  {selectedAgent.status}
                </Badge>
              )}
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger className="w-[250px] bg-card border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-8">
          <Card className="h-full border-border flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">Conversation</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
              <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      role={message.role}
                      content={message.content}
                      timestamp={message.timestamp}
                      agentName={selectedAgent?.name}
                    />
                  ))}
                </div>
              </ScrollArea>
              <ChatInput onSend={handleSendMessage} disabled={isTyping || !selectedAgentId} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
