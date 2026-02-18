import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { LandingPage } from "@/components/landing-page"

export default async function HomePage() {
  const session = await auth()

  if (session?.user) {
    // Authenticated — check onboarding, then redirect to dashboard
    const userId = session.user.id
    if (userId) {
      const configs = await sql`
        SELECT id FROM tool_configs
        WHERE user_id = ${userId} AND tool = 'openai'
      `
      if (configs.length === 0) {
        redirect("/onboarding")
      }
    }
    redirect("/dashboard")
  }

  // Not authenticated — show landing page
  return <LandingPage />
}
