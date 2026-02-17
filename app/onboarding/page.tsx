"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Brain, Key, ArrowRight, CheckCircle2 } from "lucide-react"

export default function OnboardingPage() {
  const router = useRouter()
  const [apiKey, setApiKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleSave = async () => {
    if (!apiKey.trim()) return
    setSaving(true)
    setError("")

    try {
      const res = await fetch("/api/settings/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "openai", data: { apiKey: apiKey.trim() } }),
      })

      if (!res.ok) {
        throw new Error("Failed to save API key")
      }

      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg border-border">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">Welcome to Volition</CardTitle>
            <CardDescription>One more step to get your AI agents running</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Google account connected
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Gmail, Calendar, and Drive access granted
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="openai-key" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              OpenAI API Key
            </Label>
            <Input
              id="openai-key"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-secondary border-border"
            />
            <p className="text-xs text-muted-foreground">
              Your API key is encrypted and stored securely. Get one at{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                platform.openai.com/api-keys
              </a>
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            className="w-full gap-2"
            size="lg"
            onClick={handleSave}
            disabled={!apiKey.trim() || saving}
          >
            {saving ? "Saving..." : "Continue to Dashboard"}
            {!saving && <ArrowRight className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => router.push("/dashboard")}
          >
            Skip for now
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
