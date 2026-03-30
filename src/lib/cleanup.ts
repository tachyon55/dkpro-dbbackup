import { unlink } from "fs/promises"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

/**
 * Delete backup history records (and their files) older than the configured
 * retentionDays for the given connection.
 *
 * Safety guard (D-07): Always preserves the most recent successful backup
 * even if it falls outside the retention window.
 */
export async function runRetentionCleanup(connectionId: string): Promise<void> {
  const schedule = await prisma.schedule.findUnique({ where: { connectionId } })
  if (!schedule) return

  const cutoff = new Date(Date.now() - schedule.retentionDays * 86400000)

  // Safety guard: find the most recent successful backup to protect it
  const lastSuccess = await prisma.backupHistory.findFirst({
    where: { connectionId, status: "success" },
    orderBy: { startedAt: "desc" },
  })

  // Build candidate query — records older than cutoff, excluding the protected record
  const candidateWhere: Prisma.BackupHistoryWhereInput = {
    connectionId,
    startedAt: { lt: cutoff },
    ...(lastSuccess ? { id: { not: lastSuccess.id } } : {}),
  }

  const candidates = await prisma.backupHistory.findMany({ where: candidateWhere })

  for (const record of candidates) {
    if (record.filePath) {
      try {
        await unlink(record.filePath)
      } catch {
        // File may already be gone — not an error
      }
    }
    await prisma.backupHistory.delete({ where: { id: record.id } })
  }

  if (candidates.length > 0) {
    console.log(`[Cleanup] Deleted ${candidates.length} old backup(s) for ${connectionId}`)
  }
}
