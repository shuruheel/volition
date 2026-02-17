import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"

export default async function HomePage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  // Check if user has OpenAI key configured
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
