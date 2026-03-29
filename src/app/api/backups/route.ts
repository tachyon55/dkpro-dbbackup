import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma, BackupStatus } from "@prisma/client"
import { isBackupRunning, lockBackup } from "@/lib/backup-store"

// ── GET /api/backups — Paginated backup history list with filters ──────────────

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })
  }

  const { searchParams } = request.nextUrl

  const connectionId = searchParams.get("connectionId") || undefined
  const statusParam = searchParams.get("status") || undefined
  const startDate = searchParams.get("startDate") || undefined
  const endDate = searchParams.get("endDate") || undefined
  const cursor = searchParams.get("cursor") || undefined
  const limitParam = searchParams.get("limit")
  const limit = Math.min(Math.max(parseInt(limitParam ?? "20", 10) || 20, 1), 100)

  const where: Prisma.BackupHistoryWhereInput = {}

  if (connectionId) where.connectionId = connectionId

  if (statusParam) {
    where.status = statusParam as BackupStatus
  }

  if (startDate || endDate) {
    where.startedAt = {}
    if (startDate) (where.startedAt as Prisma.DateTimeFilter).gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      ;(where.startedAt as Prisma.DateTimeFilter).lte = end
    }
  }

  const items = await prisma.backupHistory.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true,
      connectionId: true,
      connectionName: true,
      dbType: true,
      status: true,
      fileName: true,
      fileSizeBytes: true,
      durationMs: true,
      startedAt: true,
      completedAt: true,
    },
  })

  const hasMore = items.length > limit
  const data = hasMore ? items.slice(0, limit) : items
  const nextCursor = hasMore ? data[data.length - 1].id : null

  const total = await prisma.backupHistory.count({ where })

  // Serialize BigInt fields — JSON.stringify cannot handle BigInt
  const serialized = data.map((item) => ({
    ...item,
    fileSizeBytes: item.fileSizeBytes?.toString() ?? null,
  }))

  return NextResponse.json({
    data: serialized,
    pagination: { total, nextCursor, hasMore },
  })
}

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
