"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { Sidebar } from "@/components/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function GraphPage() {
  const router = useRouter()

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
            <Badge variant="outline" className="text-sm">Coming Soon</Badge>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Graph Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-4">&#x1F9E0;</div>
                <h3 className="text-lg font-medium text-foreground mb-2">Knowledge Graph Coming Soon</h3>
                <p className="text-muted-foreground max-w-md">
                  This page will visualize the semantic relationships between research documents stored in Supermemory.
                  Agent memories are already being collected — the visualization layer is under development.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
