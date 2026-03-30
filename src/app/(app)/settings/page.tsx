import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { NotificationSettingsForm } from "@/components/settings/NotificationSettingsForm"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "admin") redirect("/connections")

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-neutral-900 mb-6">설정</h1>
      <NotificationSettingsForm />
    </div>
  )
}
