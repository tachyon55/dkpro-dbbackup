import { createTransport } from "nodemailer"
import { prisma } from "@/lib/prisma"
import { decrypt } from "@/lib/crypto"
import { createAuditLog } from "@/lib/audit"
import type { BackupHistory } from "@prisma/client"

// ── HTML escape helper ────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// ── Email body builder ────────────────────────────────────────────────────────

export function buildEmailBody(
  history: BackupHistory | null,
  error?: Error,
  uploadFailed?: boolean
): string {
  const connectionName = escapeHtml(history?.connectionName ?? "알 수 없음")
  const errorMessage = escapeHtml(error?.message ?? history?.errorMessage ?? "알 수 없는 오류")
  const isSuccess = history?.status === "success"

  if (!isSuccess) {
    const startedAt = history?.startedAt
      ? new Date(history.startedAt).toLocaleString("ko-KR")
      : "-"
    return `
<h2>백업 실패</h2>
<p><strong>연결명:</strong> ${connectionName}</p>
<p><strong>오류:</strong> ${errorMessage}</p>
<p><strong>시작:</strong> ${startedAt}</p>
`.trim()
  }

  const fileName = escapeHtml(history?.fileName ?? "-")
  const mb =
    history?.fileSizeBytes != null
      ? (Number(history.fileSizeBytes) / 1024 / 1024).toFixed(2)
      : "-"
  const sec =
    history?.durationMs != null ? (history.durationMs / 1000).toFixed(1) : "-"

  const uploadWarning = uploadFailed
    ? "\n<p><strong>⚠️ S3 업로드에 실패했습니다</strong></p>"
    : ""

  return `
<h2>백업 성공</h2>
<p><strong>연결명:</strong> ${connectionName}</p>
<p><strong>파일:</strong> ${fileName}</p>
<p><strong>크기:</strong> ${mb} MB</p>
<p><strong>소요시간:</strong> ${sec}초</p>${uploadWarning}
`.trim()
}

// ── Slack message builder ─────────────────────────────────────────────────────

export function buildSlackMessage(
  history: BackupHistory | null,
  error?: Error,
  uploadFailed?: boolean
): string {
  const connectionName = history?.connectionName ?? "알 수 없음"
  const isSuccess = history?.status === "success"

  if (!isSuccess) {
    const errorMessage = error?.message ?? history?.errorMessage ?? "알 수 없는 오류"
    return `백업 실패: ${connectionName} - ${errorMessage}`
  }

  const mb =
    history?.fileSizeBytes != null
      ? (Number(history.fileSizeBytes) / 1024 / 1024).toFixed(2)
      : "-"
  const sec =
    history?.durationMs != null ? (history.durationMs / 1000).toFixed(1) : "-"

  const uploadSuffix = uploadFailed ? " ⚠️ S3 업로드에 실패했습니다" : ""

  return `백업 성공: ${connectionName} (${mb}MB, ${sec}초)${uploadSuffix}`
}

// ── Internal send helpers ─────────────────────────────────────────────────────

async function sendEmail(
  settings: {
    smtpHost: string | null
    smtpPort: number | null
    smtpUser: string | null
    smtpPassword: string | null
    smtpFrom: string | null
    notifyEmail: string | null
  },
  subject: string,
  html: string
): Promise<void> {
  const password = settings.smtpPassword ? decrypt(settings.smtpPassword) : ""
  const transporter = createTransport({
    host: settings.smtpHost!,
    port: settings.smtpPort ?? 587,
    secure: (settings.smtpPort ?? 587) === 465,
    auth: { user: settings.smtpUser ?? "", pass: password },
  })
  await transporter.sendMail({
    from: settings.smtpFrom ?? settings.smtpUser ?? "",
    to: settings.notifyEmail!,
    subject,
    html,
  })
}

async function sendSlack(
  settings: { slackWebhookUrl: string | null; slackChannel: string | null },
  text: string
): Promise<void> {
  const webhookUrl = decrypt(settings.slackWebhookUrl!)
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, channel: settings.slackChannel || undefined }),
  })
  if (!res.ok) throw new Error(`Slack webhook returned ${res.status}`)
}

// ── Test helpers (called from /api/settings/notifications/test) ───────────────

export async function sendTestEmail(settings: {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  smtpFrom: string
  notifyEmail: string
}): Promise<void> {
  const transporter = createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465,
    auth: { user: settings.smtpUser, pass: settings.smtpPassword },
  })
  await transporter.sendMail({
    from: settings.smtpFrom,
    to: settings.notifyEmail,
    subject: "[DB Backup] 테스트 메일",
    html: "<p>이 메일은 DB Backup Manager의 테스트 메일입니다.</p>",
  })
}

export async function sendTestSlack(webhookUrl: string, channel?: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "DB Backup Manager 테스트 메시지입니다.",
      channel: channel || undefined,
    }),
  })
  if (!res.ok) throw new Error(`Slack webhook returned ${res.status}`)
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function sendBackupNotification(
  connectionId: string,
  history: BackupHistory | null,
  error?: Error,
  uploadFailed?: boolean  // D-06: append "(S3 업로드 실패)" to subject/message if true
): Promise<void> {
  // Check per-connection notification flag (NOTF-04)
  const schedule = await prisma.schedule.findUnique({ where: { connectionId } })
  if (!schedule?.notificationsEnabled) return

  // Load global notification settings
  const settings = await prisma.notificationSettings.findFirst()
  if (!settings) return

  const status = history?.status === "success" ? "성공" : "실패"
  const uploadSuffix = uploadFailed ? " (S3 업로드 실패)" : ""
  const subject = `[DB Backup] ${history?.connectionName ?? connectionId} 백업 ${status}${uploadSuffix}`

  // Send email if configured
  if (settings.smtpEnabled && settings.smtpHost && settings.notifyEmail) {
    try {
      await sendEmail(settings, subject, buildEmailBody(history, error, uploadFailed))
      await createAuditLog({
        event: "NOTIF_SENT",
        targetId: connectionId,
        metadata: { channel: "email" },
      })
    } catch (err) {
      console.error("[Notification] Email send failed:", err)
      await createAuditLog({
        event: "NOTIF_FAIL",
        targetId: connectionId,
        metadata: { channel: "email", error: (err as Error).message },
      })
    }
  }

  // Send Slack if configured
  if (settings.slackEnabled && settings.slackWebhookUrl) {
    try {
      await sendSlack(settings, buildSlackMessage(history, error, uploadFailed))
      await createAuditLog({
        event: "NOTIF_SENT",
        targetId: connectionId,
        metadata: { channel: "slack" },
      })
    } catch (err) {
      console.error("[Notification] Slack send failed:", err)
      await createAuditLog({
        event: "NOTIF_FAIL",
        targetId: connectionId,
        metadata: { channel: "slack", error: (err as Error).message },
      })
    }
  }
}
