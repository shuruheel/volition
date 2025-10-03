"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { KnowledgeGraphNode, KnowledgeGraphRelationship } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"

interface KnowledgeGraphProps {
  nodes: KnowledgeGraphNode[]
  relationships: KnowledgeGraphRelationship[]
}

interface Position {
  x: number
  y: number
}

const nodeColors = {
  thought: "#60a5fa",
  reasoning_chain: "#a78bfa",
  hypothesis: "#f472b6",
  evidence: "#34d399",
  proposition: "#fbbf24",
  conclusion: "#fb923c",
}

const nodeLabels = {
  thought: "Thought",
  reasoning_chain: "Reasoning",
  hypothesis: "Hypothesis",
  evidence: "Evidence",
  proposition: "Proposition",
  conclusion: "Conclusion",
}

export function KnowledgeGraph({ nodes, relationships }: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null)
  const [nodePositions, setNodePositions] = useState<Map<string, Position>>(new Map())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Initialize node positions in a circular layout
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const radius = Math.min(rect.width, rect.height) * 0.35

    const positions = new Map<string, Position>()
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI
      positions.set(node.id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      })
    })
    setNodePositions(positions)

    // Draw relationships (edges)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
    ctx.lineWidth = 2
    relationships.forEach((rel) => {
      const sourcePos = positions.get(rel.source)
      const targetPos = positions.get(rel.target)
      if (sourcePos && targetPos) {
        ctx.beginPath()
        ctx.moveTo(sourcePos.x, sourcePos.y)
        ctx.lineTo(targetPos.x, targetPos.y)
        ctx.stroke()
      }
    })

    // Draw nodes
    nodes.forEach((node) => {
      const pos = positions.get(node.id)
      if (!pos) return

      const color = nodeColors[node.type]
      const nodeRadius = 30

      // Draw node circle
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, nodeRadius, 0, 2 * Math.PI)
      ctx.fillStyle = color + "40"
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw node label
      ctx.fillStyle = "#ffffff"
      ctx.font = "10px sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      const label = nodeLabels[node.type]
      ctx.fillText(label, pos.x, pos.y)
    })
  }, [nodes, relationships])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if click is on a node
    for (const node of nodes) {
      const pos = nodePositions.get(node.id)
      if (!pos) continue

      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2)
      if (distance < 30) {
        setSelectedNode(node)
        return
      }
    }

    setSelectedNode(null)
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base">Knowledge Graph</CardTitle>
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(nodeLabels).map(([type, label]) => (
            <Badge
              key={type}
              variant="outline"
              style={{
                backgroundColor: nodeColors[type as keyof typeof nodeColors] + "20",
                borderColor: nodeColors[type as keyof typeof nodeColors],
                color: nodeColors[type as keyof typeof nodeColors],
              }}
            >
              {label}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full h-[500px] bg-card rounded-lg cursor-pointer"
            onClick={handleCanvasClick}
          />
          {selectedNode && (
            <div className="absolute top-4 right-4 bg-card border border-border rounded-lg p-4 max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="outline"
                  style={{
                    backgroundColor: nodeColors[selectedNode.type] + "20",
                    borderColor: nodeColors[selectedNode.type],
                    color: nodeColors[selectedNode.type],
                  }}
                >
                  {nodeLabels[selectedNode.type]}
                </Badge>
              </div>
              <p className="text-sm text-foreground font-medium mb-1">{selectedNode.label}</p>
              <p className="text-xs text-muted-foreground">Created {selectedNode.createdAt.toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
