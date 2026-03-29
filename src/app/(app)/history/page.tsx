import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { HistoryPageClient } from "./HistoryPageClient"

export default async function HistoryPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return <HistoryPageClient />
}
