import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DashboardClient } from "@/components/dashboard/DashboardClient"

function getNextFireTime(hour: number, minute: number): Date {
  const now = new Date()
  const candidate = new Date(now)
  candidate.setHours(hour, minute, 0, 0)
  if (candidate <= now) candidate.setDate(candidate.getDate() + 1)
  return candidate
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    totalConnections,
    todaySuccess,
    todayFailed,
    enabledSchedules,
    recentHistory,
    connectionStatuses,
  ] = await Promise.all([
    prisma.dbConnection.count(),
    prisma.backupHistory.count({
      where: { status: "success", startedAt: { gte: today } },
    }),
    prisma.backupHistory.count({
      where: { status: "failed", startedAt: { gte: today } },
    }),
    prisma.schedule.findMany({
      where: { isEnabled: true },
      select: {
        hour: true,
        minute: true,
        connection: { select: { name: true } },
      },
    }),
    prisma.backupHistory.findMany({
      take: 10,
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        connectionName: true,
        dbType: true,
        status: true,
        fileName: true,
        fileSizeBytes: true,
        startedAt: true,
        durationMs: true,
      },
    }),
    prisma.dbConnection.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        color: true,
        backupHistories: {
          take: 1,
          orderBy: { startedAt: "desc" },
          select: { status: true, startedAt: true },
        },
      },
    }),
  ])

  const nextSchedule =
    enabledSchedules.length > 0
      ? enabledSchedules
          .map((s) => ({
            connectionName: s.connection.name,
            nextFire: getNextFireTime(s.hour, s.minute),
          }))
          .sort((a, b) => a.nextFire.getTime() - b.nextFire.getTime())[0]
      : null

  return (
    <DashboardClient
      totalConnections={totalConnections}
      todaySuccess={todaySuccess}
      todayFailed={todayFailed}
      nextSchedule={
        nextSchedule
          ? {
              connectionName: nextSchedule.connectionName,
              nextFire: nextSchedule.nextFire.toISOString(),
            }
          : null
      }
      recentHistory={recentHistory.map((h) => ({
        id: h.id,
        connectionName: h.connectionName,
        dbType: h.dbType,
        status: h.status,
        fileName: h.fileName,
        fileSizeBytes: h.fileSizeBytes !== null ? h.fileSizeBytes.toString() : null,
        startedAt: h.startedAt.toISOString(),
        durationMs: h.durationMs,
      }))}
      connectionStatuses={connectionStatuses.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        color: c.color,
        latestBackup:
          c.backupHistories.length > 0
            ? {
                status: c.backupHistories[0].status,
                startedAt: c.backupHistories[0].startedAt.toISOString(),
              }
            : null,
      }))}
    />
  )
}
