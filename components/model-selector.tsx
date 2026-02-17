"use client"

import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-5.2, o3, and other OpenAI models',
    models: [
      { id: 'gpt-5.2-2025-12-11', name: 'GPT-5.2', badge: 'Recommended' },
      { id: 'o3', name: 'o3', badge: 'Reasoning' },
      { id: 'o4-mini', name: 'o4-mini', badge: 'Fast' },
      { id: 'gpt-4.1', name: 'GPT-4.1', badge: null },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', badge: 'Budget' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude Sonnet 4.5, Opus 4.6, and Haiku 4.5',
    models: [
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', badge: 'Recommended' },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', badge: 'Most Capable' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', badge: 'Fast' },
    ],
  },
]

interface ModelSelectorProps {
  provider: string
  modelId: string
  onProviderChange: (provider: string) => void
  onModelChange: (modelId: string) => void
}

export function ModelSelector({ provider, modelId, onProviderChange, onModelChange }: ModelSelectorProps) {
  const selectedProvider = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0]

  return (
    <div className="space-y-4">
      {/* Provider selection */}
      <div>
        <Label className="mb-2 block">Provider</Label>
        <div className="grid grid-cols-2 gap-3">
          {PROVIDERS.map(p => (
            <Card
              key={p.id}
              className={`cursor-pointer transition-all ${
                provider === p.id ? 'border-primary' : 'border-border hover:border-primary/50'
              }`}
              onClick={() => {
                onProviderChange(p.id)
                onModelChange('')  // Reset model when changing provider
              }}
            >
              <CardContent className="p-3">
                <p className="font-medium text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Model selection */}
      <div>
        <Label className="mb-2 block">Model</Label>
        <div className="space-y-2">
          {selectedProvider.models.map(m => (
            <Card
              key={m.id}
              className={`cursor-pointer transition-all ${
                modelId === m.id ? 'border-primary' : 'border-border hover:border-primary/50'
              }`}
              onClick={() => onModelChange(m.id)}
            >
              <CardContent className="p-3 flex items-center justify-between">
                <span className="text-sm font-medium">{m.name}</span>
                {m.badge && (
                  <Badge variant={m.badge === 'Recommended' ? 'default' : 'secondary'} className="text-xs">
                    {m.badge}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        {!modelId && (
          <p className="text-xs text-muted-foreground mt-2">
            No model selected — the provider&apos;s default model will be used.
          </p>
        )}
      </div>
    </div>
  )
}
