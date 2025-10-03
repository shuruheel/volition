"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { Sidebar } from "@/components/sidebar"
import { ChatMessage } from "@/components/chat-message"
import { ChatInput } from "@/components/chat-input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MOCK_AGENTS } from "@/lib/mock-data"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface Message {
  id: string
  role: "user" | "agent"
  content: string
  timestamp: Date
}

const MOCK_RESPONSES = [
  "I'm analyzing the data you provided. Let me process this information and update the knowledge graph.",
  "Based on my research, I've found several relevant papers on this topic. Would you like me to summarize them?",
  "I've completed the task and added 3 new reasoning chains to the knowledge graph.",
  "I'm currently processing 5 websites related to your query. This may take a few moments.",
  "I've sent outreach emails to 8 potential contacts. I'll monitor for responses.",
]

export default function ChatPage() {
  const router = useRouter()
  const [selectedAgentId, setSelectedAgentId] = useState<string>(MOCK_AGENTS[0]?.id || "")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "agent",
      content: "Hello! I'm ready to assist you. What would you like me to work on?",
      timestamp: new Date(),
    },
  ])
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      router.push("/login")
    }
  }, [router])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: String(Date.now()),
      role: "user",
      content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsTyping(true)

    // Simulate agent response
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const agentMessage: Message = {
      id: String(Date.now() + 1),
      role: "agent",
      content: MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)],
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, agentMessage])
    setIsTyping(false)
  }

  const selectedAgent = MOCK_AGENTS.find((a) => a.id === selectedAgentId)

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
                  {MOCK_AGENTS.map((agent) => (
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
                  {isTyping && (
                    <div className="flex gap-3 mb-4">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10">
                        <div className="flex gap-1">
                          <div
                            className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          />
                          <div
                            className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <div
                            className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <ChatInput onSend={handleSendMessage} disabled={isTyping} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
