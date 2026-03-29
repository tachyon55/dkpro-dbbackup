import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ConnectionsPageClient } from "./ConnectionsPageClient"

export default async function ConnectionsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }
  const role = (session.user.role ?? "viewer") as "admin" | "operator" | "viewer"
  return <ConnectionsPageClient userRole={role} />
}
