"use client"

import { Button } from "@/components/ui/button"
import { Brain, LayoutDashboard, MessageSquare, Network, LogOut, Settings } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { logout } from "@/lib/auth"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: MessageSquare, label: "Chat", href: "/chat" },
    { icon: Network, label: "Knowledge Graph", href: "/graph" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ]

  return (
    <div className="flex flex-col h-full w-64 border-r border-border bg-sidebar">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-sidebar-primary/10 flex items-center justify-center">
            <Brain className="h-5 w-5 text-sidebar-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground">Volition</h1>
            <p className="text-xs text-sidebar-foreground/60">Agent Orchestration</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Button
              key={item.href}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
              onClick={() => router.push(item.href)}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}
