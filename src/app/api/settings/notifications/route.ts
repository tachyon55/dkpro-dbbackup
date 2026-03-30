import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { encrypt } from "@/lib/crypto"

// ── GET /api/settings/notifications ──────────────────────────────────────────

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 })
  }

  const settings = await prisma.notificationSettings.findFirst()
  if (!settings) {
    return NextResponse.json({ data: null })
  }

  // Never return sensitive fields to the client — return boolean indicators instead
  const { smtpPassword, slackWebhookUrl, ...safe } = settings
  return NextResponse.json({
    data: {
      ...safe,
      smtpPasswordSet: !!smtpPassword,
      slackWebhookUrlSet: !!slackWebhookUrl,
    },
  })
}

// ── PUT /api/settings/notifications ──────────────────────────────────────────

const settingsSchema = z.object({
  smtpEnabled: z.boolean(),
  smtpHost: z.string().nullable().optional(),
  smtpPort: z.number().int().min(1).max(65535).nullable().optional(),
  smtpUser: z.string().nullable().optional(),
  smtpPassword: z.string().nullable().optional(), // plaintext; encrypt before storing
  smtpFrom: z.string().nullable().optional(),
  notifyEmail: z.string().email().nullable().optional(),
  slackEnabled: z.boolean(),
  slackWebhookUrl: z.string().nullable().optional(), // plaintext; encrypt before storing
  slackChannel: z.string().nullable().optional(),
})

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 })
  }

  const body = await request.json()
  const result = settingsSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
  }

  const validated = result.data
  const existing = await prisma.notificationSettings.findFirst()

  // Pitfall 4: preserve existing encrypted password when client sends null/empty
  const smtpPasswordFinal =
    validated.smtpPassword && validated.smtpPassword.length > 0
      ? encrypt(validated.smtpPassword)
      : (existing?.smtpPassword ?? null)

  const slackWebhookUrlFinal =
    validated.slackWebhookUrl && validated.slackWebhookUrl.length > 0
      ? encrypt(validated.slackWebhookUrl)
      : (existing?.slackWebhookUrl ?? null)

  const data = {
    smtpEnabled: validated.smtpEnabled,
    smtpHost: validated.smtpHost ?? null,
    smtpPort: validated.smtpPort ?? 587,
    smtpUser: validated.smtpUser ?? null,
    smtpPassword: smtpPasswordFinal,
    smtpFrom: validated.smtpFrom ?? null,
    notifyEmail: validated.notifyEmail ?? null,
    slackEnabled: validated.slackEnabled,
    slackWebhookUrl: slackWebhookUrlFinal,
    slackChannel: validated.slackChannel ?? null,
  }

  let updated
  if (existing) {
    updated = await prisma.notificationSettings.update({
      where: { id: existing.id },
      data,
    })
  } else {
    updated = await prisma.notificationSettings.create({ data })
  }

  console.log("[Settings] Notification settings updated by", session.user.email)

  // Return safe representation — never return passwords
  const { smtpPassword: _sp, slackWebhookUrl: _sw, ...safe } = updated
  return NextResponse.json({
    data: {
      ...safe,
      smtpPasswordSet: !!updated.smtpPassword,
      slackWebhookUrlSet: !!updated.slackWebhookUrl,
    },
  })
}
