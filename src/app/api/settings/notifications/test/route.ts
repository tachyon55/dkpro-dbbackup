import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"
import { sendTestEmail, sendTestSlack } from "@/lib/notifications"

const testSchema = z.object({
  channel: z.enum(["email", "slack"]),
})

// ── POST /api/settings/notifications/test ────────────────────────────────────

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 })
  }

  const body = await request.json()
  const result = testSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const { channel } = result.data

  const settings = await prisma.notificationSettings.findFirst()
  if (!settings) {
    return NextResponse.json(
      { error: "알림 설정이 없습니다. 먼저 설정을 저장해주세요." },
      { status: 400 }
    )
  }

  if (channel === "email") {
    if (!settings.smtpHost || !settings.smtpUser || !settings.notifyEmail) {
      return NextResponse.json(
        { error: "SMTP 설정이 완료되지 않았습니다" },
        { status: 400 }
      )
    }

    const password = settings.smtpPassword ? decrypt(settings.smtpPassword) : ""

    try {
      await sendTestEmail({
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort ?? 587,
        smtpUser: settings.smtpUser,
        smtpPassword: password,
        smtpFrom: settings.smtpFrom ?? settings.smtpUser,
        notifyEmail: settings.notifyEmail,
      })
      return NextResponse.json({ data: { success: true } })
    } catch (err) {
      return NextResponse.json(
        { error: `테스트 메일 발송에 실패했습니다: ${(err as Error).message}` },
        { status: 500 }
      )
    }
  }

  // channel === "slack"
  if (!settings.slackWebhookUrl) {
    return NextResponse.json(
      { error: "Slack Webhook URL이 설정되지 않았습니다" },
      { status: 400 }
    )
  }

  const webhookUrl = decrypt(settings.slackWebhookUrl)

  try {
    await sendTestSlack(webhookUrl, settings.slackChannel ?? undefined)
    return NextResponse.json({ data: { success: true } })
  } catch (err) {
    return NextResponse.json(
      { error: `테스트 메시지 발송에 실패했습니다: ${(err as Error).message}` },
      { status: 500 }
    )
  }
}
