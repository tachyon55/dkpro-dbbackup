import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { QueryPageClient } from "@/components/query/QueryPageClient"

export default async function QueryPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const connections = await prisma.dbConnection.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true, color: true },
  })

  const role = (session.user.role ?? "viewer") as "admin" | "operator" | "viewer"

  return <QueryPageClient connections={connections} userRole={role} />
}
