export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { recoverOrphanedBackups } = await import("@/lib/backup-store")
    const { loadAllSchedules } = await import("@/lib/scheduler")

    try {
      await recoverOrphanedBackups()
      await loadAllSchedules()
    } catch (err) {
      console.error("[instrumentation] DB not ready at startup — skipping recovery:", err)
    }
  }
}
