"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, X, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Agent } from "@/lib/auth"

interface Message {
  id: string
  role: "user" | "agent"
  content: string
  timestamp: Date
  agentId?: string
}

interface ChatDrawerProps {
  agents: Agent[]
}

export function ChatDrawer({ agents }: ChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  const handleSend = () => {
    if (!input.trim() || !selectedAgentId) return

    const userMessage: Message = {
      id: String(Date.now()),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages([...messages, userMessage])
    setInput("")

    // Mock agent response
    setTimeout(() => {
      const agentMessage: Message = {
        id: String(Date.now() + 1),
        role: "agent",
        content: "I'm processing your request. This is a mock response from the agent.",
        timestamp: new Date(),
        agentId: selectedAgentId,
      }
      setMessages((prev) => [...prev, agentMessage])
    }, 1000)
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
