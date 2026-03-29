"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Database, Users, Shield, History, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: "/connections", label: "연결 관리", icon: Database },
  { href: "/history", label: "백업 히스토리", icon: History },
  { href: "/users", label: "사용자 관리", icon: Users, adminOnly: true },
  { href: "/audit-logs", label: "감사 로그", icon: Shield, adminOnly: true },
]

interface SidebarProps {
  role: "admin" | "operator" | "viewer"
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || role === "admin"
  )

  return (
    <aside
      className={cn(
        "relative flex flex-col bg-white border-r border-neutral-200 shadow-sm transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* App title */}
      <div className="flex items-center h-16 px-4 border-b border-neutral-200 overflow-hidden">
        <Database className="shrink-0 h-6 w-6 text-indigo-600" />
        {!collapsed && (
          <span className="ml-3 font-semibold text-sm text-neutral-900 whitespace-nowrap">
            DB Backup Manager
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="shrink-0 h-5 w-5" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-20 flex items-center justify-center w-6 h-6 rounded-full bg-white border border-neutral-200 shadow-sm hover:bg-neutral-50 transition-colors"
        aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3 text-neutral-500" />
        ) : (
          <ChevronLeft className="h-3 w-3 text-neutral-500" />
        )}
      </button>
    </aside>
  )
}
