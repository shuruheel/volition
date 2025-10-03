import { cn } from "@/lib/utils"
import { Bot, User } from "lucide-react"

interface ChatMessageProps {
  role: "user" | "agent"
  content: string
  timestamp: Date
  agentName?: string
}

export function ChatMessage({ role, content, timestamp, agentName }: ChatMessageProps) {
  const isAgent = role === "agent"

  return (
    <div className={cn("flex gap-3 mb-4", !isAgent && "flex-row-reverse")}>
      <div
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
          isAgent ? "bg-primary/10" : "bg-secondary",
        )}
      >
        {isAgent ? <Bot className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-foreground" />}
      </div>
      <div className={cn("flex flex-col gap-1 max-w-[70%]", !isAgent && "items-end")}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{isAgent ? agentName || "Agent" : "You"}</span>
          <span>{timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <div
          className={cn(
            "rounded-lg px-4 py-2 text-sm",
            isAgent ? "bg-card border border-border text-foreground" : "bg-primary text-primary-foreground",
          )}
        >
          {content}
        </div>
      </div>
    </div>
  )
}
