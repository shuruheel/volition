"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Subgraph } from "@/lib/mock-data"
import { Network, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface SubgraphCardProps {
  subgraph: Subgraph
  agentName: string
}

export function SubgraphCard({ subgraph, agentName }: SubgraphCardProps) {
  const nodeTypeColors: Record<string, string> = {
    thought: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    reasoning_chain: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    hypothesis: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    evidence: "bg-green-500/10 text-green-500 border-green-500/20",
    proposition: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    conclusion: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  }

  return (
    <Card className="border-border hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{subgraph.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{subgraph.description}</p>
          </div>
          <Badge variant="outline" className="shrink-0">
            {agentName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-secondary/50 rounded-lg border border-border">
          <p className="text-sm text-foreground leading-relaxed">{subgraph.reasoning}</p>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Network className="h-3 w-3" />
            <span>
              {subgraph.nodesAdded} nodes, {subgraph.relationshipsAdded} relationships
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(subgraph.createdAt, { addSuffix: true })}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {subgraph.nodes.map((node) => (
            <Badge key={node.id} variant="outline" className={nodeTypeColors[node.type]}>
              {node.type.replace("_", " ")}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
