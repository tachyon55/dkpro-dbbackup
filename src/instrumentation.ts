export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { recoverOrphanedBackups } = await import("@/lib/backup-store")
    const { loadAllSchedules } = await import("@/lib/scheduler")

    await recoverOrphanedBackups()
    await loadAllSchedules()
  }
}
