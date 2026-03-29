import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isBackupRunning, lockBackup } from "@/lib/backup-store"

// ── POST /api/backups — Trigger a backup job ─────────────────────────────────

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  if (session.user.role === "viewer") {
    return NextResponse.json({ error: "백업 실행 권한이 없습니다" }, { status: 403 })
  }

  const body = await request.json()
  const { connectionId } = body

  if (!connectionId || typeof connectionId !== "string") {
    return NextResponse.json({ error: "connectionId가 필요합니다" }, { status: 400 })
  }

  // Verify the connection exists
  const conn = await prisma.dbConnection.findUnique({
    where: { id: connectionId },
  })

  if (!conn) {
    return NextResponse.json({ error: "연결을 찾을 수 없습니다" }, { status: 404 })
  }

  // Check concurrency — reject if backup already running for this connection
  if (isBackupRunning(connectionId)) {
    return NextResponse.json(
      { error: "이미 백업이 실행 중입니다. 완료 후 다시 시도해주세요." },
      { status: 409 }
    )
  }

  // Create BackupHistory record with status 'running'
  const record = await prisma.backupHistory.create({
    data: {
      connectionId: conn.id,
      connectionName: conn.name,
      dbType: conn.type,
      status: "running",
    },
  })

  // Acquire concurrency lock
  lockBackup(connectionId)

  return NextResponse.json({ data: { jobId: record.id } })
}
