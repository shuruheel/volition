"use client"

import { useState } from "react"
import { Network, CheckCircle2, XCircle, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { RecentActivity, ResearchActivity } from "@/lib/mock-data"

interface ResearchActivityCardProps {
  activity: RecentActivity
}

export function ResearchActivityCard({ activity }: ResearchActivityCardProps) {
  const data = activity.data as ResearchActivity
  const { subgraph } = data
  const [userInput, setUserInput] = useState("")
  const [showInput, setShowInput] = useState(activity.status === "pending")

  const needsUserInput = activity.status === "pending"
  const researchOptions = [
    "Continue with mechanistic interpretability focus",
    "Pivot to explore adversarial robustness approaches",
    "Investigate both paths in parallel with separate sub-agents",
  ]

  const handleApprove = (option?: string) => {
    console.log("[v0] Research approved:", option || "continue")
    setShowInput(false)
  }

  const handleReject = () => {
    console.log("[v0] Research rejected")
    setShowInput(false)
  }

  const handleCustomInput = () => {
    console.log("[v0] Custom research direction:", userInput)
    setShowInput(false)
  }

  const nodeTypeColors: Record<string, string> = {
    thought: "bg-blue-500/20 border-blue-500/40 text-blue-400",
    reasoning_chain: "bg-purple-500/20 border-purple-500/40 text-purple-400",
    hypothesis: "bg-cyan-500/20 border-cyan-500/40 text-cyan-400",
    evidence: "bg-green-500/20 border-green-500/40 text-green-400",
    proposition: "bg-yellow-500/20 border-yellow-500/40 text-yellow-400",
    conclusion: "bg-orange-500/20 border-orange-500/40 text-orange-400",
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg mb-2">{subgraph.title}</h3>
        <p className="text-sm text-muted-foreground mb-3">{subgraph.description}</p>
      </div>

      <div className="p-4 bg-secondary/50 rounded-lg border border-border">
        <p className="text-sm text-foreground leading-relaxed">{subgraph.reasoning}</p>
      </div>

      <div className="p-6 bg-card rounded-lg border border-border">
        <div className="flex flex-wrap gap-3 items-center justify-center">
          {subgraph.nodes.map((node, idx) => (
            <div key={node.id} className="flex items-center gap-2">
              <div
                className={`px-3 py-2 rounded-md border text-xs font-medium ${nodeTypeColors[node.type]}`}
                title={node.content}
              >
                {node.label}
              </div>
              {idx < subgraph.nodes.length - 1 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <div className="w-8 h-px bg-border" />
                  <span className="text-[10px]">
                    {subgraph.relationships.find((r) => r.source === node.id)?.type || "→"}
                  </span>
                  <div className="w-8 h-px bg-border" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {needsUserInput && showInput && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg space-y-4">
          <div className="flex items-start gap-2">
            <MessageSquare className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-2">Agent needs your input</h4>
              <p className="text-sm text-muted-foreground mb-3">
                I've reached a decision point in my research. Which direction should I take next?
              </p>

              <div className="space-y-2 mb-4">
                {researchOptions.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApprove(option)}
                    className="w-full text-left p-3 rounded-md bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 transition-colors text-sm"
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Or provide custom direction:</label>
                <Textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Describe the research direction you'd like me to pursue..."
                  className="min-h-[80px] text-sm"
                />
                <div className="flex gap-2">
                  <Button onClick={handleCustomInput} disabled={!userInput.trim()} size="sm">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Submit Direction
                  </Button>
                  <Button onClick={handleReject} variant="outline" size="sm">
                    <XCircle className="h-4 w-4 mr-1" />
                    Pause Research
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1">
          <Network className="h-3 w-3" />
          <span>
            {subgraph.nodesAdded} nodes, {subgraph.relationshipsAdded} relationships
          </span>
        </div>
      </div>
    </div>
  )
}
