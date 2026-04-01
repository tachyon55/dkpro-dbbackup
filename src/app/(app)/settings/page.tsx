import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { NotificationSettingsForm } from "@/components/settings/NotificationSettingsForm"
import { CloudStorageSettingsForm } from "@/components/settings/CloudStorageSettingsForm"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "admin") redirect("/connections")

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-neutral-900 mb-6">설정</h1>
      <Tabs defaultValue="notifications">
        <TabsList className="mb-6">
          <TabsTrigger value="notifications">알림</TabsTrigger>
          <TabsTrigger value="cloud-storage">클라우드 스토리지</TabsTrigger>
        </TabsList>
        <TabsContent value="notifications">
          <NotificationSettingsForm />
        </TabsContent>
        <TabsContent value="cloud-storage">
          <CloudStorageSettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
