"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export function NotificationSettingsForm() {
  // SMTP state
  const [smtpEnabled, setSmtpEnabled] = useState(false)
  const [smtpHost, setSmtpHost] = useState("")
  const [smtpPort, setSmtpPort] = useState(587)
  const [smtpUser, setSmtpUser] = useState("")
  const [smtpPassword, setSmtpPassword] = useState("")
  const [smtpFrom, setSmtpFrom] = useState("")
  const [notifyEmail, setNotifyEmail] = useState("")
  const [smtpPasswordSet, setSmtpPasswordSet] = useState(false)

  // Slack state
  const [slackEnabled, setSlackEnabled] = useState(false)
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("")
  const [slackChannel, setSlackChannel] = useState("")
  const [slackWebhookUrlSet, setSlackWebhookUrlSet] = useState(false)

  // UI state
  const [loading, setLoading] = useState(true)
  const [savingSmtp, setSavingSmtp] = useState(false)
  const [savingSlack, setSavingSlack] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testingSlack, setTestingSlack] = useState(false)

  // ── Load settings on mount ──────────────────────────────────────────────────

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((res) => res.json())
      .then(({ data }) => {
        if (data) {
          setSmtpEnabled(data.smtpEnabled ?? false)
          setSmtpHost(data.smtpHost ?? "")
          setSmtpPort(data.smtpPort ?? 587)
          setSmtpUser(data.smtpUser ?? "")
          setSmtpFrom(data.smtpFrom ?? "")
          setNotifyEmail(data.notifyEmail ?? "")
          setSmtpPasswordSet(data.smtpPasswordSet ?? false)
          setSlackEnabled(data.slackEnabled ?? false)
          setSlackChannel(data.slackChannel ?? "")
          setSlackWebhookUrlSet(data.slackWebhookUrlSet ?? false)
        }
      })
      .catch(() => toast.error("설정을 불러오는 데 실패했습니다"))
      .finally(() => setLoading(false))
  }, [])

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function buildFullBody() {
    return {
      smtpEnabled,
      smtpHost: smtpHost || null,
      smtpPort,
      smtpUser: smtpUser || null,
      smtpPassword: smtpPassword || null, // empty = preserve existing (Pitfall 4)
      smtpFrom: smtpFrom || null,
      notifyEmail: notifyEmail || null,
      slackEnabled,
      slackWebhookUrl: slackWebhookUrl || null, // empty = preserve existing
      slackChannel: slackChannel || null,
    }
  }

  async function saveSettings() {
    const res = await fetch("/api/settings/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildFullBody()),
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error ?? "저장 실패")
    }
    const { data } = await res.json()
    // Update set-indicators after successful save
    setSmtpPasswordSet(data.smtpPasswordSet ?? false)
    setSlackWebhookUrlSet(data.slackWebhookUrlSet ?? false)
    // Clear sensitive input fields — existing values are preserved server-side
    setSmtpPassword("")
    setSlackWebhookUrl("")
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleSaveSmtp() {
    setSavingSmtp(true)
    try {
      await saveSettings()
      toast.success("이메일 설정이 저장되었습니다")
    } catch (err) {
      toast.error(`설정 저장에 실패했습니다: ${(err as Error).message}`)
    } finally {
      setSavingSmtp(false)
    }
  }

  async function handleSaveSlack() {
    setSavingSlack(true)
    try {
      await saveSettings()
      toast.success("Slack 설정이 저장되었습니다")
    } catch (err) {
      toast.error(`설정 저장에 실패했습니다: ${(err as Error).message}`)
    } finally {
      setSavingSlack(false)
    }
  }

  async function handleTestEmail() {
    setTestingEmail(true)
    try {
      const res = await fetch("/api/settings/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "email" }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(`테스트 메일 발송에 실패했습니다: ${error}`)
      } else {
        toast.success("테스트 메일을 발송했습니다")
      }
    } catch {
      toast.error("테스트 메일 발송에 실패했습니다")
    } finally {
      setTestingEmail(false)
    }
  }

  async function handleTestSlack() {
    setTestingSlack(true)
    try {
      const res = await fetch("/api/settings/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "slack" }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        toast.error(`테스트 메시지 발송에 실패했습니다: ${error}`)
      } else {
        toast.success("테스트 메시지를 발송했습니다")
      }
    } catch {
      toast.error("테스트 메시지 발송에 실패했습니다")
    } finally {
      setTestingSlack(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  return (
    <Tabs defaultValue="email">
      <TabsList>
        <TabsTrigger value="email">이메일 (SMTP)</TabsTrigger>
        <TabsTrigger value="slack">Slack</TabsTrigger>
      </TabsList>

      <TabsContent value="email">
        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Enable toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={smtpEnabled}
                onCheckedChange={setSmtpEnabled}
                aria-label="이메일 알림 활성화"
              />
              <Label>이메일 알림 활성화</Label>
            </div>

            {/* SMTP fields */}
            <div className="space-y-4">
              <div className="text-sm font-semibold text-neutral-900">SMTP 서버 설정</div>

              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP 호스트</Label>
                <Input
                  id="smtpHost"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtpPort">SMTP 포트</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtpUser">사용자명</Label>
                <Input
                  id="smtpUser"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtpPassword">비밀번호</Label>
                <Input
                  id="smtpPassword"
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder={smtpPasswordSet ? "저장된 비밀번호 유지" : "비밀번호 입력"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtpFrom">발신자 이메일</Label>
                <Input
                  id="smtpFrom"
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  placeholder="noreply@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notifyEmail">수신 이메일</Label>
                <Input
                  id="notifyEmail"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleTestEmail}
                disabled={testingEmail || !smtpEnabled}
              >
                {testingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                테스트 메일 발송
              </Button>
              <Button onClick={handleSaveSmtp} disabled={savingSmtp}>
                {savingSmtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                이메일 설정 저장
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="slack">
        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Enable toggle */}
            <div className="flex items-center gap-3">
              <Switch
                checked={slackEnabled}
                onCheckedChange={setSlackEnabled}
                aria-label="Slack 알림 활성화"
              />
              <Label>Slack 알림 활성화</Label>
            </div>

            {/* Slack fields */}
            <div className="space-y-4">
              <div className="text-sm font-semibold text-neutral-900">Slack 설정</div>

              <div className="space-y-2">
                <Label htmlFor="slackWebhookUrl">Webhook URL</Label>
                <Input
                  id="slackWebhookUrl"
                  value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  placeholder={
                    slackWebhookUrlSet
                      ? "설정됨 (변경하려면 새 URL 입력)"
                      : "https://hooks.slack.com/services/..."
                  }
                />
                <p className="text-xs text-neutral-400">
                  Slack 앱에서 Incoming Webhook URL을 복사하세요
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slackChannel">채널</Label>
                <Input
                  id="slackChannel"
                  value={slackChannel}
                  onChange={(e) => setSlackChannel(e.target.value)}
                  placeholder="#backups"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleTestSlack}
                disabled={testingSlack || !slackEnabled}
              >
                {testingSlack && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                테스트 메시지 발송
              </Button>
              <Button onClick={handleSaveSlack} disabled={savingSlack}>
                {savingSlack && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Slack 설정 저장
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
