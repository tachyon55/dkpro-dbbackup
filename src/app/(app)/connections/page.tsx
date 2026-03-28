import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ConnectionsPageClient } from "./ConnectionsPageClient"

export default async function ConnectionsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }
  return <ConnectionsPageClient />
}
