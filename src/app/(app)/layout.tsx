import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopNav } from "@/components/layout/TopNav"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const role = (session.user.role as "admin" | "operator" | "viewer") ?? "viewer"

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      <Sidebar role={role} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopNav email={session.user.email} role={role} />

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
