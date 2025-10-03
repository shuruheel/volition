"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { Sidebar } from "@/components/sidebar"
import { KnowledgeGraph } from "@/components/knowledge-graph"
import { MOCK_GRAPH_NODES, MOCK_GRAPH_RELATIONSHIPS } from "@/lib/mock-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MOCK_AGENTS } from "@/lib/mock-data"

export default function GraphPage() {
  const router = useRouter()
  const [selectedAgentId, setSelectedAgentId] = useState<string>("all")

  useEffect(() => {
    const user = getCurrentUser()
    if (!user) {
      router.push("/login")
    }
  }, [router])

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Knowledge Graph</h1>
              <p className="text-muted-foreground mt-1">Explore the semantic memory of your agents</p>
            </div>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="w-[200px] bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {MOCK_AGENTS.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Nodes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{MOCK_GRAPH_NODES.length}</div>
                <p className="text-xs text-muted-foreground mt-1">In knowledge graph</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Relationships</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{MOCK_GRAPH_RELATIONSHIPS.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Connections made</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Recent Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">3</div>
                <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
              </CardContent>
            </Card>
          </div>

          <KnowledgeGraph nodes={MOCK_GRAPH_NODES} relationships={MOCK_GRAPH_RELATIONSHIPS} />
        </div>
      </main>
    </div>
  )
}
