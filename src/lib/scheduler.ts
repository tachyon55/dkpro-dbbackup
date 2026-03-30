import { schedule as cronSchedule } from "node-cron"
import type { ScheduledTask } from "node-cron"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { runRetentionCleanup } from "@/lib/cleanup"

// ── globalThis singleton to survive Next.js hot reload ─────────────────────
declare global {
  // eslint-disable-next-line no-var
  var _cronRegistry: Map<string, ScheduledTask> | undefined
}

export const cronRegistry: Map<string, ScheduledTask> =
  globalThis._cronRegistry ?? (globalThis._cronRegistry = new Map())

// ── Public API ───────────────────────────────────────────────────────────────

export function startSchedule(connectionId: string, hour: number, minute: number): void {
  // Clear any existing task for this connection first
  stopSchedule(connectionId)

  // 6-field cron: seconds minutes hours day-of-month month day-of-week
  const expression = `0 ${minute} ${hour} * * *`
  // node-cron v4: tasks start automatically; timezone passed via options
  const task = cronSchedule(
    expression,
    () => { void runScheduledBackup(connectionId) },
    { timezone: "Asia/Seoul" }
  )

  cronRegistry.set(connectionId, task)
}

export function stopSchedule(connectionId: string): void {
  const task = cronRegistry.get(connectionId)
  if (task) {
    task.stop()
    cronRegistry.delete(connectionId)
  }
}

export async function loadAllSchedules(): Promise<void> {
  const schedules = await prisma.schedule.findMany({
    where: { isEnabled: true },
    include: { connection: true },
  })

  for (const schedule of schedules) {
    startSchedule(schedule.connectionId, schedule.hour, schedule.minute)

    // D-08: Catch-up on restart if enabled and a previous run is known
    if (schedule.catchUpOnRestart && schedule.lastRunAt) {
      const lastExpected = getMostRecentFireTime(schedule.hour, schedule.minute)
      if (lastExpected > schedule.lastRunAt) {
        console.log(
          `[Scheduler] Missed backup detected for ${schedule.connectionId}, running catch-up`
        )
        void runScheduledBackup(schedule.connectionId)
      }
    }
  }

  console.log(`[Scheduler] Loaded ${schedules.length} active schedule(s)`)
}

export async function runScheduledBackup(connectionId: string): Promise<void> {
  // Dynamic imports to avoid circular dependency issues and for Next.js compatibility
  const { isBackupRunning, lockBackup } = await import("@/lib/backup-store")
  const { runBackup } = await import("@/lib/backup-engine")
  const { getBackupDir } = await import("@/lib/backup-tools")

  if (isBackupRunning(connectionId)) {
    console.log(`[Scheduler] Skipping ${connectionId} — backup already in progress`)
    return
  }

  const conn = await prisma.dbConnection.findUnique({ where: { id: connectionId } })
  if (!conn) return

  const schedule = await prisma.schedule.findUnique({ where: { connectionId } })
  if (!schedule) return

  // Determine backup directory — use custom path if configured, else default
  const backupDir = schedule.backupPath ? schedule.backupPath : await getBackupDir(connectionId)
  void backupDir // stored for future per-connection path overrides; runBackup uses getBackupDir internally

  // D-Pitfall-6: Update lastRunAt BEFORE runBackup to prevent duplicate catch-ups on restart
  await prisma.schedule.update({
    where: { connectionId },
    data: { lastRunAt: new Date() },
  })

  // Create BackupHistory record with status 'running'
  const record = await prisma.backupHistory.create({
    data: {
      connectionId,
      connectionName: conn.name,
      dbType: conn.type,
      status: "running",
    },
  })

  lockBackup(connectionId)

  // No-op send function — scheduled backups don't stream to a client
  const noop = () => {}

  try {
    await runBackup(record.id, noop)
    await createAuditLog({
      event: "SCHEDULE_RUN",
      targetId: connectionId,
      metadata: { historyId: record.id, status: "success" },
    })
    const { sendBackupNotification } = await import("@/lib/notifications")
    const completed = await prisma.backupHistory.findUnique({ where: { id: record.id } })
    if (completed) {
      await sendBackupNotification(connectionId, completed).catch((err) =>
        console.error("[Scheduler] Notification failed:", err)
      )
    }
  } catch (err) {
    console.error(`[Scheduler] Backup failed for ${connectionId}:`, err)
    await createAuditLog({
      event: "SCHEDULE_RUN",
      targetId: connectionId,
      metadata: {
        historyId: record.id,
        status: "failed",
        error: (err as Error).message,
      },
    })
    const { sendBackupNotification } = await import("@/lib/notifications")
    const failed = await prisma.backupHistory.findUnique({ where: { id: record.id } })
    await sendBackupNotification(connectionId, failed, err as Error).catch((notifErr) =>
      console.error("[Scheduler] Notification failed:", notifErr)
    )
  } finally {
    // D-06: Cleanup always runs after every scheduled backup regardless of success/failure
    await runRetentionCleanup(connectionId)
  }
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Returns the most recent wall-clock time the cron would have fired at
 * the given hour and minute (local time). If the scheduled time today is
 * still in the future, returns yesterday's fire time.
 */
function getMostRecentFireTime(hour: number, minute: number): Date {
  const now = new Date()
  const today = new Date(now)
  today.setHours(hour, minute, 0, 0)

  if (today > now) {
    return new Date(today.getTime() - 86400000)
  }
  return today
}
