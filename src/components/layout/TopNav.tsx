import { signOut } from "@/auth"
import { cn } from "@/lib/utils"

const roleBadgeColor: Record<string, string> = {
  admin: "bg-red-100 text-red-700 border-red-200",
  operator: "bg-blue-100 text-blue-700 border-blue-200",
  viewer: "bg-neutral-100 text-neutral-600 border-neutral-200",
}

const roleLabel: Record<string, string> = {
  admin: "관리자",
  operator: "운영자",
  viewer: "조회자",
}

interface TopNavProps {
  email: string | null | undefined
  role: "admin" | "operator" | "viewer"
}

export function TopNav({ email, role }: TopNavProps) {
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-neutral-200">
      <div />

      <div className="flex items-center gap-4">
        {/* Role badge */}
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
            roleBadgeColor[role] ?? roleBadgeColor.viewer
          )}
        >
          {roleLabel[role] ?? role}
        </span>

        {/* User email */}
        <span className="text-sm text-neutral-600">{email}</span>

        {/* Logout */}
        <form
          action={async () => {
            "use server"
            await signOut({ redirectTo: "/login" })
          }}
        >
          <button
            type="submit"
            className="text-sm text-neutral-500 hover:text-neutral-900 hover:underline transition-colors"
          >
            로그아웃
          </button>
        </form>
      </div>
    </header>
  )
}
