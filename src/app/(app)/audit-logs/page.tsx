import { redirect } from "next/navigation"
import { auth } from "@/auth"
import AuditLogsPageClient from "./AuditLogsPageClient"

export default async function AuditLogsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "admin") {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 mb-2">감사 로그</h1>
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 mt-4">
          <p className="text-sm text-red-600">권한이 없습니다. 관리자만 접근할 수 있습니다.</p>
        </div>
      </div>
    )
  }

  return <AuditLogsPageClient />
}
