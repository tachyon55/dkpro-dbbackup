import { prisma } from "@/lib/prisma"

// globalThis singleton — survives Next.js hot-reload
declare global {
  // eslint-disable-next-line no-var
  var _backupInProgress: Set<string> | undefined
}

export const inProgressSet: Set<string> =
  globalThis._backupInProgress ?? (globalThis._backupInProgress = new Set())

export function isBackupRunning(connectionId: string): boolean {
  return inProgressSet.has(connectionId)
}

export function lockBackup(connectionId: string): void {
  inProgressSet.add(connectionId)
}

export function unlockBackup(connectionId: string): void {
  inProgressSet.delete(connectionId)
}

/**
 * On server restart, any BackupHistory records with status 'running' are orphaned
 * (the process that was running them is gone). Mark them as failed and clear the lock set.
 */
export async function recoverOrphanedBackups(): Promise<void> {
  const orphans = await prisma.backupHistory.findMany({
    where: { status: "running" },
  })

  if (orphans.length === 0) return

  await prisma.backupHistory.updateMany({
    where: { status: "running" },
    data: {
      status: "failed",
      errorMessage: "서버 재시작으로 인해 중단됨",
      completedAt: new Date(),
    },
  })

  // Clear any stale entries from the in-memory set
  inProgressSet.clear()

  console.log(`[BackupStore] Recovered ${orphans.length} orphaned backup(s)`)
}
