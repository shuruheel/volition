import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { getOrCreateUserAgent } from "@/lib/agent-helpers"
import { LandingPage } from "@/components/landing-page"

export default async function HomePage() {
  const session = await auth()

  if (session?.user) {
    // Authenticated — check onboarding, then ensure agent exists, redirect to dashboard
    const userId = session.user.id
    if (userId) {
      const configs = await sql`
        SELECT id FROM tool_configs
        WHERE user_id = ${userId} AND tool = 'openai'
      `
      if (configs.length === 0) {
        redirect("/onboarding")
      }

      // Ensure user has an agent (auto-create if needed)
      await getOrCreateUserAgent(userId, session.user.name || undefined)
    }
    redirect("/dashboard")
  }

  // Not authenticated — show landing page
  return <LandingPage />
}
